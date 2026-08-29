# Every Photobooth Frontend

React/Vite kiosk and mobile takeaway modeled on the Halloween photobooth's state and data flow, art-directed as an Every / Thesis: 2027 editorial print study.

## Experience flow

`ATTRACT → CAMERA → COUNTDOWN → CAPTURE → PROCESSING → RESULTS → RESET`

- The camera starts only after the guest taps **Begin portrait**, keeping browser permission within a user gesture.
- A file/camera-roll fallback keeps the experience usable when kiosk camera permission is unavailable.
- The captured JPEG is posted to the backend with three operator-editable prompts.
- Results show the original and two AI interpretations, plus a QR code linking to the mobile takeaway.
- Results automatically reset after 90 seconds by default.
- The takeaway prefers the generated GIF and falls back to the still strip.
- Press `F1` to expose live prompt controls for an operator.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

The backend is expected at `http://localhost:8000`; change `VITE_API_URL` for deployment.

## Visual direction

The kiosk uses Thesis-inspired cream paper, near-black fields, oversized grotesque headlines with serif italics, electric blue/coral/cyan accents, screenprint rules, star marks, and rough diagonal swashes. The AI variants are named **Thesis Blue** and **Thesis Coral** and are configured server-side to produce:

- high-contrast black-and-white photographic cutouts
- saturated blue/coral backgrounds
- rough diagonal dry-brush swashes behind subjects
- coarse halftone, photocopy, paper-fiber, and misregistered risograph texture
- exact framing, person count, poses, and recognizable faces

The prompts prohibit generated text, logos, watermarks, borders, and objects over faces.

The fastest adaptation points for a future event are:

- CSS tokens at the top of `src/styles.scss`
- title and kicker variables in `.env`
- the attract, countdown, processing, and results sections in `src/App.jsx`
- variant labels and AI prompts served by the backend

No Halloween video, DeLorean artwork, fonts, or deployment URLs were copied into this repository.

## Creative lab modes

In local development, the top-right Creative lab menu switches between:

- `thesis.editorial` — the standard two-variant Thesis portrait.
- `every.one.in` — an in-memory cumulative group portrait. Each capture feeds the previous group back as a reference so the newest people sit in the middle while the room closes in around them. Reset memory between runs.
- `every.oracle` — accepts a small, consented context payload (city, industry, role) and turns it into subtle visual motifs; it does not fetch LinkedIn data.
- `every.designer` — lets the developer place a color/brush accent before sending the image to the editor.
- `branded.posthog` — a sponsor skin inspired by analytics dashboards and desktop operating systems.

The selector is developer-only by default (`import.meta.env.DEV`). Set `VITE_SHOW_DEV_MENU=true` to expose it in a preview build.

## Deploy on GitHub Pages

The included GitHub Actions workflow publishes the Vite build to Pages on every push to `main`. In the repository settings, enable Pages with **GitHub Actions** as the source, then add a repository variable (or secret) named `VITE_API_URL` containing the Render backend URL, such as `https://every-photobooth-backend.onrender.com`. The workflow uses the `/every.photobooth.fe/` project-pages base path and keeps `VITE_SHOW_DEV_MENU=true` for client review.
