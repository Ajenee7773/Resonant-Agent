const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { cleanSessions, timestampFromPiFilename } = require("../scripts/session-retention");

function write(file, content = "{}\n") {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

test("hard-caps Pi and coding session logs by creation date without touching durable memory", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "aligned-retention-"));
  const native = path.join(home, "agent", "sessions", "workspace");
  const web = path.join(home, "data", "sessions", "pi", "conversation");
  const coding = path.join(home, "workspace", ".aligned-coding-agent", "sessions");
  const oldNative = path.join(native, "2026-07-01T00-00-00-000Z_old.jsonl");
  const oldWeb = path.join(web, "2026-07-15T00-00-00-000Z_old.jsonl");
  const oldCoding = path.join(coding, "run_2026-07-20T00-00-00-000Z_old.jsonl");
  const recent = path.join(native, "2026-08-01T00-00-00-000Z_recent.jsonl");
  const memory = path.join(home, "workspace", "rooms", "memory", "MEMORY.md");

  for (const file of [oldNative, oldWeb, oldCoding, recent]) write(file);
  write(memory, "durable memory\n");
  write(
    path.join(home, "state", "resident-sessions", "flash.json"),
    `${JSON.stringify({ session_file: oldNative })}\n`,
  );

  const now = Date.parse("2026-08-11T00:00:00.000Z");
  const preview = cleanSessions({ home, maxAgeDays: 15, now, dryRun: true });
  assert.equal(preview.expired.length, 3);
  assert.equal(fs.existsSync(oldNative), true);

  const result = cleanSessions({ home, maxAgeDays: 15, now });
  assert.equal(result.ok, true);
  assert.equal(result.deleted.length, 3);
  assert.equal(fs.existsSync(oldNative), false, "hard cap also expires a formerly pinned log");
  assert.equal(fs.existsSync(oldWeb), false);
  assert.equal(fs.existsSync(oldCoding), false);
  assert.equal(fs.existsSync(recent), true);
  assert.equal(fs.readFileSync(memory, "utf8"), "durable memory\n");
});

test("recognizes Pi and aligned coding session creation timestamps", () => {
  assert.equal(
    timestampFromPiFilename("2026-08-06T01-53-14-903Z_id.jsonl"),
    Date.parse("2026-08-06T01:53:14.903Z"),
  );
  assert.equal(
    timestampFromPiFilename("run_2026-08-06T01-53-14-903Z_id.jsonl"),
    Date.parse("2026-08-06T01:53:14.903Z"),
  );
});
