#!/usr/bin/env node

const { initializeRuntime } = require("./runtime");

function main() {
  const result = initializeRuntime();
  const summary = {
    ok: true,
    runtime_home: result.home,
    onboarding_complete: result.onboardingComplete,
    legacy_import_available: result.legacyAvailable,
    created: result.created,
    harness_files_added: result.copiedHarnessFiles,
    entity: {
      id: result.entity.id,
      name: result.entity.display_name,
      status: result.entity.status,
    },
    model_transition_required: Boolean(result.pendingTransition),
    provider: result.provider,
  };
  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }
  console.log("RESONANT Agent runtime is ready.");
  console.log(`Home: ${summary.runtime_home}`);
  console.log(`Entity: ${summary.entity.name} (${summary.entity.status})`);
  console.log(
    `Model: ${summary.provider.configured ? `${summary.provider.provider} / ${summary.provider.model}` : "not configured"}`,
  );
  console.log(`Onboarding: ${summary.onboarding_complete ? "complete" : "required"}`);
  if (summary.model_transition_required) {
    console.log("Model introduction or lineage confirmation is required before first launch.");
  }
  if (summary.legacy_import_available) {
    console.log("A legacy Resonant runtime is available to import from the onboarding screen.");
  }
}

try {
  main();
} catch (error) {
  console.error(`RESONANT Agent setup failed: ${error.message}`);
  process.exitCode = 1;
}
