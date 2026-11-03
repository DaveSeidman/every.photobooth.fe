import { logEvent } from "./logger.js";
const active = new Map();
let sequence = 0;
function schedule(kind, callback, delay, args) {
  const timerId = `timer-${++sequence}`;
  const scheduledAt = performance.now();
  const source = new Error().stack?.split("\n").slice(3, 6).join("\n");
  let ticks = 0;
  const handle = window[kind]((...values) => {
    if (kind === "setTimeout") active.delete(handle);
    logEvent("timer.fired", { timerId, kind, delay, ticks: ++ticks, elapsedMs: Math.round(performance.now() - scheduledAt) });
    callback(...values);
  }, delay, ...args);
  active.set(handle, { timerId, kind });
  logEvent("timer.scheduled", { timerId, kind, delay, source });
  return handle;
}
function clear(handle, kind) {
  const timer = active.get(handle);
  if (timer) { logEvent("timer.cleared", timer); active.delete(handle); }
  window[kind](handle);
}
export const timers = {
  setTimeout: (callback, delay = 0, ...args) => schedule("setTimeout", callback, delay, args),
  setInterval: (callback, delay = 0, ...args) => schedule("setInterval", callback, delay, args),
  clearTimeout: (handle) => clear(handle, "clearTimeout"),
  clearInterval: (handle) => clear(handle, "clearInterval"),
};
