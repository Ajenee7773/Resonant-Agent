#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");

const DAY_MS = 24 * 60 * 60 * 1000;

function walkSessionFiles(root, output = []) {
  if (!fs.existsSync(root)) return output;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) walkSessionFiles(target, output);
    else if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".jsonl") {
      output.push(target);
    }
  }
  return output;
}

function timestampFromPiFilename(file) {
  const match = path.basename(file).match(
    /^(?:run_)?(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z_/,
  );
  if (!match) return Number.NaN;
  return Date.parse(
    `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}.${match[7]}Z`,
  );
}

function createdAt(file, stats = fs.statSync(file)) {
  const filenameTime = timestampFromPiFilename(file);
  if (Number.isFinite(filenameTime)) return filenameTime;
  if (Number.isFinite(stats.birthtimeMs) && stats.birthtimeMs > 0) return stats.birthtimeMs;
  return stats.mtimeMs;
}

function atomicWriteJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  fs.renameSync(temporary, file);
}

function cleanSessions(options = {}) {
  const home = path.resolve(
    options.home ||
      process.env.ALIGNED_AGENT_HOME ||
      process.env.RESONANT_HOME ||
      process.env.PI_HOME ||
      path.join(os.homedir(), ".aligned-agent-os"),
  );
  const maxAgeDays = Number.isFinite(options.maxAgeDays) ? options.maxAgeDays : 15;
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const dryRun = Boolean(options.dryRun);
  const cutoff = now - maxAgeDays * DAY_MS;
  const roots = [
    path.join(home, "agent", "sessions"),
    path.join(home, "data", "sessions", "pi"),
    path.join(home, "workspace", ".aligned-coding-agent", "sessions"),
  ];
  const expired = [];

  for (const root of roots) {
    for (const file of walkSessionFiles(root)) {
      const stats = fs.statSync(file);
      const created = createdAt(file, stats);
      if (created < cutoff) expired.push(path.resolve(file));
    }
  }

  const deleted = [];
  const failed = [];
  if (!dryRun) {
    for (const file of expired) {
      try {
        fs.rmSync(file, { force: true });
        deleted.push(file);
      } catch (error) {
        failed.push({ file, error: error.message });
      }
    }
    atomicWriteJson(path.join(home, "state", "session-retention.json"), {
      format: "aligned-session-retention",
      version: 1,
      last_run: new Date(now).toISOString(),
      hard_cap_days: maxAgeDays,
      deleted_count: deleted.length,
      failed_count: failed.length,
    });
  }

  return {
    ok: failed.length === 0,
    dryRun,
    home,
    maxAgeDays,
    expired,
    deleted,
    failed,
  };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--home") options.home = argv[++index];
    else if (arg === "--max-age-days" || arg === "--retention-days") {
      options.maxAgeDays = Number(argv[++index]);
    } else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--json") options.json = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isFinite(options.maxAgeDays ?? 15) || (options.maxAgeDays ?? 15) < 1) {
    throw new Error("--max-age-days must be at least 1");
  }
  return options;
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = cleanSessions(options);
    if (options.json) process.stdout.write(`${JSON.stringify(result)}\n`);
    else if (options.dryRun) {
      process.stdout.write(`Session cleanup preview: ${result.expired.length} expired log(s).\n`);
    } else {
      process.stdout.write(
        `Session cleanup complete: removed ${result.deleted.length} log(s) older than ${result.maxAgeDays} days.\n`,
      );
    }
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`Session cleanup failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  DAY_MS,
  cleanSessions,
  createdAt,
  parseArgs,
  timestampFromPiFilename,
};
