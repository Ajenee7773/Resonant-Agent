const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  appendMessage,
  conversationFile,
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
} = require("../core/conversations");
const { runtimePaths } = require("../core/paths");

function conversationRuntime(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aligned-conversation-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return runtimePaths(root);
}

test("conversation history persists in the private runtime", (t) => {
  const paths = conversationRuntime(t);
  const conversation = createConversation(paths, { entityId: "entity-1" });
  appendMessage(paths, conversation.id, {
    role: "user",
    text: "Map the next product milestone.",
  });
  appendMessage(paths, conversation.id, {
    role: "assistant",
    text: "Start with a durable session record.",
  });

  const restored = getConversation(paths, conversation.id);
  assert.equal(restored.messages.length, 2);
  assert.equal(restored.title, "Map the next product milestone.");
  assert.equal(listConversations(paths)[0].message_count, 2);
});

test("conversation paths reject traversal", (t) => {
  const paths = conversationRuntime(t);
  assert.throws(() => conversationFile(paths, "../../secrets"), /invalid/);
});

test("conversation deletion is explicit", (t) => {
  const paths = conversationRuntime(t);
  const conversation = createConversation(paths);
  assert.equal(deleteConversation(paths, conversation.id), true);
  assert.equal(getConversation(paths, conversation.id), null);
});
