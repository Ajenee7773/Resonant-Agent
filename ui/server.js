const http = require("node:http");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { PiRpcSession, homePath, piAvailable, readJson } = require("../bridge/pi-rpc");
const { dryRunText, runHeartbeat } = require("../heartbeat/runner");

const HOST = process.env.RESONANT_UI_HOST || "127.0.0.1";
const PORT = Number(process.env.RESONANT_UI_PORT || 47891);
const PUBLIC_DIR = path.join(__dirname, "public");
const HEARTBEAT_RUNNER = path.resolve(__dirname, "..", "heartbeat", "runner.js");
const HEARTBEAT_CONFIG = homePath("agent", "heartbeat.json");
const HEARTBEAT_STATE = homePath("agent", "heartbeat-state.json");
const HEARTBEAT_FILE = homePath("agent", "HEARTBEAT.md");
const HEARTBEAT_LOG = homePath("agent", "heartbeat.log");
const HEARTBEAT_LOCK = homePath("agent", "heartbeat-runner.lock");

const DEFAULT_HEARTBEAT_CONFIG = {
  enabled: true,
  every: "30m",
  target: "console",
  activeHours: null,
};

const auth = readJson(homePath("agent", "auth.json"), {});
const session = new PiRpcSession({
  sessionDir: homePath("agent", "sessions", "ui"),
  provider: auth.provider,
  model: auth.model,
});

function sendJson(res, status, value) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(value));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error("Request body too large."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function contentTypeFor(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
  }[ext] || "application/octet-stream";
}

function writeJson(file, value, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { encoding: "utf8", mode });
}

function processIsAlive(pid) {
  if (!pid || !Number.isFinite(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function parseDuration(value, fallbackMs) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  const text = String(value || "").trim().toLowerCase();
  const match = text.match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)?$/);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2] || "m";
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return Math.max(0, Math.floor(amount * multipliers[unit]));
}

function minutesFromTime(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 24 || minutes < 0 || minutes > 59) return null;
  if (hours === 24 && minutes !== 0) return null;
  return hours * 60 + minutes;
}

function inActiveHours(activeHours, date = new Date()) {
  if (!activeHours || !activeHours.start || !activeHours.end) return true;
  const start = minutesFromTime(activeHours.start);
  const end = minutesFromTime(activeHours.end);
  if (start === null || end === null || start === end) return false;
  const current = date.getHours() * 60 + date.getMinutes();
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

function unquote(value) {
  const text = String(value || "").trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  return text;
}

function parseHeartbeatTasks(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const tasks = [];
  let inTasks = false;
  let current = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!inTasks) {
      if (/^tasks:\s*$/i.test(trimmed)) inTasks = true;
      continue;
    }

    if (/^#{1,6}\s+/.test(trimmed)) break;
    if (!trimmed || trimmed.startsWith("#")) continue;

    const nameMatch = trimmed.match(/^-\s+name:\s*(.+)$/i);
    if (nameMatch) {
      if (current) tasks.push(current);
      current = { name: unquote(nameMatch[1]), enabled: true };
      continue;
    }

    const propertyMatch = trimmed.match(/^(interval|prompt|enabled):\s*(.*)$/i);
    if (current && propertyMatch) {
      const key = propertyMatch[1].toLowerCase();
      const value = unquote(propertyMatch[2]);
      current[key] = key === "enabled" ? !/^(false|no|0|off)$/i.test(value) : value;
    }
  }

  if (current) tasks.push(current);
  return tasks.filter((task) => task.enabled !== false && task.name && task.prompt);
}

function dueHeartbeatTasks(tasks, state, now = Date.now()) {
  const taskState = state.tasks || {};
  return tasks.filter((task) => {
    const intervalMs = parseDuration(task.interval, 30 * 60 * 1000);
    if (intervalMs === 0) return false;
    const lastRun = Date.parse((taskState[task.name] || {}).lastRun || "");
    return !Number.isFinite(lastRun) || now - lastRun >= intervalMs;
  });
}

function readText(file, fallback = "") {
  try {
    if (!fs.existsSync(file)) return fallback;
    return fs.readFileSync(file, "utf8");
  } catch {
    return fallback;
  }
}

function readLastLogBlock() {
  const text = readText(HEARTBEAT_LOG).trim();
  if (!text) return "";
  const blocks = text.split(/\n\s*\n/).filter(Boolean);
  return (blocks.at(-1) || "").slice(0, 900);
}

function readHeartbeatStatus() {
  const config = { ...DEFAULT_HEARTBEAT_CONFIG, ...readJson(HEARTBEAT_CONFIG, {}) };
  const state = readJson(HEARTBEAT_STATE, {});
  const markdown = readText(HEARTBEAT_FILE);
  const tasks = parseHeartbeatTasks(markdown);
  const due = dueHeartbeatTasks(tasks, state);
  const lock = readJson(HEARTBEAT_LOCK, {});
  const pid = Number(lock.pid);
  const running = processIsAlive(pid);
  const logStat = fs.existsSync(HEARTBEAT_LOG) ? fs.statSync(HEARTBEAT_LOG) : null;

  return {
    enabled: Boolean(config.enabled),
    every: config.every || "30m",
    target: config.target || "console",
    active: inActiveHours(config.activeHours),
    hasHeartbeatFile: fs.existsSync(HEARTBEAT_FILE),
    tasks: tasks.map((task) => ({
      name: task.name,
      interval: task.interval || "",
      lastRun: ((state.tasks || {})[task.name] || {}).lastRun || "",
      due: due.some((dueTask) => dueTask.name === task.name),
    })),
    dueCount: due.length,
    running,
    staleLock: Boolean(lock.pid && !running),
    pid: running ? pid : null,
    startedAt: running ? lock.startedAt || "" : "",
    lastLog: readLastLogBlock(),
    logUpdatedAt: logStat ? logStat.mtime.toISOString() : "",
  };
}

