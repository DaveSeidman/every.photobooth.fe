const numberValue = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const appConfig = {
  apiUrl: (import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`).replace(/\/$/, ""),
  publicAppUrl: (import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, ""),
  title: import.meta.env.VITE_EXPERIENCE_TITLE || "Portraits After Automation",
  kicker: import.meta.env.VITE_EXPERIENCE_KICKER || "Every / Thesis: 2027",
  countdownSeconds: numberValue(import.meta.env.VITE_COUNTDOWN_SECONDS, 3),
  resetDelayMs: numberValue(import.meta.env.VITE_RESET_DELAY_MS, 90_000),
};

export const defaultExperience = {
  labels: {
    variantA: "Thesis Blue",
    original: "Source Portrait",
    variantB: "Thesis Coral",
  },
  prompts: {
    variantA: "",
    variantB: "",
    transition: "",
  },
  features: {
    animation: true,
    print: false,
  },
  modes: [
    { id: "thesis.editorial", label: "Thesis editorial", description: "Blue/coral screenprinted portrait studies.", color: "#2B83EE", developerOnly: false },
    { id: "every.one.in", label: "Every One In", description: "A cumulative group portrait that remembers the room.", color: "#FF7B70", developerOnly: true },
    { id: "every.oracle", label: "Every Oracle", description: "A consent-safe portrait with subtle attendee signals.", color: "#31C8F5", developerOnly: true },
    { id: "every.designer", label: "Every Designer", description: "A guest-adjustable print composition.", color: "#FFDE3D", developerOnly: true },
    { id: "branded.posthog", label: "Branded / PostHog", description: "A sponsor skin inspired by product analytics.", color: "#F59E0B", developerOnly: true },
    { id: "every.future.familiar", label: "Every Future Familiar", description: "Your chosen future escapes from your phone as a living symbol.", color: "#A8F0D0", developerOnly: true },
  ],
};
