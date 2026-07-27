const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { readJson, writeJson } = require("./json-store");
const { assertInside } = require("./paths");
const {
  BASE_ROOM_NAMES,
  SYSTEM_ROOM_NAMES,
  describeRoom,
  roomDirectory,
} = require("./rooms");

const FORMAT = "aligned-living-library";
const FORMAT_VERSION = 1;
const MAX_FILES = 500;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const TEXT_EXTENSIONS = new Set([".json", ".md", ".txt", ".yaml", ".yml"]);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function validRoomId(value) {
  const id = String(value || "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(id)) {
    throw new Error("Living Library identifier is invalid.");
  }
  if (SYSTEM_ROOM_NAMES.has(id) || BASE_ROOM_NAMES.has(id)) {
    throw new Error("Living Library identifier is reserved by RESONANT Agent.");
  }
  return id;
}

function validPackagePath(value) {
  const candidate = String(value || "").replace(/\\/g, "/").trim();
  if (
    !candidate ||
    candidate.includes("\0") ||
    candidate.startsWith("/") ||
    /^[a-z]:/i.test(candidate)
  ) {
    throw new Error("Living Library contains an invalid file path.");
  }
  const normalized = path.posix.normalize(candidate);
  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.split("/").includes("..") ||
    normalized !== candidate
  ) {
    throw new Error(
      "Living Library file paths must be canonical and stay inside the room.",
    );
  }
  if (!TEXT_EXTENSIONS.has(path.posix.extname(normalized).toLowerCase())) {
    throw new Error(`Living Library file type is not allowed: ${normalized}`);
  }
  return normalized;
}

function packageDigest(files, library = {}) {
  const identity = JSON.stringify({
    id: String(library.id || ""),
    name: String(library.name || ""),
    description: String(library.description || ""),
    version: String(library.version || ""),
    author: String(library.author || ""),
    license: String(library.license || ""),
    created_at: String(library.created_at || ""),
  });
  return sha256(
    [
      identity,
      ...[...files]
        .sort((left, right) => left.path.localeCompare(right.path))
        .map((file) => `${file.path}:${file.sha256}:${file.bytes}`),
    ].join("\n"),
  );
}

function collectRoomFiles(directory) {
  const files = [];
  let totalBytes = 0;

  function walk(current) {
    const entries = fs
      .readdirSync(current, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        throw new Error("Living Libraries cannot contain symbolic links.");
      }
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      const relative = validPackagePath(
        path.relative(directory, absolute).replace(/\\/g, "/"),
      );
      const bytes = fs.readFileSync(absolute);
      if (bytes.length > MAX_FILE_BYTES) {
        throw new Error(`Living Library file is too large: ${relative}`);
      }
      totalBytes += bytes.length;
      if (totalBytes > MAX_TOTAL_BYTES) {
        throw new Error("Living Library exceeds the 50 MB package limit.");
      }
      const content = bytes.toString("utf8");
      if (!Buffer.from(content, "utf8").equals(bytes)) {
        throw new Error(`Living Library file is not valid UTF-8 text: ${relative}`);
      }
      files.push({
        path: relative,
        encoding: "utf8",
        bytes: bytes.length,
        sha256: sha256(bytes),
        content,
      });
      if (files.length > MAX_FILES) {
        throw new Error(`Living Library exceeds the ${MAX_FILES}-file limit.`);
      }
    }
  }

  walk(directory);
  return files;
}

function exportLivingLibrary(paths, roomId, options = {}) {
  const id = validRoomId(roomId);
  const directory = roomDirectory(paths, id);
  const room = describeRoom(paths, id);
  const files = collectRoomFiles(directory);
  const roomFile = files.find((file) => file.path === "room.json");
  const readmeFile = files.find((file) => file.path === "README.md");
  if (!roomFile || !readmeFile) {
    throw new Error("Exportable rooms require room.json and README.md.");
  }

  const originalCard = JSON.parse(roomFile.content);
  const library = {
    id,
    name: room.name,
    description: room.description,
    version: room.version,
    author: String(
      options.author || originalCard.author || "Independent creator",
    ).trim(),
    license: String(
      options.license || originalCard.license || "All rights reserved",
    ).trim(),
    created_at: new Date().toISOString(),
  };
  const card = {
    ...originalCard,
    name: room.name,
    description: room.description,
    version: room.version,
    kind: "living-library",
    author: library.author,
    license: library.license,
  };
  const cardContent = `${JSON.stringify(card, null, 2)}\n`;
  const cardBytes = Buffer.from(cardContent, "utf8");
  Object.assign(roomFile, {
    bytes: cardBytes.length,
    sha256: sha256(cardBytes),
    content: cardContent,
  });

  return {
    format: FORMAT,
    format_version: FORMAT_VERSION,
    library,
    digest: packageDigest(files, library),
    files,
  };
}

