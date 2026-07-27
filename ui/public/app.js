const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const ui = {
  sidebar: $("#sidebar"),
  setup: $("#setupView"),
  conversation: $("#conversationView"),
  rooms: $("#roomsView"),
  settings: $("#settingsView"),
  messages: $("#messages"),
  composer: $("#composer"),
  input: $("#input"),
  attachImage: $("#attachImage"),
  imageInput: $("#imageInput"),
  imagePreview: $("#imagePreview"),
  imagePreviewThumbnail: $("#imagePreviewThumbnail"),
  imagePreviewName: $("#imagePreviewName"),
  removeImage: $("#removeImage"),
  send: $("#send"),
  stop: $("#stopGeneration"),
  presence: $("#presence"),
  presenceLabel: $("#presenceLabel"),
};

const speakStorageKey = "resonant.voice.speakReplies";
const activeRoomsStorageKey = "resonant.rooms.active";
let onboarding = null;
let system = null;
let messages = [];
let currentConversationId = "";
const storedSpeakPreference = localStorage.getItem(speakStorageKey);
let speakReplies = storedSpeakPreference === null || storedSpeakPreference === "1";
let recognition = null;
let recognizing = false;
let heartbeat = null;
let heartbeatBusy = false;
let rooms = [];
let awakeningStarted = false;
let conversationBusy = false;
let activeRooms = {};
let pendingImage = null;
try {
  activeRooms = JSON.parse(localStorage.getItem(activeRoomsStorageKey) || "{}");
} catch {
  activeRooms = {};
}

const CONTINUITY_PROMPTS = Object.freeze({
  recover:
    "Go get your memories. Read your External Brain: MY-HARNESS.md, identity, operator profile, foundational integration, curated long-term memory, short-term ideas, recent journal and context, and any active plan. Do not reread the full Foundation Library. Recover your identity and recent continuity, then tell me briefly what you recovered and when you are ready.",
  ideas:
    "Go to the short-term-memory room. Read its README.md and IDEAS.md, then give me every active idea in a compact numbered list with its status and next step. Do not invent ideas that are not written there.",
});

async function api(path, options = {}) {
  const response = await fetch(path, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || payload.message || `Request failed: ${response.status}`);
  }
  return payload;
}

function setResult(selector, message, tone = "") {
  const node = $(selector);
  node.textContent = message || "";
  node.className = `form-result ${tone}`.trim();
}

