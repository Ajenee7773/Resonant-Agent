const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { PiRpcSession } = require("../bridge/pi-rpc");
const { saveProvider, testConnection } = require("../core/onboarding");
const { initializeRuntime } = require("../core/runtime");

const MODEL =
  process.env.RESONANT_GEMINI_TEST_MODEL ||
  process.env.ALIGNED_GEMINI_TEST_MODEL ||
  "gemini-flash-latest";
const EXPECTED = "GEMINI_OS_SMOKE_OK";

function redact(value, secret) {
  return String(value || "")
    .split(secret)
    .join("[credential removed]")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[credential removed]");
}

async function main() {
  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("Enter a Gemini API key in the secure local prompt first.");
  }

  const previousHome = process.env.RESONANT_HOME;
  const previousResonantHome = process.env.RESONANT_HOME;
  const previousPiHome = process.env.PI_CODING_AGENT_DIR;
  const temporaryHome = fs.mkdtempSync(
    path.join(os.tmpdir(), "aligned-gemini-smoke-"),
  );
  let session;
  let credentialsFile = "";

  try {
    process.env.RESONANT_HOME = temporaryHome;
    process.env.RESONANT_HOME = temporaryHome;
    process.env.PI_CODING_AGENT_DIR = path.join(temporaryHome, "agent");

    const runtime = initializeRuntime({
      runtimeHome: temporaryHome,
      env: {
        RESONANT_HOME: temporaryHome,
      },
      userHome: os.homedir(),
    });
    credentialsFile = runtime.paths.credentialsFile;

    saveProvider(runtime.paths, {
      provider: "google",
      model: MODEL,
      api_key: apiKey,
    });

    const connection = await testConnection(runtime.paths, {
      timeoutMs: 20_000,
    });
    if (!connection.ok) {
      throw new Error(connection.message || "Gemini connection test failed.");
    }
    console.log(`Connection passed: Google Gemini (${MODEL})`);

    session = new PiRpcSession({
      cwd: runtime.paths.workspace,
      sessionDir: path.join(runtime.paths.data, "sessions", "gemini-smoke"),
      provider: "google",
      model: MODEL,
      timeoutMs: 120_000,
    });
    const response = await session.prompt(
      `Reply with exactly ${EXPECTED} and nothing else. Do not use tools.`,
    );
    if (String(response || "").trim() !== EXPECTED) {
      throw new Error("Gemini responded, but the exact smoke-test receipt was missing.");
    }
    console.log(`Generation passed: ${EXPECTED}`);
    console.log("Disposable Gemini runtime removed. Lucifer was not changed.");
  } catch (error) {
    throw new Error(redact(error.message, apiKey));
  } finally {
    session?.stop({ rejectCurrent: false });
    delete process.env.GEMINI_API_KEY;
    if (credentialsFile) {
      fs.rmSync(credentialsFile, { force: true });
    }
    if (previousHome === undefined) delete process.env.RESONANT_HOME;
    else process.env.RESONANT_HOME = previousHome;
    if (previousResonantHome === undefined) delete process.env.RESONANT_HOME;
    else process.env.RESONANT_HOME = previousResonantHome;
    if (previousPiHome === undefined) delete process.env.PI_CODING_AGENT_DIR;
    else process.env.PI_CODING_AGENT_DIR = previousPiHome;
    fs.rmSync(temporaryHome, {
      recursive: true,
      force: true,
      maxRetries: 20,
      retryDelay: 250,
    });
  }
}

main().catch((error) => {
  console.error(`Gemini smoke test failed: ${error.message}`);
  process.exitCode = 1;
});
