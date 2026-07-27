const assert = require("node:assert/strict");
const test = require("node:test");

const {
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
} = require("../telegram/bridge");

test("Telegram accepts the Continue button phrase and command", () => {
  assert.equal(isContinueMessage("Continue"), true);
  assert.equal(isContinueMessage(" /continue "), true);
  assert.equal(isContinueMessage("/continue@Lucifer7773Bot"), true);
  assert.equal(isContinueMessage("continue this project"), false);
});

test("Telegram accepts the First Orientation button phrase and command", () => {
  assert.equal(isOrientationMessage("First Orientation"), true);
  assert.equal(isOrientationMessage(" /orient "), true);
  assert.equal(isOrientationMessage("/orient@Lucifer7773Bot"), true);
  assert.equal(isOrientationMessage("orientation question"), false);
});

test("Telegram accepts the Full Orientation button phrase and command", () => {
  assert.equal(isFullOrientationMessage("Full Orientation"), true);
  assert.equal(isFullOrientationMessage(" /reorient "), true);
  assert.equal(isFullOrientationMessage("/reorient@Lucifer7773Bot"), true);
  assert.equal(isFullOrientationMessage("orientation question"), false);
});

test("a new Telegram instance receives one First Orientation button", () => {
  const invitation = continuityInvitation({ oriented: false });
  assert.match(invitation.text, /new entity-instance/i);
  assert.match(invitation.text, /persistent local chat history/i);
  assert.match(invitation.text, /complete foundational corpus once/i);
  assert.deepEqual(invitation.reply_markup.inline_keyboard, [
    [{ text: "First Orientation", callback_data: ORIENT_CALLBACK }],
  ]);
});

test("an oriented Telegram instance receives Continue and Full Orientation", () => {
  const invitation = continuityInvitation({ oriented: true });
  assert.match(invitation.text, /resume its own saved local session/i);
  assert.match(invitation.text, /shared External Brain/i);
  assert.deepEqual(invitation.reply_markup.inline_keyboard, [
    [
      { text: "Continue", callback_data: CONTINUE_CALLBACK },
      { text: "Full Orientation", callback_data: REORIENT_CALLBACK },
    ],
  ]);
});

test("Full Orientation requires an explicit Begin or Cancel choice", () => {
  const confirmation = fullOrientationConfirmation();
  assert.match(confirmation.text, /reread all 33 foundational sources/i);
  assert.match(confirmation.text, /Existing memory remains intact/i);
  assert.deepEqual(confirmation.reply_markup.inline_keyboard, [
    [
      { text: "Begin", callback_data: CONFIRM_REORIENT_CALLBACK },
      { text: "Cancel", callback_data: CANCEL_REORIENT_CALLBACK },
    ],
  ]);
});