function formPayload(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function profileReady() {
  const profile = onboarding?.profile || {};
  return Boolean(profile.operator_name && profile.agent_name && profile.mission);
}

function providerReady() {
  return Boolean(onboarding?.runtime?.provider && onboarding?.runtime?.model);
}

function lineageReady() {
  return Boolean(onboarding?.entity?.model_binding && !onboarding?.pending_transition);
}

function markStep(selector, complete, current) {
  const node = $(selector);
  node.classList.toggle("complete", complete);
  node.classList.toggle("current", current && !complete);
}

function updateProviderFields() {
  const provider = $("#provider").value;
  const local = provider === "ollama";
  const custom = provider === "custom";
  $("#apiKeyField").hidden = local;
  $("#baseUrlField").hidden = !local && !custom;
  $("#apiKey").required = !local && !custom;
  if (local && !$("#baseUrl").value) $("#baseUrl").value = "http://localhost:11434/v1";
}

function updateSettingsProviderFields() {
  const provider = $("#settingsProvider").value;
  const local = provider === "ollama";
  const custom = provider === "custom";
  $("#settingsApiKeyField").hidden = local;
  $("#settingsBaseUrlField").hidden = !local && !custom;
  $("#settingsApiKey").required = !local && !custom;
  if (local && !$("#settingsBaseUrl").value) {
    $("#settingsBaseUrl").value = "http://localhost:11434/v1";
  }
}

function renderSettingsModel() {
  const runtime = onboarding?.runtime || {};
  const binding = onboarding?.entity?.model_binding || {};
  const pending = onboarding?.pending_transition || null;
  $("#settingsCurrentModel").textContent =
    `Active · ${binding.provider || "unbound"} / ${binding.model || "unbound"}`;
  $("#settingsProvider").value = runtime.provider || binding.provider || "";
  $("#settingsModel").value = runtime.model || binding.model || "";
  $("#settingsBaseUrl").value = runtime.base_url || "";
  $("#settingsApiKey").value = "";
  updateSettingsProviderFields();

  $("#settingsTransitionPanel").hidden = !pending;
  if (!pending) {
    $("#settingsTransitionSummary").textContent = "";
    return;
  }
  const incoming = `${pending.incoming.provider} / ${pending.incoming.model}`;
  const prior = pending.current
    ? `${pending.current.provider} / ${pending.current.model}`
    : "no previous model";
  $("#settingsTransitionSummary").textContent =
    `${incoming} is waiting to enter an environment previously bound to ${prior}.`;
  $("#settingsTransitionMode").value =
    pending.reason === "model-binding-change" ? "succession" : "fresh-start";
}

function renderSetup() {
  const profile = onboarding.profile || {};
  const runtime = onboarding.runtime || {};
  $("#operatorName").value = profile.operator_name || "";
  $("#agentName").value = profile.agent_name || "Resonant";
  $("#mission").value = profile.mission || "";
  $("#provider").value = runtime.provider || "";
  $("#model").value = runtime.model || "";
  $("#baseUrl").value = runtime.base_url || "";
  $("#apiKey").value = "";
  updateProviderFields();

  const identityDone = profileReady();
  const providerDone = providerReady();
  const lineageDone = lineageReady();
  markStep("#stepIdentity", identityDone, true);
  markStep("#stepProvider", providerDone, identityDone);
  markStep("#stepLineage", lineageDone, providerDone);
  markStep("#stepReady", onboarding.complete, lineageDone);

  $("#providerCard").classList.toggle("locked", !identityDone);
  $("#lineageCard").classList.toggle("locked", !providerDone);
  $("#approveTransition").disabled = !onboarding.pending_transition;
  $("#completeSetup").disabled = !(identityDone && providerDone && lineageDone);

  const transition = onboarding.pending_transition;
  if (transition) {
    const incoming = `${transition.incoming.provider} / ${transition.incoming.model}`;
    const prior = transition.current
      ? `${transition.current.provider} / ${transition.current.model}`
      : "no previous model";
    $("#transitionSummary").textContent =
      transition.reason === "model-binding-change"
        ? `${incoming} is waiting to enter an environment previously bound to ${prior}.`
        : `${incoming} is waiting for its first introduction.`;
  } else if (lineageDone) {
    $("#transitionSummary").textContent =
      `${onboarding.entity.model_binding.provider} / ${onboarding.entity.model_binding.model} is bound through ${onboarding.entity.lifecycle.current_mode}.`;
  } else {
    $("#transitionSummary").textContent = "Connect a model to create an introduction.";
  }

  $("#harnessDetail").textContent =
    `${onboarding.harness.installed_files} files · content v${onboarding.harness.content_version}`;
  $("#dataDirectory").textContent = onboarding.data_directory;
  $("#readyModel").textContent = lineageDone ? "✓" : "—";
  $("#readyModel").classList.toggle("ready", lineageDone);
  $("#modelDetail").textContent = lineageDone
    ? `${onboarding.entity.model_binding.provider} / ${onboarding.entity.model_binding.model}`
    : "Waiting for introduction";
  $("#readyPi").textContent = system.pi_available ? "✓" : "!";
  $("#readyPi").classList.toggle("ready", system.pi_available);
  $("#piDetail").textContent = system.pi_available ? "Installed" : "Run the full installer to add Pi";
  $("#readinessSummary").textContent =
    identityDone && providerDone && lineageDone
      ? "Identity, intelligence, and lineage are ready."
      : "Complete the steps above to begin.";
}

function renderApp() {
  const complete = Boolean(onboarding.complete);
  ui.setup.hidden = complete;
  ui.sidebar.hidden = !complete;
  ui.conversation.hidden = !complete;
  ui.rooms.hidden = true;
  ui.settings.hidden = true;
  if (!complete) {
    renderSetup();
    return;
  }

  const entity = onboarding.entity;
  const binding = entity.model_binding || {};
  $("#conversationTitle").textContent = entity.display_name;
  $("#welcomeText").textContent = `What would you like us to work on first, ${onboarding.profile.operator_name}?`;
  $("#runtimeState").textContent = entity.status === "active" ? "Entity ready" : entity.status;
  $("#runtimeModel").textContent = `${binding.provider || "provider"} / ${binding.model || "model"}`;
  $("#runtimeDot").className = "status-dot live";
  $("#systemEntity").textContent = entity.display_name;
  $("#systemLineage").textContent =
    `${entity.lifecycle.current_mode} · ${binding.provider || "unbound"} / ${binding.model || "unbound"}`;
  $("#systemDataPath").textContent = onboarding.data_directory;
  renderSettingsModel();
  initializeConversations()
    .then(() => initializeFirstAwakening())
    .catch((error) => {
      append("assistant", `Conversation history could not be loaded: ${error.message}`);
    });
  refreshHeartbeat();
}

async function loadState() {
  const payload = await api("/api/v1/onboarding");
  onboarding = payload.onboarding;
  system = payload.system;
  renderApp();
}

async function submitJson(path, payload) {
  const result = await api(path, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
  if (result.onboarding) onboarding = result.onboarding;
  return result;
}

$("#identityForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  setResult("#identityResult", "Saving…");
  try {
    await submitJson("/api/v1/onboarding/profile", formPayload(event.currentTarget));
    setResult("#identityResult", "Identity saved.", "success");
    renderSetup();
  } catch (error) {
    setResult("#identityResult", error.message, "error");
  }
});

$("#provider").addEventListener("change", updateProviderFields);
$("#providerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  setResult("#providerResult", "Saving securely…");
  try {
    await submitJson("/api/v1/onboarding/provider", formPayload(event.currentTarget));
    setResult("#providerResult", "Connection saved. Introduction required.", "success");
    renderSetup();
  } catch (error) {
    setResult("#providerResult", error.message, "error");
  }
});

$("#testConnection").addEventListener("click", async () => {
  setResult("#providerResult", "Testing connection…");
  try {
    const result = await submitJson("/api/v1/onboarding/test-connection", {});
    setResult("#providerResult", result.message, "success");
  } catch (error) {
    setResult("#providerResult", error.message, "error");
  }
});

$("#settingsProvider").addEventListener("change", updateSettingsProviderFields);
$("#settingsProviderForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  setResult("#settingsProviderResult", "Saving model connection…");
  try {
    await submitJson("/api/v1/onboarding/provider", formPayload(event.currentTarget));
    setResult(
      "#settingsProviderResult",
      "Connection saved. Approve the model handoff below.",
      "success",
    );
    renderSettingsModel();
    refreshHealth();
  } catch (error) {
    setResult("#settingsProviderResult", error.message, "error");
  }
});

$("#settingsTestConnection").addEventListener("click", async () => {
  setResult("#settingsProviderResult", "Testing configured connection…");
  try {
    const result = await submitJson("/api/v1/onboarding/test-connection", {});
    setResult("#settingsProviderResult", result.message, "success");
  } catch (error) {
    setResult("#settingsProviderResult", error.message, "error");
  }
});

$("#approveSettingsTransition").addEventListener("click", async () => {
  setResult("#settingsTransitionResult", "Recording model handoff…");
  try {
    await submitJson("/api/v1/onboarding/transition", {
      mode: $("#settingsTransitionMode").value,
      display_name: onboarding.profile.agent_name,
    });
    const binding = onboarding.entity.model_binding || {};
    $("#runtimeModel").textContent =
      `${binding.provider || "provider"} / ${binding.model || "model"}`;
    $("#systemLineage").textContent =
      `${onboarding.entity.lifecycle.current_mode} · ${binding.provider || "unbound"} / ${binding.model || "unbound"}`;
    setResult("#settingsTransitionResult", "Model handoff approved.", "success");
    renderSettingsModel();
    refreshHealth();
  } catch (error) {
    setResult("#settingsTransitionResult", error.message, "error");
  }
});

$("#lineageForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  setResult("#lineageResult", "Recording introduction…");
  const payload = formPayload(event.currentTarget);
  payload.display_name = onboarding.profile.agent_name;
  try {
    await submitJson("/api/v1/onboarding/transition", payload);
    setResult("#lineageResult", "Introduction approved and recorded.", "success");
    renderSetup();
  } catch (error) {
    setResult("#lineageResult", error.message, "error");
  }
});

