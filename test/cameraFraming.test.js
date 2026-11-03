import test from "node:test";
import assert from "node:assert/strict";
import { captureRegion, defaultFraming } from "../src/lib/cameraFraming.js";

test("square preview crops the center of landscape and portrait sources", () => {
  assert.deepEqual(captureRegion(1920, 1080, defaultFraming), { x: 420, y: 0, size: 1080 });
  assert.deepEqual(captureRegion(1080, 1920, defaultFraming), { x: 0, y: 420, size: 1080 });
});

test("zoom and edge framing stay within source bounds", () => {
  for (const [width, height] of [[1920, 1080], [1080, 1920], [1000, 1000]]) {
    for (const zoom of [1, 1.5, 3]) for (const x of [0, 50, 100]) for (const y of [0, 50, 100]) {
      const region = captureRegion(width, height, { zoom, x, y });
      assert.equal(region.size, Math.min(width, height) / zoom);
      assert.ok(region.x >= 0 && region.y >= 0);
      assert.ok(region.x + region.size <= width && region.y + region.size <= height);
    }
  }
});
