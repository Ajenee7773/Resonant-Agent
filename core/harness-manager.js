const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { writeJson } = require("./json-store");

const AGENT_FILES = [
  "AGENTS.md",
  "COMMANDS.md",
  "CONSTITUTION.md",
  "EPISTEMIC.md",
  "FOUNDATION.md",
  "HEARTBEAT.md",
  "LINEAGE.md",
  "MEMORY.md",
  "MY-HARNESS.md",
  "ORIENTATION.md",
  "README.md",
  "ROOMS.md",
  "SOUL.md",
  "TOOLS.md",
  "TRANSFER.md",
  "heartbeat.json",
  "settings.json",
];

function copyFileIfMissing(source, destination) {
  if (!fs.existsSync(source) || fs.existsSync(destination)) return false;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  return true;
}

function copyDirectoryIfMissing(source, destination) {
  if (!fs.existsSync(source)) return 0;
  let copied = 0;
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destinationPath, { recursive: true });
      copied += copyDirectoryIfMissing(sourcePath, destinationPath);
    } else if (entry.isFile() && copyFileIfMissing(sourcePath, destinationPath)) {
      copied += 1;
    }
  }
  return copied;
}

function packagedHarnessManifest(harnessRoot) {
  const records = [];

  function visit(directory) {
    const entries = fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isFile()) {
        const relative = path.relative(harnessRoot, absolute).replace(/\\/g, "/");
        const bytes = fs.readFileSync(absolute);
        records.push({
          path: relative,
          bytes: bytes.length,
          sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
        });
      }
    }
  }

  visit(harnessRoot);
  const digest = crypto
    .createHash("sha256")
    .update(records.map((record) => `${record.path}:${record.sha256}`).join("\n"))
    .digest("hex");
  return { format: "aligned-harness-manifest", version: 1, digest, files: records };
}

function installHarness(appRoot, paths, version = {}) {
  const harness = path.join(appRoot, "harness");
  if (!fs.existsSync(harness)) {
    throw new Error("The packaged Cognitive Harness is missing.");
  }

  let copied = 0;
  for (const file of AGENT_FILES) {
    if (copyFileIfMissing(path.join(harness, file), path.join(paths.agent, file))) {
      copied += 1;
    }
  }

  copied += copyDirectoryIfMissing(path.join(harness, "boot"), path.join(paths.agent, "boot"));
  copied += copyDirectoryIfMissing(
    path.join(harness, "extensions"),
    path.join(paths.agent, "extensions"),
  );
  copied += copyDirectoryIfMissing(path.join(harness, "memory"), path.join(paths.agent, "memory"));
  copied += copyDirectoryIfMissing(path.join(harness, "skills"), path.join(paths.agent, "skills"));
  copied += copyDirectoryIfMissing(
    path.join(harness, "os-skill"),
    path.join(paths.agent, "skills", "resonant-os"),
  );
  copied += copyDirectoryIfMissing(path.join(harness, "persona"), paths.persona);
  copied += copyDirectoryIfMissing(path.join(harness, "rooms"), paths.rooms);
  copied += copyDirectoryIfMissing(path.join(harness, "workspace", "input"), paths.input);
  copied += copyDirectoryIfMissing(path.join(harness, "workspace", "output"), paths.output);
  const manifest = packagedHarnessManifest(harness);
  const releaseRecord = {
    ...manifest,
    harness_content: version.harness_content ?? 1,
    recorded_at: new Date().toISOString(),
    policy: "install-missing-only-never-overwrite-active-harness",
  };
  writeJson(path.join(paths.state, "packaged-harness.json"), releaseRecord);
  return { copied, manifest: releaseRecord };
}

module.exports = {
  copyDirectoryIfMissing,
  copyFileIfMissing,
  installHarness,
  packagedHarnessManifest,
};
