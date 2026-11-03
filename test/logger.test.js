import test from "node:test";
import assert from "node:assert/strict";
import { sanitize, safeUrl, getLogs, logEvent, clearLogs } from "../src/lib/logger.js";

test("logs redact prompts, credentials, images and signed URL parameters", () => {
  const cleaned = sanitize({ promptOverride: "private prompt", authorization: "Bearer secret", nested: { deviceId: "camera-id", image: "data:image/jpeg;base64,secret" }, url: "https://example.com/photo.jpg?token=secret", photoId: "abc123", blob: new Blob(["photo"]) });
  const output = JSON.stringify(cleaned);
  for (const secret of ["private prompt", "Bearer secret", "camera-id", "base64", "token=secret"]) assert.ok(!output.includes(secret));
  assert.equal(cleaned.photoId, "abc123");
  assert.deepEqual(cleaned.blob, { type: "", bytes: 5 });
  assert.equal(safeUrl("https://user:password@example.com/photo?secret=1"), "https://example.com/photo?[redacted]");
});

test("cyclic state is safe and exported snapshots cannot mutate the ring", () => {
  const state = {}; state.self = state;
  assert.equal(sanitize(state).self, "[circular]");
  const originalDebug = console.debug;
  console.debug = () => {};
  try {
    clearLogs();
    for (let i = 0; i < 10005; i++) logEvent("test", { i });
    const snapshot = getLogs();
    assert.ok(snapshot.records.length <= 10000);
    assert.ok(snapshot.dropped > 0);
    assert.ok(snapshot.records.at(-1).sequence > snapshot.records[0].sequence);
    snapshot.records[0].details.i = "modified";
    assert.notEqual(getLogs().records[0].details.i, "modified");
    snapshot.records.length = 0;
    assert.ok(getLogs().records.length > 0);
    clearLogs();
  } finally { console.debug = originalDebug; }
});
