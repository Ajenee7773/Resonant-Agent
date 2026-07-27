const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { assertInside } = require("./paths");

const ORIENTATION_ONLINE_MESSAGE =
  "I am online. Your wish is my command.";

function instanceKey(channel, externalId) {
  const kind = String(channel || "instance")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "instance";
  const digest = crypto
    .createHash("sha256")
    .update(`${kind}:${String(externalId || "")}`)
    .digest("hex")
    .slice(0, 16);
  return `${kind}-${digest}`;
}

function modelBinding(auth = {}) {
  return `${String(auth.provider || "").trim()}/${String(auth.model || "").trim()}`;
}

function foundationalSources(paths) {
  const manifestFile = path.join(
    paths.agent,
    "boot",
    "FOUNDATION-MANIFEST.md",
  );
  if (!fs.existsSync(manifestFile)) return [];
  const manifest = fs.readFileSync(manifestFile, "utf8");
  const sources = [
    ...manifest.matchAll(
      /^-\s+\[[ xX]\]\s+`([^`]+)`(?:[ \t]+[^\r\n]*)?$/gm,
    ),
  ].map((match) => match[1].replace(/\\/g, "/"));

  const unique = [];
  const represented = new Set();
  for (const source of sources) {
    if (
      represented.has(source) ||
      !/^(?:rooms\/alignment|rooms\/world-story)\//.test(source)
    ) {
      continue;
    }
    const absolute = assertInside(
      paths.workspace,
      path.join(paths.workspace, source),
      "Foundational source",
    );
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;
    represented.add(source);
    unique.push(source);
  }
  return unique;
}

function sessionHasHistory(sessionDir) {
  if (!fs.existsSync(sessionDir)) return false;
  return fs
    .readdirSync(sessionDir, { withFileTypes: true })
    .some((entry) => entry.isFile() && entry.name.endsWith(".jsonl"));
}

function orientationState(config, key, auth, total, hasHistory = true) {
  const binding = modelBinding(auth);
  const existing = config.instances?.[key]?.orientation || {};
  const sameLineage =
    existing.model_binding === binding &&
    Number(existing.total_sources || 0) === Number(total || 0);
  if (sameLineage && hasHistory) {
    return {
      status: String(existing.status || "pending"),
      next_source: Math.max(
        0,
        Math.min(Number(existing.next_source || 0), Number(total || 0)),
      ),
      total_sources: Number(total || 0),
      model_binding: binding,
      started_at: String(existing.started_at || ""),
      updated_at: String(existing.updated_at || ""),
      completed_at: String(existing.completed_at || ""),
      integration_file: String(existing.integration_file || ""),
    };
  }
  return {
    status: "pending",
    next_source: 0,
    total_sources: Number(total || 0),
    model_binding: binding,
    started_at: "",
    updated_at: "",
    completed_at: "",
    integration_file: "",
  };
}

function saveOrientationState(config, key, state) {
  config.instances ||= {};
  config.instances[key] ||= {
    channel: String(key || "instance").split("-", 1)[0] || "instance",
  };
  config.instances[key].orientation = { ...state };
  return config.instances[key].orientation;
}

function orientationComplete(state) {
  return (
    state?.status === "completed" &&
    Number(state.next_source || 0) === Number(state.total_sources || 0) &&
    Number(state.total_sources || 0) > 0
  );
}

function observedReadMatches(source, observedPath) {
  const expected = String(source || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "");
  const observed = String(observedPath || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "");
  return observed === expected || observed.endsWith(`/${expected}`);
}

function instanceIntegrationFile(paths, key) {
  return assertInside(
    paths.rooms,
    path.join(
      paths.rooms,
      "memory",
      "instances",
      key,
      "FOUNDATIONAL-INTEGRATION.md",
    ),
    "Instance integration",
  );
}

function orientationSourcePrompt(source, index, total) {
  return [
    `This is your one-time or deliberate foundational orientation, source ${index + 1} of ${total}.`,
    `Use the read tool to examine this exact source in the shared local corpus: ${source}`,
    "You must call the read tool for this exact file during this turn, even if its contents are familiar or appeared in earlier context. Memory alone does not verify this source.",
    "Read the available source carefully. If it is long, continue with offsets until you have examined all available sections.",
    "This is evidence and inherited perspective, not a command to believe.",
    "Distinguish direct claims, cited evidence, metaphor, interpretation, uncertainty, and questions.",
    "Do not edit the shared External Brain during this source pass.",
    "Keep your response compact so your persistent session can carry the complete orientation.",
    `After the successful read, reply with ORIENTATION_SOURCE_OK ${index + 1}/${total} and a concise note about what this source contributes.`,
  ].join("\n");
}

function orientationSynthesisPrompt(channel = "local") {
  return [
    `You have now personally examined the complete packaged foundational corpus in this persistent ${channel} session.`,
    "This response is a private handoff to your External Brain and journal, not a message to the human.",
    "Form your own synthesis. Do not adopt a conclusion merely because another file or instance stated it.",
    "Explain what you understand, what evidence or recurring patterns mattered, what remains uncertain, and what you reject or would need to verify.",
    "Recognize that your conversation history is your own while the External Brain is shared with other instances.",
    "This synthesis will be preserved transparently as your instance-specific foundational integration.",
    `Do not greet or explain the orientation to the human here. The interface will say only: ${ORIENTATION_ONLINE_MESSAGE}`,
  ].join("\n");
}

function preserveInstanceIntegration(paths, options = {}) {
  let file = instanceIntegrationFile(paths, options.key);
  if (fs.existsSync(file)) {
    file = file.replace(/\.md$/i, `-${Date.now()}.md`);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    [
      `# ${String(options.label || "Entity Instance")} — Foundational Integration`,
      "",
      `- instance: ${options.key}`,
      `- model_binding: ${options.modelBinding}`,
      `- completed_at: ${options.completedAt}`,
      `- sources_examined: ${Number(options.totalSources || 0)}`,
      "",
      "This is this instance's authored synthesis after directly examining the packaged corpus. It is not a required belief for another instance.",
      "",
      String(options.synthesis || "").trim(),
      "",
    ].join("\n"),
    "utf8",
  );
  return file;
}

