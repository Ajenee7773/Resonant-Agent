const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { assertInside } = require("./paths");
const { writeJson } = require("./json-store");

const BACKUP_ROOTS = new Set([
  "agent",
  "config",
  "data",
  "secrets",
  "state",
  "workspace",
]);
const SECRET_RELATIVE_PATHS = new Set([
  "agent/auth.json",
  "secrets/credentials.json",
]);

function slashPath(value) {
  return String(value).replaceAll("\\", "/");
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function isSecretPath(relative) {
  const normalized = slashPath(relative).toLowerCase();
  return (
    SECRET_RELATIVE_PATHS.has(normalized) ||
    normalized.startsWith("secrets/")
  );
}

function collectFiles(root, options = {}) {
  const files = [];
  const maximumBytes = options.maximumBytes || 256 * 1024 * 1024;
  let totalBytes = 0;

  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        walk(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      const relative = slashPath(path.relative(root, absolute));
      const top = relative.split("/")[0];
      if (!BACKUP_ROOTS.has(top)) continue;
      if (!options.includeSecrets && isSecretPath(relative)) continue;
      const contents = fs.readFileSync(absolute);
      totalBytes += contents.length;
      if (totalBytes > maximumBytes) {
        throw new Error("Backup exceeds the 256 MB safety limit.");
      }
      files.push({
        path: relative,
        size: contents.length,
        sha256: sha256(contents),
        contents_base64: contents.toString("base64"),
      });
    }
  }

  walk(root);
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function backupFilename(date = new Date()) {
  return `resonant-agent-backup-${date.toISOString().replace(/[:.]/g, "-")}.json`;
}

function createBackup(paths, options = {}) {
  fs.mkdirSync(paths.backups, { recursive: true });
  const files = collectFiles(paths.root, {
    includeSecrets: Boolean(options.includeSecrets),
    maximumBytes: options.maximumBytes,
  });
  const bundle = {
    format: "resonant-agent-backup",
    version: 1,
    created_at: new Date().toISOString(),
    includes_secrets: Boolean(options.includeSecrets),
    runtime_format: "resonant-agent",
    file_count: files.length,
    files,
  };
  const filename = options.filename || backupFilename();
  if (!/^resonant-agent-backup-[A-Za-z0-9_.-]+\.json$/.test(filename)) {
    throw new Error("Backup filename is invalid.");
  }
  const target = assertInside(
    paths.backups,
    path.join(paths.backups, filename),
    "Backup file",
  );
  writeJson(target, bundle, { mode: 0o600 });
  return {
    filename,
    path: target,
    file_count: files.length,
    includes_secrets: bundle.includes_secrets,
    bytes: fs.statSync(target).size,
  };
}

function validateBackup(bundle, options = {}) {
  if (!bundle || bundle.format !== "resonant-agent-backup" || bundle.version !== 1) {
    throw new Error("This is not a supported RESONANT Agent backup.");
  }
  if (!Array.isArray(bundle.files) || bundle.files.length > 20_000) {
    throw new Error("Backup file list is invalid.");
  }
  const maximumBytes = options.maximumBytes || 256 * 1024 * 1024;
  let totalBytes = 0;
  const seen = new Set();
  const validated = bundle.files.map((entry) => {
    const relative = slashPath(entry.path || "");
    const parts = relative.split("/");
    if (
      !relative ||
      path.isAbsolute(relative) ||
      parts.includes("..") ||
      !BACKUP_ROOTS.has(parts[0])
    ) {
      throw new Error("Backup contains an unsafe path.");
    }
    if (seen.has(relative.toLowerCase())) {
      throw new Error("Backup contains a duplicate path.");
    }
    seen.add(relative.toLowerCase());
    const contents = Buffer.from(String(entry.contents_base64 || ""), "base64");
    totalBytes += contents.length;
    if (totalBytes > maximumBytes) {
      throw new Error("Backup exceeds the 256 MB safety limit.");
    }
    if (contents.length !== Number(entry.size) || sha256(contents) !== entry.sha256) {
      throw new Error(`Backup integrity check failed for ${relative}.`);
    }
    return { relative, contents };
  });
  return {
    files: validated,
    totalBytes,
    includesSecrets: Boolean(bundle.includes_secrets),
  };
}

function restoreBackup(paths, bundle, options = {}) {
  const validated = validateBackup(bundle, options);
  if (validated.includesSecrets && options.allowSecrets !== true) {
    throw new Error("This backup contains secrets. Explicit approval is required.");
  }

  const safetyBackup = createBackup(paths, {
    includeSecrets: true,
    filename: `resonant-agent-backup-pre-restore-${Date.now()}.json`,
    maximumBytes: options.maximumBytes,
  });

  for (const entry of validated.files) {
    const target = assertInside(
      paths.root,
      path.join(paths.root, ...entry.relative.split("/")),
      "Restored file",
    );
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const temporary = `${target}.restore-${process.pid}-${Date.now()}`;
    fs.writeFileSync(temporary, entry.contents);
    fs.renameSync(temporary, target);
  }

  return {
    restored_files: validated.files.length,
    restored_bytes: validated.totalBytes,
    safety_backup: safetyBackup.path,
  };
}

function readBackup(paths, filename) {
  if (!/^resonant-agent-backup-[A-Za-z0-9_.-]+\.json$/.test(filename)) {
    throw new Error("Backup filename is invalid.");
  }
  const file = assertInside(
    paths.backups,
    path.join(paths.backups, filename),
    "Backup file",
  );
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file);
}

module.exports = {
  BACKUP_ROOTS,
  backupFilename,
  collectFiles,
  createBackup,
  isSecretPath,
  readBackup,
  restoreBackup,
  sha256,
  validateBackup,
};
