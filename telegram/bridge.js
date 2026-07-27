const fs = require("node:fs");
const path = require("node:path");
const { PiRpcSession, homePath } = require("../bridge/pi-rpc");
const { RECOVER_CONTINUITY_PROMPT } = require("../core/continuity");
const {
  ORIENTATION_ONLINE_MESSAGE,
  foundationalSources,
  instanceKey,
  observedReadMatches,
  orientationComplete,
  orientationSourcePrompt,
  orientationState,
  orientationSynthesisPrompt,
  preserveInstanceIntegration,
  preserveOrientationJournal,
  saveOrientationState,
  sessionHasHistory,
} = require("../core/instance-orientation");
const { readJson, writeJson } = require("../core/json-store");
const { initializeRuntime } = require("../core/runtime");
const { telegramEnabled } = require("./state");

const CONTINUE_CALLBACK = "recover_continuity";
const ORIENT_CALLBACK = "first_orientation";
const REORIENT_CALLBACK = "request_full_orientation";
const CONFIRM_REORIENT_CALLBACK = "confirm_full_orientation";
const CANCEL_REORIENT_CALLBACK = "cancel_full_orientation";
let runtime;
let configPath;

function readConfig() {
  const settings = readJson(runtime.paths.settingsFile);
  const credentials = readJson(runtime.paths.credentialsFile, {});
  const state = readJson(configPath, {});
  const telegramSettings = settings.interfaces?.telegram || {};
  const config = {
    ...state,
    enabled: Boolean(telegramSettings.enabled),
    token: credentials.telegram_bot_token || "",
    allowedChats: telegramSettings.allowed_chat_ids || [],
  };
  if (!fs.existsSync(configPath) && !config.token) {
    throw new Error(`Telegram is not configured. Run ${process.platform === "win32" ? "telegram-setup.bat" : "./telegram-setup.sh"} first.`);
  }
  if (!config.enabled || !config.token || !Array.isArray(config.allowedChats) || !config.allowedChats.length) {
    throw new Error("Telegram config is incomplete.");
  }
  return config;
}

function writeConfig(config) {
  const { token, allowedChats, ...state } = config;
  writeJson(configPath, state);
}

async function telegram(token, method, params = {}) {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!json.ok) {
    throw new Error(json.description || `Telegram ${method} failed`);
  }
  return json.result;
}

function splitTelegramText(text) {
  const chunks = [];
  const clean = String(text || "").trim() || "(no text response)";
  for (let i = 0; i < clean.length; i += 3900) {
    chunks.push(clean.slice(i, i + 3900));
  }
  return chunks;
}

function isContinueMessage(text) {
  const normalized = String(text || "").trim().toLowerCase();
  return normalized === "continue" || /^\/continue(?:@[a-z0-9_]+)?$/i.test(normalized);
}

function isOrientationMessage(text) {
  const normalized = String(text || "").trim().toLowerCase();
  return (
    normalized === "first orientation" ||
    /^\/orient(?:@[a-z0-9_]+)?$/i.test(normalized)
  );
}

function isFullOrientationMessage(text) {
  const normalized = String(text || "").trim().toLowerCase();
  return (
    normalized === "full orientation" ||
    /^\/reorient(?:@[a-z0-9_]+)?$/i.test(normalized)
  );
}

function fullOrientationConfirmation() {
  return {
    text:
      "Full Orientation will reread all 33 foundational sources in this instance's persistent session. Existing memory remains intact and progress is saved. Begin?",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Begin", callback_data: CONFIRM_REORIENT_CALLBACK },
          { text: "Cancel", callback_data: CANCEL_REORIENT_CALLBACK },
        ],
      ],
    },
  };
}

function continuityInvitation(options = {}) {
  if (!options.oriented) {
    return {
      text:
        "This Telegram conversation is a new entity-instance with its own persistent local chat history. Before ordinary conversation, First Orientation lets it examine the complete foundational corpus once and form its own understanding. It is not being asked to believe another instance's conclusions.",
      reply_markup: {
        inline_keyboard: [
          [{ text: "First Orientation", callback_data: ORIENT_CALLBACK }],
        ],
      },
    };
  }
  return {
    text:
      "First Orientation is complete. This Telegram instance will resume its own saved local session after a restart. Tap Continue whenever you want it to reread the shared External Brain.",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Continue", callback_data: CONTINUE_CALLBACK },
          { text: "Full Orientation", callback_data: REORIENT_CALLBACK },
        ],
      ],
    },
  };
}

