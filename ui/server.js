const http = require("node:http");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { PiRpcSession, homePath, piAvailable, readJson } = require("../bridge/pi-rpc");
const {
  appendMessage,
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
} = require("../core/conversations");
const {
  createBackup,
  readBackup,
  restoreBackup,
} = require("../core/data-control");
const {
  isLoopbackHostname,
  requestSecurityError,
} = require("../core/http-security");
const {
  ORIENTATION_ONLINE_MESSAGE,
  foundationalSources,
  instanceKey,
  observedReadMatches,
  orientationComplete,
  orientationSourcePrompt,
  orientationState,
  orientationSynthesisPrompt,
  preserveInstanceIntegration,
  preserveOrientationJournal,
  saveOrientationState,
  sessionHasHistory,
} = require("../core/instance-orientation");
const {
  listHarnessFiles,
  readHarnessFile,
} = require("../core/harness-browser");
const {
  exportLivingLibrary,
  installLivingLibrary,
  removeLivingLibrary,
} = require("../core/living-libraries");
const {
  describeRoom,
  listKnowledgeRooms,
  roomEntryPrompt,
} = require("../core/rooms");
const { acquireInstanceLock } = require("../core/instance-lock");
const {
  approveTransition,
  completeOnboarding,
  enforceFoundationalCheckpoint,
  finalizeFoundationalIntegration,
  foundationalNoteFile,
  foundationalIntegrationState,
  preserveFoundationalIntegration,
  publicOnboardingState,
  recordFoundationalReadReceipt,
  saveProfile,
  saveProvider,
  storeFoundationalReflection,
  testConnection,
} = require("../core/onboarding");
const { initializeRuntime } = require("../core/runtime");
const {
  dryRunText,
  enqueueWakeEvent,
  heartbeatPlan,
  runHeartbeat,
} = require("../heartbeat/runner");

let runtime = initializeRuntime();
let instanceLock;
try {
  instanceLock = acquireInstanceLock(runtime.paths.serviceLockFile);
} catch (error) {
  console.error(`RESONANT Agent could not start: ${error.message}`);
  process.exit(1);
}
process.env.RESONANT_HOME = runtime.home;
process.env.ALIGNED_AGENT_HOME = runtime.home;
process.env.PI_HOME = runtime.home;
process.env.PI_CODING_AGENT_DIR = runtime.paths.agent;
process.env.PI_WORKSPACE = runtime.paths.workspace;

const HOST = process.env.RESONANT_UI_HOST || process.env.ALIGNED_UI_HOST || "127.0.0.1";
const PORT = Number(process.env.RESONANT_UI_PORT || process.env.ALIGNED_UI_PORT || 47891);
if (
  !isLoopbackHostname(HOST) &&
  process.env.RESONANT_ALLOW_NETWORK !== "1" &&
  process.env.ALIGNED_ALLOW_NETWORK !== "1"
) {
  throw new Error(
    "Non-local UI binding requires RESONANT_ALLOW_NETWORK=1.",
  );
}
const PUBLIC_DIR = path.join(__dirname, "public");
const HEARTBEAT_RUNNER = path.resolve(__dirname, "..", "heartbeat", "runner.js");
const HEARTBEAT_CONFIG = homePath("agent", "heartbeat.json");
const HEARTBEAT_STATE = homePath("state", "heartbeat.json");
const HEARTBEAT_FILE = homePath("agent", "HEARTBEAT.md");
const HEARTBEAT_LOG = homePath("logs", "heartbeat.log");
const HEARTBEAT_LOCK = homePath("state", "heartbeat-runner.lock");

const DEFAULT_HEARTBEAT_CONFIG = {
  enabled: true,
  every: "30m",
  supervisionPoll: "5s",
  target: "console",
  activeHours: null,
  prompt:
    "Read HEARTBEAT.md if it exists. Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.",
};

let session = null;
let sessionConversationId = "";
let awakeningRunning = false;
let fullOrientationRunning = false;

function resetSession() {
  if (session) session.stop();
  session = null;
  sessionConversationId = "";
}

function stopService() {
  resetSession();
  server.close(() => {
    instanceLock.release();
    process.exit(0);
  });
  const forcedExit = setTimeout(() => {
    instanceLock.release();
    process.exit(0);
  }, 3000);
  forcedExit.unref();
}

function currentSession(conversationId) {
  const auth = readJson(homePath("agent", "auth.json"), {});
  if (!session || sessionConversationId !== conversationId) {
    resetSession();
    sessionConversationId = conversationId;
    session = new PiRpcSession({
      sessionDir: homePath("data", "sessions", "pi", conversationId),
      provider: auth.provider,
      model: auth.model,
    });
  }
  return session;
}

function freshAwakeningSession(conversationId, checked) {
  resetSession();
  sessionConversationId = `awakening:${conversationId}:${checked}`;
  session = new PiRpcSession({
    sessionDir: homePath(
      "data",
      "sessions",
      "pi",
      "awakening",
      `checkpoint-${checked}-${Date.now()}`,
    ),
    provider: readJson(homePath("agent", "auth.json"), {}).provider,
    model: readJson(homePath("agent", "auth.json"), {}).model,
  });
  return session;
}

function sendJson(res, status, value) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
  });
  res.end(JSON.stringify(value));
}

function sendApiError(res, status, code, message) {
  sendJson(res, status, { ok: false, error: { code, message } });
}

function plainModelError(error) {
  const message = String(error?.message || error || "");
  if (/stopped before the response completed/i.test(message)) {
    return "Generation stopped.";
  }
  if (/timed out|timeout/i.test(message)) {
    return "The model did not finish in time. Send the message again to retry.";
  }
  if (/exited with code|process stopped|broken pipe|econnreset/i.test(message)) {
    return "The model process stopped unexpectedly. Send the message again to retry.";
  }
  return "The model connection failed. Check System health and try again.";
}

