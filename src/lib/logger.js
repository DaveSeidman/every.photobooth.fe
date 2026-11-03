const LIMIT = 10000;
const records = [];
const session = globalThis.crypto?.randomUUID?.() || `session-${Date.now()}`;
let sequence = 0;
let installed = false;
let dropped = 0;
const sensitive = /password|secret|token|authorization|cookie|deviceId|groupId|clientId|recipientId|^(prompt|promptOverride|systemPrompt|negativePrompt|photo|image|originalPhoto|source|styled|variantA|variantB|past|future)$/i;

export function safeUrl(value) {
  try {
    const url = new URL(String(value), globalThis.location?.href || "http://localhost");
    if (!["http:", "https:", "ws:", "wss:"].includes(url.protocol)) return `[${url.protocol} URL]`;
    return `${url.origin}${url.pathname}${url.search ? "?[redacted]" : ""}${url.hash ? `#${url.hash.slice(1).split("?")[0]}` : ""}`;
  } catch { return "[invalid URL]"; }
}

export function sanitize(value, depth = 0, seen = new WeakSet()) {
  if (value == null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") {
    if (/^(data:|blob:)/i.test(value)) return "[image/blob URL]";
    if (/^(https?:|wss?:)/i.test(value)) return safeUrl(value);
    return value.slice(0, 500);
  }
  if (value instanceof Error) return { name: value.name, message: sanitize(value.message), stack: value.stack?.slice(0, 1800) };
  if (typeof Blob !== "undefined" && value instanceof Blob) return { type: value.type, bytes: value.size };
  if (typeof value !== "object") return `[${typeof value}]`;
  if (seen.has(value)) return "[circular]";
  if (depth > 5) return "[depth limit]";
  seen.add(value);
  if (Array.isArray(value)) return value.slice(0, 40).map((item) => sanitize(item, depth + 1, seen));
  return Object.fromEntries(Object.entries(value).slice(0, 60).map(([key, item]) => [key,
    (sensitive.test(key) || (key === "label" && value.settings && value.capabilities)) ? (item ? "[redacted]" : item) : sanitize(item, depth + 1, seen)]));
}

export function logEvent(event, details = {}, level = "info", options = {}) {
  // Diagnostics must never interrupt camera capture or generation.
  try {
    const record = { sequence: ++sequence, timestamp: new Date().toISOString(), elapsedMs: Math.round(performance.now()), session, event, level, details: sanitize(details) };
    if (records.length >= LIMIT) { records.splice(0, 1000); dropped += 1000; }
    records.push(record);
    if(options.console !== false) (level === "error" ? console.error : level === "warn" ? console.warn : console.debug)(`[booth #${record.sequence}] ${event}`, record);
    return record;
  } catch { return undefined; }
}

export function getLogs() { return { session, dropped, limit: LIMIT, records: JSON.parse(JSON.stringify(records)) }; }
export function clearLogs() { records.length = 0; dropped = 0; logEvent("logs.cleared"); }
export function downloadLogs() {
  logEvent("logs.download");
  const blob = new Blob([JSON.stringify(getLogs(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = `photobooth-${session}-${Date.now()}.json`;
  document.body.append(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function targetInfo(target) {
  const element = target instanceof Element ? target.closest("button,a,input,select,textarea,summary,[role=button]") || target : null;
  if (!element) return {};
  return { tag: element.tagName, id: element.id, testId: element.getAttribute("data-testid"), role: element.getAttribute("role"),
    label: element.getAttribute("aria-label") || (element.matches("button,summary") ? element.textContent?.trim().slice(0, 100) : undefined),
    inputType: element.getAttribute("type"), disabled: element.hasAttribute("disabled") };
}

export function installLogging() {
  if (installed) return;
  installed = true;
  logEvent("app.started", { url: safeUrl(location.href), userAgent: navigator.userAgent, viewport: { width: innerWidth, height: innerHeight, pixelRatio: devicePixelRatio }, secureContext: isSecureContext });
  for (const type of ["click", "input", "change", "submit", "focusin", "focusout", "pointerdown", "pointerup", "pointercancel", "toggle", "scrollend"]) {
    document.addEventListener(type, (event) => {
      const target = event.target;
      // Text input values and keystrokes are deliberately omitted.
      const value = target instanceof HTMLInputElement && ["range", "checkbox", "radio"].includes(target.type)
        ? (target.type === "range" ? target.value : target.checked) : undefined;
      logEvent(`interaction.${type}`, { target: targetInfo(target), value, trusted: event.isTrusted, pointerType: event.pointerType });
    }, true);
  }
  document.addEventListener("keydown", (event) => logEvent("interaction.keydown", {
    key: ["F1", "Enter", "Escape", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key) ? event.key : "[text key]",
    target: targetInfo(event.target), repeat: event.repeat,
  }), true);
  for (const type of ["hashchange", "popstate", "online", "offline", "pageshow", "pagehide", "resize", "orientationchange"]) {
    window.addEventListener(type, () => logEvent(`browser.${type}`, { url: safeUrl(location.href), width: innerWidth, height: innerHeight, online: navigator.onLine }));
  }
  document.addEventListener("visibilitychange", () => logEvent("browser.visibility", { state: document.visibilityState }));
  window.addEventListener("error", (event) => logEvent("error.uncaught", { error: event.error || event.message, resource: event.target instanceof Element ? event.target.tagName : undefined }, "error"), true);
  window.addEventListener("unhandledrejection", (event) => logEvent("error.unhandled-rejection", { error: event.reason }, "error"));
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, options) => {
    const requestId = `fetch-${++sequence}`;
    const started = performance.now();
    const url = safeUrl(input instanceof Request ? input.url : input);
    const body = options?.body;
    const fields = body instanceof FormData ? Array.from(body.entries()).map(([name, value]) => ({ name, ...(value instanceof Blob ? { type: value.type, bytes: value.size } : { characters: String(value).length }) })) : undefined;
    logEvent("fetch.started", { requestId, url, method: options?.method || (input instanceof Request ? input.method : "GET"), fields });
    try {
      const response = await originalFetch(input, options);
      logEvent("fetch.response", { requestId, url, status: response.status, ok: response.ok, serverRequestId: response.headers.get("x-request-id"), durationMs: Math.round(performance.now() - started), contentType: response.headers.get("content-type"), contentLength: response.headers.get("content-length") }, response.ok ? "info" : "warn");
      return response;
    } catch (error) {
      logEvent("fetch.failed", { requestId, url, durationMs: Math.round(performance.now() - started), error }, "error");
      throw error;
    }
  };
  if (typeof PerformanceObserver !== "undefined") {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) logEvent("resource.loaded", { url: safeUrl(entry.name), initiator: entry.initiatorType, durationMs: Math.round(entry.duration), bytes: entry.transferSize, status: entry.responseStatus });
      });
      observer.observe({ type: "resource", buffered: true });
    } catch { /* Resource timing is optional on older iPads. */ }
  }
  window.boothLogs = Object.freeze({ get: getLogs, download: downloadLogs, clear: clearLogs });
}