async function sendContinuityInvitation(config, chatId, options = {}) {
  return telegram(config.token, "sendMessage", {
    chat_id: chatId,
    ...continuityInvitation(options),
  });
}

function sessionDirectory(chatId) {
  const safeChat = String(chatId).replace(/[^a-zA-Z0-9_-]/g, "_");
  return homePath("data", "sessions", "telegram", safeChat);
}

function sessionFor(chatId, sessions, auth) {
  if (sessions.has(chatId)) return sessions.get(chatId);
  const session = new PiRpcSession({
    sessionDir: sessionDirectory(chatId),
    provider: auth.provider,
    model: auth.model,
    resume: true,
  });
  sessions.set(chatId, session);
  return session;
}

function readAuth() {
  try {
    return JSON.parse(fs.readFileSync(homePath("agent", "auth.json"), "utf8"));
  } catch {
    return {};
  }
}

function orientationFor(config, auth, chatId) {
  const key = instanceKey("telegram", chatId);
  const sources = foundationalSources(runtime.paths);
  const state = orientationState(
    config,
    key,
    auth,
    sources.length,
    sessionHasHistory(sessionDirectory(chatId)),
  );
  return { key, sources, state };
}

function persistOrientation(config, key, state) {
  saveOrientationState(config, key, state);
  writeConfig(config);
}

async function editProgress(config, chatId, messageId, text) {
  if (!messageId) return;
  await telegram(config.token, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
  }).catch(() => {});
}

