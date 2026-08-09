const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { StringDecoder } = require("node:string_decoder");

function homePath(...parts) {
  const base =
    process.env.RESONANT_HOME ||
    process.env.ALIGNED_AGENT_HOME ||
    path.join(os.homedir(), ".resonant");
  return path.join(base, ...parts);
}

function readJson(file, fallback = {}) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function envVarForProvider(name) {
  const normalized = String(name || "").toLowerCase();
  const map = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    google: "GEMINI_API_KEY",
    gemini: "GEMINI_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    groq: "GROQ_API_KEY",
    xai: "XAI_API_KEY",
    mistral: "MISTRAL_API_KEY",
  };
  return map[normalized] || `${normalized.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_API_KEY`;
}

function buildPiEnv(baseEnv = process.env) {
  const env = { ...baseEnv };
  if (process.platform === "win32") {
    prependPathEntry(env, path.join(os.homedir(), "AppData", "Roaming", "npm"));
  }
  const auth = readJson(homePath("agent", "auth.json"), {});
  const credentials = readJson(homePath("secrets", "credentials.json"), {});
  const apiKey = String(credentials.provider_api_key || "").trim();
  if (apiKey) {
    env[auth.envVar || envVarForProvider(auth.provider)] = apiKey;
  }
  env.PI_CODING_AGENT_DIR = env.PI_CODING_AGENT_DIR || homePath("agent");
  return env;
}

function pathEnvKey(env) {
  return Object.keys(env).find((key) => key.toLowerCase() === "path") || "Path";
}

function prependPathEntry(env, entry) {
  if (!entry) return;
  const key = pathEnvKey(env);
  const current = env[key] || "";
  const parts = current.split(path.delimiter).filter(Boolean);
  const normalized = path.resolve(entry).toLowerCase();
  if (parts.some((part) => path.resolve(part).toLowerCase() === normalized)) return;
  env[key] = current ? `${entry}${path.delimiter}${current}` : entry;
}

function resolvePiCommand(env = buildPiEnv()) {
  const override = env.ALIGNED_PI_COMMAND || env.PI_COMMAND;
  if (override && fs.existsSync(override)) return override;

  if (process.platform === "win32") {
    const npmShim = path.join(os.homedir(), "AppData", "Roaming", "npm", "pi.cmd");
    if (fs.existsSync(npmShim)) return npmShim;
    const located = spawnSync("where.exe", ["pi.cmd"], {
      env,
      encoding: "utf8",
      windowsHide: true,
    });
    if (located.status === 0) {
      return String(located.stdout || "").split(/\r?\n/).find(Boolean) || "";
    }
    return "";
  }

  const located = spawnSync("sh", ["-lc", "command -v pi"], {
    env,
    encoding: "utf8",
  });
  return located.status === 0 ? String(located.stdout || "").trim() : "";
}

function piAvailable() {
  return Boolean(resolvePiCommand());
}

function attachJsonlReader(stream, onLine) {
  const decoder = new StringDecoder("utf8");
  let buffer = "";

  stream.on("data", (chunk) => {
    buffer += typeof chunk === "string" ? chunk : decoder.write(chunk);
    while (true) {
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex === -1) break;
      let line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      onLine(line);
    }
  });

  stream.on("end", () => {
    buffer += decoder.end();
    if (buffer.length > 0) {
      onLine(buffer.endsWith("\r") ? buffer.slice(0, -1) : buffer);
    }
  });
}

function extractTextFromMessage(message) {
  if (!message) return "";
  if (typeof message.text === "string") return message.text;
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content)) {
    return message.content
      .map((part) => {
        if (!part) return "";
        if (typeof part === "string") return part;
        if (typeof part.text === "string") return part.text;
        if (typeof part.content === "string") return part.content;
        return "";
      })
      .join("");
  }
  return "";
}

function buildSessionArgs(options = {}) {
  const args = ["--mode", "rpc", "--session-dir", options.sessionDir];
  if (options.sessionFile) {
    args.push("--session", options.sessionFile);
  } else if (options.resume !== false) {
    args.push("--continue");
  }
  if (options.provider) args.push("--provider", options.provider);
  if (options.model) args.push("--model", options.model);
  return args;
}

function sessionPinFile(sessionDir) {
  return path.join(path.resolve(sessionDir), "active-session.json");
}

