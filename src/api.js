import { appConfig, defaultExperience } from "./config.js";
import { currentBrand } from "./brand.js";

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
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
      labels: { ...defaultExperience.labels, ...payload.labels },
      features: { ...defaultExperience.features, ...payload.features },
    };
  } catch (error) {
    console.warn("Using local experience defaults:", error.message);
    return defaultExperience;
  }
}

export async function submitPhoto(photo, { mode = "every", style } = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), appConfig.generationTimeoutMs);
  const form = new FormData();
  form.append("photo", photo, "photo.jpg");
  form.append("mode", mode);
  if (style) form.append("style", style);

  try {
    const response = await fetch(`${appConfig.apiUrl}/submit`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
    return await parseResponse(response);
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The portrait took longer than 30 seconds. Please choose the style and try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function photoUrl(photoId, extension = "jpg") {
  return `${appConfig.apiUrl}/photos/${photoId}.${extension}`;
}

export function takeawayUrl(photoId, brand = currentBrand()) {
  const url = new URL(appConfig.publicAppUrl);
  url.searchParams.set("brand", brand);
  url.hash = `/takeaway/${photoId}`;
  return url.toString();
}
