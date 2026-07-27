const fs = require("node:fs");
const path = require("node:path");

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT" && fallback !== undefined) return fallback;
    if (error instanceof SyntaxError) {
      throw new Error(`${path.basename(file)} contains invalid JSON: ${error.message}`);
    }
    throw error;
  }
}

function writeJson(file, value, options = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const mode = options.mode ?? 0o600;
  const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode,
  });
  try {
    fs.renameSync(temporary, file);
  } catch (error) {
    try {
      fs.rmSync(temporary, { force: true });
    } catch {
      // Preserve the original error.
    }
    throw error;
  }
  try {
    fs.chmodSync(file, mode);
  } catch {
    // Windows ACLs do not map cleanly to POSIX modes.
  }
  return file;
}

function copyJsonDefault(source, destination, options = {}) {
  if (fs.existsSync(destination)) return false;
  writeJson(destination, readJson(source), options);
  return true;
}

module.exports = {
  copyJsonDefault,
  readJson,
  writeJson,
};