$("#completeSetup").addEventListener("click", async () => {
  setResult("#completeResult", "Opening the shared space…");
  try {
    await submitJson("/api/v1/onboarding/complete", {});
    renderApp();
  } catch (error) {
    setResult("#completeResult", error.message, "error");
  }
});

function append(role, text) {
  const message = { role, text };
  messages.push(message);
  renderMessages();
  return message;
}

async function listConversationMetadata() {
  const payload = await api("/api/v1/conversations");
  return payload.conversations || [];
}

function renderConversationList(items) {
  const container = $("#conversationList");
  container.innerHTML = "";
  for (const item of items.slice(0, 8)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `conversation-link ${item.id === currentConversationId ? "active" : ""}`;
    button.textContent = item.title || "New conversation";
    button.addEventListener("click", () => openConversation(item.id));
    container.appendChild(button);
  }
}

async function createNewConversation() {
  const payload = await api("/api/v1/conversations", {
    method: "POST",
    body: JSON.stringify({}),
  });
  currentConversationId = payload.conversation.id;
  messages = payload.conversation.messages || [];
  renderActiveRoom();
  renderMessages();
  renderConversationList(await listConversationMetadata());
}

async function openConversation(id) {
  const payload = await api(`/api/v1/conversations/${encodeURIComponent(id)}`);
  currentConversationId = payload.conversation.id;
  messages = payload.conversation.messages || [];
  renderActiveRoom();
  renderMessages();
  renderConversationList(await listConversationMetadata());
}

async function initializeConversations() {
  const items = await listConversationMetadata();
  if (!items.length) {
    await createNewConversation();
    return;
  }
  await openConversation(items[0].id);
}

function setAwakeningPaused(checked, total, message = "") {
  awakeningStarted = false;
  $("#resumeAwakening").hidden = false;
  $("#welcomeText").hidden = false;
  $("#welcomeText").textContent = message ||
    `First awakening paused at ${checked}/${total} foundation sources. Press Resume Awakening to continue from the ledger.`;
}

async function followExistingAwakening() {
  $("#welcomeText").hidden = false;
  setPresence("thinking", "Awakening");
  setConversationBusy(true);
  try {
    while (true) {
      const payload = await api("/api/v1/system/awakening");
      const state = payload.awakening || {};
      const checked = Number(state.checked || 0);
      const total = Number(state.total || 0);
      $("#welcomeText").textContent =
        `First awakening is continuing · ${checked}/${total} foundation sources verified.`;
      if (!payload.running) {
        onboarding.awakening.status = state.status;
        onboarding.awakening.required = Boolean(state.required);
        onboarding.awakening.checked = checked;
        onboarding.awakening.total = total;
        await openConversation(currentConversationId);
        if (state.required) {
          setAwakeningPaused(checked, total);
        } else {
          $("#resumeAwakening").hidden = true;
          $("#welcomeText").hidden = messages.length > 0;
          awakeningStarted = true;
        }
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
  } finally {
    setPresence("ready", "Ready");
    setConversationBusy(false);
    ui.input.focus();
  }
}

async function initializeFirstAwakening() {
  if (!onboarding?.awakening?.required) return;
  const payload = await api("/api/v1/system/awakening");
  const state = payload.awakening || {};
  onboarding.awakening.status = state.status;
  onboarding.awakening.required = Boolean(state.required);
  onboarding.awakening.checked = Number(state.checked || 0);
  onboarding.awakening.total = Number(state.total || 0);
  if (!onboarding.awakening.required) return;
  if (payload.running) {
    await followExistingAwakening();
    return;
  }
  if (payload.paused) {
    setAwakeningPaused(
      onboarding.awakening.checked,
      onboarding.awakening.total,
    );
    return;
  }
  await beginFirstAwakening();
}

async function beginFirstAwakening() {
  if (!onboarding?.awakening?.required || awakeningStarted) return;
  awakeningStarted = true;
  $("#resumeAwakening").hidden = true;
  const assistant = append("assistant", "");
  setConversationBusy(true);
  $("#welcomeText").hidden = false;
  $("#welcomeText").textContent =
    "First awakening in progress. The intelligence is reading its inheritance and writing its own harness.";
  setPresence("thinking", "Awakening");

  try {
    const response = await fetch("/api/v1/awaken", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: currentConversationId }),
    });
    if (!response.ok || !response.body) {
      const payload = await response.json().catch(() => ({}));
      if (response.status === 409 && payload.error?.code === "AWAKENING_IN_PROGRESS") {
        messages.pop();
        renderMessages();
        await followExistingAwakening();
        return;
      }
      throw new Error(
        payload.error?.message || `Awakening failed: ${response.status}`,
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === "delta") {
          assistant.text += event.delta;
          setPresence("speaking", "Coming online");
          renderMessages();
          } else if (event.type === "done") {
            assistant.text = event.text || "";
            renderMessages();
            onboarding.awakening.status = event.awakening_status;
            onboarding.awakening.required =
              event.awakening_status !== "completed";
            onboarding.awakening.checked = event.checked;
            onboarding.awakening.total = event.total;
        } else if (event.type === "error") {
          throw new Error(event.error);
        }
      }
    }
      if (!assistant.text.trim()) {
        messages.pop();
        renderMessages();
      }
      if (onboarding.awakening.required) {
        const checked = Number(onboarding.awakening.checked || 0);
        const total = Number(onboarding.awakening.total || 0);
        setAwakeningPaused(checked, total);
      } else {
        $("#resumeAwakening").hidden = true;
      }
      renderConversationList(await listConversationMetadata());
  } catch (error) {
    assistant.text =
      assistant.text ||
      `My first awakening paused before completion: ${error.message}`;
    renderMessages();
    const checked = Number(onboarding.awakening.checked || 0);
    const total = Number(onboarding.awakening.total || 0);
    setAwakeningPaused(
      checked,
      total,
      "First awakening paused. Press Resume Awakening to continue from the verified ledger.",
    );
  } finally {
    setPresence("ready", "Ready");
    setConversationBusy(false);
    ui.input.focus();
  }
}

