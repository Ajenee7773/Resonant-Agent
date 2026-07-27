const fs = require("node:fs");
const path = require("node:path");

const { copyJsonDefault, readJson, writeJson } = require("./json-store");
const { initializeEntity } = require("./entity");
const { copyFileIfMissing, installHarness } = require("./harness-manager");
const { APP_ROOT, legacyHome, runtimeHome, runtimePaths } = require("./paths");
const { syncProviderConfig } = require("./provider-config");

const DIRECTORY_KEYS = [
  "config",
  "secrets",
  "agent",
  "workspace",
  "rooms",
  "persona",
  "input",
  "output",
  "data",
  "sessions",
  "logs",
  "backups",
  "state",
];

function ensureDirectories(paths) {
  for (const key of DIRECTORY_KEYS) {
    fs.mkdirSync(paths[key], { recursive: true });
  }
}

function initializeRuntime(options = {}) {
  const appRoot = options.appRoot || APP_ROOT;
  const home = runtimeHome({
    env: options.env,
    home: options.userHome,
    runtimeHome: options.runtimeHome,
  });
  const paths = runtimePaths(home);
  ensureDirectories(paths);

  const created = {
    profile: copyJsonDefault(
      path.join(appRoot, "defaults", "profile.json"),
      paths.profileFile,
    ),
    settings: copyJsonDefault(
      path.join(appRoot, "defaults", "settings.json"),
      paths.settingsFile,
    ),
    credentials: copyJsonDefault(
      path.join(appRoot, "defaults", "credentials.json"),
      paths.credentialsFile,
      { mode: 0o600 },
    ),
    soul: copyFileIfMissing(path.join(appRoot, "soul.json"), paths.soulFile),
  };

  const version = readJson(path.join(appRoot, "version.json"));
  const harness = installHarness(appRoot, paths, version);
  const existingInstall = readJson(paths.installStateFile, {});
  const legacy = legacyHome({ env: options.env, home: options.userHome });
  const legacyAvailable = legacy !== home && fs.existsSync(legacy);

  const installState = {
    ...existingInstall,
    product: "RESONANT Agent",
    application_version: version.application,
    config_schema: version.config_schema,
    soul_schema: version.soul_schema,
    harness_content: version.harness_content,
    migration_set: version.migration_set,
    runtime_home: home,
    initialized_at: existingInstall.initialized_at || new Date().toISOString(),
    last_started_at: new Date().toISOString(),
    legacy_import: existingInstall.legacy_import || {
      available: legacyAvailable,
      source: legacyAvailable ? legacy : "",
      status: legacyAvailable ? "offered" : "not-found",
    },
  };
  writeJson(paths.installStateFile, installState);

  const profile = readJson(paths.profileFile);
  const settings = readJson(paths.settingsFile);
  const entity = initializeEntity(paths, {
    profile,
    settings,
    harnessManifest: harness.manifest,
  });
  const provider = syncProviderConfig(paths);

  return {
    home,
    paths,
    created,
    copiedHarnessFiles: harness.copied,
    harnessManifest: harness.manifest,
    entity: entity.entity,
    pendingTransition: entity.transition,
    provider,
    onboardingComplete: Boolean(profile.onboarding_complete),
    legacyAvailable,
  };
}

module.exports = {
  initializeRuntime,
};
