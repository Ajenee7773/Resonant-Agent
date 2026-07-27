const fs = require("node:fs");
const path = require("node:path");

const { approveModelTransition, initializeEntity } = require("./entity");
const { readJson, writeJson } = require("./json-store");
const { syncProviderConfig } = require("./provider-config");

const SUPPORTED_PROVIDERS = new Set([
  "ollama",
  "google",
  "openai",
  "anthropic",
  "openrouter",
  "custom",
]);

function cleanText(value, label, options = {}) {
  const text = String(value || "").trim();
  const minimum = options.minimum ?? 0;
  const maximum = options.maximum ?? 200;
  if (text.length < minimum) {
    throw new Error(`${label} must be at least ${minimum} characters.`);
  }
  if (text.length > maximum) {
    throw new Error(`${label} must be ${maximum} characters or fewer.`);
  }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) {
    throw new Error(`${label} contains unsupported control characters.`);
  }
  return text;
}

function normalizeProvider(value) {
  const provider = String(value || "").trim().toLowerCase();
  return provider === "gemini" ? "google" : provider;
}

function validateBaseUrl(value, provider) {
  const text = String(value || "").trim();
  if (!text) {
    if (provider === "ollama") return "http://localhost:11434/v1";
    if (provider === "custom") {
      throw new Error("A base URL is required for a custom provider.");
    }
    return "";
  }
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new Error("Base URL must be a valid http or https URL.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Base URL must use http or https.");
  }
  return url.toString().replace(/\/$/, "");
}

