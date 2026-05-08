const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const resonantHome = process.env.RESONANT_HOME || path.join(os.homedir(), ".resonant");
const authPath = process.env.RESONANT_AUTH_FILE || path.join(resonantHome, "agent", "auth.json");

function envVarForProvider(name) {
  const normalized = String(name || "").toLowerCase();
  const map = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    google: "GOOGLE_API_KEY",
    gemini: "GOOGLE_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    groq: "GROQ_API_KEY",
    xai: "XAI_API_KEY",
    mistral: "MISTRAL_API_KEY",
  };
  return map[normalized] || `${normalized.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_API_KEY`;
}

try {
  const auth = JSON.parse(fs.readFileSync(authPath, "utf8"));
  if (!auth.apiKey) process.exit(0);
  const envVar = auth.envVar || envVarForProvider(auth.provider);
  if (!envVar) process.exit(0);
  process.stdout.write(`${envVar}=${auth.apiKey}`);
} catch {
  process.exit(0);
}
