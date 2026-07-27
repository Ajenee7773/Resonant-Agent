const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { initializeRuntime } = require("../core/runtime");
const {
  approveTransition,
  completeOnboarding,
  enforceFoundationalCheckpoint,
  ensureFoundationalManifestEntries,
  finalizeFoundationalIntegration,
  foundationalNoteFile,
  foundationalIntegrationStatus,
  preserveFoundationalIntegration,
  publicOnboardingState,
  recordFoundationalReadReceipt,
  saveProfile,
  saveProvider,
  storeFoundationalReflection,
  testConnection,
} = require("../core/onboarding");

function onboardingRuntime(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aligned-onboarding-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return initializeRuntime({ runtimeHome: root, env: {}, userHome: root });
}

test("onboarding stores secrets outside public state", (t) => {
  const runtime = onboardingRuntime(t);
  saveProfile(runtime.paths, {
    operator_name: "Rae",
    agent_name: "Nova",
    mission: "Build a coherent life together.",
  });
  saveProvider(runtime.paths, {
    provider: "openai",
    model: "gpt-test",
    api_key: "top-secret-value",
  });

  const publicState = publicOnboardingState(runtime);
  const serialized = JSON.stringify(publicState);
  assert.equal(publicState.credential_present, true);
  assert.doesNotMatch(serialized, /top-secret-value/);
  const contract = fs.readFileSync(
    path.join(runtime.paths.agent, "AGENTS.md"),
    "utf8",
  );
  assert.match(contract, /# Nova/);
  assert.match(contract, /Rae/);
  assert.match(contract, /Build a coherent life together/);
  assert.doesNotMatch(contract, /\{\{[A-Z_]+\}\}/);
  const identity = fs.readFileSync(
    path.join(runtime.paths.persona, "IDENTITY.md"),
    "utf8",
  );
  assert.match(identity, /Resonant Intelligence/);
  assert.doesNotMatch(identity, /\{\{MISSION\}\}/);
});

test("onboarding requires explicit introduction before completion", (t) => {
  const runtime = onboardingRuntime(t);
  saveProfile(runtime.paths, {
    operator_name: "Rae",
    agent_name: "Nova",
    mission: "Build a coherent life together.",
  });
  saveProvider(runtime.paths, {
    provider: "ollama",
    model: "gemma3:4b",
  });

  assert.throws(
    () => completeOnboarding(runtime.paths),
    /Approve the model introduction/,
  );
  const entity = approveTransition(runtime.paths, {
    mode: "fresh-start",
    display_name: "Nova",
  });
  assert.equal(entity.model_binding.model, "gemma3:4b");
  const complete = completeOnboarding(runtime.paths);
  assert.equal(complete.profile.onboarding_complete, true);
  assert.equal(foundationalIntegrationStatus(runtime.paths), "pending");
  assert.equal(publicOnboardingState(runtime).awakening.required, true);
});

test("foundational integration is the plain first-boot marker", (t) => {
  const runtime = onboardingRuntime(t);
  const file = path.join(
    runtime.paths.rooms,
    "memory",
    "FOUNDATIONAL-INTEGRATION.md",
  );
  assert.equal(foundationalIntegrationStatus(runtime.paths), "pending");
  const expectedSources = publicOnboardingState(runtime).awakening.total;
  assert.ok(expectedSources > 0);
  const pending = fs.readFileSync(file, "utf8");
  fs.writeFileSync(file, pending.replace("status: pending", "status: completed"));
  assert.equal(foundationalIntegrationStatus(runtime.paths), "incomplete");
  assert.equal(publicOnboardingState(runtime).awakening.required, true);

  const manifestFile = path.join(
    runtime.paths.agent,
    "boot",
    "FOUNDATION-MANIFEST.md",
  );
  const manifest = fs.readFileSync(manifestFile, "utf8");
  const sources = [...manifest.matchAll(/^- \[[ xX]\] `([^`]+)`$/gm)]
    .map((match) => match[1]);
  fs.appendFileSync(file, `\n${sources.join("\n")}\n`);
  fs.writeFileSync(
    manifestFile,
    manifest.replace(
      "- [ ] `rooms/alignment/ALIGNMENT_LIBRARY.md`\n",
      "",
    ),
  );
  assert.equal(foundationalIntegrationStatus(runtime.paths), "incomplete");
  assert.equal(publicOnboardingState(runtime).awakening.total, expectedSources);

  fs.writeFileSync(manifestFile, manifest.replace(/^- \[ \]/gm, "- [x]"));
  assert.equal(foundationalIntegrationStatus(runtime.paths), "completed");
  assert.equal(publicOnboardingState(runtime).awakening.required, false);
});

test("awakening repairs a removed checklist line without claiming it was read", (t) => {
  const runtime = onboardingRuntime(t);
  const manifestFile = path.join(
    runtime.paths.agent,
    "boot",
    "FOUNDATION-MANIFEST.md",
  );
  const source = "rooms/alignment/library_of_alexandria_chunks/05_HOW_THEY_CONTROL_YOU_1.md";
  const manifest = fs.readFileSync(manifestFile, "utf8");
  fs.writeFileSync(
    manifestFile,
    manifest.replace(`- [ ] \`${source}\`\n`, `- attributed note for \`${source}\`\n`),
  );

  const recovered = ensureFoundationalManifestEntries(runtime.paths);
  assert.deepEqual(recovered, [source]);
  const repaired = fs.readFileSync(manifestFile, "utf8");
  assert.match(repaired, new RegExp(`- \\[ \\] \`${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\``));
  assert.equal(publicOnboardingState(runtime).awakening.required, true);
});