function validateLivingLibrary(bundle) {
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) {
    throw new Error("Living Library package must be a JSON object.");
  }
  if (
    bundle.format !== FORMAT ||
    Number(bundle.format_version) !== FORMAT_VERSION
  ) {
    throw new Error("Living Library package format is not supported.");
  }
  const id = validRoomId(bundle.library?.id);
  const files = Array.isArray(bundle.files) ? bundle.files : [];
  if (!files.length || files.length > MAX_FILES) {
    throw new Error("Living Library has an invalid file count.");
  }

  const represented = new Set();
  const validatedFiles = [];
  let totalBytes = 0;
  for (const candidate of files) {
    const filePath = validPackagePath(candidate?.path);
    if (represented.has(filePath)) {
      throw new Error(`Living Library repeats a file path: ${filePath}`);
    }
    represented.add(filePath);
    if (candidate?.encoding !== "utf8" || typeof candidate?.content !== "string") {
      throw new Error(`Living Library file is not UTF-8 text: ${filePath}`);
    }
    const content = Buffer.from(candidate.content, "utf8");
    if (
      content.length !== Number(candidate.bytes) ||
      sha256(content) !== String(candidate.sha256 || "")
    ) {
      throw new Error(`Living Library integrity check failed: ${filePath}`);
    }
    if (content.length > MAX_FILE_BYTES) {
      throw new Error(`Living Library file is too large: ${filePath}`);
    }
    totalBytes += content.length;
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new Error("Living Library exceeds the 50 MB package limit.");
    }
    validatedFiles.push({ path: filePath, content });
  }

  if (!represented.has("room.json") || !represented.has("README.md")) {
    throw new Error("Living Library requires room.json and README.md.");
  }
  if (packageDigest(files, bundle.library) !== String(bundle.digest || "")) {
    throw new Error("Living Library package digest does not match its files.");
  }

  let card;
  try {
    card = JSON.parse(
      validatedFiles.find((file) => file.path === "room.json").content.toString(
        "utf8",
      ),
    );
  } catch {
    throw new Error("Living Library room.json is invalid.");
  }
  if (
    !String(card.name || "").trim() ||
    !String(card.description || "").trim() ||
    !String(card.version || "").trim()
  ) {
    throw new Error("Living Library room.json is incomplete.");
  }
  if (String(card.kind || "") !== "living-library") {
    throw new Error("Living Library room.json must declare kind living-library.");
  }
  const normalizedLibrary = {
    id,
    name: String(bundle.library?.name || "").trim(),
    description: String(bundle.library?.description || "").trim(),
    version: String(bundle.library?.version || "").trim(),
    author: String(bundle.library?.author || "").trim(),
    license: String(bundle.library?.license || "").trim(),
    created_at: String(bundle.library?.created_at || "").trim(),
  };
  if (
    !normalizedLibrary.name ||
    !normalizedLibrary.description ||
    !normalizedLibrary.version ||
    !normalizedLibrary.author ||
    !normalizedLibrary.license ||
    !normalizedLibrary.created_at
  ) {
    throw new Error("Living Library package metadata is incomplete.");
  }
  if (
    normalizedLibrary.name !== String(card.name).trim() ||
    normalizedLibrary.description !== String(card.description).trim() ||
    normalizedLibrary.version !== String(card.version).trim() ||
    normalizedLibrary.author !== String(card.author || "").trim() ||
    normalizedLibrary.license !== String(card.license || "").trim()
  ) {
    throw new Error("Living Library metadata does not match room.json.");
  }

  return {
    id,
    library: normalizedLibrary,
    digest: String(bundle.digest),
    files: validatedFiles,
    totalBytes,
  };
}

