const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { PiRpcSession, homePath } = require("../bridge/pi-rpc");

const resonantHome = process.env.RESONANT_HOME || path.join(os.homedir(), ".resonant");
const configPath = path.join(resonantHome, "agent", "telegram.json");

function readConfig() {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Telegram is not configured. Run ${process.platform === "win32" ? "telegram-setup.bat" : "./telegram-setup.sh"} first.`);
  }
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  if (!config.enabled || !config.token || !Array.isArray(config.allowedChats) || !config.allowedChats.length) {
    throw new Error("Telegram config is incomplete.");
  }
  return config;
}

function writeConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
}

async function telegram(token, method, params = {}) {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!json.ok) {
    throw new Error(json.description || `Telegram ${method} failed`);
  }
  return json.result;
}

function splitTelegramText(text) {
  const chunks = [];
  const clean = String(text || "").trim() || "(no text response)";
  for (let i = 0; i < clean.length; i += 3900) {
    chunks.push(clean.slice(i, i + 3900));
  }
  return chunks;
}

function sessionFor(chatId, sessions, auth) {
  if (sessions.has(chatId)) return sessions.get(chatId);
  const safeChat = String(chatId).replace(/[^a-zA-Z0-9_-]/g, "_");
  const session = new PiRpcSession({
    sessionDir: homePath("agent", "sessions", "telegram", safeChat),
    provider: auth.provider,
    model: auth.model,
  });
  sessions.set(chatId, session);
  return session;
}

function readAuth() {
  try {
    return JSON.parse(fs.readFileSync(homePath("agent", "auth.json"), "utf8"));
  } catch {
    return {};
  }
}

async function handleMessage(config, sessions, auth, message) {
  const chatId = String(message.chat.id);
  if (!config.allowedChats.map(String).includes(chatId)) {
    return;
  }
  const text = String(message.text || "").trim();
  if (!text) return;

  if (text === "/stop") {
    await telegram(config.token, "sendMessage", { chat_id: chatId, text: "RESONANT Agent Telegram bridge is still running on the computer. Stop the local process to disconnect." });
    return;
  }

  await telegram(config.token, "sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => {});
  const session = sessionFor(chatId, sessions, auth);

  try {
    const response = await session.prompt(text);
    for (const chunk of splitTelegramText(response)) {
      await telegram(config.token, "sendMessage", { chat_id: chatId, text: chunk });
    }
  } catch (error) {
    await telegram(config.token, "sendMessage", {
      chat_id: chatId,
      text: `RESONANT error: ${error.message}`,
    });
  }
}

async function main() {
  const config = readConfig();
  const sessions = new Map();
  const auth = readAuth();

  console.log("RESONANT Agent Telegram bridge running.");
  console.log("Mode: long polling");
  console.log(`Allowed chats: ${config.allowedChats.join(", ")}`);
  console.log("Press Ctrl+C to stop.");

  let running = true;
  process.on("SIGINT", () => {
    running = false;
    for (const session of sessions.values()) session.stop();
    process.exit(0);
  });

  while (running) {
    try {
      const updates = await telegram(config.token, "getUpdates", {
        timeout: 25,
        offset: config.offset || 0,
        allowed_updates: ["message"],
      });

      for (const update of updates) {
        config.offset = Math.max(config.offset || 0, update.update_id + 1);
        writeConfig(config);
        if (update.message) {
          await handleMessage(config, sessions, auth, update.message);
        }
      }
    } catch (error) {
      console.error(`Telegram bridge warning: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

main().catch((error) => {
  console.error(`Telegram bridge failed: ${error.message}`);
  process.exit(1);
});
