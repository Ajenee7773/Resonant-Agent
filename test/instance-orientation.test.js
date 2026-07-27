const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  ORIENTATION_ONLINE_MESSAGE,
  foundationalSources,
  instanceIntegrationFile,
  instanceKey,
  observedReadMatches,
  orientationComplete,
  orientationSourcePrompt,
  orientationState,
  preserveOrientationJournal,
  saveOrientationState,
  sessionHasHistory,
} = require("../core/instance-orientation");
const { runtimePaths } = require("../core/paths");

test("instance keys are stable without exposing the external identifier", () => {
  const key = instanceKey("telegram", "private-chat-id");
  assert.match(key, /^telegram-[a-f0-9]{16}$/);
  assert.doesNotMatch(key, /private-chat-id/);
  assert.equal(key, instanceKey("telegram", "private-chat-id"));
  assert.notEqual(key, instanceKey("telegram", "another-chat"));
});

test("orientation state persists only with matching lineage and session history", () => {
  const config = {};
  const auth = { provider: "ollama", model: "gemma" };
  const key = instanceKey("telegram", "chat");
  const pending = orientationState(config, key, auth, 33, true);
  assert.equal(pending.status, "pending");
  saveOrientationState(config, key, {
    ...pending,
    status: "completed",
    next_source: 33,
  });
  const completed = orientationState(config, key, auth, 33, true);
  assert.equal(orientationComplete(completed), true);
  assert.equal(
    orientationState(config, key, auth, 33, false).status,
    "pending",
  );
  assert.equal(
    orientationState(
      config,
      key,
      { provider: "google", model: "gemini" },
      33,
      true,
    ).status,
    "pending",
  );
});

test("foundation source inventory and integration paths stay inside the brain", (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "aligned-orientation-"));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const paths = runtimePaths(home);
  fs.mkdirSync(path.join(paths.agent, "boot"), { recursive: true });
  fs.mkdirSync(path.join(paths.rooms, "alignment"), { recursive: true });
  fs.writeFileSync(
    path.join(paths.rooms, "alignment", "SOURCE.md"),
    "source",
  );
  fs.writeFileSync(
    path.join(paths.agent, "boot", "FOUNDATION-MANIFEST.md"),
    [
      "- [ ] `rooms/alignment/SOURCE.md`",
      "- [ ] `../secrets/credentials.json`",
    ].join("\n"),
  );
  assert.deepEqual(foundationalSources(paths), [
    "rooms/alignment/SOURCE.md",
  ]);
  assert.match(
    instanceIntegrationFile(paths, instanceKey("telegram", "chat")),
    /rooms[\\/]memory[\\/]instances/,
  );
});

test("saved session detection and read receipts are strict", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "aligned-session-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  assert.equal(sessionHasHistory(directory), false);
  fs.writeFileSync(path.join(directory, "session.jsonl"), "{}\n");
  assert.equal(sessionHasHistory(directory), true);
  assert.equal(
    observedReadMatches(
      "rooms/alignment/SOURCE.md",
      "C:\\runtime\\workspace\\rooms\\alignment\\SOURCE.md",
    ),
    true,
  );
  assert.equal(
    observedReadMatches(
      "rooms/alignment/SOURCE.md",
      "rooms/alignment/OTHER.md",
    ),
    false,
  );
});

test("each orientation turn requires a fresh read of the exact source", () => {
  const prompt = orientationSourcePrompt(
    "rooms/alignment/SOURCE.md",
    2,
    33,
  );
  assert.match(prompt, /source 3 of 33/);
  assert.match(prompt, /read tool for this exact file during this turn/i);
  assert.match(prompt, /Memory alone does not verify this source/);
});

test("orientation synthesis is journaled without overwriting the day", (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "aligned-journal-"));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const paths = runtimePaths(home);
  const integrationFile = instanceIntegrationFile(
    paths,
    instanceKey("web", "conversation"),
  );
  fs.mkdirSync(path.dirname(integrationFile), { recursive: true });
  fs.writeFileSync(integrationFile, "# Integration\n");

  const first = preserveOrientationJournal(paths, {
    key: instanceKey("web", "conversation"),
    label: "Web Instance",
    modelBinding: "google/gemini",
    completedAt: "2026-07-25T12:00:00.000Z",
    integrationFile,
    synthesis: "First private synthesis.",
  });
  preserveOrientationJournal(paths, {
    key: instanceKey("telegram", "conversation"),
    label: "Telegram Instance",
    modelBinding: "google/gemini",
    completedAt: "2026-07-25T13:00:00.000Z",
    integrationFile,
    synthesis: "Second private synthesis.",
  });

  const journal = fs.readFileSync(first, "utf8");
  assert.match(journal, /First private synthesis/);
  assert.match(journal, /Second private synthesis/);
  assert.match(journal, /### What I absorbed/);
  assert.equal(
    ORIENTATION_ONLINE_MESSAGE,
    "I am online. Your wish is my command.",
  );
});