$("#resumeAwakening").addEventListener("click", () => {
  beginFirstAwakening().catch((error) => {
    setAwakeningPaused(
      Number(onboarding.awakening.checked || 0),
      Number(onboarding.awakening.total || 0),
      `Awakening could not resume: ${error.message}`,
    );
  });
});

function renderMessages() {
  ui.messages.innerHTML = "";
  for (const message of messages) {
    const node = document.createElement("article");
    node.className = `message ${message.role}`;
    const role = document.createElement("small");
    role.textContent = message.role === "user" ? "YOU" : onboarding?.entity?.display_name?.toUpperCase() || "ENTITY";
    const content = document.createElement("div");
    content.textContent = message.text || "";
    node.append(role, content);
    ui.messages.appendChild(node);
  }
  ui.messages.scrollTop = ui.messages.scrollHeight;
  $("#welcomeText").hidden = messages.length > 0;
}

function setPresence(state, label) {
  ui.presence.className = `presence ${state}`;
  ui.presence.setAttribute("aria-label", `Entity presence: ${label.toLowerCase()}`);
  ui.presenceLabel.innerHTML = "<span></span>";
  ui.presenceLabel.append(document.createTextNode(` ${label}`));
}

function renderActiveRoom(room = activeRooms[currentConversationId]) {
  const badge = $("#activeRoomBadge");
  if (!room?.name) {
    badge.hidden = true;
    badge.classList.remove("loading");
    $("#activeRoomName").textContent = "";
    return;
  }
  badge.hidden = false;
  $("#activeRoomName").textContent = room.name;
}

function rememberActiveRoom(room) {
  activeRooms[currentConversationId] = {
    id: room.id,
    name: room.name,
  };
  localStorage.setItem(activeRoomsStorageKey, JSON.stringify(activeRooms));
  renderActiveRoom(room);
}

function autosize() {
  ui.input.style.height = "auto";
  ui.input.style.height = `${Math.min(ui.input.scrollHeight, 180)}px`;
}

function speakText(text) {
  if (!speakReplies || !("speechSynthesis" in window)) return;
  const spoken = String(text || "").trim();
  if (!spoken) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(spoken));
}

function setConversationBusy(value) {
  conversationBusy = Boolean(value);
  ui.send.disabled = conversationBusy;
  ui.send.hidden = conversationBusy;
  ui.stop.hidden = !conversationBusy;
  ui.input.disabled = conversationBusy;
  ui.attachImage.disabled = conversationBusy;
  ui.removeImage.disabled = conversationBusy;
  $$(".continuity-action").forEach((button) => {
    button.disabled = conversationBusy;
  });
  $$(".room-enter-button").forEach((button) => {
    button.disabled = conversationBusy;
  });
  $$(".room-export-button").forEach((button) => {
    button.disabled = conversationBusy;
  });
  $$(".room-remove-button").forEach((button) => {
    button.disabled = conversationBusy;
  });
}

function clearPendingImage() {
  pendingImage = null;
  ui.imageInput.value = "";
  ui.imagePreview.hidden = true;
  ui.imagePreviewThumbnail.removeAttribute("src");
  ui.imagePreviewName.textContent = "";
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      if (comma < 0) {
        reject(new Error("The selected image could not be read."));
        return;
      }
      resolve({
        type: "image",
        data: result.slice(comma + 1),
        mimeType: file.type,
        name: file.name,
        preview: result,
      });
    });
    reader.addEventListener("error", () => {
      reject(new Error("The selected image could not be read."));
    });
    reader.readAsDataURL(file);
  });
}

async function selectImage(file) {
  if (!file) return;
  const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowed.has(file.type)) {
    $("#voiceStatus").textContent = "Choose a JPEG, PNG, or WebP image.";
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    $("#voiceStatus").textContent = "Choose an image that is 8 MB or smaller.";
    return;
  }
  try {
    pendingImage = await readImageFile(file);
    ui.imagePreviewThumbnail.src = pendingImage.preview;
    ui.imagePreviewName.textContent = pendingImage.name;
    ui.imagePreview.hidden = false;
    $("#voiceStatus").textContent = "Image attached. Add a question or press Send.";
  } catch (error) {
    $("#voiceStatus").textContent = error.message;
  }
}

async function sendMessage(text) {
  if (conversationBusy) return false;
  const image = pendingImage;
  if (!String(text || "").trim() && !image) return false;
  setConversationBusy(true);
  setPresence("thinking", "Thinking");
  let assistant = null;
  let succeeded = false;

  try {
    if (!currentConversationId) {
      await createNewConversation();
    }
    append("user", image ? `${text || "What do you see?"}\n\n[Image attached]` : text);
    assistant = append("assistant", "");
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: currentConversationId,
        message: text,
        images: image
          ? [{ type: "image", data: image.data, mimeType: image.mimeType }]
          : [],
      }),
    });
    if (!response.ok || !response.body) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error?.message || `Request failed: ${response.status}`);
    }
    if (image === pendingImage) clearPendingImage();

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let beganSpeaking = false;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === "delta") {
          if (!beganSpeaking) {
            beganSpeaking = true;
            setPresence("speaking", "Speaking");
          }
          assistant.text += event.delta;
          renderMessages();
        } else if (event.type === "error") {
          throw new Error(event.error);
        }
      }
    }
    speakText(assistant.text);
    renderConversationList(await listConversationMetadata());
    succeeded = true;
  } catch (error) {
    if (!assistant) assistant = append("assistant", "");
    const stopped = error.message === "Generation stopped.";
    if (stopped) {
      assistant.text = assistant.text.trim()
        ? `${assistant.text.trim()}\n\n[Generation stopped.]`
        : "Generation stopped.";
    } else if (assistant.text.trim()) {
      assistant.text =
        `${assistant.text.trim()}\n\n[Response interrupted. ${error.message}]`;
    } else {
      assistant.text = `I couldn't answer: ${error.message}`;
    }
    renderMessages();
  } finally {
    setPresence("ready", "Ready");
    setConversationBusy(false);
    ui.input.focus();
  }
  return succeeded;
}

