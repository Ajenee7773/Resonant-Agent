const assert = require("node:assert/strict");
const test = require("node:test");

const {
  isAllowedHostHeader,
  isAllowedOrigin,
  requestSecurityError,
} = require("../core/http-security");

const local = { host: "127.0.0.1", port: 47891 };

test("local host guard rejects DNS rebinding names", () => {
  assert.equal(isAllowedHostHeader("127.0.0.1:47891", local), true);
  assert.equal(isAllowedHostHeader("localhost:47891", local), true);
  assert.equal(isAllowedHostHeader("127.0.0.1.evil.example:47891", local), false);
  assert.equal(isAllowedHostHeader("localhost:9000", local), false);
});

test("write origins must match the local service", () => {
  assert.equal(isAllowedOrigin("http://localhost:47891", local), true);
  assert.equal(isAllowedOrigin("https://attacker.example", local), false);
  assert.equal(
    requestSecurityError({
      method: "POST",
      headers: {
        host: "localhost:47891",
        origin: "https://attacker.example",
      },
    }, local).code,
    "INVALID_ORIGIN",
  );
});
