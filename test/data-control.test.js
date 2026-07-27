const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  createBackup,
  restoreBackup,
  validateBackup,
} = require("../core/data-control");
const { initializeRuntime } = require("../core/runtime");

function dataRuntime(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aligned-data-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return initializeRuntime({ runtimeHome: root, env: {}, userHome: root });
}

test("default backups exclude credentials and preserve harness data", (t) => {
  const runtime = dataRuntime(t);
  fs.writeFileSync(runtime.paths.credentialsFile, '{"provider_api_key":"never-export"}\n');
  const memoryFile = path.join(runtime.paths.rooms, "memory", "continuity.md");
  fs.writeFileSync(memoryFile, "remember this", "utf8");

  const result = createBackup(runtime.paths);
  const bundle = JSON.parse(fs.readFileSync(result.path, "utf8"));
  const serialized = JSON.stringify(bundle);
  assert.doesNotMatch(serialized, /never-export/);
  assert.ok(bundle.files.some((entry) => entry.path.endsWith("continuity.md")));
});

test("restore validates paths before writing", (t) => {
  const runtime = dataRuntime(t);
  const malicious = {
    format: "resonant-agent-backup",
    version: 1,
    files: [{
      path: "../escape.txt",
      size: 0,
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      contents_base64: "",
    }],
  };
  assert.throws(() => validateBackup(malicious), /unsafe path/);
  assert.equal(fs.existsSync(path.join(runtime.home, "..", "escape.txt")), false);
});

test("restore creates a safety backup and restores opaque bytes", (t) => {
  const runtime = dataRuntime(t);
  const memoryFile = path.join(runtime.paths.rooms, "memory", "continuity.md");
  fs.writeFileSync(memoryFile, "before", "utf8");
  const backup = createBackup(runtime.paths);
  const bundle = JSON.parse(fs.readFileSync(backup.path, "utf8"));
  fs.writeFileSync(memoryFile, "after", "utf8");

  const restored = restoreBackup(runtime.paths, bundle);
  assert.equal(fs.readFileSync(memoryFile, "utf8"), "before");
  assert.ok(fs.existsSync(restored.safety_backup));
});
