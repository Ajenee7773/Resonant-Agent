const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { readJson, writeJson } = require("../core/json-store");
const { initializeRuntime } = require("../core/runtime");
const { pairingMessageMatches } = require("../telegram/setup");
const { configPath, disconnectTelegram, telegramEnabled } = require("../telegram/state");

test("Telegram disconnect disables the bridge, clears the allowlist, and removes the token", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aligned-telegram-disconnect-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const runtime = initializeRuntime({
    runtimeHome: root,
    env: { RESONANT_HOME: root },
    userHome: root,
  });
  const settings = readJson(runtime.paths.settingsFile);
  settings.interfaces.telegram = {
    enabled: true,
    allowed_chat_ids: ["123456"],
  };
  writeJson(runtime.paths.settingsFile, settings);
  writeJson(runtime.paths.credentialsFile, {
    schema_version: 1,
    telegram_bot_token: "throwaway-test-token",
  });
  writeJson(configPath(runtime.paths), {
    enabled: true,
    offset: 2,
    mode: "long-polling",
  });

  assert.equal(telegramEnabled(runtime.paths), true);
  const result = disconnectTelegram(runtime.paths);
  assert.equal(result.disabled, true);
  assert.equal(result.token_removed, true);
  assert.equal(result.allowlist_cleared, true);
  assert.equal(result.state_removed, true);
  assert.equal(telegramEnabled(runtime.paths), false);
  assert.equal(
    Object.hasOwn(readJson(runtime.paths.credentialsFile), "telegram_bot_token"),
    false,
  );
  assert.deepEqual(
    readJson(runtime.paths.settingsFile).interfaces.telegram.allowed_chat_ids,
    [],
  );
  assert.equal(fs.existsSync(configPath(runtime.paths)), false);
});

test("Telegram setup accepts only the matching one-time pairing code", () => {
  const code = "a1b2c3d4e5f6";
  assert.equal(pairingMessageMatches(`/start ${code}`, code), true);
  assert.equal(pairingMessageMatches(`PAIR ${code}`, code), true);
  assert.equal(pairingMessageMatches("/start", code), false);
  assert.equal(pairingMessageMatches("/start wrong-code", code), false);
  assert.equal(pairingMessageMatches("", code), false);
});
