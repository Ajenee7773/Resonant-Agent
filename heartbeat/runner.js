const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { PiRpcSession, homePath, piAvailable, readJson } = require("../bridge/pi-rpc");

const DEFAULT_CONFIG = {
  enabled: true,
  every: "30m",
  runOnStart: true,
  target: "console",
  showOk: false,
  showAlerts: true,
  ackMaxChars: 300,
  activeHours: null,
  telegramChatIds: [],
  prompt:
    "Read HEARTBEAT.md if it exists. Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.",
};

const configPath = homePath("agent", "heartbeat.json");
const statePath = homePath("agent", "heartbeat-state.json");
const heartbeatPath = homePath("agent", "HEARTBEAT.md");
const logPath = homePath("agent", "heartbeat.log");
const lockPath = homePath("agent", "heartbeat-runner.lock");
const telegramConfigPath = homePath("agent", "telegram.json");

let running = true;
let lockAcquired = false;
let wakeSleep = null;

function writeJson(file, value, mode) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { encoding: "utf8", mode });
}

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    writeJson(configPath, DEFAULT_CONFIG, 0o600);
  }

  const raw = readJson(configPath, {});
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    activeHours: raw.activeHours || null,
    telegramChatIds: Array.isArray(raw.telegramChatIds) ? raw.telegramChatIds : [],
  };
}

function loadState() {
  const state = readJson(statePath, {});
  state.tasks = state.tasks || {};
  return state;
}

function saveState(state) {
  writeJson(statePath, state, 0o600);
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

function formatDuration(ms) {
  if (ms % (24 * 60 * 60 * 1000) === 0) return `${ms / (24 * 60 * 60 * 1000)}d`;
  if (ms % (60 * 60 * 1000) === 0) return `${ms / (60 * 60 * 1000)}h`;
  if (ms % (60 * 1000) === 0) return `${ms / (60 * 1000)}m`;
  if (ms % 1000 === 0) return `${ms / 1000}s`;
  return `${ms}ms`;
}

function timestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function appendLog(kind, text) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `[${timestamp()}] ${kind}\n${String(text || "").trim()}\n\n`, "utf8");
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

function acquireLock() {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });

  while (true) {
    try {
      const fd = fs.openSync(lockPath, "wx");
      fs.writeFileSync(
        fd,
        JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }, null, 2) + "\n",
        "utf8",
      );
      fs.closeSync(fd);
      lockAcquired = true;
      return;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;

      const existing = readJson(lockPath, {});
      const existingPid = Number(existing.pid);
      if (processIsAlive(existingPid)) {
        throw new Error(
          `RESONANT heartbeat is already running with process id ${existingPid}. Stop that runner before starting another.`,
        );
      }

      fs.unlinkSync(lockPath);
    }
  }
}

function releaseLock() {
  if (!lockAcquired) return;
  try {
    const existing = readJson(lockPath, {});
    if (Number(existing.pid) === process.pid) fs.unlinkSync(lockPath);
  } catch {
    // Best effort only; a stale lock is cleaned up on the next start.
  } finally {
    lockAcquired = false;
  }
}

function unquote(value) {
  const text = String(value || "").trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  return text;
}

function parseTasks(markdown) {
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

function removeTasksBlock(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const kept = [];
  let inTasks = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inTasks && /^tasks:\s*$/i.test(trimmed)) {
      inTasks = true;
      continue;
    }
    if (inTasks && /^#{1,6}\s+/.test(trimmed)) {
      inTasks = false;
    }
    if (!inTasks) kept.push(line);
  }

  return kept.join("\n").trim();
}

function hasHeartbeatContent(markdown) {
  const cleaned = String(markdown || "")
    .replace(/```[\s\S]*?```/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !/^---+$/.test(line) && !/^tasks:\s*$/i.test(line));
  return cleaned.length > 0;
}

function dueTasks(tasks, state, now = Date.now()) {
  return tasks.filter((task) => {
    const intervalMs = parseDuration(task.interval, 30 * 60 * 1000);
    if (intervalMs === 0) return false;
    const taskState = state.tasks[task.name] || {};
    const lastRun = Date.parse(taskState.lastRun || "");
    return !Number.isFinite(lastRun) || now - lastRun >= intervalMs;
  });
}