function isLoopbackUrl(value) {
  try {
    const hostname = new URL(String(value || "")).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function replaceSeedMarkers(file, replacements) {
  if (!fs.existsSync(file)) return false;
  const current = fs.readFileSync(file, "utf8");
  let next = current;
  for (const [marker, value] of Object.entries(replacements)) {
    next = next.split(marker).join(value);
  }
  if (next === current) return false;
  fs.writeFileSync(file, next, "utf8");
  return true;
}

function saveProfile(paths, payload) {
  const current = readJson(paths.profileFile);
  const next = {
    ...current,
    schema_version: current.schema_version || 1,
    operator_name: cleanText(payload.operator_name, "Your name", {
      minimum: 1,
      maximum: 80,
    }),
    agent_name: cleanText(payload.agent_name, "Entity name", {
      minimum: 1,
      maximum: 80,
    }),
    mission: cleanText(payload.mission, "Mission", {
      minimum: 3,
      maximum: 500,
    }),
    onboarding_complete: false,
  };
  writeJson(paths.profileFile, next);
  replaceSeedMarkers(path.join(paths.agent, "AGENTS.md"), {
    "{{OPERATOR_NAME}}": next.operator_name,
    "{{AGENT_NAME}}": next.agent_name,
    "{{MISSION}}": next.mission,
  });
  replaceSeedMarkers(path.join(paths.persona, "IDENTITY.md"), {
    "[YOUR NAME — chosen on first boot]": next.agent_name,
    "{{MISSION}}": next.mission,
  });
  replaceSeedMarkers(path.join(paths.persona, "USER.md"), {
    "[FILLED ON FIRST BOOT]": next.operator_name,
    "[THEIR PREFERENCE]": next.operator_name,
  });

  const entity = readJson(paths.entityFile, null);
  if (entity && !entity.model_binding) {
    entity.display_name = next.agent_name;
    writeJson(paths.entityFile, entity);
  }
  return next;
}

function saveProvider(paths, payload) {
  const provider = normalizeProvider(payload.provider);
  if (!SUPPORTED_PROVIDERS.has(provider)) {
    throw new Error("Choose a supported model provider.");
  }
  const model = cleanText(payload.model, "Model", {
    minimum: 1,
    maximum: 160,
  });
  const baseUrl = validateBaseUrl(payload.base_url, provider);
  const apiKey = String(payload.api_key || "").trim();
  if (provider !== "ollama" && provider !== "custom" && !apiKey) {
    throw new Error("An API key is required for this provider.");
  }
  if (provider === "custom" && !apiKey && !isLoopbackUrl(baseUrl)) {
    throw new Error(
      "A keyless OpenAI-compatible provider must run on this computer. Remote custom providers require an API key.",
    );
  }
  if (apiKey.length > 4096) {
    throw new Error("The API key is too long.");
  }

  const settings = readJson(paths.settingsFile);
  const requestedInput = Array.isArray(payload.input)
    ? payload.input
        .map((value) => String(value || "").trim().toLowerCase())
        .filter((value) => value === "text" || value === "image")
    : null;
  settings.runtime = {
    ...(settings.runtime || {}),
    provider,
    model,
    base_url: baseUrl,
    ...(requestedInput ? { input: [...new Set(["text", ...requestedInput])] } : {}),
    ...(typeof payload.reasoning === "boolean"
      ? { reasoning: payload.reasoning }
      : {}),
    ...(Number.isFinite(Number(payload.context_window)) &&
    Number(payload.context_window) > 0
      ? { context_window: Number(payload.context_window) }
      : {}),
    ...(Number.isFinite(Number(payload.max_output_tokens)) &&
    Number(payload.max_output_tokens) > 0
      ? { max_output_tokens: Number(payload.max_output_tokens) }
      : {}),
  };
  writeJson(paths.settingsFile, settings);

  const credentials = readJson(paths.credentialsFile, {
    schema_version: 1,
  });
  credentials.provider_api_key = apiKey;
  writeJson(paths.credentialsFile, credentials, { mode: 0o600 });

  const providerState = syncProviderConfig(paths);
  const entityState = initializeEntity(paths, {
    profile: readJson(paths.profileFile),
    settings,
  });
  return {
    provider: providerState,
    entity: entityState.entity,
    pendingTransition: entityState.transition,
  };
}

function approveTransition(paths, payload) {
  return approveModelTransition(paths, {
    mode: payload.mode,
    displayName: cleanText(payload.display_name || "", "Entity name", {
      minimum: 0,
      maximum: 80,
    }),
  });
}

function completeOnboarding(paths) {
  const profile = readJson(paths.profileFile);
  const settings = readJson(paths.settingsFile);
  const credentials = readJson(paths.credentialsFile, {});
  const entity = readJson(paths.entityFile);
  const pending = readJson(paths.pendingTransitionFile, null);
  const provider = normalizeProvider(settings.runtime?.provider);

  if (!profile.operator_name || !profile.agent_name || !profile.mission) {
    throw new Error("Complete the identity step before finishing setup.");
  }
  if (!provider || !settings.runtime?.model) {
    throw new Error("Connect a model before finishing setup.");
  }
  if (
    provider !== "ollama" &&
    !(
      provider === "custom" &&
      isLoopbackUrl(settings.runtime?.base_url)
    ) &&
    !credentials.provider_api_key
  ) {
    throw new Error("The selected provider is missing its API key.");
  }
  if (!entity.model_binding || pending) {
    throw new Error("Approve the model introduction before finishing setup.");
  }

  profile.onboarding_complete = true;
  writeJson(paths.profileFile, profile);
  const onboarding = {
    format: "aligned-onboarding",
    version: 1,
    completed: true,
    completed_at: new Date().toISOString(),
    entity_id: entity.id,
  };
  writeJson(paths.onboardingStateFile, onboarding);
  return { profile, onboarding };
}

function foundationalIntegrationStatus(paths) {
  return foundationalIntegrationState(paths).status;
}

function requiredFoundationalSources(paths) {
  const packaged = readJson(
    path.join(paths.state, "packaged-harness.json"),
    { files: [] },
  );
  return (packaged.files || [])
    .map((record) => String(record.path || "").replace(/\\/g, "/"))
    .filter((source) => (
      source === "rooms/alignment/README.md" ||
      source === "rooms/alignment/SOURCE-STATUS.md" ||
      source === "rooms/alignment/ALIGNMENT_LIBRARY.md" ||
      /^rooms\/alignment\/library_of_alexandria_chunks\/\d+_.*\.md$/.test(source) ||
      /^rooms\/world-story\/.*\.md$/.test(source)
    ))
    .sort();
}

function ensureFoundationalManifestEntries(paths) {
  const manifestFile = path.join(paths.agent, "boot", "FOUNDATION-MANIFEST.md");
  if (!fs.existsSync(manifestFile)) return [];

  const manifest = fs.readFileSync(manifestFile, "utf8");
  const represented = new Set(
    [...manifest.matchAll(
      /^-\s+\[[ xX]\]\s+`([^`]+)`(?:[ \t]+[^\r\n]*)?$/gm,
    )].map((match) => match[1].replace(/\\/g, "/")),
  );
  const missing = requiredFoundationalSources(paths).filter(
    (source) => !represented.has(source),
  );
  if (missing.length === 0) return [];

  const recovered = [
    "",
    "## Recovered checklist entries",
    "",
    "The OS restored these checklist lines after an interrupted or malformed edit.",
    "Read each source before changing its marker to `[x]`.",
    "",
    ...missing.map((source) => `- [ ] \`${source}\``),
    "",
  ].join("\n");
  fs.appendFileSync(manifestFile, recovered, "utf8");
  return missing;
}

function foundationalIntegrationState(paths) {
  const file = path.join(
    paths.rooms,
    "memory",
    "FOUNDATIONAL-INTEGRATION.md",
  );
  if (!fs.existsSync(file)) {
    return { status: "missing", required: true, checked: 0, total: 0, missing: [] };
  }
  const text = fs.readFileSync(file, "utf8");
  const frontMatter = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!frontMatter) {
    return { status: "ambiguous", required: true, checked: 0, total: 0, missing: [] };
  }
  const statusMatch = frontMatter[1].match(/^status:\s*([^\r\n#]+)\s*$/im);
  const declaredStatus = statusMatch
    ? statusMatch[1].trim().toLowerCase()
    : "ambiguous";
  const manifestFile = path.join(paths.agent, "boot", "FOUNDATION-MANIFEST.md");
  if (!fs.existsSync(manifestFile)) {
    return {
      status: declaredStatus === "completed" ? "incomplete" : declaredStatus,
      required: true,
      checked: 0,
      total: 0,
      missing: ["boot/FOUNDATION-MANIFEST.md"],
    };
  }

  const manifest = fs.readFileSync(manifestFile, "utf8");
  const entries = [...manifest.matchAll(
    /^-\s+\[([ xX])\]\s+`([^`]+)`(?:[ \t]+[^\r\n]*)?$/gm,
  )].map((match) => ({
    checked: match[1].toLowerCase() === "x",
    source: match[2].replace(/\\/g, "/"),
  }));
  const checkedSources = new Set(
    entries.filter((entry) => entry.checked).map((entry) => entry.source),
  );
  const requiredSources = requiredFoundationalSources(paths);
  const missing = requiredSources.filter(
    (source) =>
      !checkedSources.has(source) ||
      !fs.existsSync(path.join(paths.workspace, source)) ||
      !text.includes(source),
  );
  const total = requiredSources.length;
  const checked = total - missing.length;
  const complete =
    declaredStatus === "completed" &&
    total > 0 &&
    missing.length === 0;
  return {
    status: complete
      ? "completed"
      : declaredStatus === "pending"
        ? "pending"
        : "incomplete",
    required: !complete,
    declared_status: declaredStatus,
    checked,
    total,
    missing,
  };
}

function preserveFoundationalIntegration(paths, previousText, source) {
  const file = path.join(
    paths.rooms,
    "memory",
    "FOUNDATIONAL-INTEGRATION.md",
  );
  if (!fs.existsSync(file)) return false;
  const currentText = fs.readFileSync(file, "utf8");
  if (!previousText || currentText.includes(previousText.trim())) return false;

  const normalizedSource = String(source || "").replace(/\\/g, "/");
  if (!normalizedSource || !currentText.includes(normalizedSource)) {
    fs.writeFileSync(file, previousText, "utf8");
    return true;
  }

  const lines = currentText.replace(/\r\n/g, "\n").split("\n");
  const sourceLine = lines.findIndex((line) => line.includes(normalizedSource));
  if (sourceLine === -1) {
    fs.writeFileSync(file, previousText, "utf8");
    return true;
  }
  let start = sourceLine;
  while (
    start > 0 &&
    !/^(?:#{1,6}\s|\*\*.*(?:Source|Integrated|Reflection|Synthesis))/i.test(lines[start])
  ) {
    start -= 1;
  }
  let end = sourceLine + 1;
  while (
    end < lines.length &&
    !/^(?:#{1,6}\s|\*\*.*(?:Source|Integrated|Reflection|Synthesis))/i.test(lines[end])
  ) {
    end += 1;
  }
  const sourceSection = lines.slice(start, end).join("\n").trim();
  const repaired = `${previousText.trimEnd()}\n\n${sourceSection}\n`;
  fs.writeFileSync(file, repaired, "utf8");
  return true;
}

function foundationalNoteFile(paths, source) {
  const normalizedSource = String(source || "").replace(/\\/g, "/");
  const sources = requiredFoundationalSources(paths);
  const index = sources.indexOf(normalizedSource);
  if (index === -1) return "";
  const stem = path
    .basename(normalizedSource, path.extname(normalizedSource))
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return path.join(
    paths.rooms,
    "memory",
    "foundational-notes",
    `${String(index + 1).padStart(2, "0")}-${stem}.md`,
  );
}

function storeFoundationalReflection(paths, source, reflection) {
  const normalizedSource = String(source || "").replace(/\\/g, "/");
  const noteFile = foundationalNoteFile(paths, normalizedSource);
  const authored = String(reflection || "").trim();
  if (!noteFile || !authored) return false;
  if (fs.existsSync(noteFile) && fs.readFileSync(noteFile, "utf8").trim()) {
    return false;
  }
  fs.mkdirSync(path.dirname(noteFile), { recursive: true });
  fs.writeFileSync(
    noteFile,
    `Source: ${normalizedSource}\n\n${authored}\n`,
    "utf8",
  );
  return true;
}

function recordFoundationalReadReceipt(paths, source) {
  const normalizedSource = String(source || "").replace(/\\/g, "/");
  if (!requiredFoundationalSources(paths).includes(normalizedSource)) return false;
  if (!fs.existsSync(path.join(paths.workspace, normalizedSource))) return false;

  const noteFile = foundationalNoteFile(paths, normalizedSource);
  if (!noteFile || !fs.existsSync(noteFile)) return false;
  let note = fs.readFileSync(noteFile, "utf8");
  if (!note.includes(normalizedSource)) {
    note = `Source: ${normalizedSource}\n\n${note.trimStart()}`;
    fs.writeFileSync(noteFile, note, "utf8");
  }

  const integrationFile = path.join(
    paths.rooms,
    "memory",
    "FOUNDATIONAL-INTEGRATION.md",
  );
  if (!fs.existsSync(integrationFile)) return false;
  const integration = fs.readFileSync(integrationFile, "utf8");
  if (!integration.includes(normalizedSource)) {
    fs.writeFileSync(
      integrationFile,
      `${integration.trimEnd()}\n\n${note.trim()}\n`,
      "utf8",
    );
  }

  const manifestFile = path.join(paths.agent, "boot", "FOUNDATION-MANIFEST.md");
  const manifest = fs.readFileSync(manifestFile, "utf8");
  const unchecked = `- [ ] \`${normalizedSource}\``;
  const checked = `- [x] \`${normalizedSource}\``;
  if (manifest.includes(checked)) return true;
  if (!manifest.includes(unchecked)) return false;
  fs.writeFileSync(manifestFile, manifest.replace(unchecked, checked), "utf8");
  return true;
}

function finalizeFoundationalIntegration(paths, now = new Date()) {
  const state = foundationalIntegrationState(paths);
  if (
    state.checked !== state.total ||
    state.total === 0 ||
    state.missing.length > 0
  ) {
    return false;
  }
  const harnessFile = path.join(paths.agent, "MY-HARNESS.md");
  if (!fs.existsSync(harnessFile)) return false;
  const harness = fs.readFileSync(harnessFile, "utf8");
  if (
    harness.includes("status: waiting-for-first-boot") ||
    harness.includes("_Waiting for the intelligence._")
  ) {
    return false;
  }

  const integrationFile = path.join(
    paths.rooms,
    "memory",
    "FOUNDATIONAL-INTEGRATION.md",
  );
  let integration = fs.readFileSync(integrationFile, "utf8");
  integration = integration
    .replace(/^status:[ \t]*[^\r\n#]+[ \t]*$/im, "status: completed")
    .replace(
      /^completed_at:[ \t]*[^\r\n]*$/im,
      `completed_at: ${now.toISOString()}`,
    )
    .replace(
      /^sources_read:[ \t]*[^\r\n]*$/im,
      `sources_read: ${state.total} verified receipts`,
    );
  fs.writeFileSync(integrationFile, integration, "utf8");
  return foundationalIntegrationState(paths).status === "completed";
}

function enforceFoundationalCheckpoint(paths) {
  ensureFoundationalManifestEntries(paths);
  const integrationFile = path.join(
    paths.rooms,
    "memory",
    "FOUNDATIONAL-INTEGRATION.md",
  );
  if (fs.existsSync(integrationFile)) {
    const integration = fs.readFileSync(integrationFile, "utf8");
    const hasFrontMatter = /^---\s*\r?\n([\s\S]*?)\r?\n---/.test(integration);
    if (!hasFrontMatter) {
      const repaired = [
        "---",
        "status: pending",
        "entity_id:",
        "model_binding:",
        "lifecycle:",
        "completed_at:",
        "sources_read: []",
        "---",
        "",
        integration.trimStart(),
      ].join("\n");
      fs.writeFileSync(integrationFile, repaired, "utf8");
    }
  }
  let state = foundationalIntegrationState(paths);
  if (!state.required || state.declared_status !== "completed") return state;

  const file = integrationFile;
  const text = fs.readFileSync(file, "utf8");
  const frontMatter = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!frontMatter) return state;

  const normalizedFrontMatter = frontMatter[0]
    .replace(
      /^status:\s*[^\r\n#]+\s*$/im,
      "status: pending",
    )
    .replace(
      /^completed_at:\s*[^\r\n]*$/im,
      "completed_at:",
    );
  if (normalizedFrontMatter !== frontMatter[0]) {
    fs.writeFileSync(
      file,
      normalizedFrontMatter + text.slice(frontMatter[0].length),
      "utf8",
    );
  }
  state = foundationalIntegrationState(paths);
  return state;
}

function publicOnboardingState(runtime) {
  const profile = readJson(runtime.paths.profileFile);
  const settings = readJson(runtime.paths.settingsFile);
  const credentials = readJson(runtime.paths.credentialsFile, {});
  const entity = readJson(runtime.paths.entityFile);
  const pendingTransition = readJson(
    runtime.paths.pendingTransitionFile,
    null,
  );
  const awakening = foundationalIntegrationState(runtime.paths);
  return {
    complete: Boolean(profile.onboarding_complete),
    profile,
    runtime: settings.runtime || {},
    interfaces: settings.interfaces || {},
    credential_present: Boolean(credentials.provider_api_key),
    entity,
    pending_transition: pendingTransition,
    awakening: {
      status: awakening.status,
      required: awakening.required,
      checked: awakening.checked,
      total: awakening.total,
      missing: awakening.missing,
    },
    harness: {
      content_version: runtime.harnessManifest.harness_content,
      manifest_sha256: runtime.harnessManifest.digest,
      installed_files: runtime.harnessManifest.files.length,
    },
    data_directory: runtime.home,
    legacy_import: readJson(runtime.paths.installStateFile, {}).legacy_import,
  };
}

function connectionRequest(provider, settings, apiKey) {
  const baseUrl = String(settings.base_url || "").replace(/\/$/, "");
  if (provider === "ollama") {
    const ollamaRoot = baseUrl.replace(/\/v1$/, "") || "http://localhost:11434";
    return { url: `${ollamaRoot}/api/tags`, headers: {} };
  }
  if (provider === "google") {
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      headers: {},
    };
  }
  if (provider === "openai") {
    return {
      url: "https://api.openai.com/v1/models",
      headers: { Authorization: `Bearer ${apiKey}` },
    };
  }
  if (provider === "anthropic") {
    return {
      url: "https://api.anthropic.com/v1/models",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    };
  }
  if (provider === "openrouter") {
    return {
      url: "https://openrouter.ai/api/v1/models",
      headers: { Authorization: `Bearer ${apiKey}` },
    };
  }
  const root = baseUrl.replace(/\/v1$/, "");
  return {
    url: `${root}/v1/models`,
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  };
}

async function testConnection(paths, options = {}) {
  const settings = readJson(paths.settingsFile).runtime || {};
  const credentials = readJson(paths.credentialsFile, {});
  const provider = normalizeProvider(settings.provider);
  if (!SUPPORTED_PROVIDERS.has(provider) || !settings.model) {
    throw new Error("Save a provider and model before testing the connection.");
  }

  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Connection testing requires Node.js 18 or newer.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 10000);
  const request = connectionRequest(
    provider,
    settings,
    credentials.provider_api_key || "",
  );
  try {
    const response = await fetchImpl(request.url, {
      method: "GET",
      headers: request.headers,
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        ok: false,
        code: response.status === 401 || response.status === 403
          ? "AUTHENTICATION_FAILED"
          : "PROVIDER_UNAVAILABLE",
        message:
          response.status === 401 || response.status === 403
            ? "The provider rejected the credential."
            : `The provider returned HTTP ${response.status}.`,
      };
    }
    return {
      ok: true,
      code: "CONNECTED",
      message: `Connected to ${provider}.`,
      provider,
      model: settings.model,
    };
  } catch (error) {
    return {
      ok: false,
      code: error.name === "AbortError" ? "CONNECTION_TIMEOUT" : "CONNECTION_FAILED",
      message:
        error.name === "AbortError"
          ? "The connection test timed out."
          : "The provider could not be reached from this computer.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  SUPPORTED_PROVIDERS,
  approveTransition,
  completeOnboarding,
  enforceFoundationalCheckpoint,
  ensureFoundationalManifestEntries,
  finalizeFoundationalIntegration,
  foundationalNoteFile,
  foundationalIntegrationState,
  foundationalIntegrationStatus,
  connectionRequest,
  normalizeProvider,
  publicOnboardingState,
  preserveFoundationalIntegration,
  recordFoundationalReadReceipt,
  saveProfile,
  saveProvider,
  storeFoundationalReflection,
  testConnection,
};