function readBody(req, maximumBytes = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > maximumBytes) {
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

const CHAT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_CHAT_IMAGES = 4;
const MAX_CHAT_IMAGE_BYTES = 8 * 1024 * 1024;

function chatImages(payload) {
  if (payload.images === undefined) return [];
  if (!Array.isArray(payload.images)) {
    throw new Error("Images must be sent as a list.");
  }
  if (payload.images.length > MAX_CHAT_IMAGES) {
    throw new Error(`Attach no more than ${MAX_CHAT_IMAGES} images at once.`);
  }

  return payload.images.map((image) => {
    const mimeType = String(image?.mimeType || "").trim().toLowerCase();
    const data = String(image?.data || "").replace(/\s+/g, "");
    if (!CHAT_IMAGE_TYPES.has(mimeType)) {
      throw new Error("Images must be JPEG, PNG, or WebP.");
    }
    if (!data || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
      throw new Error("An attached image is not valid base64 data.");
    }
    const byteLength = Buffer.byteLength(data, "base64");
    if (!byteLength || byteLength > MAX_CHAT_IMAGE_BYTES) {
      throw new Error("Each attached image must be 8 MB or smaller.");
    }
    return { type: "image", data, mimeType };
  });
}

function awakeningControl() {
  return readJson(
    path.join(runtime.paths.state, "awakening-control.json"),
    { paused: false },
  );
}

function setAwakeningPaused(paused, reason = "") {
  writeJson(path.join(runtime.paths.state, "awakening-control.json"), {
    format: "aligned-awakening-control",
    version: 1,
    paused: Boolean(paused),
    reason: String(reason || ""),
    updated_at: new Date().toISOString(),
  });
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
    const record = taskState[task.name] || {};
    const nextAttempt = Date.parse(record.nextAttemptAt || "");
    if (Number.isFinite(nextAttempt) && now < nextAttempt) return false;
    const lastSuccess = Date.parse(record.lastSuccess || record.lastRun || "");
    return !Number.isFinite(lastSuccess) || now - lastSuccess >= intervalMs;
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
  const machineSettings = readJson(runtime.paths.settingsFile, {});
  const machineEnabled = Boolean(
    machineSettings.interfaces?.heartbeat?.enabled,
  );
  const state = readJson(HEARTBEAT_STATE, {});
  const markdown = readText(HEARTBEAT_FILE);
  const tasks = parseHeartbeatTasks(markdown);
  const due = dueHeartbeatTasks(tasks, state);
  const plan = heartbeatPlan(config, false);
  const lock = readJson(HEARTBEAT_LOCK, {});
  const pid = Number(lock.pid);
  const running = processIsAlive(pid);
  const logStat = fs.existsSync(HEARTBEAT_LOG) ? fs.statSync(HEARTBEAT_LOG) : null;

  return {
    enabled: machineEnabled,
    every: config.every || "30m",
    prompt: config.prompt || "",
    supervisionPoll: config.supervisionPoll || "5s",
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
    nextWake: plan.scheduledWake?.invalid
      ? {
          invalid: true,
          raw: plan.scheduledWake.raw,
          reason: plan.scheduledWake.reason || "",
        }
      : plan.scheduledWake
        ? {
            at: plan.scheduledWake.at,
            reason: plan.scheduledWake.reason || "",
            due: plan.wakeDue,
          }
        : null,
    pendingWakeEvents: plan.wakeEventBacklog.length,
    dueWakeEvents: plan.wakeEvents.length,
    running,
    staleLock: Boolean(lock.pid && !running),
    pid: running ? pid : null,
    startedAt: running ? lock.startedAt || "" : "",
    lastExecution: state.lastExecution || null,
    lastLog: readLastLogBlock(),
    logUpdatedAt: logStat ? logStat.mtime.toISOString() : "",
  };
}

function startHeartbeatLoop() {
  const status = readHeartbeatStatus();
  if (status.running) return { ok: true, message: "Heartbeat loop is already running." };
  if (!status.enabled) {
    return {
      ok: false,
      message: "Enable heartbeat consent before starting the runner.",
    };
  }

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

  if (action === "configure") {
    try {
      const payload = JSON.parse(await readBody(req));
      const every = String(payload.every || "").trim().toLowerCase();
      const prompt = String(payload.prompt || "").trim();
      if (!/^\d+(?:\.\d+)?\s*(?:ms|s|m|h|d)$/.test(every)) {
        throw new Error("Use a heartbeat interval such as 30m, 2h, or 1d.");
      }
      if (!prompt) {
        throw new Error("The heartbeat wake instruction cannot be empty.");
      }
      if (prompt.length > 8000) {
        throw new Error("The heartbeat wake instruction must be 8,000 characters or fewer.");
      }
      const config = {
        ...DEFAULT_HEARTBEAT_CONFIG,
        ...readJson(HEARTBEAT_CONFIG, {}),
        every,
        prompt,
      };
      writeJson(HEARTBEAT_CONFIG, config);
      sendJson(res, 200, {
        ok: true,
        message: "Heartbeat settings saved.",
        heartbeat: readHeartbeatStatus(),
      });
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        message: error.message,
        heartbeat: readHeartbeatStatus(),
      });
    }
    return;
  }

  if (action === "toggle") {
    let payload = {};
    try {
      payload = JSON.parse(await readBody(req));
    } catch {
      payload = {};
    }
    const settings = readJson(runtime.paths.settingsFile, {});
    settings.interfaces ||= {};
    settings.interfaces.heartbeat ||= {};
    const current = Boolean(settings.interfaces.heartbeat.enabled);
    settings.interfaces.heartbeat.enabled =
      typeof payload.enabled === "boolean" ? payload.enabled : !current;
    writeJson(runtime.paths.settingsFile, settings);
    const enabled = Boolean(settings.interfaces.heartbeat.enabled);
    const start = enabled ? startHeartbeatLoop() : null;
    setTimeout(
      () =>
        sendJson(res, 200, {
          ok: true,
          message: enabled
            ? start?.message || "Heartbeat resumed."
            : "Heartbeat paused. Pending wake requests remain durable.",
          heartbeat: readHeartbeatStatus(),
        }),
      enabled ? 500 : 0,
    );
    return;
  }

  if (action === "wake") {
    try {
      let payload = {};
      try {
        payload = JSON.parse(await readBody(req));
      } catch {
        payload = {};
      }
      const event = enqueueWakeEvent({
        prompt: payload.prompt || "Wake now. Read HEARTBEAT.md and decide what needs attention.",
        source: payload.source || "local-ui",
        notBefore: payload.notBefore || payload.not_before || "",
      });
      const status = readHeartbeatStatus();
      const start = status.enabled ? startHeartbeatLoop() : null;
      setTimeout(
        () =>
          sendJson(res, 200, {
            ok: true,
            message: status.enabled
              ? `Wake event queued. ${start?.message || ""}`.trim()
              : "Wake event queued. It will remain pending until heartbeat consent is resumed.",
            wakeEvent: {
              id: event.id,
              createdAt: event.created_at,
              notBefore: event.not_before,
              source: event.source,
            },
            heartbeat: readHeartbeatStatus(),
          }),
        status.enabled ? 500 : 0,
      );
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        message: error.message,
        heartbeat: readHeartbeatStatus(),
      });
    }
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
      const result = await runHeartbeat({ force: true });
      const output =
        result.status === "succeeded"
          ? `Heartbeat run complete (${result.runId}).`
          : `Heartbeat skipped: ${result.reason}.`;
      sendJson(res, 200, { ok: true, output, result, heartbeat: readHeartbeatStatus() });
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
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  });
  fs.createReadStream(file).pipe(res);
}

