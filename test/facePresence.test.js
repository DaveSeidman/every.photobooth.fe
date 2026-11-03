import test from "node:test";
import assert from "node:assert/strict";
import { createFacePresence } from "../src/lib/facePresence.js";

test("a sustained face brings the photo forward; isolated detections do not", () => {
  const update = createFacePresence();
  assert.equal(update(false, 0), false);
  assert.equal(update(true, 100), false);
  assert.equal(update(false, 150), false);
  assert.equal(update(true, 300), false);
  assert.equal(update(true, 499), false);
  assert.equal(update(true, 500), true);
});

test("brief tracking gaps keep normal depth; sustained absence returns to back", () => {
  const update = createFacePresence();
  update(true, 0);
  assert.equal(update(true, 200), true);
  assert.equal(update(false, 1000), true);
  assert.equal(update(true, 1100), true);
  assert.equal(update(false, 2499), true);
  assert.equal(update(false, 2500), false);
});