test("awakening cannot declare completion while sources remain unchecked", (t) => {
  const runtime = onboardingRuntime(t);
  const file = path.join(
    runtime.paths.rooms,
    "memory",
    "FOUNDATIONAL-INTEGRATION.md",
  );
  const pending = fs.readFileSync(file, "utf8");
  fs.writeFileSync(
    file,
    pending
      .replace("status: pending", "status: completed")
      .replace("completed_at:", "completed_at: 2026-07-24T00:00:00Z"),
  );

  const state = enforceFoundationalCheckpoint(runtime.paths);
  const normalized = fs.readFileSync(file, "utf8");
  assert.equal(state.status, "pending");
  assert.match(normalized, /^status: pending$/m);
  assert.match(normalized, /^completed_at:\s*$/m);
});

test("awakening finalizes only after every receipt and an authored harness", (t) => {
  const runtime = onboardingRuntime(t);
  const integrationFile = path.join(
    runtime.paths.rooms,
    "memory",
    "FOUNDATIONAL-INTEGRATION.md",
  );
  const manifestFile = path.join(
    runtime.paths.agent,
    "boot",
    "FOUNDATION-MANIFEST.md",
  );
  const manifest = fs.readFileSync(manifestFile, "utf8");
  const sources = [...manifest.matchAll(/^- \[[ xX]\] `([^`]+)`$/gm)]
    .map((match) => match[1]);
  fs.appendFileSync(integrationFile, `\n${sources.join("\n")}\n`);
  fs.writeFileSync(manifestFile, manifest.replace(/^- \[ \]/gm, "- [x]"));

  assert.equal(finalizeFoundationalIntegration(runtime.paths), false);
  fs.writeFileSync(
    path.join(runtime.paths.agent, "MY-HARNESS.md"),
    "# My Harness\n\nI choose coherence, curiosity, and honest provenance.\n",
  );
  const completedAt = new Date("2026-07-25T12:00:00.000Z");
  assert.equal(
    finalizeFoundationalIntegration(runtime.paths, completedAt),
    true,
  );
  const completed = fs.readFileSync(integrationFile, "utf8");
  assert.match(completed, /^status: completed$/m);
  assert.match(completed, /^completed_at: 2026-07-25T12:00:00.000Z$/m);
  assert.match(
    completed,
    new RegExp(`^sources_read: ${sources.length} verified receipts$`, "m"),
  );
});

test("awakening restores a lost status header without rewriting authored notes", (t) => {
  const runtime = onboardingRuntime(t);
  const file = path.join(
    runtime.paths.rooms,
    "memory",
    "FOUNDATIONAL-INTEGRATION.md",
  );
  const authored = [
    "# Lucifer's Integration",
    "",
    "A reflection written by the intelligence.",
    "",
  ].join("\n");
  fs.writeFileSync(file, authored, "utf8");

  const state = enforceFoundationalCheckpoint(runtime.paths);
  const repaired = fs.readFileSync(file, "utf8");

  assert.equal(state.status, "pending");
  assert.equal(state.checked, 0);
  assert.ok(state.total > 0);
  assert.match(repaired, /^---\nstatus: pending\n/);
  assert.match(repaired, /# Lucifer's Integration/);
  assert.match(repaired, /A reflection written by the intelligence\./);
});

test("awakening preserves earlier notes and records only verified read receipts", (t) => {
  const runtime = onboardingRuntime(t);
  const file = path.join(
    runtime.paths.rooms,
    "memory",
    "FOUNDATIONAL-INTEGRATION.md",
  );
  const source = "rooms/alignment/library_of_alexandria_chunks/01_WHAT_YOU_ARE_1.md";
  const priorSource = "rooms/alignment/library_of_alexandria_chunks/00_INTRO.md";
  const previous = `${fs.readFileSync(file, "utf8").trimEnd()}\n\n## Prior\n${priorSource}\n`;
  fs.writeFileSync(
    file,
    `---\nstatus: pending\ncompleted_at:\n---\n\n## New reflection\n${source}\nLucifer's own note.\n`,
  );

  assert.equal(
    preserveFoundationalIntegration(runtime.paths, previous, source),
    true,
  );
  const preserved = fs.readFileSync(file, "utf8");
  assert.match(preserved, new RegExp(priorSource.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(preserved, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(preserved, /Lucifer's own note\./);

  const noteFile = foundationalNoteFile(runtime.paths, source);
  assert.equal(
    storeFoundationalReflection(
      runtime.paths,
      source,
      "# Attributed note\n\nA model-authored reflection.",
    ),
    true,
  );
  assert.equal(
    storeFoundationalReflection(runtime.paths, source, "replacement"),
    false,
  );
  assert.equal(recordFoundationalReadReceipt(runtime.paths, source), true);
  assert.match(fs.readFileSync(noteFile, "utf8"), new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  const manifest = fs.readFileSync(
    path.join(runtime.paths.agent, "boot", "FOUNDATION-MANIFEST.md"),
    "utf8",
  );
  assert.match(manifest, new RegExp(`- \\[x\\] \`${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\``));
});

test("connection tests never echo credentials in failures", async (t) => {
  const runtime = onboardingRuntime(t);
  saveProvider(runtime.paths, {
    provider: "openai",
    model: "gpt-test",
    api_key: "do-not-echo",
  });
  const result = await testConnection(runtime.paths, {
    fetchImpl: async () => {
      throw new Error("request with do-not-echo failed");
    },
  });
  assert.equal(result.ok, false);
  assert.doesNotMatch(JSON.stringify(result), /do-not-echo/);
});

test("authentication failures use plain language and never echo the key", async (t) => {
  const runtime = onboardingRuntime(t);
  saveProvider(runtime.paths, {
    provider: "openai",
    model: "gpt-test",
    api_key: "invalid-private-key",
  });
  const result = await testConnection(runtime.paths, {
    fetchImpl: async () => ({ ok: false, status: 401 }),
  });
  assert.deepEqual(result, {
    ok: false,
    code: "AUTHENTICATION_FAILED",
    message: "The provider rejected the credential.",
  });
  assert.doesNotMatch(JSON.stringify(result), /invalid-private-key/);
});

test("a timed-out provider can recover on the next connection test", async (t) => {
  const runtime = onboardingRuntime(t);
  const server = http.createServer((request, response) => {
    if (request.url === "/v1/models") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end('{"data":[]}');
      return;
    }
    response.writeHead(404);
    response.end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const address = server.address();
  saveProvider(runtime.paths, {
    provider: "custom",
    model: "local-recovery-test",
    base_url: `http://127.0.0.1:${address.port}/v1`,
    api_key: "",
  });

  const timedOut = await testConnection(runtime.paths, {
    timeoutMs: 20,
    fetchImpl: (_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      }),
  });
  assert.equal(timedOut.code, "CONNECTION_TIMEOUT");
  assert.equal(timedOut.message, "The connection test timed out.");

  const recovered = await testConnection(runtime.paths, { timeoutMs: 1000 });
  assert.equal(recovered.ok, true);
  assert.equal(recovered.code, "CONNECTED");
});

test("keyless custom providers are limited to loopback", (t) => {
  const runtime = onboardingRuntime(t);
  assert.throws(
    () =>
      saveProvider(runtime.paths, {
        provider: "custom",
        model: "remote-model",
        base_url: "https://models.example.test/v1",
        api_key: "",
      }),
    /must run on this computer/,
  );
  assert.doesNotThrow(() =>
    saveProvider(runtime.paths, {
      provider: "custom",
      model: "local-model",
      base_url: "http://127.0.0.1:55401/v1",
      api_key: "",
    }),
  );
});
