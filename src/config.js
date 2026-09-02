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
    { id: "every", label: "Every", description: "Four focused Every editorial transformations.", color: "#2B83EE", developerOnly: false },
  ],
  everyStyles: [
    {
      id: "weights-measures",
      label: "Weights & Measures",
      description: "Your portrait mapped with architectural lines, proportion, and precision.",
      preview: `${import.meta.env.BASE_URL}style-previews/weights-measures.jpg`,
    },
    {
      id: "digital-twins",
      label: "Digital Twins",
      description: "Meet the android counterpart built from your pose and personality.",
      preview: `${import.meta.env.BASE_URL}style-previews/digital-twins.jpg`,
    },
    {
      id: "future-of-work",
      label: "Future of Work",
      description: "Wear the strange, tactile interfaces of work after automation.",
      preview: `${import.meta.env.BASE_URL}style-previews/future-of-work.jpg`,
    },
    {
      id: "black-white",
      label: "Black & White",
      description: "Become a hand-engraved portrait against a vivid field of color.",
      preview: `${import.meta.env.BASE_URL}style-previews/black-white.jpg`,
    },
  ],
};