function validatedSessionFile(sessionDir, candidate, options = {}) {
  if (!candidate) return "";
  const directory = path.resolve(sessionDir);
  const sessionFile = path.resolve(String(candidate));
  const relative = path.relative(directory, sessionFile);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return "";
  if (path.extname(sessionFile).toLowerCase() !== ".jsonl") return "";
  if (options.mustExist !== false && !fs.existsSync(sessionFile)) return "";
  return sessionFile;
}

function readSessionPin(sessionDir, pinFile = sessionPinFile(sessionDir)) {
  const pin = readJson(pinFile, {});
  if (pin.format !== "aligned-pi-session-pin" || Number(pin.version) !== 1) return "";
  const candidate = path.isAbsolute(String(pin.session_file || ""))
    ? pin.session_file
    : path.join(path.resolve(sessionDir), String(pin.session_file || ""));
  return validatedSessionFile(sessionDir, candidate);
}

function mostRecentSessionFile(sessionDir) {
  try {
    return fs
      .readdirSync(sessionDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".jsonl"))
      .map((entry) => {
        const file = path.join(sessionDir, entry.name);
        return { file, modified: fs.statSync(file).mtimeMs };
      })
      .sort((left, right) => right.modified - left.modified)[0]?.file || "";
  } catch {
    return "";
  }
}

