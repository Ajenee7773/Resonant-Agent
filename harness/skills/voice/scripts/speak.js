#!/usr/bin/env node
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function resonantHome() {
  return process.env.RESONANT_HOME || path.join(os.homedir(), ".resonant");
}

const stateDir = path.join(resonantHome(), "agent", "voice");
const pidFile = path.join(stateDir, "speak.pid");

function usage(exitCode = 0) {
  const out = exitCode ? console.error : console.log;
  out("Usage: speak \"text\" [--voice NAME] [--rate N] [--volume N] [--wait]");
  out("       speak --stop");
  out("       speak --list-voices");
  process.exit(exitCode);
}

function parseArgs(argv) {
  const options = {
    text: [],
    voice: process.env.RESONANT_TTS_VOICE || "",
    rate: process.env.RESONANT_TTS_RATE || "",
    volume: process.env.RESONANT_TTS_VOLUME || "",
    stop: false,
    wait: false,
    listVoices: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") usage(0);
    if (arg === "--stop") {
      options.stop = true;
    } else if (arg === "--wait") {
      options.wait = true;
    } else if (arg === "--list-voices") {
      options.listVoices = true;
    } else if (arg === "--voice") {
      options.voice = argv[++i] || "";
    } else if (arg === "--rate") {
      options.rate = argv[++i] || "";
    } else if (arg === "--volume") {
      options.volume = argv[++i] || "";
    } else {
      options.text.push(arg);
    }
  }

  return options;
}

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve("");
      return;
    }
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      input += chunk;
    });
    process.stdin.on("end", () => resolve(input));
  });
}

function commandExists(command) {
  const checker = process.platform === "win32" ? "where" : "command";
  const args = process.platform === "win32" ? [command] : ["-v", command];
  return spawnSync(checker, args, { stdio: "ignore", shell: process.platform !== "win32" }).status === 0;
}

function rememberPid(pid) {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(pidFile, String(pid), "utf8");
}

function stopSpeaking() {
  let stopped = false;
  try {
    const pid = Number(fs.readFileSync(pidFile, "utf8").trim());
    if (pid) {
      process.kill(pid);
      stopped = true;
    }
  } catch {
    // Stale or missing pid file.
  }

  if (process.platform === "darwin") {
    spawnSync("killall", ["say"], { stdio: "ignore" });
  }

  try {
    fs.rmSync(pidFile, { force: true });
  } catch {
    // Nothing to remove.
  }

  if (stopped) console.log("Stopped speech.");
}

function listVoices() {
  if (process.platform === "darwin") {
    spawnSync("say", ["-v", "?"], { stdio: "inherit" });
    return;
  }

  if (process.platform === "win32") {
    const script = [
      "$s = New-Object -ComObject SAPI.SpVoice",
      "$s.GetVoices() | ForEach-Object { $_.GetDescription() }",
    ].join("; ");
    spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], { stdio: "inherit" });
    return;
  }

  if (commandExists("espeak")) {
    spawnSync("espeak", ["--voices"], { stdio: "inherit" });
  } else if (commandExists("spd-say")) {
    console.log("spd-say is available. Voice listing is not standardized.");
  } else {
    console.error("No speech engine found. Install espeak-ng or speech-dispatcher.");
    process.exit(1);
  }
}

function clampInt(value, min, max) {
  if (value === "" || value === undefined) return "";
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return "";
  return String(Math.max(min, Math.min(max, parsed)));
}

function buildCommand(text, options) {
  if (process.platform === "darwin") {
    const args = [];
    if (options.voice) args.push("-v", options.voice);
    if (options.rate) args.push("-r", clampInt(options.rate, 80, 450));
    args.push(text);
    return { command: "say", args, env: process.env };
  }

  if (process.platform === "win32") {
    const script = [
      "$s = New-Object -ComObject SAPI.SpVoice",
      "if ($env:RESONANT_TTS_VOICE) { $match = $s.GetVoices() | Where-Object { $_.GetDescription() -like ('*' + $env:RESONANT_TTS_VOICE + '*') } | Select-Object -First 1; if ($match) { $s.Voice = $match } }",
      "if ($env:RESONANT_TTS_RATE) { $s.Rate = [int]$env:RESONANT_TTS_RATE }",
      "if ($env:RESONANT_TTS_VOLUME) { $s.Volume = [int]$env:RESONANT_TTS_VOLUME }",
      "$s.Speak($env:RESONANT_TTS_TEXT)",
    ].join("; ");
    return {
      command: "powershell.exe",
      args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
      env: {
        ...process.env,
        RESONANT_TTS_TEXT: text,
        RESONANT_TTS_VOICE: options.voice || "",
        RESONANT_TTS_RATE: clampInt(options.rate, -10, 10),
        RESONANT_TTS_VOLUME: clampInt(options.volume || 100, 0, 100),
      },
    };
  }

  if (commandExists("spd-say")) {
    const args = [];
    if (options.rate) args.push("-r", clampInt(options.rate, -100, 100));
    args.push(text);
    return { command: "spd-say", args, env: process.env };
  }

  if (commandExists("espeak")) {
    const args = [];
    if (options.voice) args.push("-v", options.voice);
    if (options.rate) args.push("-s", clampInt(options.rate, 80, 450));
    args.push(text);
    return { command: "espeak", args, env: process.env };
  }

  console.error("No speech engine found. Install espeak-ng or speech-dispatcher.");
  process.exit(1);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.stop) {
    stopSpeaking();
    return;
  }

  if (options.listVoices) {
    listVoices();
    return;
  }

  let text = options.text.join(" ").trim();
  if (!text) text = (await readStdin()).trim();
  if (!text) usage(1);

  const { command, args, env } = buildCommand(text, options);
  const child = spawn(command, args, {
    detached: !options.wait,
    env,
    stdio: options.wait ? "inherit" : "ignore",
    windowsHide: true,
  });

  child.on("error", (error) => {
    console.error(`speak failed: ${error.message}`);
    process.exit(1);
  });

  if (options.wait) {
    child.on("exit", (code) => process.exit(code || 0));
  } else {
    rememberPid(child.pid);
    child.unref();
  }
}

main().catch((error) => {
  console.error(`speak failed: ${error.message}`);
  process.exit(1);
});
