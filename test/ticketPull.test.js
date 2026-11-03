import test from "node:test";
import assert from "node:assert/strict";
import { ticketPull, ticketLightPoint } from "../src/lib/ticketPull.js";

const pull = (values) => ticketPull({ dx: 0, dy: 0, width: 280, grabX: .9, ...values });
test("pulling from the right peels downward around the top-left attachment", () => {
  const state = pull({ dy: 60 });
  assert.equal(state.origin, 0);
  assert.ok(state.angle > 0 && state.angle < 32);
  assert.ok(state.y > 0 && state.y < 60);
  assert.equal(state.complete, false);
});
test("pulling from the left mirrors the pivot and rotation", () => {
  const left = pull({ dy: 60, grabX: .1 });
  const right = pull({ dy: 60, grabX: .9 });
  assert.equal(left.origin, 100);
  assert.equal(left.angle, -right.angle);
  assert.equal(left.y, right.y);
});
test("upward and sideways pulls cannot accidentally select a ticket", () => {
  for (const movement of [{dx:200,dy:0}, {dx:30,dy:-100}]) {
    const state = pull(movement);
    assert.equal(state.complete, false);
    assert.equal(state.progress, 0);
    assert.equal(state.y, 0);
  }
});
test("selection requires a full downward tear and clamps progress and rotation", () => {
  assert.equal(pull({dy:89}).complete, false);
  assert.equal(pull({dy:90}).complete, true);
  const state = pull({dx:10000,dy:10000});
  assert.equal(state.progress, 1);
  assert.equal(state.angle, 32);
  assert.equal(state.x, 40);
});

test("grab highlight stays beneath the finger after the ticket translates and rotates", () => {
  const pull = { origin: 100, x: 12, y: 25, angle: -24 };
  const input = { startX: 40, startY: 30, dx: 8, dy: 65, width: 300, pull };
  const local = ticketLightPoint(input);
  const angle = pull.angle * Math.PI / 180;
  const pivot = input.width;
  const screenX = pivot + (local.x - pivot) * Math.cos(angle) - local.y * Math.sin(angle) + pull.x;
  const screenY = (local.x - pivot) * Math.sin(angle) + local.y * Math.cos(angle) + pull.y;
  assert.ok(Math.abs(screenX - (input.startX + input.dx)) < .0001);
  assert.ok(Math.abs(screenY - (input.startY + input.dy)) < .0001);
});
