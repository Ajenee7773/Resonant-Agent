const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline/promises");
const { stdin: input, stdout: output } = require("node:process");

const resonantHome = process.env.RESONANT_HOME || path.join(os.homedir(), ".resonant");
const configPath = path.join(resonantHome, "agent", "telegram.json");

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

function writeConfig(config) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
}

async function waitForFirstChat(token) {
  let offset = 0;
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    const updates = await telegram(token, "getUpdates", {
      timeout: 20,
      offset,
      allowed_updates: ["message"],
    });
    for (const update of updates) {
      offset = Math.max(offset, update.update_id + 1);
      const message = update.message;
      if (message?.chat?.id && message.text) {
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
  throw new Error("Timed out waiting for a Telegram /start message.");
}

async function main() {
  const rl = readline.createInterface({ input, output });
  try {
    console.log("RESONANT Agent Telegram setup");
    console.log("1. Open Telegram.");
    console.log("2. Message @BotFather.");
    console.log("3. Run /newbot and copy the bot token.");
    console.log("");

    const token = (await rl.question("Telegram bot token: ")).trim();
    if (!token) throw new Error("No token provided.");

    const bot = await telegram(token, "getMe");
    console.log(`Connected to bot: @${bot.username || bot.first_name}`);
    console.log("");
    console.log("Now send /start to your bot in Telegram.");
    console.log("Waiting for the first message...");

    const firstChat = await waitForFirstChat(token);
    const answer = (await rl.question(`Use chat "${firstChat.title}" (${firstChat.chatId}) for RESONANT? [Y/n]: `)).trim();
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

    writeConfig(config);
    await telegram(token, "sendMessage", {
      chat_id: firstChat.chatId,
      text: "RESONANT Agent Telegram bridge is connected. Start the bridge on your computer to talk to your agent here.",
    });

    console.log("");
    console.log(`Telegram configured: ${configPath}`);
    console.log("Start it with:");
    console.log(process.platform === "win32" ? "  telegram-start.bat" : "  ./telegram-start.sh");
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(`Telegram setup failed: ${error.message}`);
  process.exit(1);
});
