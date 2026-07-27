const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  listHarnessFiles,
  readHarnessFile,
  resolveHarnessFile,
} = require("../core/harness-browser");
const { initializeRuntime } = require("../core/runtime");

function harnessRuntime(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "resonant-browser-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return initializeRuntime({ runtimeHome: root, env: {}, userHome: root });
}

test("harness browser lists rooms without changing them", (t) => {
  const runtime = harnessRuntime(t);
  const before = fs.readFileSync(path.join(runtime.paths.rooms, "short-term", "scratchpad.md"), "utf8");
  const files = listHarnessFiles(runtime.paths, "rooms");
  const item = files.find((entry) => entry.path === "short-term/scratchpad.md");
  assert.ok(item);
  const inspected = readHarnessFile(runtime.paths, "rooms", item.path);
  assert.equal(inspected.contents, before);
  assert.equal(
    fs.readFileSync(path.join(runtime.paths.rooms, "short-term", "scratchpad.md"), "utf8"),
    before,
  );
});

test("memory view is limited to memory-oriented roots", (t) => {
  const runtime = harnessRuntime(t);
  const files = listHarnessFiles(runtime.paths, "memory");
  assert.ok(files.some((entry) => entry.path === "agent/MEMORY.md"));
  assert.ok(
    files.some(
      (entry) => entry.path === "rooms/memory/FOUNDATIONAL-INTEGRATION.md",
    ),
  );
  assert.ok(
    files.some(
      (entry) => entry.path === "rooms/short-term/scratchpad.md",
    ),
  );
  assert.equal(files.some((entry) => entry.path.includes("alignment/")), false);
});

test("short-term ideas are inspectable but remain inside memory scope", (t) => {
  const runtime = harnessRuntime(t);
  const relative = "rooms/short-term/scratchpad.md";
  const inspected = readHarnessFile(runtime.paths, "memory", relative);
  assert.match(inspected.contents, /Short-Term Memory/);
  assert.throws(
    () =>
      resolveHarnessFile(
        runtime.paths,
        "memory",
        "rooms/short-term/../../alignment/README.md",
      ),
    /invalid/,
  );
});

test("harness browser rejects traversal", (t) => {
  const runtime = harnessRuntime(t);
  assert.throws(
    () => resolveHarnessFile(runtime.paths, "rooms", "../../secrets/credentials.json"),
    /invalid/,
  );
});
