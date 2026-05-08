const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { StringDecoder } = require("node:string_decoder");

function homePath(...parts) {
  const base = process.env.RESONANT_HOME || path.join(os.homedir(), ".resonant");
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
    google: "GOOGLE_API_KEY",
    gemini: "GOOGLE_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    groq: "GROQ_API_KEY",
    xai: "XAI_API_KEY",
    mistral: "MISTRAL_API_KEY",
  };
  return map[normalized] || `${normalized.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_API_KEY`;
}

function buildPiEnv(baseEnv = process.env) {
  const env = { ...baseEnv };
  const auth = readJson(homePath("agent", "auth.json"), {});
  if (auth.apiKey) {
    env[auth.envVar || envVarForProvider(auth.provider)] = auth.apiKey;
  }
  env.PI_CODING_AGENT_DIR = env.PI_CODING_AGENT_DIR || homePath("agent");
  return env;
}

function piAvailable() {
  const command = process.platform === "win32" ? "where" : "command";
  const args = process.platform === "win32" ? ["pi"] : ["-v", "pi"];
  return spawnSync(command, args, { stdio: "ignore", shell: process.platform !== "win32" }).status === 0;
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

class PiRpcSession {
  constructor(options = {}) {
    this.cwd = options.cwd || process.env.PI_WORKSPACE || homePath("workspace");
    this.sessionDir = options.sessionDir || homePath("agent", "sessions", "resonant");
    this.provider = options.provider || "";
    this.model = options.model || "";
    this.proc = null;
    this.current = null;
    this.stderr = "";
  }

  start() {
    if (this.proc && !this.proc.killed) return;

    fs.mkdirSync(this.cwd, { recursive: true });
    fs.mkdirSync(this.sessionDir, { recursive: true });

    const args = ["--mode", "rpc", "--session-dir", this.sessionDir];
    if (this.provider) args.push("--provider", this.provider);
    if (this.model) args.push("--model", this.model);

    const piCommand = process.platform === "win32" ? "pi.cmd" : "pi";
    this.proc = spawn(piCommand, args, {
      cwd: this.cwd,
      env: buildPiEnv(),
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    this.proc.on("error", (error) => {
      if (this.current) {
        this.current.reject(error);
        this.current = null;
      } else {
        this.stderr += error.message;
      }
      this.proc = null;
    });

    this.proc.stderr.on("data", (chunk) => {
      this.stderr += chunk.toString();
    });

    attachJsonlReader(this.proc.stdout, (line) => this.handleLine(line));

    this.proc.on("exit", (code) => {
      if (this.current) {
        this.current.reject(new Error(`pi exited with code ${code}. ${this.stderr.trim()}`.trim()));
        this.current = null;
      }
      this.proc = null;
    });
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
      const resolve = this.current.resolve;
      this.current = null;
      resolve(text);
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
      this.current = {
        text: "",
        resolve,
        reject,
        onText: callbacks.onText,
        onEvent: callbacks.onEvent,
        onTool: callbacks.onTool,
      };
      this.send({ type: "prompt", message });
    });
  }

  stop() {
    if (this.proc && !this.proc.killed) {
      this.proc.kill();
    }
  }
}

module.exports = {
  PiRpcSession,
  buildPiEnv,
  homePath,
  piAvailable,
  readJson,
};
