const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { assertInside, runtimeHome, runtimePaths } = require("../core/paths");

test("runtimeHome prefers the RESONANT environment variable", () => {
  const result = runtimeHome({
    env: {
      ALIGNED_AGENT_HOME: "C:\\AlignedHome",
      RESONANT_HOME: "C:\\ResonantHome",
    },
    home: "C:\\User",
  });
  assert.equal(result, path.resolve("C:\\ResonantHome"));
});

test("runtimeHome uses the RESONANT default on a clean system", () => {
  const result = runtimeHome({ env: {}, home: "C:\\User" });
  assert.equal(result, path.resolve("C:\\User", ".resonant"));
});

test("runtimePaths keeps mutable data under one root", () => {
  const paths = runtimePaths(path.resolve("C:\\Runtime"));
  for (const [key, value] of Object.entries(paths)) {
    if (key === "root") continue;
    assert.doesNotThrow(() => assertInside(paths.root, value, key));
  }
});

test("assertInside rejects traversal outside the runtime", () => {
  const root = path.resolve("C:\\Runtime");
  assert.throws(() => assertInside(root, path.resolve(root, "..", "escape")), /must stay inside/);
});
