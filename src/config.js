const numberValue = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const appConfig = {
  apiUrl: (import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`).replace(/\/$/, ""),
  publicAppUrl: (import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, ""),
  title: import.meta.env.VITE_EXPERIENCE_TITLE || "Every Portrait Studio",
  kicker: import.meta.env.VITE_EXPERIENCE_KICKER || "An AI photobooth study",
  countdownSeconds: numberValue(import.meta.env.VITE_COUNTDOWN_SECONDS, 3),
  resetDelayMs: numberValue(import.meta.env.VITE_RESET_DELAY_MS, 90_000),
};

export const defaultExperience = {
  labels: {
    variantA: "Reimagined One",
    original: "Original",
    variantB: "Reimagined Two",
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
};