async function handleChat(req, res) {
  const onboarding = publicOnboardingState(runtime);
  if (!onboarding.complete) {
    sendApiError(
      res,
      409,
      "ONBOARDING_REQUIRED",
      "Complete the local setup before starting a conversation.",
    );
    return;
  }
  if (onboarding.pending_transition) {
    sendApiError(
      res,
      409,
      "MODEL_TRANSITION_REQUIRED",
      "Approve the pending model introduction before continuing.",
    );
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req, 44 * 1024 * 1024));
  } catch {
    sendJson(res, 400, { error: "Expected JSON body." });
    return;
  }

  const message = String(payload.message || "").trim();
  let images;
  try {
    images = chatImages(payload);
  } catch (error) {
    sendApiError(res, 400, "INVALID_IMAGE", error.message);
    return;
  }
  const conversationId = String(payload.conversation_id || "").trim();
  if (!message && images.length === 0) {
    sendJson(res, 400, { error: "Message is empty." });
    return;
  }
  const promptMessage =
    message || "Describe what you see in the attached image.";
  if (!conversationId || !getConversation(runtime.paths, conversationId)) {
    sendApiError(
      res,
      404,
      "CONVERSATION_NOT_FOUND",
      "Create or choose a conversation before sending a message.",
    );
    return;
  }

  try {
    appendMessage(runtime.paths, conversationId, {
      role: "user",
      text:
        images.length > 0
          ? `${promptMessage}\n\n[${images.length} image${images.length === 1 ? "" : "s"} attached]`
          : promptMessage,
    });
  } catch (error) {
    sendApiError(res, 400, "CONVERSATION_WRITE_FAILED", error.message);
    return;
  }

  res.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Connection": "keep-alive",
  });

  const write = (event) => {
    if (res.writableEnded || res.destroyed) return false;
    return res.write(`${JSON.stringify(event)}\n`);
  };

  try {
    const text = await currentSession(conversationId).prompt(promptMessage, {
      images,
      onText: (delta) => write({ type: "delta", delta }),
      onTool: ({ phase, event }) => write({ type: "tool", phase, name: event.toolName || event.name || "" }),
      onEvent: (event) => {
        if (event.type === "notice") write(event);
      },
    });
    if (text.trim()) {
      appendMessage(runtime.paths, conversationId, {
        role: "assistant",
        text,
      });
    }
    write({ type: "done", text });
  } catch (error) {
    write({ type: "error", error: plainModelError(error) });
  } finally {
    if (!res.writableEnded && !res.destroyed) res.end();
  }
}

async function handleEnterRoom(req, res) {
  const onboarding = publicOnboardingState(runtime);
  if (!onboarding.complete) {
    sendApiError(
      res,
      409,
      "ONBOARDING_REQUIRED",
      "Complete the local setup before entering a Knowledge Room.",
    );
    return;
  }
  if (onboarding.pending_transition) {
    sendApiError(
      res,
      409,
      "MODEL_TRANSITION_REQUIRED",
      "Approve the pending model introduction before entering a Knowledge Room.",
    );
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    sendApiError(res, 400, "INVALID_JSON", "Expected a valid JSON request body.");
    return;
  }

  const conversationId = String(payload.conversation_id || "").trim();
  const roomId = String(payload.room_id || "").trim();
  if (!conversationId || !getConversation(runtime.paths, conversationId)) {
    sendApiError(
      res,
      404,
      "CONVERSATION_NOT_FOUND",
      "Create or choose a conversation before entering a Knowledge Room.",
    );
    return;
  }

  try {
    const room = describeRoom(runtime.paths, roomId);
    const roomSession = currentSession(conversationId);
    if (roomSession.current) {
      sendApiError(
        res,
        409,
        "MODEL_BUSY",
        "The entity is already working. Wait for the current response, then enter the room.",
      );
      return;
    }
    await roomSession.prompt(roomEntryPrompt(room), {
      onText: () => {},
      onTool: () => {},
      onEvent: () => {},
    });
    sendJson(res, 200, {
      ok: true,
      room,
      message: `${room.name} is ready.`,
    });
  } catch (error) {
    sendApiError(res, 400, "ROOM_ENTRY_FAILED", plainModelError(error));
  }
}