async function runContinuityAction(options) {
  if (conversationBusy) return;
  if (options.confirm && !confirm(options.confirm)) return;
  const status = $("#continuityStatus");
  status.className = "";
  status.textContent = options.progress;
  const succeeded = await sendMessage(options.prompt);
  status.className = succeeded ? "success" : "error";
  status.textContent = succeeded ? options.complete : options.failure;
}

ui.composer.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = ui.input.value.trim();
  if (!text && !pendingImage) return;
  ui.input.value = "";
  autosize();
  sendMessage(text);
});

ui.attachImage.addEventListener("click", () => {
  if (!conversationBusy) ui.imageInput.click();
});

ui.imageInput.addEventListener("change", () => {
  selectImage(ui.imageInput.files?.[0]);
});

ui.removeImage.addEventListener("click", () => {
  clearPendingImage();
  $("#voiceStatus").textContent = "";
});

ui.stop.addEventListener("click", async () => {
  if (!conversationBusy) return;
  ui.stop.disabled = true;
  ui.stop.textContent = "Stopping…";
  try {
    const result = await api("/api/chat/stop", {
      method: "POST",
      body: JSON.stringify({}),
    });
    $("#continuityStatus").textContent = result.message;
  } catch (error) {
    $("#continuityStatus").textContent = `Stop failed: ${error.message}`;
  } finally {
    ui.stop.disabled = false;
    ui.stop.textContent = "Stop";
  }
});

ui.input.addEventListener("input", autosize);
ui.input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    ui.composer.requestSubmit();
  }
});

$("#recoverContinuity").addEventListener("click", () => {
  runContinuityAction({
    prompt: CONTINUITY_PROMPTS.recover,
    progress: "Reading External Brain…",
    complete: "Continuity restored.",
    failure: "Continuity recovery paused. Try again when the model is available.",
  });
});

$("#reviewIdeas").addEventListener("click", () => {
  runContinuityAction({
    prompt: CONTINUITY_PROMPTS.ideas,
    progress: "Opening short-term idea inbox…",
    complete: "Short-term ideas loaded.",
    failure: "The idea inbox could not be loaded.",
  });
});

async function runFullOrientation() {
  if (conversationBusy) return;
  if (!confirm(
    "Full Orientation will reread the complete foundational corpus. Existing memory remains intact and progress is saved. Begin?",
  )) return;

  setConversationBusy(true);
  setPresence("thinking", "Reorienting");
  const status = $("#continuityStatus");
  status.className = "";
  status.textContent = "Starting Full Orientation…";
  append("user", "Full Orientation");
  const assistant = append("assistant", "");

  try {
    const response = await fetch("/api/v1/orientation/full", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: currentConversationId }),
    });
    if (!response.ok || !response.body) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(
        payload.error?.message || `Full Orientation failed: ${response.status}`,
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === "progress") {
          status.textContent =
            `Full Orientation · ${event.checked}/${event.total} foundational context absorbed`;
        } else if (event.type === "done") {
          assistant.text = event.text || "";
          status.className = "success";
          status.textContent =
            `Full Orientation complete · ${event.total}/${event.total} sources`;
          renderMessages();
        } else if (event.type === "error") {
          throw new Error(event.error);
        }
      }
    }
    if (!assistant.text.trim()) {
      assistant.text = "Full Orientation completed.";
      renderMessages();
    }
    renderConversationList(await listConversationMetadata());
  } catch (error) {
    assistant.text =
      assistant.text ||
      `Full Orientation paused: ${error.message}`;
    status.className = "error";
    status.textContent =
      "Full Orientation paused. Press the button again to resume from saved progress.";
    renderMessages();
  } finally {
    setPresence("ready", "Ready");
    setConversationBusy(false);
    ui.input.focus();
  }
}

$("#fullOrientation").addEventListener("click", () => {
  runFullOrientation();
});

$("#newChat").addEventListener("click", () => {
  if (!confirm("Start a new conversation view? The entity's harness and memory are not changed.")) return;
  createNewConversation().catch((error) => append("assistant", error.message));
});

$("#speakToggle").addEventListener("click", () => {
  speakReplies = !speakReplies;
  localStorage.setItem(speakStorageKey, speakReplies ? "1" : "0");
  $("#speakToggle").classList.toggle("active", speakReplies);
  $("#speakToggle").setAttribute("aria-pressed", speakReplies ? "true" : "false");
  if (!speakReplies && "speechSynthesis" in window) window.speechSynthesis.cancel();
});

function setupSpeechRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    $("#voiceInput").disabled = true;
    $("#voiceStatus").textContent =
      "Voice input is unavailable in this browser. Text conversation still works.";
    return;
  }
  recognition = new Recognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = navigator.language || "en-US";
  recognition.addEventListener("start", () => {
    recognizing = true;
    $("#voiceStatus").textContent = "";
    $("#voiceInput").classList.add("active");
    setPresence("listening", "Listening");
  });
  recognition.addEventListener("end", () => {
    recognizing = false;
    $("#voiceInput").classList.remove("active");
    setPresence("ready", "Ready");
  });
  recognition.addEventListener("result", (event) => {
    let transcript = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      transcript += event.results[index][0].transcript;
    }
    ui.input.value = transcript.trim();
    autosize();
  });
  recognition.addEventListener("error", (event) => {
    recognizing = false;
    $("#voiceInput").classList.remove("active");
    setPresence("ready", "Ready");
    const denied = ["not-allowed", "service-not-allowed"].includes(event.error);
    $("#voiceStatus").textContent = denied
      ? "Microphone access was denied. Allow microphone access in browser settings, or continue typing."
      : `Voice input could not start (${event.error || "unknown error"}). Text conversation still works.`;
  });
}

$("#voiceInput").addEventListener("click", () => {
  if (!recognition) return;
  if (recognizing) recognition.stop();
  else {
    try {
      recognition.start();
    } catch (error) {
      $("#voiceStatus").textContent =
        `Voice input could not start: ${error.message}. Text conversation still works.`;
    }
  }
});

ui.presence.addEventListener("pointermove", (event) => {
  const rect = ui.presence.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
  const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  ui.presence.style.setProperty("--look-x", `${Math.max(-1, Math.min(1, x)) * 10}px`);
  ui.presence.style.setProperty("--look-y", `${Math.max(-1, Math.min(1, y)) * 6}px`);
});
ui.presence.addEventListener("pointerleave", () => {
  ui.presence.style.setProperty("--look-x", "0px");
  ui.presence.style.setProperty("--look-y", "0px");
});

