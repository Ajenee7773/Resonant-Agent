const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("customer package includes the one-click resident-agent starter", () => {
  const start = read("resident-agents/start-resident-agents.ps1");
  const register = read("resident-agents/register-resident-agent.ps1");
  const batch = read("resident-agents/Start Resident Agents.bat");
  const installer = read("install.ps1");

  assert.match(start, /resident-agents\.json/);
  assert.match(start, /Start-ResidentLauncher/);
  assert.match(start, /\[READY\]/);
  assert.match(register, /aligned-resident-agents/);
  assert.match(register, /Move-Item[^\n]+-Force/);
  assert.match(batch, /start-resident-agents\.ps1/);
  assert.match(installer, /register-resident-agent\.ps1/);
  assert.match(installer, /InstallDesktopStarter/);
});
