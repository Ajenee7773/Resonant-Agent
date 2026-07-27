const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const runtimeHome = fs.mkdtempSync(
  path.join(os.tmpdir(), "aligned-heartbeat-test-"),
);
process.env.RESONANT_HOME = runtimeHome;

const { PiRpcSession, buildSessionArgs } = require("../bridge/pi-rpc");
const { readJson, writeJson } = require("../core/json-store");
const { initializeRuntime } = require("../core/runtime");
const {
  classifyResponse,
  dueTasks,
  enqueueWakeEvent,
  parseWakeDirective,
  parseDuration,
  pendingWakeEvents,
  runHeartbeat,
  scheduledWakeDue,
} = require("../heartbeat/runner");

const runtime = initializeRuntime({
  runtimeHome,
  env: { RESONANT_HOME: runtimeHome },
  userHome: runtimeHome,
});
const settings = readJson(runtime.paths.settingsFile);
settings.interfaces.heartbeat.enabled = true;
settings.runtime.provider = "custom";
settings.runtime.model = "test-model";
settings.runtime.base_url = "http://127.0.0.1:55401/v1";
writeJson(runtime.paths.settingsFile, settings);
writeJson(path.join(runtime.paths.agent, "auth.json"), {
  provider: "custom",
  model: "test-model",
});

test.after(() => {
  fs.rmSync(runtimeHome, { recursive: true, force: true });
});

test("heartbeat duration and response contracts are strict", () => {
  assert.equal(parseDuration("15m", 1), 900000);
  assert.deepEqual(classifyResponse("HEARTBEAT_OK", 300), {
    ok: true,
    text: "",
  });
  assert.equal(classifyResponse("", 300).empty, true);
});

test("failed tasks wait for retry backoff instead of stacking", () => {
  const tasks = [{ name: "journal", interval: "1h", prompt: "Reflect." }];
  const now = Date.parse("2026-07-24T12:00:00Z");
  const state = {
    tasks: {
      journal: {
        lastSuccess: "2026-07-24T10:00:00Z",
        nextAttemptAt: "2026-07-24T12:15:00Z",
      },
    },
  };
  assert.equal(dueTasks(tasks, state, now).length, 0);
  assert.equal(dueTasks(tasks, state, now + 16 * 60 * 1000).length, 1);
});

test("entity-authored relative wakes are anchored once and consumed once", () => {
  const anchor = Date.parse("2026-07-25T12:00:00Z");
  const wake = parseWakeDirective(
    [
      "next_wake: in 5m",
      "wake_reason: Continue the saved work.",
      "```text",
      "next_wake: in 1s",
      "```",
    ].join("\n"),
    { mtimeMs: anchor },
  );
  assert.equal(wake.at, "2026-07-25T12:05:00.000Z");
  assert.equal(wake.reason, "Continue the saved work.");
  assert.equal(scheduledWakeDue(wake, {}, anchor + 4 * 60 * 1000), false);
  assert.equal(scheduledWakeDue(wake, {}, anchor + 6 * 60 * 1000), true);
  assert.equal(
    scheduledWakeDue(
      wake,
      {
        scheduledWake: {
          fingerprint: wake.fingerprint,
          status: "succeeded",
        },
      },
      anchor + 6 * 60 * 1000,
    ),
    false,
  );

  const rewritten = parseWakeDirective(
    "next_wake: in 5m\nwake_reason: Continue the saved work.",
    { mtimeMs: anchor + 1000 },
  );
  assert.notEqual(rewritten.fingerprint, wake.fingerprint);

  const absoluteOne = parseWakeDirective(
    "next_wake: 2026-07-25T13:00:00Z\nwake_reason: Fixed appointment.",
    { mtimeMs: anchor },
  );
  const absoluteTwo = parseWakeDirective(
    "next_wake: 2026-07-25T13:00:00Z\nwake_reason: Fixed appointment.",
    { mtimeMs: anchor + 1000 },
  );
  assert.equal(absoluteOne.fingerprint, absoluteTwo.fingerprint);
});

test("external wake events remain pending until a successful receipt", () => {
  const event = enqueueWakeEvent({
    prompt: "Handle the incoming local event.",
    source: "test-phone",
    notBefore: "2026-07-25T12:00:00Z",
  });
  const now = Date.parse("2026-07-25T12:01:00Z");
  assert.equal(
    pendingWakeEvents({ wakeEvents: {} }, now, 10, [event]).length,
    1,
  );
  assert.equal(
    pendingWakeEvents(
      {
        wakeEvents: {
          [event.id]: {
            status: "failed",
            nextAttemptAt: "2026-07-25T12:15:00Z",
          },
        },
      },
      now,
      10,
      [event],
    ).length,
    0,
  );
  assert.equal(
    pendingWakeEvents(
      {
        wakeEvents: {
          [event.id]: { status: "succeeded" },
        },
      },
      now + 60 * 60 * 1000,
      10,
      [event],
    ).length,
    0,
  );
});