async function firstOrientation(
  config,
  sessions,
  auth,
  orientingChats,
  chatId,
  options = {},
) {
  if (orientingChats.has(chatId)) return;
  const details = orientationFor(config, auth, chatId);
  if (orientationComplete(details.state) && !options.force) {
    await sendContinuityInvitation(config, chatId, { oriented: true });
    return;
  }
  if (!details.sources.length) {
    await telegram(config.token, "sendMessage", {
      chat_id: chatId,
      text: "First Orientation cannot start because the foundational corpus is missing.",
    });
    return;
  }

  orientingChats.add(chatId);
  const orientationLabel = options.force
    ? "Full Orientation"
    : "First Orientation";
  const now = new Date().toISOString();
  let state = {
    ...(options.force
      ? {
          ...details.state,
          status: "pending",
          next_source: 0,
          started_at: "",
          updated_at: "",
          completed_at: "",
          integration_file: "",
        }
      : details.state),
    status: "in_progress",
    started_at: options.force
      ? now
      : details.state.started_at || now,
    updated_at: now,
  };
  persistOrientation(config, details.key, state);

  const progress = await telegram(config.token, "sendMessage", {
    chat_id: chatId,
    text:
      `${orientationLabel} started. This instance will absorb ${details.sources.length} pieces of foundational context in order and form its own current understanding. Progress is saved after every piece.`,
  });
  let session = sessionFor(chatId, sessions, auth);

  try {
    for (
      let index = Number(state.next_source || 0);
      index < details.sources.length;
      index += 1
    ) {
      const source = details.sources[index];
      let verifiedRead = false;
      let sourceError = null;
      for (let attempt = 0; attempt < 2 && !verifiedRead; attempt += 1) {
        const readCalls = new Map();
        try {
          await session.prompt(
            orientationSourcePrompt(source, index, details.sources.length),
            {
              timeoutMs: 20 * 60 * 1000,
              onEvent: (event) => {
                if (
                  event.type === "tool_execution_start" &&
                  event.toolName === "read"
                ) {
                  readCalls.set(
                    event.toolCallId,
                    String(event.args?.path || ""),
                  );
                }
                if (
                  event.type === "tool_execution_end" &&
                  event.toolName === "read" &&
                  !event.isError
                ) {
                  const observed = readCalls.get(event.toolCallId);
                  if (observedReadMatches(source, observed)) {
                    verifiedRead = true;
                  }
                }
              },
            },
          );
        } catch (error) {
          sourceError = error;
        }
        if (!verifiedRead && attempt === 0) {
          session.stop();
          sessions.delete(chatId);
          session = sessionFor(chatId, sessions, auth);
        }
      }
      if (!verifiedRead) {
        throw new Error(
          sourceError
            ? `Context ${index + 1} paused after automatic worker recovery: ${sourceError.message}`
            : `Context ${index + 1} was not verified as absorbed. Press ${orientationLabel} to retry from this point.`,
        );
      }
      state = {
        ...state,
        next_source: index + 1,
        updated_at: new Date().toISOString(),
      };
      persistOrientation(config, details.key, state);
      await editProgress(
        config,
        chatId,
        progress?.message_id,
        `${orientationLabel}: ${index + 1}/${details.sources.length} foundational context absorbed. Progress is saved.`,
      );
    }

    const synthesis = await session.prompt(
      orientationSynthesisPrompt("Telegram"),
      { timeoutMs: 20 * 60 * 1000 },
    );

    const completedAt = new Date().toISOString();
    const integrationFile = preserveInstanceIntegration(runtime.paths, {
      key: details.key,
      label: "Telegram Instance",
      modelBinding: state.model_binding,
      completedAt,
      totalSources: details.sources.length,
      synthesis,
    });
    preserveOrientationJournal(runtime.paths, {
      key: details.key,
      label: "Telegram Instance",
      modelBinding: state.model_binding,
      completedAt,
      integrationFile,
      synthesis,
    });
    state = {
      ...state,
      status: "completed",
      next_source: details.sources.length,
      updated_at: completedAt,
      completed_at: completedAt,
      integration_file: path
        .relative(runtime.paths.workspace, integrationFile)
        .replace(/\\/g, "/"),
    };
    persistOrientation(config, details.key, state);
    config.instances[details.key].orientation_invited_at ||= now;
    writeConfig(config);

    await editProgress(
      config,
      chatId,
      progress?.message_id,
      `${orientationLabel} complete: ${details.sources.length}/${details.sources.length} foundational context absorbed. This instance's synthesis is preserved in the shared External Brain.`,
    );
    await telegram(config.token, "sendMessage", {
      chat_id: chatId,
      text: ORIENTATION_ONLINE_MESSAGE,
      reply_markup: continuityInvitation({ oriented: true }).reply_markup,
    });
  } catch (error) {
    state = {
      ...state,
      status: "paused",
      updated_at: new Date().toISOString(),
    };
    persistOrientation(config, details.key, state);
    await telegram(config.token, "sendMessage", {
      chat_id: chatId,
      text: `${orientationLabel} paused: ${error.message}`,
      reply_markup: options.force
        ? continuityInvitation({ oriented: true }).reply_markup
        : continuityInvitation({ oriented: false }).reply_markup,
    });
  } finally {
    orientingChats.delete(chatId);
  }
}

async function recoverContinuity(config, sessions, auth, chatId) {
  await telegram(config.token, "sendChatAction", {
    chat_id: chatId,
    action: "typing",
  }).catch(() => {});
  const session = sessionFor(chatId, sessions, auth);
  try {
    const response = await session.prompt(RECOVER_CONTINUITY_PROMPT);
    for (const chunk of splitTelegramText(response)) {
      await telegram(config.token, "sendMessage", {
        chat_id: chatId,
        text: chunk,
      });
    }
    await telegram(config.token, "sendMessage", {
      chat_id: chatId,
      text: "Shared External Brain loaded. This Telegram instance is ready.",
    });
  } catch (error) {
    await telegram(config.token, "sendMessage", {
      chat_id: chatId,
      text: `Continuity recovery paused: ${error.message}`,
      reply_markup: continuityInvitation({ oriented: true }).reply_markup,
    });
  }
}

