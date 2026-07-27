const path = require("node:path");

const { readJson, writeJson } = require("./json-store");

const PROVIDER_ENV_KEYS = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GEMINI_API_KEY",
  gemini: "GEMINI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  groq: "GROQ_API_KEY",
  xai: "XAI_API_KEY",
  mistral: "MISTRAL_API_KEY",
};

function providerEnvironmentKey(provider) {
  const normalized = String(provider || "").trim().toLowerCase();
  if (!normalized) return "";
  return (
    PROVIDER_ENV_KEYS[normalized] ||
    `${normalized.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_API_KEY`
  );
}

function upsertModel(entries, id, values) {
  const current = Array.isArray(entries) ? entries : [];
  const index = current.findIndex((entry) => entry?.id === id);
  if (index < 0) return [...current, { id, ...values }];
  return current.map((entry, entryIndex) =>
    entryIndex === index ? { ...entry, ...values } : entry,
  );
}

function modelDefinition(runtime) {
  const declaredInput = Array.isArray(runtime.input)
    ? runtime.input
        .map((value) => String(value || "").trim().toLowerCase())
        .filter((value) => value === "text" || value === "image")
    : [];
  const input = [...new Set(["text", ...declaredInput])];
  return {
    name: String(runtime.model_name || runtime.model || "").trim(),
    reasoning: Boolean(runtime.reasoning),
    input,
    cost: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
    },
    ...(runtime.context_window
      ? { contextWindow: Number(runtime.context_window) }
      : {}),
    ...(runtime.max_output_tokens
      ? { maxTokens: Number(runtime.max_output_tokens) }
      : {}),
  };
}

function isLoopbackBaseUrl(value) {
  try {
    const hostname = new URL(String(value || "")).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function syncProviderConfig(paths) {
  const settings = readJson(paths.settingsFile);
  const credentials = readJson(paths.credentialsFile, {});
  const runtime = settings.runtime || {};
  const provider = String(runtime.provider || "").trim().toLowerCase();
  const model = String(runtime.model || "").trim();
  const apiKey = String(credentials.provider_api_key || "").trim();
  const envVar = providerEnvironmentKey(provider);

  const auth = {
    provider,
    model,
    ...(envVar ? { envVar } : {}),
    ...(runtime.context_window ? { contextWindow: Number(runtime.context_window) } : {}),
    ...(runtime.max_output_tokens ? { maxTokens: Number(runtime.max_output_tokens) } : {}),
  };
  writeJson(path.join(paths.agent, "auth.json"), auth, { mode: 0o600 });

  const piSettingsFile = path.join(paths.agent, "settings.json");
  const piSettings = readJson(piSettingsFile, {});
  piSettings.defaultProvider = provider;
  piSettings.defaultModel = model;
  piSettings.sessionDir = piSettings.sessionDir || "sessions";
  piSettings.quietStartup = piSettings.quietStartup ?? false;
  writeJson(piSettingsFile, piSettings);

  const modelsFile = path.join(paths.agent, "models.json");
  const models = readJson(modelsFile, { providers: {} });
  models.providers ||= {};
  if (provider === "ollama" && model) {
    const existing = models.providers.ollama || {};
    models.providers.ollama = {
      ...existing,
      baseUrl: runtime.base_url || existing.baseUrl || "http://localhost:11434/v1",
      api: existing.api || "openai-completions",
      apiKey: existing.apiKey || "ollama",
      compat: {
        supportsDeveloperRole: false,
        supportsReasoningEffort: false,
        ...(existing.compat || {}),
      },
      models: upsertModel(existing.models, model, modelDefinition(runtime)),
    };
  } else if (provider && model && runtime.base_url) {
    const existing = models.providers[provider] || {};
    models.providers[provider] = {
      ...existing,
      baseUrl: runtime.base_url,
      api: runtime.api || existing.api || "openai-completions",
      apiKey:
        provider === "custom" && isLoopbackBaseUrl(runtime.base_url) && !apiKey
          ? "local"
          : envVar,
      compat: {
        supportsDeveloperRole: false,
        supportsReasoningEffort: false,
        ...(existing.compat || {}),
      },
      models: upsertModel(
        existing.models,
        model,
        modelDefinition(runtime),
      ),
    };
  }
  writeJson(modelsFile, models);

  return {
    provider,
    model,
    configured: Boolean(
      provider &&
        model &&
        (provider === "ollama" ||
          (provider === "custom" &&
            runtime.base_url &&
            (isLoopbackBaseUrl(runtime.base_url) || apiKey)) ||
          apiKey),
    ),
    local:
      provider === "ollama" ||
      (provider === "custom" && isLoopbackBaseUrl(runtime.base_url)),
    hasCredential: Boolean(apiKey),
    envVar,
  };
}

module.exports = {
  providerEnvironmentKey,
  syncProviderConfig,
};
