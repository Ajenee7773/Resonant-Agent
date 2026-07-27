const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  exportLivingLibrary,
  installLivingLibrary,
  removeLivingLibrary,
  validateLivingLibrary,
} = require("../core/living-libraries");
const { runtimePaths } = require("../core/paths");

function temporaryRuntime(t, prefix) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const paths = runtimePaths(home);
  fs.mkdirSync(paths.rooms, { recursive: true });
  fs.mkdirSync(paths.state, { recursive: true });
  return paths;
}

function createRoom(paths, id = "market-structure") {
  const room = path.join(paths.rooms, id);
  fs.mkdirSync(path.join(room, "methods"), { recursive: true });
  fs.writeFileSync(
    path.join(room, "room.json"),
    JSON.stringify(
      {
        name: "Market Structure",
        description: "Reusable historical market-structure context.",
        version: "1.0",
        kind: "personal-room",
        author: "Local creator",
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.join(room, "README.md"),
    "# Market Structure\n\nRead methods/overview.md first.\n",
  );
  fs.writeFileSync(
    path.join(room, "methods", "overview.md"),
    "# Overview\n\nHistorical methods and provenance.\n",
  );
  return room;
}

test("a Room Builder room exports and installs as one Living Library", (t) => {
  const creator = temporaryRuntime(t, "aligned-library-creator-");
  const buyer = temporaryRuntime(t, "aligned-library-buyer-");
  createRoom(creator);

  const bundle = exportLivingLibrary(creator, "market-structure");
  assert.equal(bundle.format, "aligned-living-library");
  assert.equal(bundle.format_version, 1);
  assert.equal(bundle.library.id, "market-structure");
  assert.equal(validateLivingLibrary(bundle).files.length, 3);

  const installed = installLivingLibrary(buyer, bundle);
  assert.equal(installed.room.id, "market-structure");
  assert.equal(installed.room.kind, "living-library");
  assert.equal(installed.room.built_in, false);
  assert.equal(installed.receipt.digest, bundle.digest);
  assert.equal(
    fs.existsSync(
      path.join(buyer.rooms, "market-structure", "methods", "overview.md"),
    ),
    true,
  );
  assert.throws(
    () => installLivingLibrary(buyer, bundle),
    /never overwritten/i,
  );
});

test("Living Library installation rejects tampering and traversal", (t) => {
  const creator = temporaryRuntime(t, "aligned-library-security-");
  createRoom(creator);
  const tampered = exportLivingLibrary(creator, "market-structure");
  tampered.files[0].content += "tampered";
  assert.throws(
    () => validateLivingLibrary(tampered),
    /integrity check failed/i,
  );

  const traversal = exportLivingLibrary(creator, "market-structure");
  traversal.files[0].path = "../outside.md";
  assert.throws(
    () => validateLivingLibrary(traversal),
    /stay inside the room/i,
  );

  const falseAuthor = exportLivingLibrary(creator, "market-structure");
  falseAuthor.library.author = "Different author";
  assert.throws(
    () => validateLivingLibrary(falseAuthor),
    /digest does not match/i,
  );
});

test("built-in and system identifiers cannot become marketplace packages", (t) => {
  const creator = temporaryRuntime(t, "aligned-library-reserved-");
  createRoom(creator, "planning");
  assert.throws(
    () => exportLivingLibrary(creator, "planning"),
    /reserved/i,
  );
});

test("an installed library can be removed without destroying its recoverable copy", (t) => {
  const creator = temporaryRuntime(t, "aligned-library-remove-creator-");
  const buyer = temporaryRuntime(t, "aligned-library-remove-buyer-");
  createRoom(creator, "temporary-signal");
  const bundle = exportLivingLibrary(creator, "temporary-signal");
  installLivingLibrary(buyer, bundle);

  const target = path.join(buyer.rooms, "temporary-signal");
  assert.equal(fs.existsSync(target), true);

  const removed = removeLivingLibrary(buyer, "temporary-signal");
  assert.equal(removed.room.name, "Market Structure");
  assert.equal(removed.recoverable, true);
  assert.equal(fs.existsSync(target), false);

  const recoveryRoot = path.join(
    buyer.backups,
    "removed-living-libraries",
  );
  const recovered = fs.readdirSync(recoveryRoot);
  assert.equal(recovered.length, 1);
  assert.equal(
    fs.existsSync(path.join(recoveryRoot, recovered[0], "README.md")),
    true,
  );

  const receipts = JSON.parse(
    fs.readFileSync(path.join(buyer.state, "living-libraries.json"), "utf8"),
  );
  assert.equal(receipts.libraries["temporary-signal"], undefined);
  assert.equal(receipts.removed.at(-1).id, "temporary-signal");
  assert.throws(
    () => removeLivingLibrary(buyer, "temporary-signal"),
    /not found/i,
  );
});

test("library removal never removes a personal Room Builder room", (t) => {
  const paths = temporaryRuntime(t, "aligned-library-personal-");
  createRoom(paths, "personal-research");
  assert.throws(
    () => removeLivingLibrary(paths, "personal-research"),
    /only installed Living Libraries/i,
  );
  assert.equal(
    fs.existsSync(path.join(paths.rooms, "personal-research", "README.md")),
    true,
  );
});