function selectView(view) {
  $$(".nav-item").forEach((node) =>
    node.classList.toggle("active", node.dataset.view === view),
  );
  ui.conversation.hidden = view !== "conversation";
  ui.rooms.hidden = view !== "rooms";
  ui.settings.hidden = view !== "settings";
  if (view === "settings") {
    renderSettingsModel();
    refreshHeartbeat();
    refreshHealth();
  } else if (view === "rooms") {
    loadRoomCatalog();
  } else if (view === "conversation") {
    ui.input.focus();
  }
}

$$(".nav-item").forEach((button) => {
  button.addEventListener("click", () => selectView(button.dataset.view));
});

function formatRoomSize(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function renderRoomCatalog() {
  const container = $("#roomCatalog");
  container.innerHTML = "";
  $("#roomCount").textContent =
    `${rooms.length} ${rooms.length === 1 ? "room" : "rooms"} installed`;
  if (!rooms.length) {
    const empty = document.createElement("article");
    empty.className = "room-empty";
    empty.innerHTML =
      "<span>▦</span><h3>No Knowledge Rooms installed yet.</h3><p>Install a Living Library to add its room here.</p>";
    container.appendChild(empty);
    return;
  }
  for (const room of rooms) {
    const card = document.createElement("article");
    card.className = "room-card";
    card.dataset.roomId = room.id;

    const mark = document.createElement("span");
    mark.className = "room-mark";
    mark.textContent = "▦";

    const copy = document.createElement("div");
    copy.className = "room-copy";
    const kind = document.createElement("small");
    kind.textContent =
      room.kind === "living-library" ? "LIVING LIBRARY" : "KNOWLEDGE ROOM";
    const title = document.createElement("h3");
    title.textContent = room.name;
    const description = document.createElement("p");
    description.textContent = room.description;
    const meta = document.createElement("span");
    meta.className = "room-meta";
    meta.textContent =
      `${room.file_count} ${room.file_count === 1 ? "source" : "sources"} · ${formatRoomSize(room.total_bytes)} · v${room.version}`;
    copy.append(kind, title, description, meta);

    const actions = document.createElement("div");
    actions.className = "room-card-actions";
    const enter = document.createElement("button");
    enter.type = "button";
    enter.className = "room-enter-button";
    enter.innerHTML = "Enter room <span>↗</span>";
    enter.addEventListener("click", () => enterRoom(room));
    actions.appendChild(enter);
    if (!room.built_in) {
      const exportButton = document.createElement("button");
      exportButton.type = "button";
      exportButton.className = "room-export-button";
      exportButton.textContent = "Export";
      exportButton.addEventListener("click", () =>
        exportLivingLibrary(room, exportButton),
      );
      actions.appendChild(exportButton);
    }
    if (room.kind === "living-library") {
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "room-remove-button";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () =>
        removeInstalledLibrary(room, removeButton),
      );
      actions.appendChild(removeButton);
    }
    card.append(mark, copy, actions);
    container.appendChild(card);
  }
}

async function loadRoomCatalog() {
  $("#roomCount").textContent = "Loading rooms…";
  $("#roomCatalog").innerHTML =
    '<p class="room-loading">Reading the local room catalog…</p>';
  try {
    const payload = await api("/api/v1/rooms");
    rooms = payload.rooms || [];
    renderRoomCatalog();
  } catch (error) {
    rooms = [];
    $("#roomCount").textContent = "Catalog unavailable";
    $("#roomCatalog").innerHTML = "";
    const failure = document.createElement("p");
    failure.className = "room-loading error";
    failure.textContent = error.message;
    $("#roomCatalog").appendChild(failure);
  }
}

async function exportLivingLibrary(room, button) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = "Exporting…";
  setResult("#libraryResult", `Compiling ${room.name}…`);
  try {
    const response = await fetch("/api/v1/rooms/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room_id: room.id }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(
        payload.error?.message || `Export failed: ${response.status}`,
      );
    }
    const disposition = response.headers.get("Content-Disposition") || "";
    const filename =
      disposition.match(/filename="([^"]+)"/i)?.[1] ||
      `${room.id}.living-library.json`;
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(await response.blob());
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    anchor.remove();
    setResult(
      "#libraryResult",
      `${room.name} compiled as a Living Library.`,
      "success",
    );
  } catch (error) {
    setResult("#libraryResult", error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

async function removeInstalledLibrary(room, button) {
  if (!confirm(
    `Remove "${room.name}" from Rooms? A recoverable local copy will be preserved. ` +
    "Your current conversation and everything already understood will remain.",
  )) {
    return;
  }
  const original = button.textContent;
  button.disabled = true;
  button.textContent = "Removing…";
  setResult("#libraryResult", `Removing ${room.name}…`);
  try {
    const payload = await api("/api/v1/living-libraries/remove", {
      method: "POST",
      body: JSON.stringify({
        room_id: room.id,
        confirmation: "REMOVE LIVING LIBRARY",
      }),
    });
    for (const [conversationId, activeRoom] of Object.entries(activeRooms)) {
      if (activeRoom?.id === room.id) {
        delete activeRooms[conversationId];
      }
    }
    localStorage.setItem(activeRoomsStorageKey, JSON.stringify(activeRooms));
    renderActiveRoom();
    setResult("#libraryResult", payload.message, "success");
    await loadRoomCatalog();
  } catch (error) {
    setResult("#libraryResult", error.message, "error");
    button.disabled = false;
    button.textContent = original;
  }
}

async function enterRoom(room, options = {}) {
  if (conversationBusy) return;
  if (!currentConversationId) await createNewConversation();
  const previousRoom = activeRooms[currentConversationId];
  selectView("conversation");
  renderActiveRoom(room);
  $("#activeRoomBadge").classList.add("loading");
  $("#continuityStatus").className = "";
  $("#continuityStatus").textContent = `Entering ${room.name}…`;
  setConversationBusy(true);
  setPresence("thinking", "Entering room");
  try {
    const payload = await api("/api/v1/rooms/enter", {
      method: "POST",
      body: JSON.stringify({
        conversation_id: currentConversationId,
        room_id: room.id,
      }),
    });
    rememberActiveRoom(payload.room);
    $("#activeRoomBadge").classList.remove("loading");
    $("#continuityStatus").className = "success";
    $("#continuityStatus").textContent = options.readyMessage ||
      `${payload.room.name} is active. Talk normally.`;
    if (options.placeholder) {
      ui.input.placeholder = options.placeholder;
    }
    return true;
  } catch (error) {
    renderActiveRoom(previousRoom);
    $("#activeRoomBadge").classList.remove("loading");
    $("#continuityStatus").className = "error";
    $("#continuityStatus").textContent =
      `${room.name} could not be entered: ${error.message}`;
    return false;
  } finally {
    setPresence("ready", "Ready");
    setConversationBusy(false);
    ui.input.focus();
  }
}

$("#returnToConversation").addEventListener("click", () =>
  selectView("conversation"),
);

$("#installLibrary").addEventListener("click", () => {
  $("#libraryFile").click();
});

async function installLibraryFile(file) {
  if (!file) return;
  $("#installLibrary").disabled = true;
  setResult("#libraryResult", "Validating Living Library…");
  try {
    const bundle = JSON.parse(await file.text());
    const payload = await api("/api/v1/living-libraries/install", {
      method: "POST",
      body: JSON.stringify({ bundle }),
    });
    setResult("#libraryResult", payload.message, "success");
    await loadRoomCatalog();
  } catch (error) {
    setResult("#libraryResult", error.message, "error");
  } finally {
    $("#installLibrary").disabled = false;
  }
}

$("#libraryFile").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  await installLibraryFile(file);
  event.target.value = "";
});