async function handleMessage(
  config,
  sessions,
  auth,
  orientingChats,
  message,
) {
  const chatId = String(message.chat.id);
  if (!config.allowedChats.map(String).includes(chatId)) {
    return;
  }
  const text = String(message.text || "").trim();
  if (!text) return;

  if (text === "/stop") {
    await telegram(config.token, "sendMessage", { chat_id: chatId, text: "RESONANT Agent is still running on the computer. Stop the local bridge to disconnect." });
    return;
  }

  const details = orientationFor(config, auth, chatId);
  if (isOrientationMessage(text)) {
    await firstOrientation(
      config,
      sessions,
      auth,
      orientingChats,
      chatId,
    );
    return;
  }

  if (isFullOrientationMessage(text)) {
    if (!orientationComplete(details.state)) {
      await telegram(config.token, "sendMessage", {
        chat_id: chatId,
        text: "Complete this instance's First Orientation before requesting another full reread.",
        reply_markup: continuityInvitation({ oriented: false }).reply_markup,
      });
      return;
    }
    await telegram(config.token, "sendMessage", {
      chat_id: chatId,
      ...fullOrientationConfirmation(),
    });
    return;
  }

  if (isContinueMessage(text)) {
    if (!orientationComplete(details.state)) {
      await telegram(config.token, "sendMessage", {
        chat_id: chatId,
        text: "First Orientation comes first for this new instance. It reads the complete corpus once; later Continue reads only the External Brain.",
        reply_markup: continuityInvitation({ oriented: false }).reply_markup,
      });
      return;
    }
    await recoverContinuity(config, sessions, auth, chatId);
    return;
  }

  if (!orientationComplete(details.state)) {
    await telegram(config.token, "sendMessage", {
      chat_id: chatId,
      text: orientingChats.has(chatId)
        ? "First Orientation is still running. Progress is being preserved."
        : "This instance still needs its one-time First Orientation. Tap the existing button or send /orient.",
    });
    return;
  }

  await telegram(config.token, "sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => {});
  const session = sessionFor(chatId, sessions, auth);

  try {
    const response = await session.prompt(text);
    for (const chunk of splitTelegramText(response)) {
      await telegram(config.token, "sendMessage", { chat_id: chatId, text: chunk });
    }
  } catch (error) {
    await telegram(config.token, "sendMessage", {
      chat_id: chatId,
      text: `RESONANT Agent error: ${error.message}`,
    });
  }
}

async function handleCallbackQuery(
  config,
  sessions,
  auth,
  orientingChats,
  query,
) {
  const chatId = String(query.message?.chat?.id || "");
  if (
    !chatId ||
    !config.allowedChats.map(String).includes(chatId) ||
    ![
      CONTINUE_CALLBACK,
      ORIENT_CALLBACK,
      REORIENT_CALLBACK,
      CONFIRM_REORIENT_CALLBACK,
      CANCEL_REORIENT_CALLBACK,
    ].includes(query.data)
  ) {
    return;
  }
  const details = orientationFor(config, auth, chatId);
  const completed = orientationComplete(details.state);

  if (query.data === REORIENT_CALLBACK) {
    await telegram(config.token, "answerCallbackQuery", {
      callback_query_id: query.id,
      text: completed
        ? "Confirm Full Orientation."
        : "First Orientation is required first.",
    }).catch(() => {});
    await telegram(config.token, "sendMessage", {
      chat_id: chatId,
      ...(completed
        ? fullOrientationConfirmation()
        : continuityInvitation({ oriented: false })),
    });
    return;
  }

  if (query.data === CANCEL_REORIENT_CALLBACK) {
    await telegram(config.token, "answerCallbackQuery", {
      callback_query_id: query.id,
      text: "Full Orientation cancelled.",
    }).catch(() => {});
    await telegram(config.token, "editMessageText", {
      chat_id: chatId,
      message_id: query.message?.message_id,
      text: "Full Orientation cancelled. Existing memory was not changed.",
    }).catch(() => {});
    return;
  }

  if (query.data === CONFIRM_REORIENT_CALLBACK) {
    await telegram(config.token, "answerCallbackQuery", {
      callback_query_id: query.id,
      text: completed
        ? "Starting Full Orientation…"
        : "First Orientation is required first.",
    }).catch(() => {});
    if (!completed) {
      await sendContinuityInvitation(config, chatId, { oriented: false });
      return;
    }
    await firstOrientation(
      config,
      sessions,
      auth,
      orientingChats,
      chatId,
      { force: true },
    );
    return;
  }

  await telegram(config.token, "answerCallbackQuery", {
    callback_query_id: query.id,
    text:
      query.data === ORIENT_CALLBACK
        ? completed
          ? "First Orientation is already complete."
          : orientingChats.has(chatId)
            ? "First Orientation is already running."
            : "Starting First Orientation…"
        : completed
          ? "Reading the shared External Brain…"
          : "First Orientation is required first.",
  }).catch(() => {});
  if (query.data === ORIENT_CALLBACK) {
    await firstOrientation(
      config,
      sessions,
      auth,
      orientingChats,
      chatId,
    );
    return;
  }
  if (!completed) {
    await sendContinuityInvitation(config, chatId, { oriented: false });
    return;
  }
  await recoverContinuity(config, sessions, auth, chatId);
}

async function main() {
  runtime = initializeRuntime();
  configPath = path.join(runtime.paths.data, "telegram", "config.json");
  const config = readConfig();
  const sessions = new Map();
  const orientingChats = new Set();
  const auth = readAuth();
  const orientOnStart = process.argv.includes("--orient-now");

  console.log("RESONANT Agent Telegram bridge running.");
  console.log("Mode: long polling");
  console.log(`Allowed chats: ${config.allowedChats.join(", ")}`);
  console.log("Press Ctrl+C to stop.");

  for (const chatId of config.allowedChats) {
    const normalizedChatId = String(chatId);
    const details = orientationFor(config, auth, normalizedChatId);
    const stored = config.instances?.[details.key]?.orientation || {};
    const reset =
      stored.model_binding !== details.state.model_binding ||
      Number(stored.total_sources || 0) !== details.state.total_sources ||
      (stored.status === "completed" &&
        !orientationComplete(details.state));
    if (details.state.status === "in_progress") {
      details.state.status = "paused";
      details.state.updated_at = new Date().toISOString();
    }
    persistOrientation(config, details.key, details.state);
    if (reset) {
      delete config.instances[details.key].orientation_invited_at;
      delete config.instances[details.key].orientation_invitation_message_id;
      writeConfig(config);
    }
    if (
      !orientationComplete(details.state) &&
      !config.instances[details.key].orientation_invited_at
    ) {
      await sendContinuityInvitation(
        config,
        normalizedChatId,
        { oriented: false },
      ).then((message) => {
        config.instances[details.key].orientation_invited_at =
          new Date().toISOString();
        config.instances[details.key].orientation_invitation_message_id =
          message?.message_id || 0;
        writeConfig(config);
      }).catch((error) => {
        console.error(
          `Telegram orientation invitation warning: ${error.message}`,
        );
      });
    }
    if (orientOnStart && !orientationComplete(details.state)) {
      await firstOrientation(
        config,
        sessions,
        auth,
        orientingChats,
        normalizedChatId,
      );
    }
  }

  let running = true;
  process.on("SIGINT", () => {
    running = false;
    for (const session of sessions.values()) session.stop();
    process.exit(0);
  });

  while (running) {
    if (!telegramEnabled(runtime.paths)) {
      console.log("Telegram was disconnected. Stopping the local bridge.");
      break;
    }
    try {
      const updates = await telegram(config.token, "getUpdates", {
        timeout: 25,
        offset: config.offset || 0,
        allowed_updates: ["message", "callback_query"],
      });

      if (!telegramEnabled(runtime.paths)) break;
      for (const update of updates) {
        config.offset = Math.max(config.offset || 0, update.update_id + 1);
        writeConfig(config);
        if (update.message) {
          await handleMessage(
            config,
            sessions,
            auth,
            orientingChats,
            update.message,
          );
        }
        if (update.callback_query) {
          await handleCallbackQuery(
            config,
            sessions,
            auth,
            orientingChats,
            update.callback_query,
          );
        }
      }
    } catch (error) {
      console.error(`Telegram bridge warning: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  for (const session of sessions.values()) session.stop();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Telegram bridge failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  CANCEL_REORIENT_CALLBACK,
  CONFIRM_REORIENT_CALLBACK,
  CONTINUE_CALLBACK,
  ORIENT_CALLBACK,
  REORIENT_CALLBACK,
  continuityInvitation,
  fullOrientationConfirmation,
  isContinueMessage,
  isFullOrientationMessage,
  isOrientationMessage,
};
