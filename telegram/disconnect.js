const readline = require("node:readline/promises");
const { stdin: input, stdout: output } = require("node:process");

const { initializeRuntime } = require("../core/runtime");
const { disconnectTelegram } = require("./state");

async function main() {
  const runtime = initializeRuntime();
  const rl = readline.createInterface({ input, output });
  try {
    console.log("RESONANT Agent Telegram disconnect");
    console.log("This disables Telegram, clears the allowlist, and deletes the stored bot token.");
    const confirmation = (await rl.question('Type DISCONNECT TELEGRAM to continue: ')).trim();
    if (confirmation !== "DISCONNECT TELEGRAM") {
      console.log("Telegram disconnect cancelled. Nothing changed.");
      return;
    }
    const result = disconnectTelegram(runtime.paths);
    console.log("Telegram disconnected.");
    console.log(`Token removed: ${result.token_removed ? "yes" : "no token was stored"}`);
    console.log("Any running bridge will stop after its current long-poll request returns.");
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(`Telegram disconnect failed: ${error.message}`);
  process.exit(1);
});
