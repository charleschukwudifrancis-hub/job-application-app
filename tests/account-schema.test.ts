import assert from "node:assert/strict";
import test from "node:test";
import { loginAccountSchema, registerAccountSchema } from "../src/lib/schemas";

test("registration normalizes email and requires a strong password", () => {
  const valid = registerAccountSchema.safeParse({
    name: "  Alex Candidate ",
    email: "  ALEX@example.com ",
    password: "a-long-correct-horse-password",
  });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.name, "Alex Candidate");
    assert.equal(valid.data.email, "alex@example.com");
  }

  assert.equal(registerAccountSchema.safeParse({ name: "Alex", email: "alex@example.com", password: "short" }).success, false);
});

test("sign-in normalizes email and rejects malformed credentials", () => {
  const valid = loginAccountSchema.safeParse({ email: "ALEX@example.com", password: "secret" });
  assert.equal(valid.success, true);
  if (valid.success) assert.equal(valid.data.email, "alex@example.com");

  assert.equal(loginAccountSchema.safeParse({ email: "not-an-email", password: "secret" }).success, false);
});