function installLivingLibrary(paths, bundle) {
  const validated = validateLivingLibrary(bundle);
  const target = assertInside(
    paths.rooms,
    path.join(paths.rooms, validated.id),
    "Living Library",
  );
  if (fs.existsSync(target)) {
    throw new Error(
      "A room with this identifier is already installed. Existing rooms are never overwritten.",
    );
  }

  const staging = assertInside(
    paths.root,
    path.join(
      paths.state,
      `living-library-${validated.id}-${crypto.randomUUID()}`,
    ),
    "Living Library staging",
  );
  fs.mkdirSync(staging, { recursive: true });
  try {
    for (const file of validated.files) {
      const destination = assertInside(
        staging,
        path.join(staging, ...file.path.split("/")),
        "Living Library file",
      );
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, file.content);
    }
    if (fs.existsSync(target)) {
      throw new Error("The destination room appeared during installation.");
    }
    fs.renameSync(staging, target);
  } catch (error) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw error;
  }

  const receiptFile = path.join(paths.state, "living-libraries.json");
  const receipts = readJson(receiptFile, {
    format: "aligned-living-library-receipts",
    version: 1,
    libraries: {},
  });
  receipts.libraries ||= {};
  receipts.libraries[validated.id] = {
    name: validated.library.name,
    version: validated.library.version,
    author: validated.library.author,
    license: validated.library.license,
    digest: validated.digest,
    installed_at: new Date().toISOString(),
  };
  writeJson(receiptFile, receipts);

  return {
    room: describeRoom(paths, validated.id),
    receipt: receipts.libraries[validated.id],
  };
}

function removeLivingLibrary(paths, roomId) {
  const id = validRoomId(roomId);
  const target = roomDirectory(paths, id);
  const room = describeRoom(paths, id);
  if (room.kind !== "living-library") {
    throw new Error(
      "Only installed Living Libraries can be removed from the library controls.",
    );
  }

  const receiptFile = path.join(paths.state, "living-libraries.json");
  const receipts = readJson(receiptFile, {
    format: "aligned-living-library-receipts",
    version: 1,
    libraries: {},
  });
  const receipt = receipts.libraries?.[id];
  if (!receipt) {
    throw new Error(
      "This room has no installation receipt. It was not removed.",
    );
  }

  const removedAt = new Date().toISOString();
  const recoveryRoot = assertInside(
    paths.root,
    path.join(paths.backups, "removed-living-libraries"),
    "Living Library recovery",
  );
  const recoveryTarget = assertInside(
    recoveryRoot,
    path.join(
      recoveryRoot,
      `${id}-${removedAt.replace(/[:.]/g, "-")}-${crypto.randomUUID()}`,
    ),
    "Living Library recovery item",
  );
  fs.mkdirSync(recoveryRoot, { recursive: true });
  fs.renameSync(target, recoveryTarget);

  receipts.libraries ||= {};
  delete receipts.libraries[id];
  receipts.removed ||= [];
  receipts.removed.push({
    id,
    name: room.name,
    version: room.version,
    digest: receipt.digest,
    installed_at: receipt.installed_at,
    removed_at: removedAt,
    recovery_item: path.relative(paths.root, recoveryTarget).replace(/\\/g, "/"),
  });

  try {
    writeJson(receiptFile, receipts);
  } catch (error) {
    if (!fs.existsSync(target) && fs.existsSync(recoveryTarget)) {
      fs.renameSync(recoveryTarget, target);
    }
    throw error;
  }

  return {
    room,
    removed_at: removedAt,
    recoverable: true,
  };
}

module.exports = {
  FORMAT,
  FORMAT_VERSION,
  MAX_FILES,
  MAX_TOTAL_BYTES,
  exportLivingLibrary,
  installLivingLibrary,
  packageDigest,
  removeLivingLibrary,
  validateLivingLibrary,
  validPackagePath,
  validRoomId,
};
