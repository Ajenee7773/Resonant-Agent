const fs = require("node:fs");
const path = require("node:path");

const { assertInside } = require("./paths");

const TEXT_EXTENSIONS = new Set([".json", ".md", ".txt", ".yaml", ".yml"]);

function slashPath(value) {
  return String(value || "").replaceAll("\\", "/");
}

function textFilesUnder(root, prefix = "") {
  if (!fs.existsSync(root)) return [];
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
        continue;
      }
      if (!entry.isFile() || !TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        continue;
      }
      const stat = fs.statSync(absolute);
      files.push({
        path: slashPath(path.join(prefix, path.relative(root, absolute))),
        name: entry.name,
        size: stat.size,
        updated_at: stat.mtime.toISOString(),
      });
    }
  }
  walk(root);
  return files;
}

function listHarnessFiles(paths, scope) {
  if (scope === "rooms") {
    return textFilesUnder(paths.rooms).sort((left, right) =>
      left.path.localeCompare(right.path),
    );
  }
  if (scope === "memory") {
    const files = [
      ...textFilesUnder(path.join(paths.rooms, "journal"), "rooms/journal"),
      ...textFilesUnder(path.join(paths.rooms, "memory"), "rooms/memory"),
      ...textFilesUnder(
        path.join(paths.rooms, "short-term-memory"),
        "rooms/short-term-memory",
      ),
      ...textFilesUnder(path.join(paths.rooms, "short-term"), "rooms/short-term"),
      ...textFilesUnder(path.join(paths.rooms, "context"), "rooms/context"),
      ...textFilesUnder(path.join(paths.agent, "memory"), "agent/memory"),
    ];
    const memoryFile = path.join(paths.agent, "MEMORY.md");
    if (fs.existsSync(memoryFile)) {
      const stat = fs.statSync(memoryFile);
      files.push({
        path: "agent/MEMORY.md",
        name: "MEMORY.md",
        size: stat.size,
        updated_at: stat.mtime.toISOString(),
      });
    }
    return files.sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  }
  throw new Error("Harness browser scope is invalid.");
}

function resolveHarnessFile(paths, scope, relative) {
  const normalized = slashPath(relative).replace(/^\/+/, "");
  if (!normalized || normalized.split("/").includes("..")) {
    throw new Error("Harness file path is invalid.");
  }
  let root;
  let inner = normalized;
  if (scope === "rooms") {
    root = paths.rooms;
  } else if (scope === "memory") {
    if (normalized === "agent/MEMORY.md") {
      root = paths.agent;
      inner = "MEMORY.md";
    } else if (normalized.startsWith("agent/memory/")) {
      root = path.join(paths.agent, "memory");
      inner = normalized.slice("agent/memory/".length);
    } else if (/^rooms\/(context|journal|memory|short-term|short-term-memory)\//.test(normalized)) {
      root = paths.rooms;
      inner = normalized.slice("rooms/".length);
    } else {
      throw new Error("Memory file path is outside the inspectable memory rooms.");
    }
  } else {
    throw new Error("Harness browser scope is invalid.");
  }
  const file = assertInside(root, path.join(root, ...inner.split("/")), "Harness file");
  if (!TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) {
    throw new Error("Only text-based harness files can be inspected.");
  }
  return file;
}

function readHarnessFile(paths, scope, relative) {
  const file = resolveHarnessFile(paths, scope, relative);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  const stat = fs.statSync(file);
  if (stat.size > 5 * 1024 * 1024) {
    throw new Error("This harness file exceeds the 5 MB inspection limit.");
  }
  const contents = fs.readFileSync(file, "utf8");
  if (contents.includes("\u0000")) {
    throw new Error("Binary files cannot be displayed.");
  }
  return {
    path: slashPath(relative),
    size: stat.size,
    updated_at: stat.mtime.toISOString(),
    contents,
  };
}

module.exports = {
  listHarnessFiles,
  readHarnessFile,
  resolveHarnessFile,
  textFilesUnder,
};
