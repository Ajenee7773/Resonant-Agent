const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { approveModelTransition, initializeEntity } = require("../core/entity");
const { readJson } = require("../core/json-store");
const { runtimePaths } = require("../core/paths");

function entityRuntime(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aligned-entity-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const paths = runtimePaths(root);
  fs.mkdirSync(paths.state, { recursive: true });
  return paths;
}

function settings(provider, model) {
  return { runtime: { provider, model } };
}

test("a configured model waits for explicit initial introduction", (t) => {
  const paths = entityRuntime(t);
  const result = initializeEntity(paths, {
    profile: { agent_name: "Nova" },
    settings: settings("ollama", "gemma3:4b"),
    harnessManifest: { harness_content: 1, digest: "abc123" },
  });

  assert.equal(result.entity.display_name, "Nova");
  assert.equal(result.entity.model_binding, null);
  assert.equal(result.transition.reason, "initial-model-introduction");
  assert.deepEqual(result.transition.incoming, {
    provider: "ollama",
    model: "gemma3:4b",
  });
});

test("approving initial introduction binds the model and records lineage", (t) => {
  const paths = entityRuntime(t);
  initializeEntity(paths, {
    profile: { agent_name: "Nova" },
    settings: settings("ollama", "gemma3:4b"),
  });
  const entity = approveModelTransition(paths, {
    mode: "fresh-start",
    displayName: "Nova",
  });

  assert.equal(entity.status, "active");
  assert.equal(entity.model_binding.provider, "ollama");
  assert.equal(entity.model_binding.model, "gemma3:4b");
  assert.equal(fs.existsSync(paths.pendingTransitionFile), false);
  const events = fs
    .readFileSync(paths.lineageFile, "utf8")
    .trim()
    .split(/\r?\n/)
    .map(JSON.parse);
  assert.equal(events.at(-1).type, "initial-model-bound");
});

test("changing model creates a succession decision instead of silent replacement", (t) => {
  const paths = entityRuntime(t);
  initializeEntity(paths, {
    profile: { agent_name: "Nova" },
    settings: settings("ollama", "gemma3:4b"),
  });
  approveModelTransition(paths, { mode: "fresh-start" });

  const changed = initializeEntity(paths, {
    profile: { agent_name: "Nova" },
    settings: settings("google", "gemini-2.5-pro"),
  });
  const persisted = readJson(paths.entityFile);

  assert.equal(persisted.model_binding.model, "gemma3:4b");
  assert.equal(changed.transition.reason, "model-binding-change");
  assert.equal(changed.transition.incoming.model, "gemini-2.5-pro");
});

test("unsupported lifecycle modes are rejected", (t) => {
  const paths = entityRuntime(t);
  initializeEntity(paths, {
    profile: { agent_name: "Nova" },
    settings: settings("ollama", "gemma3:4b"),
  });
  assert.throws(
    () => approveModelTransition(paths, { mode: "silent-replacement" }),
    /Unsupported entity lifecycle mode/,
  );
});
