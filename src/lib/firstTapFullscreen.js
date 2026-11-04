import { logEvent } from "./logger.js";

export function installFirstTapFullscreen({ doc = document, pageLocation = window.location, log = logEvent,
  standalone = Boolean(globalThis.navigator?.standalone || globalThis.matchMedia?.("(display-mode: standalone)")?.matches),
} = {}) {
  if (standalone || pageLocation.origin !== "https://photobooth.lightboxlive.io" || pageLocation.hash?.startsWith("#/takeaway/")) return () => {};
  const active = () => Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
  let pending = false, disposed = false, wasActive = active(), hasRequested = false;
  const change = () => {
    const next = active();
    if (next === wasActive) return; // Safari may fire both standard and prefixed events.
    wasActive = next;
    log(next ? "fullscreen.entered" : "fullscreen.exited", { restoreOnNextTap: !next });
    // Fullscreen requires transient user activation. A swipe-exit event cannot
    // supply that; the next trusted click restores it without consuming the tap.
  };
  const tap = (event) => {
    if (!event.isTrusted || disposed || pending || active() || pageLocation.hash?.startsWith("#/takeaway/")) return;
    const root = doc.documentElement;
    const request = root.requestFullscreen || root.webkitRequestFullscreen;
    if (!request) { if (!hasRequested) log("fullscreen.unavailable", {}, "warn"); hasRequested = true; return; }
    pending = true;
    log("fullscreen.requested", { trigger: hasRequested ? "restore-tap" : "first-tap" });
    hasRequested = true;
    try {
      const result = root.requestFullscreen ? request.call(root, { navigationUI: "hide" }) : request.call(root);
      Promise.resolve(result).then(() => {
        if (!disposed) log("fullscreen.request-completed", { active: active() });
      }).catch((error) => {
        if (!disposed) log("fullscreen.request-failed", { error }, "warn");
      }).finally(() => { pending = false; });
    } catch (error) { pending = false; log("fullscreen.request-failed", { error }, "warn"); }
  };
  doc.addEventListener("click", tap, true);
  doc.addEventListener("fullscreenchange", change, true);
  doc.addEventListener("webkitfullscreenchange", change, true);
  return () => {
    disposed = true;
    doc.removeEventListener("click", tap, true);
    doc.removeEventListener("fullscreenchange", change, true);
    doc.removeEventListener("webkitfullscreenchange", change, true);
  };
}