async function handleExportLivingLibrary(req, res) {
  const onboarding = publicOnboardingState(runtime);
  if (!onboarding.complete || onboarding.pending_transition) {
    sendApiError(
      res,
      409,
      "LIBRARY_EXPORT_NOT_READY",
      "Complete setup and approve the model introduction before exporting a room.",
    );
    return;
  }
  let payload = {};
  try {
    payload = JSON.parse((await readBody(req)) || "{}");
  } catch {
    sendApiError(res, 400, "INVALID_JSON", "Expected a valid JSON request body.");
    return;
  }
  try {
    const bundle = exportLivingLibrary(
      runtime.paths,
      String(payload.room_id || ""),
      {
        author: payload.author,
        license: payload.license,
      },
    );
    const safeVersion = String(bundle.library.version || "1.0").replace(
      /[^a-z0-9._-]+/gi,
      "-",
    );
    const filename =
      `${bundle.library.id}-${safeVersion}.living-library.json`;
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify(bundle));
  } catch (error) {
    sendApiError(
      res,
      400,
      "LIBRARY_EXPORT_FAILED",
      error.message,
    );
  }
}

async function handleInstallLivingLibrary(req, res) {
  const onboarding = publicOnboardingState(runtime);
  if (!onboarding.complete || onboarding.pending_transition) {
    sendApiError(
      res,
      409,
      "LIBRARY_INSTALL_NOT_READY",
      "Complete setup and approve the model introduction before installing a Living Library.",
    );
    return;
  }
  let payload = {};
  try {
    payload = JSON.parse(
      (await readBody(req, 120 * 1024 * 1024)) || "{}",
    );
  } catch {
    sendApiError(
      res,
      400,
      "INVALID_LIBRARY_JSON",
      "Choose a valid Living Library JSON package.",
    );
    return;
  }
  try {
    const installed = installLivingLibrary(
      runtime.paths,
      payload.bundle || payload,
    );
    sendJson(res, 201, {
      ok: true,
      room: installed.room,
      receipt: installed.receipt,
      message: `${installed.room.name} installed. It is now available in Rooms.`,
    });
  } catch (error) {
    sendApiError(
      res,
      400,
      "LIBRARY_INSTALL_FAILED",
      error.message,
    );
  }
}

async function handleRemoveLivingLibrary(req, res) {
  const onboarding = publicOnboardingState(runtime);
  if (!onboarding.complete || onboarding.pending_transition) {
    sendApiError(
      res,
      409,
      "LIBRARY_REMOVE_NOT_READY",
      "Complete setup and approve the model introduction before removing a Living Library.",
    );
    return;
  }
  let payload = {};
  try {
    payload = JSON.parse((await readBody(req)) || "{}");
  } catch {
    sendApiError(res, 400, "INVALID_JSON", "Expected a valid JSON request body.");
    return;
  }
  if (payload.confirmation !== "REMOVE LIVING LIBRARY") {
    sendApiError(
      res,
      400,
      "LIBRARY_REMOVE_CONFIRMATION_REQUIRED",
      "Living Library removal requires explicit confirmation.",
    );
    return;
  }
  try {
    const removed = removeLivingLibrary(
      runtime.paths,
      String(payload.room_id || ""),
    );
    sendJson(res, 200, {
      ok: true,
      room: removed.room,
      removed_at: removed.removed_at,
      recoverable: removed.recoverable,
      message:
        `${removed.room.name} was removed from Rooms. A recoverable local copy was preserved.`,
    });
  } catch (error) {
    sendApiError(
      res,
      400,
      "LIBRARY_REMOVE_FAILED",
      error.message,
    );
  }
}

