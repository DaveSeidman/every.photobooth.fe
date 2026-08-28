import { appConfig, defaultExperience } from "./config.js";

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
      labels: { ...defaultExperience.labels, ...payload.labels },
      prompts: { ...defaultExperience.prompts, ...payload.prompts },
      features: { ...defaultExperience.features, ...payload.features },
    };
  } catch (error) {
    console.warn("Using local experience defaults:", error.message);
    return defaultExperience;
  }
}

export async function submitPhoto(photo, prompts) {
  const form = new FormData();
  form.append("photo", photo, "photo.jpg");
  form.append("variantAPrompt", prompts.variantA);
  form.append("variantBPrompt", prompts.variantB);
  form.append("transitionPrompt", prompts.transition);

  const response = await fetch(`${appConfig.apiUrl}/submit`, {
    method: "POST",
    body: form,
  });
  return parseResponse(response);
}

export function photoUrl(photoId, extension = "jpg") {
  return `${appConfig.apiUrl}/photos/${photoId}.${extension}`;
}

export function takeawayUrl(photoId) {
  return `${appConfig.publicAppUrl}/#/takeaway/${photoId}`;
}
