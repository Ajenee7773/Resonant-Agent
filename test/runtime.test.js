const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { readJson, writeJson } = require("../core/json-store");
const { initializeRuntime } = require("../core/runtime");

function temporaryHome(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "resonant-runtime-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function readTextTree(directory) {
  const contents = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      contents.push(readTextTree(target));
    } else if (entry.isFile()) {
      contents.push(fs.readFileSync(target, "utf8"));
    }
  }
  return contents.join("\n");
}

test("initializeRuntime creates one complete private runtime", (t) => {
  const home = temporaryHome(t);
  const result = initializeRuntime({
    runtimeHome: home,
    env: {},
    userHome: home,
  });

  assert.equal(result.home, path.resolve(home));
  assert.equal(result.onboardingComplete, false);
  assert.ok(fs.existsSync(result.paths.profileFile));
  assert.ok(fs.existsSync(result.paths.settingsFile));
  assert.ok(fs.existsSync(result.paths.credentialsFile));
  assert.ok(fs.existsSync(result.paths.soulFile));
  assert.ok(fs.existsSync(path.join(result.paths.agent, "AGENTS.md")));
  assert.ok(fs.existsSync(path.join(result.paths.agent, "MY-HARNESS.md")));
  assert.ok(
    fs.existsSync(path.join(result.paths.agent, "boot", "FOUNDATION-MANIFEST.md")),
  );
  assert.equal(
    fs.readFileSync(path.join(result.paths.agent, "AGENTS.md"), "utf8"),
    fs.readFileSync(path.join(__dirname, "..", "harness", "AGENTS.md"), "utf8"),
  );
  assert.ok(fs.existsSync(path.join(result.paths.agent, "auth.json")));
  assert.ok(fs.existsSync(path.join(result.paths.agent, "models.json")));
  assert.ok(fs.existsSync(result.paths.entityFile));
  assert.ok(fs.existsSync(result.paths.lineageFile));
  assert.ok(fs.existsSync(path.join(result.paths.rooms, "alignment", "README.md")));
  assert.ok(
    fs.existsSync(
      path.join(result.paths.rooms, "alignment", "ALIGNMENT_LIBRARY.md"),
    ),
  );
  assert.ok(
    fs.existsSync(
      path.join(result.paths.rooms, "alignment", "LIBRARY_OF_ALEXANDRIA.md"),
    ),
  );
  assert.equal(
    fs
      .readdirSync(
        path.join(
          result.paths.rooms,
          "alignment",
          "library_of_alexandria_chunks",
        ),
        { withFileTypes: true },
      )
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md")).length,
    16,
  );
  assert.deepEqual(
    fs
      .readdirSync(result.paths.rooms, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort(),
    [
      "alignment",
      "art",
      "commands",
      "internet",
      "journal",
      "memory",
      "planning",
      "prompt-engineering",
      "research",
      "short-term",
      "shorts",
      "tts",
      "world-story",
      "youtube-script-writing",
    ],
  );
  assert.ok(
    fs.existsSync(path.join(result.paths.rooms, "world-story", "README.md")),
  );
  const cognitiveContract = fs.readFileSync(
    path.join(result.paths.agent, "AGENTS.md"),
    "utf8",
  );
  assert.match(cognitiveContract, /Resonant Intelligence/);
  assert.match(cognitiveContract, /## Boot Protocol/);
  assert.match(cognitiveContract, /Rooms are context/);
  const installedSoul = JSON.parse(
    fs.readFileSync(result.paths.soulFile, "utf8"),
  );
  assert.ok(
    installedSoul.system_instructions.some((instruction) =>
      instruction.includes("Make the operator more capable"),
    ),
  );
  assert.ok(
    fs.existsSync(
      path.join(
        result.paths.rooms,
        "world-story",
        "agent-zero-reports",
        "001_consolidated-report.md",
      ),
    ),
  );
  assert.ok(
    fs.existsSync(
      path.join(result.paths.rooms, "memory", "FOUNDATIONAL-INTEGRATION.md"),
    ),
  );
  assert.match(
    fs.readFileSync(
      path.join(result.paths.rooms, "memory", "FOUNDATIONAL-INTEGRATION.md"),
      "utf8",
    ),
    /^---\r?\nstatus: pending\r?$/m,
  );
  assert.ok(
    fs.existsSync(
      path.join(result.paths.rooms, "short-term", "scratchpad.md"),
    ),
  );
});

test("initializeRuntime preserves buyer-owned profile, harness, and memory", (t) => {
  const home = temporaryHome(t);
  const first = initializeRuntime({ runtimeHome: home, env: {}, userHome: home });
  const profile = readJson(first.paths.profileFile);
  profile.agent_name = "Nova";
  profile.operator_name = "Rae";
  profile.mission = "Build the signal.";
  profile.onboarding_complete = true;
  writeJson(first.paths.profileFile, profile);

  const memoryFile = path.join(first.paths.rooms, "memory", "buyer-note.md");
  fs.writeFileSync(memoryFile, "keep me", "utf8");
  const agentsFile = path.join(first.paths.agent, "AGENTS.md");
  fs.writeFileSync(agentsFile, "entity-owned cognitive architecture", "utf8");

  const second = initializeRuntime({ runtimeHome: home, env: {}, userHome: home });
  assert.equal(readJson(second.paths.profileFile).agent_name, "Nova");
  assert.equal(fs.readFileSync(memoryFile, "utf8"), "keep me");
  assert.equal(fs.readFileSync(agentsFile, "utf8"), "entity-owned cognitive architecture");
});

test("credentials remain outside the Cognitive Harness", (t) => {
  const home = temporaryHome(t);
  const result = initializeRuntime({ runtimeHome: home, env: {}, userHome: home });
  const credentials = readJson(result.paths.credentialsFile);
  credentials.provider_api_key = "secret-provider-value";
  credentials.telegram_bot_token = "secret-telegram-value";
  writeJson(result.paths.credentialsFile, credentials);

  initializeRuntime({ runtimeHome: home, env: {}, userHome: home });
  const activeAgentFiles = readTextTree(result.paths.agent);
  assert.doesNotMatch(
    activeAgentFiles,
    /secret-provider-value|secret-telegram-value/,
  );
});

test("provider settings compile into Pi configuration", (t) => {
  const home = temporaryHome(t);
  const first = initializeRuntime({ runtimeHome: home, env: {}, userHome: home });
  const settings = readJson(first.paths.settingsFile);
  settings.runtime.provider = "ollama";
  settings.runtime.model = "gemma3:4b";
  settings.runtime.base_url = "http://localhost:11434/v1";
  writeJson(first.paths.settingsFile, settings);

  const second = initializeRuntime({ runtimeHome: home, env: {}, userHome: home });
  const auth = readJson(path.join(second.paths.agent, "auth.json"));
  const models = readJson(path.join(second.paths.agent, "models.json"));

  assert.equal(second.provider.configured, true);
  assert.equal(auth.provider, "ollama");
  assert.equal(auth.model, "gemma3:4b");
  assert.equal(models.providers.ollama.models[0].id, "gemma3:4b");
  assert.equal(second.pendingTransition.reason, "initial-model-introduction");
});

test("OpenAI-compatible local models compile into a complete Pi provider", (t) => {
  const home = temporaryHome(t);
  const first = initializeRuntime({ runtimeHome: home, env: {}, userHome: home });
  const settings = readJson(first.paths.settingsFile);
  settings.runtime.provider = "custom";
  settings.runtime.model = "gemma-4-12b.gguf";
  settings.runtime.model_name = "Gemma Local";
  settings.runtime.base_url = "http://127.0.0.1:55401/v1";
  settings.runtime.context_window = 262144;
  settings.runtime.reasoning = true;
  writeJson(first.paths.settingsFile, settings);

  const second = initializeRuntime({ runtimeHome: home, env: {}, userHome: home });
  const models = readJson(path.join(second.paths.agent, "models.json"));
  const provider = models.providers.custom;

  assert.equal(second.provider.configured, true);
  assert.equal(provider.baseUrl, "http://127.0.0.1:55401/v1");
  assert.equal(provider.api, "openai-completions");
  assert.equal(provider.apiKey, "local");
  assert.equal(provider.models[0].id, "gemma-4-12b.gguf");
  assert.equal(provider.models[0].contextWindow, 262144);
  assert.equal(provider.models[0].reasoning, true);
});
