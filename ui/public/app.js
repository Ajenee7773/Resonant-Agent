const messagesEl = document.querySelector("#messages");
const form = document.querySelector("#composer");
const input = document.querySelector("#input");
const sendButton = document.querySelector("#send");
const statusEl = document.querySelector("#status");
const newChatButton = document.querySelector("#newChat");

const storageKey = "resonant.chat.messages";
let messages = [];

function loadMessages() {
  try {
    messages = JSON.parse(localStorage.getItem(storageKey) || "[]");
  } catch {
    messages = [];
  }
  if (!messages.length) {
    messages = [{ role: "system", text: "Local chat ready. Messages stay in this browser unless you save them elsewhere." }];
  }
  render();
}

function saveMessages() {
  localStorage.setItem(storageKey, JSON.stringify(messages));
}

function append(role, text) {
  const message = { role, text };
  messages.push(message);
  saveMessages();
  render();
  return message;
}

function render() {
  messagesEl.innerHTML = "";
  for (const message of messages) {
    const node = document.createElement("article");
    node.className = `message ${message.role}`;
    node.textContent = message.text || "";
    messagesEl.appendChild(node);
  }
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function autosize() {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
}

async function refreshStatus() {
  try {
    const res = await fetch("/api/status", { cache: "no-store" });
    const status = await res.json();
    statusEl.textContent = status.piAvailable
      ? `${status.provider || "provider"} / ${status.model || "model"}`
      : "Pi not found";
  } catch {
    statusEl.textContent = "Offline";
  }
}

async function sendMessage(text) {
  append("user", text);
  const assistant = append("assistant", "");
  sendButton.disabled = true;
  input.disabled = true;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`Request failed: ${res.status}`);
    }

    const reader = res.body.getReader();
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
          saveMessages();
          render();
        } else if (event.type === "error") {
          assistant.text += `\n[Error] ${event.error}`;
          saveMessages();
          render();
        } else if (event.type === "notice") {
          assistant.text += `\n[Notice] ${event.message}`;
          saveMessages();
          render();
        }
      }
    }
  } catch (error) {
    assistant.text += `\n[Error] ${error.message}`;
    saveMessages();
    render();
  } finally {
    sendButton.disabled = false;
    input.disabled = false;
    input.focus();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  autosize();
  sendMessage(text);
});

input.addEventListener("input", autosize);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

newChatButton.addEventListener("click", () => {
  if (!confirm("Clear this local chat view? This does not delete Pi's saved sessions.")) return;
  messages = [{ role: "system", text: "New local chat view started." }];
  saveMessages();
  render();
});

loadMessages();
refreshStatus();

