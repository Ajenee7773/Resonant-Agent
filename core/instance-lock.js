const fs = require("node:fs");
const path = require("node:path");

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireInstanceLock(file, options = {}) {
  const pid = options.pid || process.pid;
  fs.mkdirSync(path.dirname(file), { recursive: true });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const descriptor = fs.openSync(file, "wx", 0o600);
      fs.writeFileSync(
        descriptor,
        `${JSON.stringify({
          format: "aligned-instance-lock",
          version: 1,
          pid,
          started_at: new Date().toISOString(),
        }, null, 2)}\n`,
      );
      fs.closeSync(descriptor);
      return {
        file,
        pid,
        release() {
          try {
            const lock = JSON.parse(fs.readFileSync(file, "utf8"));
            if (lock.pid === pid) fs.rmSync(file, { force: true });
          } catch {
            // A missing or replaced lock is not ours to remove.
          }
        },
      };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      let existing = null;
      try {
        existing = JSON.parse(fs.readFileSync(file, "utf8"));
      } catch {
        // An unreadable lock is stale and can be recovered.
      }
      if (existing && processIsAlive(Number(existing.pid))) {
        throw new Error(
          `RESONANT Agent is already running for this private runtime (PID ${existing.pid}).`,
        );
      }
      fs.rmSync(file, { force: true });
    }
  }
  throw new Error("The stale runtime lock could not be recovered.");
}

module.exports = {
  acquireInstanceLock,
  processIsAlive,
};
