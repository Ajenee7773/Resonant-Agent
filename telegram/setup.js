const crypto = require("node:crypto");
const path = require("node:path");
const readline = require("node:readline/promises");
const { stdin: input, stdout: output } = require("node:process");
const { readJson, writeJson } = require("../core/json-store");
const { initializeRuntime } = require("../core/runtime");

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

function writeConfig(runtime, configPath, config) {
  const credentials = readJson(runtime.paths.credentialsFile, {
    schema_version: 1,
  });
  credentials.telegram_bot_token = config.token;
  writeJson(runtime.paths.credentialsFile, credentials, { mode: 0o600 });

  const settings = readJson(runtime.paths.settingsFile);
  settings.interfaces ||= {};
  settings.interfaces.telegram = {
    ...(settings.interfaces.telegram || {}),
    enabled: true,
    allowed_chat_ids: config.allowedChats,
  };
  writeJson(runtime.paths.settingsFile, settings);

  writeJson(configPath, {
    enabled: true,
    bot: config.bot,
    offset: config.offset,
    mode: "long-polling",
    created_at: config.createdAt,
  });
}

function pairingMessageMatches(text, pairingCode) {
  const message = String(text || "").trim().toLowerCase();
  const code = String(pairingCode || "").trim().toLowerCase();
  if (!code) return false;
  return message === `/start ${code}` || message === `pair ${code}`;
}

async function questionSecret(rl, prompt) {
  output.write(prompt);
  const writeToOutput = rl._writeToOutput;
  rl._writeToOutput = () => {};
  try {
    return (await rl.question("")).trim();
  } finally {
    rl._writeToOutput = writeToOutput;
    output.write("\n");
  }
}

async function waitForFirstChat(token, pairingCode) {
  let offset = 0;
  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    const updates = await telegram(token, "getUpdates", {
      timeout: 20,
      offset,
      allowed_updates: ["message"],
    });
    for (const update of updates) {
      offset = Math.max(offset, update.update_id + 1);
      const message = update.message;
      if (
        message?.chat?.id &&
        pairingMessageMatches(message.text, pairingCode)
      ) {
        return {
          chatId: String(message.chat.id),
          title:
            message.chat.title ||
            [message.chat.first_name, message.chat.last_name].filter(Boolean).join(" ") ||
            message.chat.username ||
            String(message.chat.id),
          offset,
        };
      }
    }
  }
  throw new Error("Timed out waiting for the one-time Telegram pairing code.");
}

async function main() {
  const runtime = initializeRuntime();
  const configPath = path.join(runtime.paths.data, "telegram", "config.json");
  const rl = readline.createInterface({ input, output });
  try {
    console.log("RESONANT Agent Telegram setup");
    console.log("1. Open Telegram.");
    console.log("2. Message @BotFather.");
    console.log("3. Run /newbot and copy the bot token.");
    console.log("");

    const token = await questionSecret(rl, "Telegram bot token (hidden): ");
    if (!token) throw new Error("No token provided.");

    const bot = await telegram(token, "getMe");
    console.log(`Connected to bot: @${bot.username || bot.first_name}`);
    console.log("");
    const pairingCode = crypto.randomBytes(6).toString("hex");
    console.log("Pair this computer with your private Telegram chat:");
    if (bot.username) {
      console.log(`  Open https://t.me/${bot.username}?start=${pairingCode}`);
    }
    console.log(`  Or send: /start ${pairingCode}`);
    console.log("Waiting up to five minutes for that one-time code...");

    const firstChat = await waitForFirstChat(token, pairingCode);
    const answer = (await rl.question(`Allow chat "${firstChat.title}" (${firstChat.chatId})? [Y/n]: `)).trim();
    if (answer && answer.toLowerCase() === "n") {
      console.log("Telegram setup cancelled.");
      return;
    }

    const config = {
      enabled: true,
      token,
      bot: {
        id: bot.id,
        username: bot.username || "",
        firstName: bot.first_name || "",
      },
      allowedChats: [firstChat.chatId],
      offset: firstChat.offset,
      mode: "long-polling",
      createdAt: new Date().toISOString(),
    };

    writeConfig(runtime, configPath, config);
    await telegram(token, "sendMessage", {
      chat_id: firstChat.chatId,
      text: "RESONANT Agent is connected. Start the local bridge to talk to your entity here.",
    });

    console.log("");
    console.log(`Telegram configured: ${configPath}`);
    console.log("Start it with:");
    console.log(process.platform === "win32" ? "  telegram-start.bat" : "  ./telegram-start.sh");
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Telegram setup failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  pairingMessageMatches,
};
