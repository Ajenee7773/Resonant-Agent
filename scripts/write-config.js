const fs = require("node:fs");
const path = require("node:path");

const agentsFile = process.env.AGENTS_FILE;
const authFile = process.env.AUTH_FILE;
const modelsFile = process.env.MODELS_FILE;
const settingsFile = process.env.SETTINGS_FILE;

const provider = process.env.RESONANT_PROVIDER || "";
const model = process.env.RESONANT_MODEL || "";
const apiKey = process.env.RESONANT_API_KEY || "";

function readJson(file, fallback) {
  try {
    if (!file || !fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value, mode) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { encoding: "utf8", mode });
}

function replaceAll(text, needle, value) {
  return text.split(needle).join(value || "");
}

function envVarForProvider(name) {
  const normalized = String(name || "").toLowerCase();
  const map = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    google: "GOOGLE_API_KEY",
    gemini: "GOOGLE_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    groq: "GROQ_API_KEY",
    xai: "XAI_API_KEY",
    mistral: "MISTRAL_API_KEY",
  };
  return map[normalized] || `${normalized.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_API_KEY`;
}

if (!agentsFile || !authFile || !modelsFile || !settingsFile) {
  console.error("Missing AGENTS_FILE, AUTH_FILE, MODELS_FILE, or SETTINGS_FILE.");
  process.exit(1);
}

let agents = fs.readFileSync(agentsFile, "utf8");
agents = replaceAll(agents, "{{OPERATOR_NAME}}", process.env.RESONANT_OPERATOR_NAME);
agents = replaceAll(agents, "{{AGENT_NAME}}", process.env.RESONANT_AGENT_NAME);
agents = replaceAll(agents, "{{MISSION}}", process.env.RESONANT_MISSION);
fs.writeFileSync(agentsFile, agents, "utf8");

const auth = {
  provider,
  model,
};
if (apiKey) {
  auth.apiKey = apiKey;
  auth.envVar = envVarForProvider(provider);
}
writeJson(authFile, auth, 0o600);

const settings = readJson(settingsFile, {});
settings.defaultProvider = provider;
settings.defaultModel = model;
settings.sessionDir = settings.sessionDir || "sessions";
settings.quietStartup = settings.quietStartup ?? false;
writeJson(settingsFile, settings);

const models = readJson(modelsFile, {});
models.providers = models.providers || {};

if (provider === "ollama") {
  const existing = models.providers.ollama || {};
  const existingModels = Array.isArray(existing.models) ? existing.models : [];
  const hasModel = existingModels.some((entry) => entry && entry.id === model);
  models.providers.ollama = {
    ...existing,
    baseUrl: existing.baseUrl || "http://localhost:11434/v1",
    api: existing.api || "openai-completions",
    apiKey: existing.apiKey || "ollama",
    compat: {
      supportsDeveloperRole: false,
      supportsReasoningEffort: false,
      ...(existing.compat || {}),
    },
    models: hasModel ? existingModels : [...existingModels, { id: model }],
  };
}

writeJson(modelsFile, models);

