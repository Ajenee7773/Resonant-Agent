#!/usr/bin/env node

const { createBackup } = require("../core/data-control");
const { runtimeHome, runtimePaths } = require("../core/paths");

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

try {
  const paths = runtimePaths(runtimeHome());
  const result = createBackup(paths, {
    filename: `resonant-agent-backup-pre-upgrade-${timestamp()}.json`,
  });
  process.stdout.write(
    `Pre-upgrade backup: ${result.path} (${result.file_count} files; credentials excluded)\n`,
  );
} catch (error) {
  process.stderr.write(`Pre-upgrade backup failed: ${error.message}\n`);
  process.exitCode = 1;
}
