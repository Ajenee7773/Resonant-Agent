const assert = require("node:assert/strict");
const test = require("node:test");

const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");

const {
  providerEnvironmentKey,
  syncProviderConfig,
} = require("../core/provider-config");

test("Gemini providers use the environment variable expected by Pi", () => {
  assert.equal(providerEnvironmentKey("google"), "GEMINI_API_KEY");
  assert.equal(providerEnvironmentKey("gemini"), "GEMINI_API_KEY");
});

test("custom multimodal providers are registered for text and image input", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aligned-provider-"));
  const paths = {
    settingsFile: path.join(root, "settings.json"),
    credentialsFile: path.join(root, "credentials.json"),
    agent: path.join(root, "agent"),
  };
  fs.mkdirSync(paths.agent, { recursive: true });
  fs.writeFileSync(
    paths.settingsFile,
    JSON.stringify({
      runtime: {
        provider: "custom",
        model: "kiwi-qwen3.6-27b",
        base_url: "http://127.0.0.1:55401/v1",
        reasoning: true,
        input: ["text", "image"],
        context_window: 131072,
      },
    }),
  );
  fs.writeFileSync(paths.credentialsFile, JSON.stringify({ provider_api_key: "" }));

  syncProviderConfig(paths);
  const models = JSON.parse(
    fs.readFileSync(path.join(paths.agent, "models.json"), "utf8"),
  );
  assert.deepEqual(
    models.providers.custom.models[0].input,
    ["text", "image"],
  );
});
