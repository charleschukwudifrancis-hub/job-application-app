import assert from "node:assert/strict";
import test from "node:test";
import { createSessionToken, readSessionUserId, verifySessionToken } from "../src/lib/session";

test("signed workspace sessions accept valid tokens and reject tampering", async () => {
  const originalSecret = process.env.APP_SESSION_SECRET;
  process.env.APP_SESSION_SECRET = "a".repeat(48);
  try {
    const token = await createSessionToken("user-123");
    assert.equal(await verifySessionToken(token), true);
    assert.equal(await readSessionUserId(token), "user-123");
    const secondUserToken = await createSessionToken("user-456");
    assert.equal(await readSessionUserId(secondUserToken), "user-456");
    const [payload, signature] = token.split(".");
    const alteredPayload = `${payload.startsWith("A") ? "B" : "A"}${payload.slice(1)}`;
    const altered = `${alteredPayload}.${signature}`;
    assert.equal(await verifySessionToken(altered), false);
    assert.equal(await readSessionUserId(altered), null);
    assert.equal(await verifySessionToken(undefined), false);
  } finally {
    if (originalSecret === undefined) delete process.env.APP_SESSION_SECRET;
    else process.env.APP_SESSION_SECRET = originalSecret;
  }
});