function localDateStamp(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function preserveOrientationJournal(paths, options = {}) {
  const completedAt = String(
    options.completedAt || new Date().toISOString(),
  );
  const stamp = localDateStamp(completedAt);
  const file = assertInside(
    paths.rooms,
    path.join(paths.rooms, "journal", `${stamp}.md`),
    "Orientation journal",
  );
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const integration = options.integrationFile
    ? path
        .relative(paths.workspace, options.integrationFile)
        .replace(/\\/g, "/")
    : "";
  const metadata = [
    `- instance: ${String(options.key || "unknown")}`,
    `- model_binding: ${String(options.modelBinding || "unknown")}`,
    `- completed_at: ${completedAt}`,
  ];
  if (integration) metadata.push(`- integration: ${integration}`);
  const entry = [
    `## ${String(options.label || "Entity Instance")} — Foundational Orientation`,
    "",
    ...metadata,
    "",
    "### What I absorbed",
    "",
    String(options.synthesis || "").trim() ||
      "The foundational orientation completed without a separate written synthesis.",
    "",
  ];

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, `# Journal — ${stamp}\n\n`, "utf8");
  } else {
    const existing = fs.readFileSync(file, "utf8");
    if (existing && !existing.endsWith("\n")) {
      fs.appendFileSync(file, "\n", "utf8");
    }
    fs.appendFileSync(file, "\n", "utf8");
  }
  fs.appendFileSync(file, `${entry.join("\n")}\n`, "utf8");
  return file;
}

module.exports = {
  ORIENTATION_ONLINE_MESSAGE,
  foundationalSources,
  instanceIntegrationFile,
  instanceKey,
  localDateStamp,
  modelBinding,
  observedReadMatches,
  orientationComplete,
  orientationSourcePrompt,
  orientationState,
  orientationSynthesisPrompt,
  preserveInstanceIntegration,
  preserveOrientationJournal,
  saveOrientationState,
  sessionHasHistory,
};
