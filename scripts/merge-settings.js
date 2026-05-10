#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const requiredPackages = [
  "extensions/internet.ts",
  "extensions/desktop.ts",
  "extensions/memory.ts",
];

const settingsPath = process.argv[2];
const templatePath = process.argv[3];

if (!settingsPath) {
  console.error("Usage: node scripts/merge-settings.js <settings.json> [template-settings.json]");
  process.exit(1);
}

function readJson(file) {
  if (!file || !fs.existsSync(file)) return {};
  try {
    const raw = fs.readFileSync(file, "utf8").trim();
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    throw new Error(`Could not parse ${file}: ${error.message}`);
  }
}

const template = readJson(templatePath);
let settings = {};

if (fs.existsSync(settingsPath)) {
  settings = readJson(settingsPath);
} else {
  settings = { ...template };
}

if (!settings.resonant && template.resonant) {
  settings.resonant = template.resonant;
}

const currentPackages = Array.isArray(settings.packages)
  ? settings.packages
  : settings.packages
  ? [settings.packages]
  : [];

const normalized = currentPackages
  .filter((pkg) => typeof pkg === "string" && pkg.trim())
  .map((pkg) => pkg.replace(/\\/g, "/"));

for (const pkg of requiredPackages) {
  if (!normalized.includes(pkg)) normalized.push(pkg);
}

settings.packages = normalized;

fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
