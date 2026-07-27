const fs = require("node:fs");
const path = require("node:path");

const { readJson, writeJson } = require("../core/json-store");

function configPath(paths) {
  return path.join(paths.data, "telegram", "config.json");
}

function telegramEnabled(paths) {
  const settings = readJson(paths.settingsFile, {});
  return Boolean(settings.interfaces?.telegram?.enabled);
}

function disconnectTelegram(paths) {
  const credentials = readJson(paths.credentialsFile, { schema_version: 1 });
  const tokenWasPresent = Boolean(credentials.telegram_bot_token);
  delete credentials.telegram_bot_token;
  writeJson(paths.credentialsFile, credentials, { mode: 0o600 });

  const settings = readJson(paths.settingsFile, {});
  settings.interfaces ||= {};
  settings.interfaces.telegram = {
    ...(settings.interfaces.telegram || {}),
    enabled: false,
    allowed_chat_ids: [],
  };
  writeJson(paths.settingsFile, settings);

  const stateFile = configPath(paths);
  if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);

  return {
    disabled: true,
    token_removed: tokenWasPresent,
    allowlist_cleared: true,
    state_removed: !fs.existsSync(stateFile),
  };
}

module.exports = {
  configPath,
  disconnectTelegram,
  telegramEnabled,
};
