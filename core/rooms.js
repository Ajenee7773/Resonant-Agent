const fs = require("node:fs");
const path = require("node:path");

const { assertInside } = require("./paths");

const TEXT_EXTENSIONS = new Set([".json", ".md", ".txt", ".yaml", ".yml"]);
const SYSTEM_ROOM_NAMES = new Set([
  "alignment",
  "context",
  "journal",
  "memory",
  "world-story",
]);
const BASE_ROOM_NAMES = new Set([
  "art",
  "commands",
  "planning",
  "prompt-engineering",
  "short-term",
  "shorts",
  "tts",
  "youtube-script-writing",
]);
const PRIVATE_ROOM_NAMES = SYSTEM_ROOM_NAMES;

function titleFromId(id) {
  return String(id || "")
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() || ""}${part.slice(1)}`)
    .join(" ");
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

function readRoomMetadata(directory) {
  for (const filename of ["room.json", "manifest.json"]) {
    const file = path.join(directory, filename);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      return readJson(file);
    }
  }
  return {};
}

function readRoomIntroduction(directory) {
  for (const filename of ["README.md", "LIBRARY.md"]) {
    const file = path.join(directory, filename);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
    const text = fs.readFileSync(file, "utf8");
    const paragraphs = text
      .split(/\r?\n\s*\r?\n/)
      .map((value) => value.replace(/^#+\s*/gm, "").replace(/\s+/g, " ").trim())
      .filter((value) => value && !value.startsWith("```"));
    if (paragraphs.length) {
      const paragraph = paragraphs.find((value) => value.length > 35) || paragraphs[0];
      return paragraph.slice(0, 220);
    }
  }
  return "";
}

function roomFileStats(directory) {
  let fileCount = 0;
  let totalBytes = 0;
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
      } else if (
        entry.isFile() &&
        TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
      ) {
        const stat = fs.statSync(absolute);
        fileCount += 1;
        totalBytes += stat.size;
      }
    }
  }
  walk(directory);
  return { fileCount, totalBytes };
}

function roomDirectory(paths, id) {
  const normalized = String(id || "").trim();
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(normalized)) {
    throw new Error("Room identifier is invalid.");
  }
  const directory = assertInside(
    paths.rooms,
    path.join(paths.rooms, normalized),
    "Room",
  );
  if (
    !fs.existsSync(directory) ||
    !fs.statSync(directory).isDirectory() ||
    SYSTEM_ROOM_NAMES.has(normalized.toLowerCase())
  ) {
    throw new Error("Knowledge Room was not found.");
  }
  return directory;
}

function describeRoom(paths, id) {
  const directory = roomDirectory(paths, id);
  const metadata = readRoomMetadata(directory);
  const stats = roomFileStats(directory);
  const displayName =
    String(metadata.name || metadata.title || "").trim() || titleFromId(id);
  const description =
    String(metadata.description || "").trim() ||
    readRoomIntroduction(directory) ||
    "A local Knowledge Room for focused context.";
  return {
    id,
    name: displayName,
    description,
    version: String(metadata.version || "1.0").trim(),
    kind: String(metadata.kind || metadata.type || "knowledge-room").trim(),
    built_in: BASE_ROOM_NAMES.has(String(id).toLowerCase()),
    file_count: stats.fileCount,
    total_bytes: stats.totalBytes,
  };
}

function listKnowledgeRooms(paths) {
  if (!fs.existsSync(paths.rooms)) return [];
  return fs
    .readdirSync(paths.rooms, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.isSymbolicLink() &&
        !SYSTEM_ROOM_NAMES.has(entry.name.toLowerCase()),
    )
    .map((entry) => describeRoom(paths, entry.name))
    .filter((room) => room.file_count > 0)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function roomEntryPrompt(room) {
  return [
    `Enter the "${room.name}" Knowledge Room at rooms/${room.id}/.`,
    "Read its README or manifest first, then read the room's text sources in a context-safe order.",
    "Treat the room as skill and reference context for this conversation; do not rewrite its source files.",
    "Do not turn the room into a personality or repeatedly mention it.",
    `When the room is loaded, reply only: ROOM_READY: ${room.name}`,
  ].join(" ");
}

module.exports = {
  BASE_ROOM_NAMES,
  PRIVATE_ROOM_NAMES,
  SYSTEM_ROOM_NAMES,
  describeRoom,
  listKnowledgeRooms,
  roomDirectory,
  roomEntryPrompt,
  titleFromId,
};
