import { logEvent } from "./logger.js";

export function installFirstTapFullscreen({ doc = document, pageLocation = window.location, log = logEvent } = {}) {
  if (pageLocation.origin !== "https://photobooth.lightboxlive.io" || pageLocation.hash?.startsWith("#/takeaway/")) return () => {};
  const cleanup = () => doc.removeEventListener("click", firstTap, true);
  const firstTap = (event) => {
    if (!event.isTrusted) return;
    cleanup();
    // Keep the phone gesture available for its native share sheet.
    if (pageLocation.hash?.startsWith("#/takeaway/")) return;
    if (doc.fullscreenElement || doc.webkitFullscreenElement) return;
    const root = doc.documentElement;
    const request = root.requestFullscreen || root.webkitRequestFullscreen;
    if (!request) { log("fullscreen.unavailable", {}, "warn"); return; }
    // Request synchronously during the real gesture, before the ticket's
    // tear animation consumes time. Preserve normal click/tap propagation.
    log("fullscreen.requested", { trigger: "first-tap" });
    try {
      const result = root.requestFullscreen ? request.call(root, { navigationUI: "hide" }) : request.call(root);
      Promise.resolve(result).then(() => log("fullscreen.request-completed", { active: Boolean(doc.fullscreenElement || doc.webkitFullscreenElement) }))
        .catch((error) => log("fullscreen.request-failed", { error }, "warn"));
    } catch (error) { log("fullscreen.request-failed", { error }, "warn"); }
  };
  doc.addEventListener("click", firstTap, true);
  return cleanup;
}
