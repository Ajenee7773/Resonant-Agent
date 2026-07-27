"use strict";

const { PiRpcSession } = require("../bridge/pi-rpc");

async function main() {
  const message = process.argv.slice(2).join(" ").trim();
  if (!message) {
    console.error("A prompt is required.");
    process.exit(2);
  }

  const session = new PiRpcSession();
  try {
    const response = await session.prompt(message);
    process.stdout.write(String(response || "").trim());
  } finally {
    session.stop();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
