import { logEvent } from "./lib/logger.js";
import { timers } from "./lib/timers.js";
import { appConfig, defaultExperience } from "./config.js";

async function parseResponse(response) {
  const payload = await response.json().catch((error) => {
    logEvent("fetch.parse-failed", { url: response.url, error }, "error");
    return {};
  });
  logEvent("fetch.payload", { url: response.url, status: response.status, payload });
  if (!response.ok) {
    throw new Error(payload.message || `Request failed (${response.status}).`);
  }
  return payload;
}

export async function fetchExperience() {
  try {
    const response = await fetch(`${appConfig.apiUrl}/config`);
    const payload = await parseResponse(response);
    return {
      ...defaultExperience,
      ...payload,
      modes: payload.modes || defaultExperience.modes,
      everyStyles: (payload.everyStyles || defaultExperience.everyStyles).map((style) => ({
        ...defaultExperience.everyStyles.find((fallback) => fallback.id === style.id),
        ...style,
      })),
      riiffsStyles: (payload.riiffsStyles || defaultExperience.riiffsStyles).map((style) => ({
        ...defaultExperience.riiffsStyles.find((fallback) => fallback.id === style.id),
        ...style,
      })),
      labels: { ...defaultExperience.labels, ...payload.labels },
      features: { ...defaultExperience.features, ...payload.features },
    };
  } catch (error) {
    logEvent("experience.fallback", { error }, "warn");
    return defaultExperience;
  }
}

async function generationRequestBudget() {
  const controller = new AbortController();
  const timeout = timers.setTimeout(() => controller.abort(), 2500);
  let fallbackAfterMs = 34000;
  try {
    // Refresh the learned deadline for each capture, including long-running kiosks.
    const response = await fetch(`${appConfig.apiUrl}/config`, { signal: controller.signal, cache: "no-store" });
    if (response.ok) {
      const payload = await parseResponse(response);
      if (Number.isFinite(payload.generation?.fallbackAfterMs) && payload.generation.fallbackAfterMs > 0) fallbackAfterMs = payload.generation.fallbackAfterMs;
    }
  } catch { /* The local backend can still handle a capture if this config lookup fails. */ }
  finally { timers.clearTimeout(timeout); }
  return Math.max(appConfig.generationTimeoutMs, fallbackAfterMs + 15000);
}

export async function submitPhoto(photo, { mode = "every", style, promptOverride, failureSimulation = "none" } = {}) {
  const timeoutMs = await generationRequestBudget();
  const controller = new AbortController();
  const timeout = timers.setTimeout(() => { logEvent("generation.timeout", { timeoutMs }, "warn"); controller.abort(); }, timeoutMs);
  const form = new FormData();
  form.append("photo", photo, "photo.jpg");
  form.append("mode", mode);
  if (style) form.append("style", style);
  if (failureSimulation !== "none") {
    form.append("failureSimulation", failureSimulation);
    logEvent("generation.simulation-requested", { failureSimulation });
  }
  if (promptOverride?.trim()) form.append("promptOverride", promptOverride.trim());

  try {
    const response = await fetch(`${appConfig.apiUrl}/submit`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
    return await parseResponse(response);
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The booth could not finish the portrait. Check the connection to the booth computer and try again.");
    }
    throw error;
  } finally {
    timers.clearTimeout(timeout);
  }
}

export function photoUrl(photoId, extension = "jpg") {
  return `${appConfig.apiUrl}/photos/${photoId}.${extension}`;
}

export function takeawayUrl(photoId) {
  const url = new URL(appConfig.publicAppUrl);
  url.searchParams.delete("brand");
  url.hash = `/takeaway/${photoId}`;
  return url.toString();
}
