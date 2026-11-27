import assert from "node:assert/strict";
import test from "node:test";
import { transitionDraft } from "../src/lib/application-workflow";

test("application handoff requires the explicit approval transition", () => {
  assert.equal(transitionDraft("DRAFT", "approve"), "APPROVED");
  assert.equal(transitionDraft("APPROVED", "handoff"), "HANDED_OFF");
  assert.equal(transitionDraft("DRAFT", "handoff"), null);
  assert.equal(transitionDraft("HANDED_OFF", "approve"), null);
  assert.equal(transitionDraft("HANDED_OFF", "edit"), null);
});

test("editing an approved but not handed-off draft returns it to review", () => {
  assert.equal(transitionDraft("APPROVED", "edit"), "DRAFT");
});