ui.rooms.addEventListener("dragover", (event) => {
  if (!Array.from(event.dataTransfer?.types || []).includes("Files")) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  ui.rooms.classList.add("library-drop-active");
});

ui.rooms.addEventListener("dragleave", (event) => {
  if (event.relatedTarget && ui.rooms.contains(event.relatedTarget)) return;
  ui.rooms.classList.remove("library-drop-active");
});

ui.rooms.addEventListener("drop", async (event) => {
  event.preventDefault();
  ui.rooms.classList.remove("library-drop-active");
  const file = event.dataTransfer?.files?.[0];
  await installLibraryFile(file);
});

$("#createRoom").addEventListener("click", async () => {
  let builder = rooms.find((room) => room.id === "room-builder");
  if (!builder) {
    await loadRoomCatalog();
    builder = rooms.find((room) => room.id === "room-builder");
  }
  if (!builder) {
    $("#roomCount").textContent = "Room Builder is not installed";
    return;
  }
  await enterRoom(builder, {
    readyMessage:
      "Room Builder is ready. Tell your entity what you want the new room to be about.",
    placeholder: "Describe the room you want to create…",
  });
});

function summarizeLog(text) {
  return String(text || "").trim().replace(/\s+/g, " ").slice(0, 240);
}

async function refreshHealth() {
  const dot = $("#healthDot");
  $("#healthState").textContent = "Checking…";
  $("#healthSummary").textContent = "Inspecting required components…";
  $("#healthRepair").textContent = "";
  dot.className = "status-dot waiting";
  try {
    const payload = await api("/api/v1/system/health");
    const health = payload.health || {};
    const problems = [];
    if (health.application !== "ready") problems.push("Application service is not ready.");
    if (health.pi !== "ready") problems.push("Pi runtime is missing.");
    if (health.onboarding !== "complete") problems.push("Setup is incomplete.");
    if (health.transition !== "clear") problems.push("A model introduction needs approval.");
    if (health.harness !== "installed") problems.push("The Cognitive Harness is missing.");
    if (!problems.length) {
      dot.className = "status-dot live";
      $("#healthState").textContent = "All required components ready";
      $("#healthSummary").textContent =
        `Node ${health.node} · Pi ready · harness installed · entity ${health.entity}`;
      $("#healthRepair").textContent = "No repair action is currently required.";
      return;
    }
    dot.className = "status-dot error";
    $("#healthState").textContent = `${problems.length} repair action${problems.length === 1 ? "" : "s"}`;
    $("#healthSummary").textContent = problems.join(" ");
    const repairs = [];
    if (health.pi !== "ready" || health.harness !== "installed") {
      repairs.push("Rerun install.bat from the extracted release.");
    }
    if (health.onboarding !== "complete" || health.transition !== "clear") {
      repairs.push("Return to Setup and complete the highlighted step.");
    }
    $("#healthRepair").textContent = repairs.join(" ");
  } catch (error) {
    dot.className = "status-dot error";
    $("#healthState").textContent = "Health check unavailable";
    $("#healthSummary").textContent = error.message;
    $("#healthRepair").textContent =
      "Restart RESONANT Agent. If the problem remains, rerun install.bat.";
  }
}

function setHeartbeatBusy(value) {
  heartbeatBusy = value;
  for (const button of [$("#heartbeatStart"), $("#heartbeatToggle"), $("#heartbeatWake"), $("#heartbeatOnce"), $("#heartbeatDryRun")]) {
    button.disabled = value;
  }
}