async function handleAwakening(req, res) {
  const onboarding = publicOnboardingState(runtime);
  if (!onboarding.complete || onboarding.pending_transition) {
    sendApiError(
      res,
      409,
      "AWAKENING_NOT_READY",
      "Complete setup and approve the model introduction first.",
    );
    return;
  }

  let payload = {};
  try {
    payload = JSON.parse((await readBody(req)) || "{}");
  } catch {
    sendApiError(res, 400, "INVALID_JSON", "Expected a valid JSON request body.");
    return;
  }
  const conversationId = String(payload.conversation_id || "").trim();
  if (!conversationId || !getConversation(runtime.paths, conversationId)) {
    sendApiError(
      res,
      404,
      "CONVERSATION_NOT_FOUND",
      "Create the first conversation before awakening.",
    );
    return;
  }

  if (awakeningRunning) {
    sendApiError(
      res,
      409,
      "AWAKENING_IN_PROGRESS",
      "First awakening is already continuing. This page can follow its progress.",
    );
    return;
  }

  res.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Connection": "keep-alive",
  });
  const write = (event) => {
    if (res.writableEnded || res.destroyed) return false;
    return res.write(`${JSON.stringify(event)}\n`);
  };

  if (!onboarding.awakening.required) {
    write({
      type: "done",
      text: "",
      awakening_status: onboarding.awakening.status,
    });
    res.end();
    return;
  }

  awakeningRunning = true;
  setAwakeningPaused(false, "running");
  try {
    const replies = [];
    let previousMissing = "";
    let stagnantPasses = 0;
    const sourcesPerPass = 1;

    for (let pass = 1; pass <= 40; pass += 1) {
      const state = enforceFoundationalCheckpoint(runtime.paths);
      if (!state.required) break;
      if (
        state.missing.length === 0 &&
        finalizeFoundationalIntegration(runtime.paths)
      ) {
        break;
      }
      const sourceBatch = state.missing.slice(0, sourcesPerPass);
      const source = sourceBatch[0] || "";
      const noteFile = source ? foundationalNoteFile(runtime.paths, source) : "";
      if (noteFile) fs.mkdirSync(path.dirname(noteFile), { recursive: true });
      const notePath = noteFile
        ? path.relative(runtime.paths.workspace, noteFile).replace(/\\/g, "/")
        : "";
      const missing = sourceBatch.length
        ? sourceBatch.map((source) => `- ${source}`).join("\n")
        : "- Inspect the marker and manifest; their state is ambiguous.";
      const wakeEvent = [
        `This is first-awakening pass ${pass}.`,
        `The verified checkpoint is ${state.status} (${state.checked}/${state.total} sources).`,
        "Your current working directory is the private workspace root.",
        "Operational files are under ../agent/; cognitive rooms are under rooms/;",
        "and the operator/entity persona is under persona/. Do not collapse these",
        "separate roots or create replacements for a file that appears missing.",
        "Use ../agent/boot/FOUNDATION-MANIFEST.md as the exact ledger.",
        "Use rooms/memory/FOUNDATIONAL-INTEGRATION.md for attributed notes.",
        "Use ../agent/MY-HARNESS.md for your authored harness and",
        "../agent/COMMANDS.md for the natural-language doorways.",
        "Before ordinary work, follow ../agent/boot/BOOT.md completely.",
        "These are natural-language sticky notes, not a questionnaire.",
        "Continue from the checked items in ../agent/boot/FOUNDATION-MANIFEST.md.",
        "Load each unchecked source in context-safe stages, think about it, add",
        "a concise attributed sticky note after reading it. Do not merely claim a",
        "source was read. Write your own ../agent/MY-HARNESS.md and identity.",
        "Do not edit the master integration or manifest during a source pass.",
        "The OS owns that bookkeeping so your reflections cannot be lost.",
        "After reading, use Pi's write tool once to author the exact sticky-note",
        `file ${notePath}. Include the exact source path in that note.`,
        "Do not end with a plan to write it later. Call the write tool before",
        "any explanatory final response; the written note is the deliverable.",
        "The OS will append your note to the master integration and mark its",
        "verified receipt only after both the successful read and note exist.",
        `Process only this batch of ${sourcesPerPass} source during this pass.`,
        "The batch may contain a checked ledger item whose attributed note was",
        "lost during an interrupted edit. Process the exact batch regardless;",
        "if its marker is already [x], preserve it as [x].",
        "Commit the attributed note before opening any other source so an",
        "interruption preserves real progress.",
        "Keep integration status pending and completed_at blank while any source",
        "remains. Never paste tool-call fields such as oldText or newText into a",
        "document. Reread each edited target and repair any malformed edit before",
        "continuing. If a targeted edit is ambiguous, reread the complete current",
        "file and retry once while preserving all existing content.",
        "Only when every item is checked may the integration status become",
        "completed. Do not explain the orientation to the operator. Preserve",
        "what you absorbed in the External Brain and journal; the interface",
        `will say only: ${ORIENTATION_ONLINE_MESSAGE}`,
        "The exact source batch for this pass is:",
        missing,
        notePath ? `Write the attributed note only to: ${notePath}` : "",
      ].join("\n");

      const integrationFile = path.join(
        runtime.paths.rooms,
        "memory",
        "FOUNDATIONAL-INTEGRATION.md",
      );
      const integrationBefore = fs.existsSync(integrationFile)
        ? fs.readFileSync(integrationFile, "utf8")
        : "";
      const readCalls = new Map();
      const successfulReads = new Set();
      let authoredReflection = "";
      const text = await currentSession(conversationId).prompt(wakeEvent, {
        timeoutMs: 20 * 60 * 1000,
        onText: () => {},
        onTool: ({ phase, event }) =>
          write({
            type: "tool",
            phase,
            name: event.toolName || event.name || "",
          }),
        onEvent: (event) => {
          if (event.type === "tool_execution_start" && event.toolName === "read") {
            readCalls.set(
              event.toolCallId,
              String(event.args?.path || "").replace(/\\/g, "/"),
            );
          }
          if (
            event.type === "tool_execution_end" &&
            event.toolName === "read" &&
            !event.isError
          ) {
            const source = readCalls.get(event.toolCallId);
            if (sourceBatch.includes(source)) successfulReads.add(source);
          }
          if (
            event.type === "message_end" &&
            event.message?.role === "assistant" &&
            Array.isArray(event.message.content)
          ) {
            const reflection = event.message.content
              .map((part) => part?.text || part?.thinking || "")
              .filter(Boolean)
              .join("\n")
              .trim();
            if (reflection) authoredReflection = reflection;
          }
          if (event.type === "notice") write(event);
        },
      });
      if (text.trim()) {
        replies.push(text);
      }

      for (const source of sourceBatch) {
        preserveFoundationalIntegration(runtime.paths, integrationBefore, source);
        if (successfulReads.has(source)) {
          storeFoundationalReflection(runtime.paths, source, authoredReflection);
          recordFoundationalReadReceipt(runtime.paths, source);
        }
      }
      const next = enforceFoundationalCheckpoint(runtime.paths);
      if (next.missing.length === 0) {
        finalizeFoundationalIntegration(runtime.paths);
      }
      const verifiedNext = enforceFoundationalCheckpoint(runtime.paths);
      if (!verifiedNext.required) break;
      const signature = verifiedNext.missing.join("\n");
      stagnantPasses = signature === previousMissing ? stagnantPasses + 1 : 0;
      previousMissing = signature;
      if (stagnantPasses >= 4) break;
    }

    const current = foundationalIntegrationState(runtime.paths);
    let text = "";
    if (current.status === "completed") {
      const masterIntegration = path.join(
        runtime.paths.rooms,
        "memory",
        "FOUNDATIONAL-INTEGRATION.md",
      );
      const synthesis = fs.existsSync(masterIntegration)
        ? fs.readFileSync(masterIntegration, "utf8")
        : replies.join("\n\n");
      const completedAt = new Date().toISOString();
      const auth = readJson(homePath("agent", "auth.json"), {});
      preserveOrientationJournal(runtime.paths, {
        key: instanceKey("web", conversationId),
        label: "Web Instance",
        modelBinding:
          `${String(auth.provider || "").trim()}/${String(auth.model || "").trim()}`,
        completedAt,
        integrationFile: masterIntegration,
        synthesis,
      });
      text = ORIENTATION_ONLINE_MESSAGE;
      appendMessage(runtime.paths, conversationId, {
        role: "assistant",
        text,
      });
    }
    write({
      type: "done",
      text,
      awakening_status: current.status,
      checked: current.checked,
      total: current.total,
    });
  } catch (error) {
    write({ type: "error", error: error.message });
  } finally {
    resetSession();
    awakeningRunning = false;
    const finalState = enforceFoundationalCheckpoint(runtime.paths);
    setAwakeningPaused(
      finalState.required,
      finalState.required ? "incomplete" : "completed",
    );
    if (!res.writableEnded && !res.destroyed) res.end();
  }
}

