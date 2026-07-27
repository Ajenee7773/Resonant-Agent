const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { assertInside } = require("./paths");
const { readJson, writeJson } = require("./json-store");

function conversationDirectory(paths) {
  const directory = path.join(paths.sessions, "conversations");
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

function conversationFile(paths, id) {
  const normalized = String(id || "").trim().toLowerCase();
  if (!/^[0-9a-f-]{36}$/.test(normalized)) {
    throw new Error("Conversation ID is invalid.");
  }
  return assertInside(
    conversationDirectory(paths),
    path.join(conversationDirectory(paths), `${normalized}.json`),
    "Conversation file",
  );
}

function titleFromText(text) {
  const clean = String(text || "").trim().replace(/\s+/g, " ");
  return clean ? clean.slice(0, 72) : "New conversation";
}

function createConversation(paths, options = {}) {
  const now = new Date().toISOString();
  const conversation = {
    format: "aligned-conversation",
    version: 1,
    id: crypto.randomUUID(),
    entity_id: String(options.entityId || ""),
    title: titleFromText(options.title),
    created_at: now,
    updated_at: now,
    messages: [],
  };
  writeJson(conversationFile(paths, conversation.id), conversation);
  return conversation;
}

function getConversation(paths, id) {
  const file = conversationFile(paths, id);
  if (!fs.existsSync(file)) return null;
  return readJson(file);
}

function listConversations(paths) {
  const directory = conversationDirectory(paths);
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^[0-9a-f-]{36}\.json$/.test(entry.name))
    .map((entry) => {
      try {
        return readJson(path.join(directory, entry.name));
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((left, right) => String(right.updated_at).localeCompare(String(left.updated_at)))
    .map(({ messages, ...metadata }) => ({
      ...metadata,
      message_count: Array.isArray(messages) ? messages.length : 0,
    }));
}

function appendMessage(paths, id, message) {
  const conversation = getConversation(paths, id);
  if (!conversation) {
    throw new Error("Conversation was not found.");
  }
  const role = String(message.role || "");
  if (!["user", "assistant", "system"].includes(role)) {
    throw new Error("Conversation message role is invalid.");
  }
  const text = String(message.text || "").trim();
  if (!text) throw new Error("Conversation message is empty.");
  if (text.length > 500_000) {
    throw new Error("Conversation message is too large.");
  }
  const entry = {
    id: crypto.randomUUID(),
    role,
    text,
    created_at: message.created_at || new Date().toISOString(),
  };
  conversation.messages ||= [];
  conversation.messages.push(entry);
  conversation.updated_at = entry.created_at;
  if (
    role === "user" &&
    (conversation.title === "New conversation" || !conversation.title)
  ) {
    conversation.title = titleFromText(text);
  }
  writeJson(conversationFile(paths, id), conversation);
  return entry;
}

function deleteConversation(paths, id) {
  const file = conversationFile(paths, id);
  if (!fs.existsSync(file)) return false;
  fs.rmSync(file, { force: true });
  return true;
}

module.exports = {
  appendMessage,
  conversationDirectory,
  conversationFile,
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  titleFromText,
};