function markTasksRan(tasks, state, date = new Date()) {
  for (const task of tasks) {
    state.tasks[task.name] = {
      lastRun: date.toISOString(),
      interval: task.interval || "",
    };
  }
  saveState(state);
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

function readHeartbeatFile() {
  if (!fs.existsSync(heartbeatPath)) return "";
  return fs.readFileSync(heartbeatPath, "utf8");
}

function buildPrompt(config, markdown, tasks) {
  const dueText = tasks.length
    ? tasks.map((task) => `- ${task.name} (${task.interval || "no interval"}): ${task.prompt}`).join("\n")
    : "- No structured tasks are due. Use the general HEARTBEAT.md checklist.";
  const remainingMarkdown = tasks.length ? removeTasksBlock(markdown) : String(markdown || "").trim();

  return [
    "HEARTBEAT RUN",
    "",
    config.prompt,
    "",
    `Heartbeat file: ${heartbeatPath}`,
    "",
    "Due tasks:",
    dueText,
    "",
    "HEARTBEAT.md:",
    "```markdown",
    remainingMarkdown || "(empty)",
    "```",
  ].join("\n");
}

function classifyResponse(text, ackMaxChars) {
  const trimmed = String(text || "").trim();
  const ack = "HEARTBEAT_OK";
  if (!trimmed) return { ok: true, text: "" };
  if (trimmed === ack) return { ok: true, text: "" };
  if (trimmed.startsWith(ack)) {
    const rest = trimmed.slice(ack.length).trim();
    if (rest.length <= ackMaxChars) return { ok: true, text: rest };
  }
  if (trimmed.endsWith(ack)) {
    const rest = trimmed.slice(0, -ack.length).trim();
    if (rest.length <= ackMaxChars) return { ok: true, text: rest };
  }
  return { ok: false, text: trimmed };
}

function splitMessage(text) {
  const chunks = [];
  const value = String(text || "").trim();
  for (let i = 0; i < value.length; i += 3900) chunks.push(value.slice(i, i + 3900));
  return chunks.length ? chunks : [""];
}

async function telegram(token, method, params = {}) {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.description || `Telegram ${method} failed`);
  return json.result;
}

async function deliverTelegram(config, text) {
  const telegramConfig = readJson(telegramConfigPath, {});
  if (!telegramConfig.enabled || !telegramConfig.token) {
    appendLog("DELIVERY_SKIPPED", "Telegram target selected, but Telegram is not configured.");
    return;
  }

  const chatIds = config.telegramChatIds.length
    ? config.telegramChatIds
    : Array.isArray(telegramConfig.heartbeatChats) && telegramConfig.heartbeatChats.length
      ? telegramConfig.heartbeatChats
      : telegramConfig.allowedChats || [];

  for (const chatId of chatIds.map(String)) {
    for (const chunk of splitMessage(text)) {
      await telegram(telegramConfig.token, "sendMessage", { chat_id: chatId, text: chunk });
    }
  }
}

async function deliver(config, result) {
  if (result.ok) {
    appendLog("HEARTBEAT_OK", result.text || "No action needed.");
    if (config.showOk && config.target === "console") {
      console.log(result.text ? `HEARTBEAT_OK: ${result.text}` : "HEARTBEAT_OK");
    }
    if (config.showOk && config.target === "telegram") {
      await deliverTelegram(config, result.text ? `HEARTBEAT_OK: ${result.text}` : "HEARTBEAT_OK");
    }
    return;
  }

  appendLog("HEARTBEAT_ALERT", result.text);
  if (config.showAlerts !== false && config.target === "console") {
    console.log("");
    console.log("HEARTBEAT ALERT");
    console.log(result.text);
    console.log("");
  }
  if (config.showAlerts !== false && config.target === "telegram") {
    await deliverTelegram(config, result.text);
  }
}

function heartbeatPlan(config, force = false) {
  const markdown = readHeartbeatFile();
  const tasks = parseTasks(markdown);
  const state = loadState();
  const due = force ? tasks : dueTasks(tasks, state);
  return {
    config,
    markdown,
    tasks,
    due,
    state,
    hasContent: hasHeartbeatContent(markdown),
    active: inActiveHours(config.activeHours),
    everyMs: parseDuration(config.every, 30 * 60 * 1000),
  };
}

