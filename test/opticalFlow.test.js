import { test } from "node:test";
import assert from "node:assert/strict";
import { trackPoint } from "../src/lib/opticalFlow.js";

const width = 96, height = 96;
const texture = (x, y) => 120 + 35 * Math.sin(x * .4) + 30 * Math.cos(y * .35) + 25 * Math.sin((x + y) * .29);
function frame(dx = 0, dy = 0) {
  return Float32Array.from({ length: width * height }, (_, i) => texture(i % width - dx, Math.floor(i / width) - dy));
}

test("optical flow recovers direction and magnitude of translated image texture", () => {
  for (const [dx, dy] of [[2, 1], [-3, 2], [1, -2]]) {
    const flow = trackPoint(frame(), frame(dx, dy), width, height, 48, 48);
    assert.ok(flow.confidence > .1);
    assert.ok(Math.abs(flow.x - dx) < .3, `horizontal flow ${flow.x}, expected ${dx}`);
    assert.ok(Math.abs(flow.y - dy) < .3, `vertical flow ${flow.y}, expected ${dy}`);
  }
});
test("static and textureless frames do not invent face motion", () => {
  const still = frame();
  const flow = trackPoint(still, still, width, height, 48, 48);
  assert.ok(Math.hypot(flow.x, flow.y) < .01);
  const blank = new Float32Array(width * height).fill(100);
  assert.equal(trackPoint(blank, blank, width, height, 48, 48).confidence, 0);
});