function writeSessionPin(sessionDir, candidate, pinFile = sessionPinFile(sessionDir)) {
  let temporary = "";
  try {
    const sessionFile = validatedSessionFile(sessionDir, candidate);
    if (!sessionFile) return false;
    const directory = path.resolve(sessionDir);
    fs.mkdirSync(directory, { recursive: true });
    const target = path.resolve(pinFile);
    const relative = path.relative(directory, target);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return false;
    temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(
      temporary,
      `${JSON.stringify(
        {
          format: "aligned-pi-session-pin",
          version: 1,
          session_file: path.relative(directory, sessionFile).replace(/\\/g, "/"),
          pinned_at: new Date().toISOString(),
        },
        null,
        2,
      )}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
    fs.renameSync(temporary, target);
    return true;
  } catch {
    if (temporary) {
      try {
        fs.rmSync(temporary, { force: true });
      } catch {
        // A failed continuity receipt must not crash the active conversation.
      }
    }
    return false;
  }
}

class PiRpcSession {
  constructor(options = {}) {
    this.cwd = options.cwd || process.env.PI_WORKSPACE || homePath("workspace");
    this.sessionDir = options.sessionDir || homePath("data", "sessions", "terminal");
    this.pinFile = options.pinFile || sessionPinFile(this.sessionDir);
    this.sessionFile =
      validatedSessionFile(this.sessionDir, options.sessionFile) ||
      readSessionPin(this.sessionDir, this.pinFile);
    this.provider = options.provider || "";
    this.model = options.model || "";
    this.resume = options.resume !== false;
    this.timeoutMs = Number(options.timeoutMs || 10 * 60 * 1000);
    this.proc = null;
    this.current = null;
    this.stderr = "";
  }

  start() {
    if (this.proc && !this.proc.killed) return;
    this.stderr = "";

    fs.mkdirSync(this.cwd, { recursive: true });
    fs.mkdirSync(this.sessionDir, { recursive: true });

    const args = buildSessionArgs({
      sessionDir: this.sessionDir,
      sessionFile: this.sessionFile,
      resume: this.resume,
      provider: this.provider,
      model: this.model,
    });

    const env = buildPiEnv();
    const piCommand = resolvePiCommand(env) || (process.platform === "win32" ? "pi.cmd" : "pi");
    const spawnCommand = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : piCommand;
    const spawnArgs = process.platform === "win32" ? ["/d", "/s", "/c", piCommand, ...args] : args;

    this.proc = spawn(spawnCommand, spawnArgs, {
      cwd: this.cwd,
      env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    this.proc.on("error", (error) => {
      if (!this.rejectCurrent(error)) {
        this.stderr += error.message;
      }
      this.proc = null;
    });

    this.proc.stderr.on("data", (chunk) => {
      this.stderr += chunk.toString();
    });

    attachJsonlReader(this.proc.stdout, (line) => this.handleLine(line));

    this.proc.on("exit", (code) => {
      this.rejectCurrent(
        new Error(`pi exited with code ${code}. ${this.stderr.trim()}`.trim()),
      );
      this.proc = null;
    });
  }

  settleCurrent(kind, value) {
    if (!this.current) return false;
    const current = this.current;
    this.current = null;
    if (current.timer) clearTimeout(current.timer);
    current[kind](value);
    return true;
  }

  resolveCurrent(value) {
    return this.settleCurrent("resolve", value);
  }

  rejectCurrent(error) {
    return this.settleCurrent("reject", error);
  }

  handleLine(line) {
    if (!line.trim()) return;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      this.current?.onEvent?.({ type: "raw", line });
      return;
    }

    this.current?.onEvent?.(event);

    if (
      event.type === "response" &&
      event.command === "get_state" &&
      event.success === true &&
      event.data?.sessionFile
    ) {
      if (writeSessionPin(this.sessionDir, event.data.sessionFile, this.pinFile)) {
        this.sessionFile = path.resolve(event.data.sessionFile);
      }
    }

    if (event.type === "message_update") {
      const update = event.assistantMessageEvent || {};
      if (update.type === "text_delta" && typeof update.delta === "string") {
        this.current.text += update.delta;
        this.current.onText?.(update.delta);
      }
    }

    if (event.type === "tool_execution_start") {
      this.current?.onTool?.({ phase: "start", event });
    }

    if (event.type === "tool_execution_update") {
      this.current?.onTool?.({ phase: "update", event });
    }

    if (event.type === "tool_execution_end") {
      this.current?.onTool?.({ phase: "end", event });
    }

    if (event.type === "extension_ui_request" && event.id) {
      this.current?.onEvent?.({ type: "notice", message: `Extension UI request: ${event.method || "unknown"}` });
      if (["select", "input", "editor"].includes(event.method)) {
        this.send({ type: "extension_ui_response", id: event.id, cancelled: true });
      } else if (event.method === "confirm") {
        this.send({ type: "extension_ui_response", id: event.id, confirmed: false });
      }
    }

    if (event.type === "agent_end" && this.current) {
      let text = this.current.text;
      if (!text && Array.isArray(event.messages)) {
        const lastAssistant = [...event.messages].reverse().find((message) => message.role === "assistant");
        text = extractTextFromMessage(lastAssistant);
      }
      const activeFile = mostRecentSessionFile(this.sessionDir);
      if (writeSessionPin(this.sessionDir, activeFile, this.pinFile)) {
        this.sessionFile = path.resolve(activeFile);
      }
      this.resolveCurrent(text);
      this.requestSessionPin();
    }
  }

  requestSessionPin() {
    if (!this.proc?.stdin?.writable) return false;
    try {
      this.proc.stdin.write(`${JSON.stringify({ type: "get_state" })}\n`);
      return true;
    } catch {
      return false;
    }
  }

  send(command) {
    this.start();
    this.proc.stdin.write(`${JSON.stringify(command)}\n`);
  }

  prompt(message, callbacks = {}) {
    if (this.current) {
      return Promise.reject(new Error("Pi is already working. Wait for the current response to finish."));
    }
    this.start();
    return new Promise((resolve, reject) => {
      const timeoutMs = Number(callbacks.timeoutMs || this.timeoutMs);
      this.current = {
        text: "",
        resolve,
        reject,
        onText: callbacks.onText,
        onEvent: callbacks.onEvent,
        onTool: callbacks.onTool,
        timer:
          Number.isFinite(timeoutMs) && timeoutMs > 0
            ? setTimeout(() => {
                const error = new Error(
                  `Pi did not complete within ${Math.ceil(timeoutMs / 1000)} seconds.`,
                );
                if (this.rejectCurrent(error)) this.stop({ rejectCurrent: false });
              }, timeoutMs)
            : null,
      };
      try {
        const command = { type: "prompt", message };
        if (Array.isArray(callbacks.images) && callbacks.images.length > 0) {
          command.images = callbacks.images;
        }
        this.send(command);
      } catch (error) {
        this.rejectCurrent(error);
      }
    });
  }

  stop(options = {}) {
    if (options.rejectCurrent !== false) {
      this.rejectCurrent(new Error("Pi session stopped before the response completed."));
    }
    if (this.proc && !this.proc.killed) {
      if (process.platform === "win32" && Number(this.proc.pid) > 0) {
        spawnSync(
          "taskkill.exe",
          ["/pid", String(this.proc.pid), "/T", "/F"],
          {
            windowsHide: true,
            stdio: "ignore",
          },
        );
      }
      try {
        this.proc.kill();
      } catch {
        // The process tree may already be gone.
      }
    }
  }
}

module.exports = {
  PiRpcSession,
  buildPiEnv,
  buildSessionArgs,
  homePath,
  piAvailable,
  readJson,
  readSessionPin,
  resolvePiCommand,
  sessionPinFile,
  writeSessionPin,
};