async function runHeartbeat(options = {}) {
  const config = loadConfig();
  const force = Boolean(options.force);
  const plan = heartbeatPlan(config, force);

  if (!config.enabled || plan.everyMs === 0) {
    console.log("Heartbeat disabled. Edit heartbeat.json to enable it.");
    return;
  }

  if (!plan.active) {
    console.log(`[${timestamp()}] Heartbeat skipped: outside active hours.`);
    return;
  }

  if (!plan.hasContent) {
    console.log(`[${timestamp()}] Heartbeat skipped: HEARTBEAT.md is empty.`);
    return;
  }

  if (plan.tasks.length && !plan.due.length && !force) {
    console.log(`[${timestamp()}] Heartbeat skipped: no tasks due.`);
    return;
  }

  if (!piAvailable()) {
    throw new Error("Pi runtime is not available on PATH. Start RESONANT after installing/configuring Pi.");
  }

  const auth = readJson(homePath("agent", "auth.json"), {});
  const session = new PiRpcSession({
    sessionDir: homePath("agent", "sessions", "heartbeat"),
    provider: config.provider || auth.provider,
    model: config.model || auth.model,
  });

  const prompt = buildPrompt(config, plan.markdown, plan.due);
  console.log(`[${timestamp()}] Heartbeat running...`);
  try {
    const response = await session.prompt(prompt);
    const result = classifyResponse(response, Number(config.ackMaxChars || DEFAULT_CONFIG.ackMaxChars));
    if (plan.due.length) markTasksRan(plan.due, plan.state);
    await deliver(config, result);
  } finally {
    session.stop();
  }
}

function printDryRun(force = false) {
  const config = loadConfig();
  const plan = heartbeatPlan(config, force);
  console.log("RESONANT heartbeat dry run");
  console.log(`Home: ${process.env.RESONANT_HOME || path.join(os.homedir(), ".resonant")}`);
  console.log(`Enabled: ${config.enabled}`);
  console.log(`Every: ${config.every} (${formatDuration(plan.everyMs)})`);
  console.log(`Target: ${config.target}`);
  console.log(`Active now: ${plan.active}`);
  console.log(`HEARTBEAT.md content: ${plan.hasContent ? "present" : "empty/missing"}`);
  console.log(`Tasks found: ${plan.tasks.length}`);
  console.log(`Tasks due: ${plan.due.length}`);
  for (const task of plan.due) {
    console.log(`- ${task.name}: ${task.prompt}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (wakeSleep === stop) wakeSleep = null;
      resolve();
    }, ms);
    const stop = () => {
      clearTimeout(timer);
      resolve();
    };
    wakeSleep = stop;
  });
}

function requestStop(message) {
  running = false;
  if (message) console.log(message);
  if (wakeSleep) {
    const stop = wakeSleep;
    wakeSleep = null;
    stop();
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const once = args.has("--once") || args.has("--now");
  const dryRun = args.has("--dry-run");

  if (dryRun) {
    printDryRun(once);
    return;
  }

  process.on("SIGINT", () => requestStop("\nStopping RESONANT heartbeat runner."));
  process.on("SIGTERM", () => requestStop());
  process.on("exit", releaseLock);

  if (once) {
    await runHeartbeat({ force: true });
    return;
  }

  try {
    acquireLock();

    console.log("RESONANT heartbeat runner online.");
    console.log("Press Ctrl+C to stop.");

    let firstLoop = true;
    while (running) {
      const config = loadConfig();
      const intervalMs = parseDuration(config.every, 30 * 60 * 1000);
      if (firstLoop && config.runOnStart === false) {
        console.log(`[${timestamp()}] Waiting ${formatDuration(intervalMs)} before first heartbeat.`);
      } else {
        await runHeartbeat({ force: false }).catch((error) => {
          appendLog("HEARTBEAT_ERROR", error.message);
          console.error(`Heartbeat warning: ${error.message}`);
        });
      }
      firstLoop = false;

      if (!running) break;

      const nextConfig = loadConfig();
      const nextIntervalMs = parseDuration(nextConfig.every, 30 * 60 * 1000) || 60 * 1000;
      console.log(`[${timestamp()}] Next heartbeat check in ${formatDuration(nextIntervalMs)}.`);
      await sleep(nextIntervalMs);
    }
  } finally {
    releaseLock();
  }
}

main().catch((error) => {
  appendLog("HEARTBEAT_FATAL", error.message);
  console.error(`RESONANT heartbeat failed: ${error.message}`);
  process.exit(1);
});
