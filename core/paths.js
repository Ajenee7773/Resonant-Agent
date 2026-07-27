const os = require("node:os");
const path = require("node:path");

const APP_ROOT = path.resolve(__dirname, "..");

function expandHome(value, home = os.homedir()) {
  const text = String(value || "").trim();
  if (text === "~") return home;
  if (text.startsWith(`~${path.sep}`) || text.startsWith("~/") || text.startsWith("~\\")) {
    return path.join(home, text.slice(2));
  }
  return text;
}

function runtimeHome(options = {}) {
  const env = options.env || process.env;
  const home = options.home || os.homedir();
  const configured =
    options.runtimeHome ||
    env.RESONANT_HOME ||
    env.ALIGNED_AGENT_HOME ||
    path.join(home, ".resonant");
  return path.resolve(expandHome(configured, home));
}

function runtimePaths(home) {
  const root = path.resolve(home);
  return {
    root,
    config: path.join(root, "config"),
    secrets: path.join(root, "secrets"),
    agent: path.join(root, "agent"),
    workspace: path.join(root, "workspace"),
    rooms: path.join(root, "workspace", "rooms"),
    persona: path.join(root, "workspace", "persona"),
    input: path.join(root, "workspace", "input"),
    output: path.join(root, "workspace", "output"),
    data: path.join(root, "data"),
    sessions: path.join(root, "data", "sessions"),
    logs: path.join(root, "logs"),
    backups: path.join(root, "backups"),
    state: path.join(root, "state"),
    profileFile: path.join(root, "config", "profile.json"),
    settingsFile: path.join(root, "config", "settings.json"),
    credentialsFile: path.join(root, "secrets", "credentials.json"),
    soulFile: path.join(root, "agent", "soul.json"),
    entityFile: path.join(root, "state", "entity.json"),
    lineageFile: path.join(root, "state", "lineage.jsonl"),
    pendingTransitionFile: path.join(root, "state", "pending-transition.json"),
    installStateFile: path.join(root, "state", "install.json"),
    migrationStateFile: path.join(root, "state", "migrations.json"),
    onboardingStateFile: path.join(root, "state", "onboarding.json"),
    serviceLockFile: path.join(root, "state", "control-service.lock"),
  };
}

function assertInside(root, target, label = "Path") {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} must stay inside the RESONANT Agent runtime home.`);
  }
  return resolvedTarget;
}

function legacyHome(options = {}) {
  const env = options.env || process.env;
  const home = options.home || os.homedir();
  return path.resolve(expandHome(env.RESONANT_HOME || path.join(home, ".resonant"), home));
}

module.exports = {
  APP_ROOT,
  assertInside,
  expandHome,
  legacyHome,
  runtimeHome,
  runtimePaths,
};