function webOrientationFile() {
  return path.join(runtime.paths.state, "web-orientations.json");
}

function webOrientationDetails(conversationId, auth) {
  const store = readJson(webOrientationFile(), { instances: {} });
  const key = instanceKey("web", conversationId);
  const sources = foundationalSources(runtime.paths);
  const sessionDir = homePath("data", "sessions", "pi", conversationId);
  const state = orientationState(
    store,
    key,
    auth,
    sources.length,
    sessionHasHistory(sessionDir),
  );
  return { store, key, sources, state };
}

function persistWebOrientation(details, state) {
  saveOrientationState(details.store, details.key, state);
  writeJson(webOrientationFile(), details.store);
}

async function handleFullOrientation(req, res) {
  const onboarding = publicOnboardingState(runtime);
  if (!onboarding.complete || onboarding.pending_transition) {
    sendApiError(
      res,
      409,
      "ORIENTATION_NOT_READY",
      "Complete setup and approve the model introduction first.",
    );
    return;
  }
  if (fullOrientationRunning || awakeningRunning) {
    sendApiError(
      res,
      409,
      "ORIENTATION_IN_PROGRESS",
      "An orientation is already running.",
    );
    return;
  }

  let payload = {};
  try {
    payload = JSON.parse((await readBody(req)) || "{}");
  } catch {
    sendApiError(res, 400, "INVALID_JSON", "Expected a valid JSON request body.");
    return;
  }
  const conversationId = String(payload.conversation_id || "").trim();
  if (!conversationId || !getConversation(runtime.paths, conversationId)) {
    sendApiError(
      res,
      404,
      "CONVERSATION_NOT_FOUND",
      "Choose a conversation before starting Full Orientation.",
    );
    return;
  }

  const auth = readJson(homePath("agent", "auth.json"), {});
  const details = webOrientationDetails(conversationId, auth);
  if (!details.sources.length) {
    sendApiError(
      res,
      409,
      "FOUNDATION_MISSING",
      "The foundational corpus is missing.",
    );
    return;
  }
  let state = details.state;
  if (orientationComplete(state)) {
    state = {
      ...state,
      status: "pending",
      next_source: 0,
      started_at: "",
      updated_at: "",
      completed_at: "",
      integration_file: "",
    };
  }

  res.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Connection": "keep-alive",
  });
  const write = (event) => {
    if (res.writableEnded || res.destroyed) return false;
    return res.write(`${JSON.stringify(event)}\n`);
  };

  fullOrientationRunning = true;
  const startedAt = state.started_at || new Date().toISOString();
  if (Number(state.next_source || 0) === 0 && !state.started_at) {
    appendMessage(runtime.paths, conversationId, {
      role: "user",
      text: "Full Orientation: return to the complete foundational corpus and form your own current understanding.",
    });
  }
  state = {
    ...state,
    status: "in_progress",
    started_at: startedAt,
    updated_at: new Date().toISOString(),
  };
  persistWebOrientation(details, state);
  write({
    type: "progress",
    checked: state.next_source,
    total: details.sources.length,
  });

  try {
    const activeSession = currentSession(conversationId);
    for (
      let index = Number(state.next_source || 0);
      index < details.sources.length;
      index += 1
    ) {
      const source = details.sources[index];
      const readCalls = new Map();
      let verifiedRead = false;
      await activeSession.prompt(
        orientationSourcePrompt(source, index, details.sources.length),
        {
          timeoutMs: 20 * 60 * 1000,
          onEvent: (event) => {
            if (
              event.type === "tool_execution_start" &&
              event.toolName === "read"
            ) {
              readCalls.set(
                event.toolCallId,
                String(event.args?.path || ""),
              );
            }
            if (
              event.type === "tool_execution_end" &&
              event.toolName === "read" &&
              !event.isError
            ) {
              const observed = readCalls.get(event.toolCallId);
              if (observedReadMatches(source, observed)) verifiedRead = true;
            }
          },
        },
      );
      if (!verifiedRead) {
        throw new Error(
          `Source ${index + 1} was not verified as read. Full Orientation will resume from this source.`,
        );
      }
      state = {
        ...state,
        next_source: index + 1,
        updated_at: new Date().toISOString(),
      };
      persistWebOrientation(details, state);
      write({
        type: "progress",
        checked: state.next_source,
        total: details.sources.length,
      });
    }

    const synthesis = await activeSession.prompt(
      orientationSynthesisPrompt("Web"),
      { timeoutMs: 20 * 60 * 1000 },
    );
    const completedAt = new Date().toISOString();
    const integrationFile = preserveInstanceIntegration(runtime.paths, {
      key: details.key,
      label: "Web Instance",
      modelBinding: state.model_binding,
      completedAt,
      totalSources: details.sources.length,
      synthesis,
    });
    preserveOrientationJournal(runtime.paths, {
      key: details.key,
      label: "Web Instance",
      modelBinding: state.model_binding,
      completedAt,
      integrationFile,
      synthesis,
    });
    state = {
      ...state,
      status: "completed",
      next_source: details.sources.length,
      updated_at: completedAt,
      completed_at: completedAt,
      integration_file: path
        .relative(runtime.paths.workspace, integrationFile)
        .replace(/\\/g, "/"),
    };
    persistWebOrientation(details, state);
    appendMessage(runtime.paths, conversationId, {
      role: "assistant",
      text: ORIENTATION_ONLINE_MESSAGE,
    });
    write({
      type: "done",
      text: ORIENTATION_ONLINE_MESSAGE,
      checked: details.sources.length,
      total: details.sources.length,
    });
  } catch (error) {
    state = {
      ...state,
      status: "paused",
      updated_at: new Date().toISOString(),
    };
    persistWebOrientation(details, state);
    write({
      type: "error",
      error: error.message,
      checked: state.next_source,
      total: details.sources.length,
    });
  } finally {
    fullOrientationRunning = false;
    if (!res.writableEnded && !res.destroyed) res.end();
  }
}