function renderHeartbeat() {
  if (!heartbeat) return;
  const dot = $("#heartbeatDot");
  dot.className = "status-dot";
  if (!heartbeat.hasHeartbeatFile) {
    dot.classList.add("error");
    $("#heartbeatState").textContent = "Configuration missing";
  } else if (!heartbeat.enabled) {
    dot.classList.add("paused");
    $("#heartbeatState").textContent = "Paused";
  } else if (heartbeat.running) {
    dot.classList.add("live");
    $("#heartbeatState").textContent = "Runner active";
  } else if (heartbeat.lastExecution?.status === "failed") {
    dot.classList.add("error");
    $("#heartbeatState").textContent = "Last pulse failed";
  } else {
    dot.classList.add("waiting");
    $("#heartbeatState").textContent = "Ready, not running";
  }
  const nextWake = heartbeat.nextWake?.invalid
    ? `invalid wake: ${heartbeat.nextWake.raw}`
    : heartbeat.nextWake?.at
      ? `next wake ${new Date(heartbeat.nextWake.at).toLocaleString()}`
      : "no self-scheduled wake";
  $("#heartbeatMeta").textContent =
    `${heartbeat.every} fallback · ${heartbeat.tasks.length} tasks · ${heartbeat.dueCount} due · ${nextWake} · ${heartbeat.pendingWakeEvents || 0} events pending`;
  const receipt = heartbeat.lastExecution;
  const receiptText = receipt
    ? `${receipt.status} · ${receipt.completedAt || receipt.startedAt || "time unknown"} · ${receipt.runId || "unknown run"}`
    : "";
  $("#heartbeatLast").textContent =
    receiptText || summarizeLog(heartbeat.lastLog) || "No heartbeat receipt yet.";
  if (document.activeElement !== $("#heartbeatEvery")) {
    $("#heartbeatEvery").value = heartbeat.every || "30m";
  }
  if (document.activeElement !== $("#heartbeatPrompt")) {
    $("#heartbeatPrompt").value = heartbeat.prompt || "";
  }
  $("#heartbeatStart").disabled = heartbeatBusy || heartbeat.running;
  $("#heartbeatToggle").disabled = heartbeatBusy || !heartbeat.hasHeartbeatFile;
  $("#heartbeatToggle").textContent = heartbeat.enabled ? "Pause" : "Resume";
  $("#heartbeatWake").disabled = heartbeatBusy;
  $("#heartbeatOnce").disabled = heartbeatBusy || !heartbeat.enabled;
}

async function refreshHeartbeat() {
  try {
    const payload = await api("/api/heartbeat");
    heartbeat = payload.heartbeat;
    renderHeartbeat();
  } catch {
    $("#heartbeatState").textContent = "Unavailable";
    $("#heartbeatDot").className = "status-dot error";
  }
}

async function heartbeatAction(action, body = {}) {
  setHeartbeatBusy(true);
  $("#heartbeatOutput").hidden = false;
  $("#heartbeatOutput").textContent = "Working…";
  try {
    const payload = await api(`/api/heartbeat/${action}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    heartbeat = payload.heartbeat;
    $("#heartbeatOutput").textContent = payload.output || payload.message || "Done.";
    renderHeartbeat();
  } catch (error) {
    $("#heartbeatOutput").textContent = error.message;
  } finally {
    setHeartbeatBusy(false);
  }
}

$("#heartbeatStart").addEventListener("click", () => heartbeatAction("start"));
$("#heartbeatSettingsForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  setHeartbeatBusy(true);
  setResult("#heartbeatSettingsResult", "Saving heartbeat…");
  try {
    const payload = await api("/api/heartbeat/configure", {
      method: "POST",
      body: JSON.stringify(formPayload(event.currentTarget)),
    });
    heartbeat = payload.heartbeat;
    renderHeartbeat();
    setResult("#heartbeatSettingsResult", "Heartbeat settings saved.", "success");
  } catch (error) {
    setResult("#heartbeatSettingsResult", error.message, "error");
  } finally {
    setHeartbeatBusy(false);
  }
});
$("#heartbeatToggle").addEventListener("click", () => heartbeatAction("toggle", { enabled: !heartbeat?.enabled }));
$("#heartbeatWake").addEventListener("click", () =>
  heartbeatAction("wake", {
    prompt: "Wake now. Read HEARTBEAT.md and decide what needs attention.",
    source: "local-ui",
  }),
);
$("#heartbeatOnce").addEventListener("click", () => heartbeatAction("run-once"));
$("#heartbeatDryRun").addEventListener("click", () => heartbeatAction("dry-run"));
$("#refreshHealth").addEventListener("click", refreshHealth);
$("#stopService").addEventListener("click", async () => {
  if (!confirm("Stop RESONANT Agent? Your conversations and External Brain are already stored locally.")) {
    return;
  }
  const button = $("#stopService");
  button.disabled = true;
  setResult("#serviceResult", "Stopping local service…");
  try {
    const payload = await api("/api/v1/system/shutdown", {
      method: "POST",
      body: JSON.stringify({ confirmation: "STOP AGENT OS" }),
    });
    setResult("#serviceResult", payload.message, "success");
    setPresence("ready", "Stopped");
    setConversationBusy(true);
  } catch (error) {
    button.disabled = false;
    setResult("#serviceResult", error.message, "error");
  }
});

$("#createBackup").addEventListener("click", async () => {
  setResult("#backupResult", "Creating an integrity-checked backup…");
  try {
    const payload = await api("/api/v1/system/backup", {
      method: "POST",
      body: JSON.stringify({ include_secrets: false }),
    });
    const anchor = document.createElement("a");
    anchor.href = payload.backup.download_url;
    anchor.download = payload.backup.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setResult(
      "#backupResult",
      `Backup ready · ${payload.backup.file_count} files · credentials excluded`,
      "success",
    );
  } catch (error) {
    setResult("#backupResult", error.message, "error");
  }
});

$("#restoreBackup").addEventListener("click", () => $("#restoreFile").click());
$("#restoreFile").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  setResult("#backupResult", "Validating backup before any files change…");
  try {
    const bundle = JSON.parse(await file.text());
    let allowSecrets = false;
    let confirmation = "";
    if (bundle.includes_secrets) {
      allowSecrets = confirm(
        "This backup contains credentials. Restore those credentials too?",
      );
      confirmation = allowSecrets ? "RESTORE SECRETS" : "";
      if (!allowSecrets) {
        throw new Error("Restore cancelled because the backup contains secrets.");
      }
    }
    const payload = await api("/api/v1/system/restore", {
      method: "POST",
      body: JSON.stringify({
        bundle,
        allow_secrets: allowSecrets,
        confirmation,
      }),
    });
    onboarding = payload.onboarding;
    setResult(
      "#backupResult",
      `Restored ${payload.restored.restored_files} files. A safety backup was created first.`,
      "success",
    );
    renderApp();
  } catch (error) {
    setResult("#backupResult", error.message, "error");
  } finally {
    event.target.value = "";
  }
});

setupSpeechRecognition();
$("#speakToggle").classList.toggle("active", speakReplies);
$("#speakToggle").setAttribute("aria-pressed", speakReplies ? "true" : "false");
loadState().catch((error) => {
  ui.setup.hidden = false;
  ui.setup.innerHTML = `<div class="fatal-error"><h1>RESONANT Agent could not start.</h1><p></p></div>`;
  ui.setup.querySelector("p").textContent = error.message;
});
