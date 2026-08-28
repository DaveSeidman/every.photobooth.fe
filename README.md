# Every Photobooth Frontend

React/Vite kiosk and mobile takeaway modeled on the Halloween photobooth's state and data flow, with a new theme-neutral visual shell.

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

## Theme handoff

The current UI is intentionally an editorial placeholder, not the final event theme. The fastest adaptation points are:

- CSS tokens at the top of `src/styles.scss`
- title and kicker variables in `.env`
- the attract, countdown, processing, and results sections in `src/App.jsx`
- variant labels and AI prompts served by the backend

No Halloween video, DeLorean artwork, fonts, or deployment URLs were copied into this repository.