async function handleSystemData(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/v1/system/health") {
    const onboarding = publicOnboardingState(runtime);
    sendJson(res, 200, {
      ok: true,
      health: {
        application: "ready",
        node: process.version,
        pi: piAvailable() ? "ready" : "missing",
        onboarding: onboarding.complete ? "complete" : "required",
        entity: onboarding.entity.status,
        transition: onboarding.pending_transition ? "required" : "clear",
        harness: "installed",
        runtime_home: runtime.home,
      },
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/v1/system/awakening") {
    sendJson(res, 200, {
      ok: true,
      running: awakeningRunning,
      paused: Boolean(awakeningControl().paused),
      awakening: foundationalIntegrationState(runtime.paths),
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/v1/system/backup") {
    let payload = {};
    try {
      payload = JSON.parse((await readBody(req)) || "{}");
      const includeSecrets = Boolean(payload.include_secrets);
      if (includeSecrets && payload.confirmation !== "INCLUDE SECRETS") {
        sendApiError(
          res,
          400,
          "CONFIRMATION_REQUIRED",
          "Type INCLUDE SECRETS to create a backup containing credentials.",
        );
        return;
      }
      const backup = createBackup(runtime.paths, { includeSecrets });
      sendJson(res, 201, {
        ok: true,
        backup: {
          ...backup,
          download_url: `/api/v1/system/backups/${encodeURIComponent(backup.filename)}`,
        },
      });
    } catch (error) {
      sendApiError(res, 400, "BACKUP_FAILED", error.message);
    }
    return;
  }

  if (req.method === "POST" && pathname === "/api/v1/system/shutdown") {
    let payload = {};
    try {
      payload = JSON.parse((await readBody(req)) || "{}");
    } catch {
      sendApiError(res, 400, "INVALID_JSON", "Expected a valid JSON request body.");
      return;
    }
    if (payload.confirmation !== "STOP AGENT OS") {
      sendApiError(
        res,
        400,
        "CONFIRMATION_REQUIRED",
        "Confirm STOP AGENT OS before shutting down the local service.",
      );
      return;
    }
    sendJson(res, 200, {
      ok: true,
      message: "RESONANT Agent is stopping. Your local data is preserved.",
    });
    setImmediate(stopService);
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/api/v1/system/backups/")) {
    try {
      const filename = decodeURIComponent(pathname.split("/").pop());
      const contents = readBackup(runtime.paths, filename);
      if (!contents) {
        sendApiError(res, 404, "NOT_FOUND", "Backup was not found.");
        return;
      }
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(contents);
    } catch (error) {
      sendApiError(res, 400, "BACKUP_READ_FAILED", error.message);
    }
    return;
  }

  if (req.method === "POST" && pathname === "/api/v1/system/restore") {
    try {
      const payload = JSON.parse(
        (await readBody(req, 300 * 1024 * 1024)) || "{}",
      );
      const allowSecrets = Boolean(payload.allow_secrets);
      if (allowSecrets && payload.confirmation !== "RESTORE SECRETS") {
        sendApiError(
          res,
          400,
          "CONFIRMATION_REQUIRED",
          "Type RESTORE SECRETS to restore credentials.",
        );
        return;
      }
      resetSession();
      const restored = restoreBackup(runtime.paths, payload.bundle, {
        allowSecrets,
      });
      runtime = initializeRuntime({ runtimeHome: runtime.home });
      sendJson(res, 200, {
        ok: true,
        restored,
        onboarding: publicOnboardingState(runtime),
      });
    } catch (error) {
      sendApiError(res, 400, "RESTORE_FAILED", error.message);
    }
    return;
  }

  sendApiError(res, 404, "NOT_FOUND", "Unknown system data action.");
}

async function handleConversations(req, res, pathname) {
  const prefix = "/api/v1/conversations";
  const remainder = pathname.slice(prefix.length).replace(/^\/+/, "");
  if (!remainder) {
    if (req.method === "GET") {
      sendJson(res, 200, {
        ok: true,
        conversations: listConversations(runtime.paths),
      });
      return;
    }
    if (req.method === "POST") {
      let payload = {};
      try {
        const body = await readBody(req);
        payload = body ? JSON.parse(body) : {};
      } catch {
        sendApiError(res, 400, "INVALID_JSON", "Expected a valid JSON request body.");
        return;
      }
      const conversation = createConversation(runtime.paths, {
        entityId: runtime.entity.id,
        title: payload.title,
      });
      sendJson(res, 201, { ok: true, conversation });
      return;
    }
    sendApiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed.");
    return;
  }

  const id = remainder.split("/")[0];
  try {
    if (req.method === "GET") {
      const conversation = getConversation(runtime.paths, id);
      if (!conversation) {
        sendApiError(res, 404, "NOT_FOUND", "Conversation was not found.");
        return;
      }
      sendJson(res, 200, { ok: true, conversation });
      return;
    }
    if (req.method === "DELETE") {
      if (sessionConversationId === id) resetSession();
      const deleted = deleteConversation(runtime.paths, id);
      sendJson(res, deleted ? 200 : 404, {
        ok: deleted,
        deleted,
      });
      return;
    }
    sendApiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed.");
  } catch (error) {
    sendApiError(res, 400, "INVALID_CONVERSATION", error.message);
  }
}

async function handleOnboarding(req, res, action) {
  if (action === "state" && req.method === "GET") {
    sendJson(res, 200, {
      ok: true,
      onboarding: publicOnboardingState(runtime),
      system: {
        pi_available: piAvailable(),
        node: process.version,
      },
    });
    return;
  }

  let payload = {};
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    sendApiError(res, 400, "INVALID_JSON", "Expected a valid JSON request body.");
    return;
  }

  try {
    if (action === "profile" && req.method === "POST") {
      saveProfile(runtime.paths, payload);
    } else if (action === "provider" && req.method === "POST") {
      resetSession();
      saveProvider(runtime.paths, payload);
    } else if (action === "test-connection" && req.method === "POST") {
      const result = await testConnection(runtime.paths);
      sendJson(res, result.ok ? 200 : 502, result);
      return;
    } else if (action === "transition" && req.method === "POST") {
      resetSession();
      approveTransition(runtime.paths, payload);
    } else if (action === "complete" && req.method === "POST") {
      completeOnboarding(runtime.paths);
    } else {
      sendApiError(res, 404, "NOT_FOUND", "Unknown onboarding action.");
      return;
    }
    sendJson(res, 200, {
      ok: true,
      onboarding: publicOnboardingState(runtime),
    });
  } catch (error) {
    sendApiError(res, 400, "VALIDATION_FAILED", error.message);
  }
}

const server = http.createServer(async (req, res) => {
  const securityError = requestSecurityError(req, {
    host: HOST,
    port: PORT,
  });
  if (securityError) {
    sendApiError(res, 403, securityError.code, securityError.message);
    return;
  }
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  if (url.pathname === "/api/v1/onboarding") {
    await handleOnboarding(req, res, "state");
    return;
  }

  if (url.pathname.startsWith("/api/v1/onboarding/")) {
    await handleOnboarding(req, res, url.pathname.split("/").pop());
    return;
  }

  if (url.pathname === "/api/v1/conversations" || url.pathname.startsWith("/api/v1/conversations/")) {
    await handleConversations(req, res, url.pathname);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/v1/rooms") {
    try {
      sendJson(res, 200, {
        ok: true,
        rooms: listKnowledgeRooms(runtime.paths),
      });
    } catch (error) {
      sendApiError(res, 400, "ROOM_CATALOG_FAILED", error.message);
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/v1/rooms/enter") {
    await handleEnterRoom(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/v1/rooms/export") {
    await handleExportLivingLibrary(req, res);
    return;
  }

  if (
    req.method === "POST" &&
    url.pathname === "/api/v1/living-libraries/install"
  ) {
    await handleInstallLivingLibrary(req, res);
    return;
  }

  if (
    req.method === "POST" &&
    url.pathname === "/api/v1/living-libraries/remove"
  ) {
    await handleRemoveLivingLibrary(req, res);
    return;
  }

  if (
    req.method === "POST" &&
    url.pathname === "/api/v1/orientation/full"
  ) {
    await handleFullOrientation(req, res);
    return;
  }

  if (url.pathname === "/api/v1/system/health" ||
      url.pathname === "/api/v1/system/awakening" ||
      url.pathname === "/api/v1/system/backup" ||
      url.pathname === "/api/v1/system/restore" ||
      url.pathname === "/api/v1/system/shutdown" ||
      url.pathname.startsWith("/api/v1/system/backups/")) {
    await handleSystemData(req, res, url.pathname);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/v1/harness/files") {
    try {
      const scope = url.searchParams.get("scope") || "";
      sendJson(res, 200, {
        ok: true,
        scope,
        files: listHarnessFiles(runtime.paths, scope),
      });
    } catch (error) {
      sendApiError(res, 400, "HARNESS_LIST_FAILED", error.message);
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/v1/harness/file") {
    try {
      const scope = url.searchParams.get("scope") || "";
      const relative = url.searchParams.get("path") || "";
      const file = readHarnessFile(runtime.paths, scope, relative);
      if (!file) {
        sendApiError(res, 404, "NOT_FOUND", "Harness file was not found.");
        return;
      }
      sendJson(res, 200, { ok: true, file });
    } catch (error) {
      sendApiError(res, 400, "HARNESS_READ_FAILED", error.message);
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/status") {
    const onboarding = publicOnboardingState(runtime);
    sendJson(res, 200, {
      ok: true,
      piAvailable: piAvailable(),
      provider: onboarding.runtime.provider || "",
      model: onboarding.runtime.model || "",
      onboardingComplete: onboarding.complete,
      entityStatus: onboarding.entity.status,
      transitionRequired: Boolean(onboarding.pending_transition),
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

  if (req.method === "POST" && url.pathname === "/api/chat/stop") {
    const stopped = Boolean(session?.current);
    if (awakeningRunning) setAwakeningPaused(true, "owner-stopped");
    resetSession();
    sendJson(res, 200, {
      ok: true,
      stopped,
      message: stopped ? "Generation stopped." : "No generation was active.",
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/v1/awaken") {
    await handleAwakening(req, res);
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
  console.log(`RESONANT Agent listening on ${url}`);
  if (readHeartbeatStatus().enabled) {
    const heartbeatStart = startHeartbeatLoop();
    console.log(heartbeatStart.message);
  }
  if (process.env.RESONANT_UI_OPEN !== "0" && process.env.ALIGNED_UI_OPEN !== "0") {
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
  resetSession();
  server.close(() => {
    instanceLock.release();
    process.exit(0);
  });
});
process.on("SIGTERM", () => {
  resetSession();
  server.close(() => {
    instanceLock.release();
    process.exit(0);
  });
});
process.on("exit", () => instanceLock.release());