function startHeartbeatLoop() {
  const status = readHeartbeatStatus();
  if (status.running) return { ok: true, message: "Heartbeat loop is already running." };

  try {
    const child = spawn(process.execPath, [HEARTBEAT_RUNNER], {
      cwd: path.resolve(__dirname, ".."),
      detached: true,
      stdio: "ignore",
      env: {
        ...process.env,
        RESONANT_HOME: process.env.RESONANT_HOME || homePath(),
        PI_HOME: process.env.PI_HOME || process.env.RESONANT_HOME || homePath(),
        PI_CODING_AGENT_DIR: process.env.PI_CODING_AGENT_DIR || homePath("agent"),
      },
      windowsHide: true,
    });
    child.unref();
    return { ok: true, message: "Heartbeat loop started." };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

async function handleHeartbeatAction(req, res, action) {
  if (action === "status") {
    sendJson(res, 200, { ok: true, heartbeat: readHeartbeatStatus() });
    return;
  }

  if (action === "toggle") {
    let payload = {};
    try {
      payload = JSON.parse(await readBody(req));
    } catch {
      payload = {};
    }
    const current = { ...DEFAULT_HEARTBEAT_CONFIG, ...readJson(HEARTBEAT_CONFIG, {}) };
    current.enabled = typeof payload.enabled === "boolean" ? payload.enabled : !current.enabled;
    writeJson(HEARTBEAT_CONFIG, current);
    sendJson(res, 200, { ok: true, heartbeat: readHeartbeatStatus() });
    return;
  }

  if (action === "dry-run") {
    try {
      sendJson(res, 200, { ok: true, output: dryRunText(false), heartbeat: readHeartbeatStatus() });
    } catch (error) {
      sendJson(res, 500, { ok: false, output: error.message, heartbeat: readHeartbeatStatus() });
    }
    return;
  }

  if (action === "run-once") {
    try {
      const status = readHeartbeatStatus();
      if (!status.enabled) {
        sendJson(res, 409, {
          ok: false,
          output: "Heartbeat is paused. Resume it before running a pulse.",
          heartbeat: status,
        });
        return;
      }
      await runHeartbeat({ force: true });
      sendJson(res, 200, { ok: true, output: "Heartbeat run complete.", heartbeat: readHeartbeatStatus() });
    } catch (error) {
      sendJson(res, 500, { ok: false, output: error.message, heartbeat: readHeartbeatStatus() });
    }
    return;
  }

  if (action === "start") {
    const result = startHeartbeatLoop();
    setTimeout(() => sendJson(res, result.ok ? 200 : 500, { ...result, heartbeat: readHeartbeatStatus() }), 500);
    return;
  }

  sendJson(res, 404, { error: "Unknown heartbeat action." });
}

function serveStatic(req, res) {
  const pathname = decodeURIComponent(new URL(req.url, `http://${HOST}:${PORT}`).pathname);
  const relative = pathname === "/" ? "index.html" : pathname.slice(1);
  const file = path.resolve(PUBLIC_DIR, relative);
  const publicRelative = path.relative(PUBLIC_DIR, file);
  const insidePublic = file === PUBLIC_DIR || (publicRelative && !publicRelative.startsWith("..") && !path.isAbsolute(publicRelative));
  if (!insidePublic) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }
  res.writeHead(200, {
    "Content-Type": contentTypeFor(file),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:",
  });
  fs.createReadStream(file).pipe(res);
}

async function handleChat(req, res) {
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    sendJson(res, 400, { error: "Expected JSON body." });
    return;
  }

  const message = String(payload.message || "").trim();
  if (!message) {
    sendJson(res, 400, { error: "Message is empty." });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Connection": "keep-alive",
  });

  const write = (event) => {
    res.write(`${JSON.stringify(event)}\n`);
  };

  try {
    const text = await session.prompt(message, {
      onText: (delta) => write({ type: "delta", delta }),
      onTool: ({ phase, event }) => write({ type: "tool", phase, name: event.toolName || event.name || "" }),
      onEvent: (event) => {
        if (event.type === "notice") write(event);
      },
    });
    write({ type: "done", text });
  } catch (error) {
    write({ type: "error", error: error.message });
  } finally {
    res.end();
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  if (req.method === "GET" && url.pathname === "/api/status") {
    sendJson(res, 200, {
      ok: true,
      piAvailable: piAvailable(),
      provider: auth.provider || "",
      model: auth.model || "",
      host: HOST,
      port: PORT,
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/heartbeat") {
    await handleHeartbeatAction(req, res, "status");
    return;
  }

  if (req.method === "POST" && url.pathname.startsWith("/api/heartbeat/")) {
    await handleHeartbeatAction(req, res, url.pathname.split("/").pop());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/chat") {
    await handleChat(req, res);
    return;
  }

  if (req.method === "GET") {
    serveStatic(req, res);
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
});

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}`;
  console.log(`RESONANT Agent UI listening on ${url}`);
  if (process.env.RESONANT_UI_OPEN !== "0") {
    const opener =
      process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : process.platform === "darwin"
          ? ["open", [url]]
          : ["xdg-open", [url]];
    try {
      spawn(opener[0], opener[1], { detached: true, stdio: "ignore" }).unref();
    } catch {
      console.log(`Open ${url} in your browser.`);
    }
  }
});

process.on("SIGINT", () => {
  session.stop();
  server.close(() => process.exit(0));
});