test("a self-scheduled wake calls the model once and saves a durable receipt", async () => {
  const heartbeatFile = path.join(runtime.paths.agent, "HEARTBEAT.md");
  const original = fs.readFileSync(heartbeatFile, "utf8");
  fs.writeFileSync(
    heartbeatFile,
    [
      "next_wake: 2020-01-01T00:00:00Z",
      "wake_reason: Resume the bounded test.",
      "",
      "Check the saved test state.",
    ].join("\n"),
  );
  let prompt = "";
  try {
    const result = await runHeartbeat({
      runId: "heartbeat-self-schedule-test",
      piAvailableFn: () => true,
      sessionFactory: () => ({
        prompt: async (value) => {
          prompt = value;
          return "HEARTBEAT_OK";
        },
        stop: () => {},
      }),
    });
    assert.equal(result.status, "succeeded");
    assert.match(prompt, /Entity-authored scheduled wake:/);
    assert.match(prompt, /Resume the bounded test/);
    const state = readJson(path.join(runtime.paths.state, "heartbeat.json"));
    assert.equal(state.scheduledWake.status, "succeeded");
    assert.equal(state.scheduledWake.lastRunId, "heartbeat-self-schedule-test");

    const second = await runHeartbeat({
      piAvailableFn: () => {
        throw new Error("A consumed wake must not call the model.");
      },
    });
    assert.equal(second.status, "skipped");
    assert.equal(second.reason, "no-tasks-due");
  } finally {
    fs.writeFileSync(heartbeatFile, original);
  }
});

test("a failed external wake survives state reload and succeeds without duplication", async () => {
  const event = enqueueWakeEvent({
    prompt: "Resume this event after a transient model failure.",
    source: "test-restart",
  });
  await assert.rejects(
    runHeartbeat({
      runId: "heartbeat-event-failure-test",
      piAvailableFn: () => true,
      sessionFactory: () => ({
        prompt: async () => "",
        stop: () => {},
      }),
    }),
    /without a model response/,
  );

  const stateFile = path.join(runtime.paths.state, "heartbeat.json");
  const failed = readJson(stateFile);
  assert.equal(failed.wakeEvents[event.id].status, "failed");
  assert.ok(failed.wakeEvents[event.id].nextAttemptAt);
  assert.equal(pendingWakeEvents(failed).some((item) => item.id === event.id), false);

  failed.wakeEvents[event.id].nextAttemptAt = "2020-01-01T00:00:00Z";
  writeJson(stateFile, failed);
  const recovered = await runHeartbeat({
    runId: "heartbeat-event-recovery-test",
    piAvailableFn: () => true,
    sessionFactory: () => ({
      prompt: async () => "HEARTBEAT_OK",
      stop: () => {},
    }),
  });
  assert.equal(recovered.status, "succeeded");
  assert.equal(recovered.wakeEventIds.includes(event.id), true);

  const completed = readJson(stateFile);
  assert.equal(completed.wakeEvents[event.id].status, "succeeded");
  assert.equal(pendingWakeEvents(completed).some((item) => item.id === event.id), false);
});

test("Pi RPC prompt rejects when the model never completes", async () => {
  const session = new PiRpcSession({ timeoutMs: 20 });
  session.start = () => {};
  session.send = () => {};
  await assert.rejects(
    session.prompt("test", { timeoutMs: 20 }),
    /did not complete within/,
  );
});

test("Pi RPC forwards native image content with the prompt", async () => {
  const session = new PiRpcSession({ timeoutMs: 1000 });
  session.start = () => {};
  let command = null;
  session.send = (value) => {
    command = value;
    queueMicrotask(() => session.resolveCurrent("VISION_OK"));
  };
  const images = [
    {
      type: "image",
      data: Buffer.from("image-bytes").toString("base64"),
      mimeType: "image/png",
    },
  ];
  const result = await session.prompt("What is shown?", { images });
  assert.equal(result, "VISION_OK");
  assert.deepEqual(command, {
    type: "prompt",
    message: "What is shown?",
    images,
  });
});

test("Pi RPC stop rejects active generation without waiting for timeout", async () => {
  const session = new PiRpcSession({ timeoutMs: 60000 });
  session.start = () => {};
  session.send = () => {};
  const pending = session.prompt("keep working");
  session.stop();
  await assert.rejects(pending, /stopped before the response completed/);
  assert.equal(session.current, null);
});

test("Pi RPC sessions resume their most recent local history by default", () => {
  assert.deepEqual(
    buildSessionArgs({
      sessionDir: "C:\\private\\session",
      provider: "ollama",
      model: "gemma",
    }),
    [
      "--mode",
      "rpc",
      "--session-dir",
      "C:\\private\\session",
      "--continue",
      "--provider",
      "ollama",
      "--model",
      "gemma",
    ],
  );
  assert.equal(
    buildSessionArgs({
      sessionDir: "C:\\private\\fresh",
      resume: false,
    }).includes("--continue"),
    false,
  );
});

test("successful heartbeat writes a durable model receipt", async () => {
  const result = await runHeartbeat({
    force: true,
    runId: "heartbeat-success-test",
    piAvailableFn: () => true,
    sessionFactory: () => ({
      prompt: async () => "HEARTBEAT_OK",
      stop: () => {},
    }),
  });

  assert.equal(result.status, "succeeded");
  const state = readJson(path.join(runtime.paths.state, "heartbeat.json"));
  assert.equal(state.lastExecution.runId, "heartbeat-success-test");
  assert.equal(state.lastExecution.status, "succeeded");
  assert.equal(state.lastExecution.responseClass, "acknowledged");
  for (const task of Object.values(state.tasks)) {
    assert.equal(task.status, "succeeded");
    assert.ok(task.lastSuccess);
  }
});

test("empty model output is a failed heartbeat, never an acknowledgment", async () => {
  await assert.rejects(
    runHeartbeat({
      force: true,
      runId: "heartbeat-empty-test",
      piAvailableFn: () => true,
      sessionFactory: () => ({
        prompt: async () => "",
        stop: () => {},
      }),
    }),
    /without a model response/,
  );

  const state = readJson(path.join(runtime.paths.state, "heartbeat.json"));
  assert.equal(state.lastExecution.runId, "heartbeat-empty-test");
  assert.equal(state.lastExecution.status, "failed");
  for (const task of Object.values(state.tasks)) {
    assert.equal(task.status, "failed");
    assert.ok(task.nextAttemptAt);
  }
});
