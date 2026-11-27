import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, verifyPassword } from "../src/lib/password";

test("passwords are stored as salted hashes and verify without exposing plaintext", async () => {
  const password = "a-long-correct-horse-password";
  const firstHash = await hashPassword(password);
  const secondHash = await hashPassword(password);

  assert.notEqual(firstHash, password);
  assert.notEqual(firstHash, secondHash);
  assert.equal(await verifyPassword(password, firstHash), true);
  assert.equal(await verifyPassword("a-different-password", firstHash), false);
  assert.equal(await verifyPassword(password, "invalid"), false);
});
