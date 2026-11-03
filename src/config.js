const numberValue = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const appConfig = {
  apiUrl: (import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`).replace(/\/$/, ""),
  publicAppUrl: (import.meta.env.VITE_PUBLIC_APP_URL || `${window.location.origin}${import.meta.env.BASE_URL}`).replace(/\/$/, ""),
  title: import.meta.env.VITE_EXPERIENCE_TITLE || "Portraits After Automation",
  kicker: import.meta.env.VITE_EXPERIENCE_KICKER || "Every / Thesis: 2027",
  countdownSeconds: numberValue(import.meta.env.VITE_COUNTDOWN_SECONDS, 3),
  generationTimeoutMs: numberValue(import.meta.env.VITE_GENERATION_TIMEOUT_MS, 30_000),
  resetDelayMs: numberValue(import.meta.env.VITE_RESET_DELAY_MS, 30_000),
};

export const defaultExperience = {
  labels: {
    styled: "Styled Portrait",
    original: "Source Portrait",
  },
  features: {
    animation: false,
    print: false,
  },
  modes: [
    { id: "every", label: "Every", description: "Two Greco-Roman emperor transformations.", color: "#2B83EE", developerOnly: false },
  ],
  everyStyles: [
    {
      id: "emperor-cyan",
      label: "Imperial Cyan",
      description: "Marble emperors, punk engraving, and a vivid cyan temple.",
      preview: `${import.meta.env.BASE_URL}style-previews/emperor-cyan.jpg`,
    },
    {
      id: "emperor-ink",
      label: "Imperial Ink",
      description: "Marble emperors in a gritty, antique engraving treatment.",
      preview: `${import.meta.env.BASE_URL}style-previews/emperor-ink.jpg`,
    },
  ],
};
