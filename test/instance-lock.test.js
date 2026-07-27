const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { acquireInstanceLock } = require("../core/instance-lock");

function lockFile(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aligned-lock-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return path.join(root, "service.lock");
}

test("instance lock prevents a second live owner", (t) => {
  const file = lockFile(t);
  const first = acquireInstanceLock(file);
  assert.throws(() => acquireInstanceLock(file), /already running/);
  first.release();
  assert.equal(fs.existsSync(file), false);
});

test("instance lock recovers a stale owner", (t) => {
  const file = lockFile(t);
  fs.writeFileSync(file, '{"pid":2147483647}\n');
  const lock = acquireInstanceLock(file);
  assert.equal(lock.pid, process.pid);
  lock.release();
});
