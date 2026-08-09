const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { runtimePaths } = require("../core/paths");
const {
  describeRoom,
  listKnowledgeRooms,
  roomDirectory,
  roomEntryPrompt,
} = require("../core/rooms");

function fixture(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "aligned-rooms-"));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const paths = runtimePaths(home);
  fs.mkdirSync(paths.rooms, { recursive: true });
  return paths;
}

test("knowledge catalog hides private continuity rooms", (t) => {
  const paths = fixture(t);
  fs.mkdirSync(path.join(paths.rooms, "memory"), { recursive: true });
  fs.writeFileSync(path.join(paths.rooms, "memory", "MEMORY.md"), "private");
  fs.mkdirSync(path.join(paths.rooms, "script-writing"), { recursive: true });
  fs.writeFileSync(
    path.join(paths.rooms, "script-writing", "room.json"),
    JSON.stringify({
      name: "Script Writing",
      description: "Narrative craft and production workflows.",
      version: "2.0",
      kind: "living-library",
    }),
  );
  fs.writeFileSync(
    path.join(paths.rooms, "script-writing", "README.md"),
    "# Script Writing\n",
  );

  const rooms = listKnowledgeRooms(paths);
  assert.equal(rooms.length, 1);
  assert.deepEqual(rooms[0], {
    id: "script-writing",
    name: "Script Writing",
    description: "Narrative craft and production workflows.",
    version: "2.0",
    kind: "living-library",
    built_in: false,
    file_count: 2,
    total_bytes:
      fs.statSync(path.join(paths.rooms, "script-writing", "room.json")).size +
      fs.statSync(path.join(paths.rooms, "script-writing", "README.md")).size,
  });
});

test("room descriptions fall back to local README text", (t) => {
  const paths = fixture(t);
  fs.mkdirSync(path.join(paths.rooms, "prompt-engineering"), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(paths.rooms, "prompt-engineering", "README.md"),
    "# Prompt Engineering\n\nA practical room for designing reliable prompts and evaluating their results.",
  );
  const room = describeRoom(paths, "prompt-engineering");
  assert.equal(room.name, "Prompt Engineering");
  assert.match(room.description, /practical room/);
});

test("room entry stays inside the local catalog", (t) => {
  const paths = fixture(t);
  fs.mkdirSync(path.join(paths.rooms, "research"), { recursive: true });
  fs.writeFileSync(path.join(paths.rooms, "research", "README.md"), "Research");
  const room = describeRoom(paths, "research");
  assert.match(roomEntryPrompt(room), /rooms\/research\//);
  assert.throws(() => roomDirectory(paths, "../secrets"), /invalid/);
  assert.throws(() => roomDirectory(paths, "memory"), /not found/);
});

test("packaged Prompt Engineering Room is discoverable", () => {
  const paths = {
    rooms: path.resolve(__dirname, "..", "harness", "rooms"),
  };
  const room = describeRoom(paths, "prompt-engineering");
  assert.equal(room.name, "Prompt Engineering");
  assert.equal(room.kind, "knowledge-room");
  assert.equal(room.built_in, true);
  assert.match(room.description, /Grok Imagine/i);
  assert.ok(room.file_count >= 1);
  assert.match(roomEntryPrompt(room), /rooms\/prompt-engineering\//);
});

test("TTS Room teaches local owner-controlled voice interfaces", () => {
  const voiceProtocol = fs.readFileSync(
    path.resolve(
      __dirname,
      "..",
      "harness",
      "rooms",
      "tts",
      "README.md",
    ),
    "utf8",
  );
  assert.match(voiceProtocol, /Built-In Voice/);
  assert.match(voiceProtocol, /built-in system speech/);
  assert.match(voiceProtocol, /local UI also exposes a mic button/);
  assert.match(voiceProtocol, /Whisper optional/);
});

test("Commands Room routes work into the relevant room", () => {
  const commandsProtocol = fs.readFileSync(
    path.resolve(
      __dirname,
      "..",
      "harness",
      "rooms",
      "commands",
      "README.md",
    ),
    "utf8",
  );
  assert.match(commandsProtocol, /Centralized command reference/);
  assert.match(commandsProtocol, /relevant room/);
  assert.match(commandsProtocol, /COMMANDS\.md/);
});

test("Communications Room teaches exact Pi session continuity", () => {
  const continuity = fs.readFileSync(
    path.resolve(
      __dirname,
      "..",
      "harness",
      "rooms",
      "communications",
      "SESSION-CONTINUITY.md",
    ),
    "utf8",
  );
  assert.match(continuity, /Conversation transcript/);
  assert.match(continuity, /Exact Pi session/);
  assert.match(continuity, /External Brain/);
  assert.match(continuity, /active-session\.json/);
  assert.match(continuity, /get_state/);
  assert.match(continuity, /--session <exact-file>/);
});

test("packaged catalog exposes the original RESONANT rooms and hides system rooms", () => {
  const paths = {
    rooms: path.resolve(__dirname, "..", "harness", "rooms"),
  };
  assert.deepEqual(
    listKnowledgeRooms(paths)
      .map((room) => room.id)
      .sort(),
    [
      "art",
      "commands",
      "communications",
      "planning",
      "prompt-engineering",
      "short-term",
      "shorts",
      "tts",
      "youtube-script-writing",
    ],
  );
  assert.equal(describeRoom(paths, "short-term").built_in, true);
  assert.throws(() => describeRoom(paths, "alignment"), /not found/);
  assert.throws(() => describeRoom(paths, "world-story"), /not found/);
  assert.throws(() => describeRoom(paths, "memory"), /not found/);
});

test("Planning Room requires execution and verification", () => {
  const instructions = fs.readFileSync(
    path.resolve(
      __dirname,
      "..",
      "harness",
      "rooms",
      "planning",
      "README.md",
    ),
    "utf8",
  );
  assert.match(instructions, /\*\*Act\.\*\* Execute one step at a time/);
  assert.match(instructions, /\*\*Verify\.\*\* Run checks/);
  assert.match(instructions, /If the operator asked you to build, do not stop at a plan/);
});
