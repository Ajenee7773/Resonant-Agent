const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function source(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

test("buyer interface exposes stop, voice recovery, and health repair controls", () => {
  const html = source("ui/public/index.html");
  const client = source("ui/public/app.js");
  const server = source("ui/server.js");

  assert.match(html, /resonant-agent-logo\.png/);
  assert.match(html, /class="genie-presence"/);
  assert.doesNotMatch(html, /class="eye"/);
  assert.match(html, /id="stopGeneration"/);
  assert.match(html, /id="roomsView"/);
  assert.match(html, /id="roomCatalog"/);
  assert.match(html, /id="activeRoomBadge"/);
  assert.match(html, /id="installLibrary"/);
  assert.match(html, /id="libraryFile"/);
  assert.match(html, /One click\. New context\. Same intelligence\./);
  assert.match(html, /id="resumeAwakening"/);
  assert.match(html, /id="fullOrientation"/);
  assert.match(html, /id="voiceStatus"[^>]*role="status"/);
  assert.match(
    html,
    /id="speakToggle"[^>]*class="icon-button active"[^>]*aria-pressed="true"/,
  );
  assert.match(html, /id="refreshHealth"/);
  assert.match(html, /id="stopService"/);
  assert.match(html, /id="heartbeatWake"/);
  assert.match(html, /class="sidebar-bottom-nav"[^>]*aria-label="Utilities"/);
  assert.match(html, /data-view="settings"[^>]*>[\s\S]*Settings/);
  assert.match(html, /id="settingsView"/);
  assert.match(html, /id="settingsProviderForm"/);
  assert.match(html, /id="settingsTransitionPanel"/);
  assert.match(html, /id="settingsTransitionMode"/);
  assert.match(html, /id="heartbeatSettingsForm"/);
  assert.match(html, /id="heartbeatEvery"/);
  assert.match(html, /id="heartbeatPrompt"/);
  assert.doesNotMatch(html, /data-view="memory"/);
  assert.doesNotMatch(html, /id="harnessView"/);
  assert.doesNotMatch(html, /id="harnessFileList"/);
  assert.doesNotMatch(client, /loadHarnessScope/);
  assert.match(client, /renderSettingsModel/);
  assert.match(client, /settingsProviderForm/);
  assert.match(client, /approveSettingsTransition/);
  assert.match(client, /"\/api\/heartbeat\/configure"/);
  assert.match(client, /Microphone access was denied/);
  assert.match(client, /Text conversation still works/);
  assert.match(
    client,
    /storedSpeakPreference === null \|\| storedSpeakPreference === "1"/,
  );
  assert.match(client, /speakText\(assistant\.text\)/);
  assert.match(client, /async function enterRoom\(room, options = \{\}\)/);
  assert.match(client, /async function exportLivingLibrary\(room, button\)/);
  assert.match(client, /"\/api\/v1\/rooms\/enter"/);
  assert.match(client, /"\/api\/v1\/rooms\/export"/);
  assert.match(client, /"\/api\/v1\/living-libraries\/install"/);
  assert.match(client, /async function installLibraryFile\(file\)/);
  assert.match(client, /addEventListener\("dragover"/);
  assert.match(client, /addEventListener\("drop"/);
  assert.match(client, /library-drop-active/);
  assert.match(client, /async function removeInstalledLibrary\(room, button\)/);
  assert.match(client, /"\/api\/v1\/living-libraries\/remove"/);
  assert.match(client, /REMOVE LIVING LIBRARY/);
  const removeFunction = client.slice(
    client.indexOf("async function removeInstalledLibrary"),
    client.indexOf("async function enterRoom"),
  );
  assert.doesNotMatch(removeFunction, /createNewConversation/);
  assert.match(removeFunction, /everything already understood will remain/);
  assert.match(client, /async function runFullOrientation\(\)/);
  assert.match(client, /heartbeatAction\("wake"/);
  assert.match(client, /"\/api\/v1\/orientation\/full"/);
  assert.match(client, /Rerun install\.bat/);
  assert.match(server, /url\.pathname === "\/api\/chat\/stop"/);
  assert.match(server, /url\.pathname === "\/api\/v1\/rooms"/);
  assert.match(server, /url\.pathname === "\/api\/v1\/rooms\/enter"/);
  assert.match(server, /url\.pathname === "\/api\/v1\/rooms\/export"/);
  assert.match(
    server,
    /url\.pathname === "\/api\/v1\/living-libraries\/install"/,
  );
  assert.match(
    server,
    /url\.pathname === "\/api\/v1\/living-libraries\/remove"/,
  );
  assert.match(server, /async function handleRemoveLivingLibrary\(req, res\)/);
  assert.match(server, /async function handleFullOrientation\(req, res\)/);
  assert.match(server, /url\.pathname === "\/api\/v1\/orientation\/full"/);
  assert.match(server, /preserveOrientationJournal\(runtime\.paths/);
  assert.match(server, /text: ORIENTATION_ONLINE_MESSAGE/);
  assert.match(server, /onText: \(\) => \{\}/);
  assert.match(server, /fs\.readFileSync\(masterIntegration, "utf8"\)/);
  assert.match(server, /const stopped = Boolean\(session\?\.current\)/);
  assert.match(server, /The model process stopped unexpectedly/);
  assert.match(source("bridge/pi-rpc.js"), /args\.push\("--continue"\)/);
  assert.match(client, /\[Response interrupted\./);
  assert.match(server, /const sourcesPerPass = 1/);
  assert.match(server, /pass <= 40/);
  assert.match(server, /current working directory is the private workspace root/);
  assert.match(server, /\.\.\/agent\/boot\/FOUNDATION-MANIFEST\.md/);
  assert.match(server, /rooms\/memory\/FOUNDATIONAL-INTEGRATION\.md/);
  assert.match(server, /OS owns that bookkeeping/);
  assert.match(server, /use Pi's write tool once/);
  assert.match(server, /Call the write tool before/);
  assert.match(server, /foundationalNoteFile/);
  assert.match(server, /recordFoundationalReadReceipt/);
  assert.match(server, /state\.missing\.slice\(0, sourcesPerPass\)/);
  assert.match(server, /stagnantPasses >= 4/);
  assert.match(server, /timeoutMs: 20 \* 60 \* 1000/);
  assert.match(server, /url\.pathname === "\/api\/v1\/system\/shutdown"/);
  assert.match(server, /enqueueWakeEvent/);
  assert.match(server, /action === "wake"/);
  assert.match(server, /action === "configure"/);
  assert.match(server, /if \(readHeartbeatStatus\(\)\.enabled\)/);
  assert.match(server, /payload\.confirmation !== "STOP AGENT OS"/);
  assert.match(server, /"AWAKENING_IN_PROGRESS"/);
  assert.match(server, /pathname === "\/api\/v1\/system\/awakening"/);
  assert.match(server, /awakening-control\.json/);
  assert.match(server, /owner-stopped/);
  assert.match(client, /followExistingAwakening/);
  assert.match(client, /initializeFirstAwakening/);
  assert.match(client, /payload\.paused/);
  assert.match(client, /Press Resume Awakening/);
});

test("Windows missing-Node errors provide an exact official installation path", () => {
  assert.match(source("install.ps1"), /https:\/\/nodejs\.org\/en\/download/);
  assert.match(source("start.ps1"), /https:\/\/nodejs\.org\/en\/download/);
});

test("Windows upgrades create a credential-free safety backup before replacing app files", () => {
  const installer = source("install.ps1");
  const backupScript = source("scripts/create-pre-upgrade-backup.js");
  assert.match(installer, /Creating a safe pre-upgrade backup/);
  assert.match(installer, /scripts\\create-pre-upgrade-backup\.js/);
  assert.match(backupScript, /createBackup\(paths/);
  assert.match(backupScript, /credentials excluded/);
});
