# Every Photobooth — designer screen list

Updated October 16, 2026. The design scope is **eight tablet screens and one phone page**. Black/white monospace developer labels use the IDs below. Loading, errors and finishing are variants within these screens.

## Tablet designs — App

The tablet app always uses a **924 × 1480 portrait canvas**, scaled to viewport height. At 100vh tall it is 62.432432vh wide, centered on dark gray. Tablet sizes, spacing and type use vh; landscape browsers do not switch layouts. The takeaway is a separate fluid phone page.

| Label | Screen | Content / flow |
| --- | --- | --- |
| 01 / ATTRACT | Attract | Live mirrored camera with face-driven optical-flow particles; fade restricted to the lower part of the screen. Every branding, Start your Thesis button → 02. Particles fade out on transition. |
| 02 / CAMERA SETUP | Camera setup → ready to take photo | Permission/setup, framing guidance, shutter. Shutter → 03. Unavailable-camera/capture errors are variants here. |
| 03 / COUNTDOWN + FLASH | Countdown → capture flash | Default 3–2–1, flash, automatic capture → 04. |
| 04 / REVIEW PHOTO | Review photo — retake or approve | Unobstructed portrait; Retake → 02; Use this photo → 05. |
| 05 / CHOOSE EVERY STYLE | Choose one of four Every styles | Weights & Measures, Digital Twins, Future of Work, Black & White. Select → 06; retake → 02. |
| 06 / GENERATING PORTRAIT | Generating portrait → finishing | Source photo, separate rock spinner beside generation text, progress/status and finishing. Success → 07. Generation error/retry is a variant here. |
| 07 / FINISHED PORTRAIT + QR | Finished portrait + QR code | Styled photo with source inset, persistent QR, Start again and reset timer in header. QR opens M01. |
| 08 / PHONE CONNECTED | Phone connected → animate photo onto phone | Photo exits upward; phone receives it later; tablet photo returns at center by scaling up and fading in. QR remains visible in the same place throughout. Return → 07. Another phone can scan to repeat. |

Start your Thesis and the framing step are intentionally retained. Result reset defaults to 30 seconds and is refreshed by phone connections and new handoffs.

## Phone designs — Takeaway / Sharing site

| Label | Screen | Content / flow |
| --- | --- | --- |
| M01 / TAKEAWAY | Single photo + native save/share button | Every header, the generated photo, and one Save or share portrait button. The phone photo enters from the bottom after the tablet photo has exited. No Original tab, dragging, alignment target or send button. |

Connecting, waiting for the scheduled arrival, loading, unavailable photo, preparing share and share errors stay within M01. A missing link shows guidance in the same page. Native sharing offers the destinations supported by that phone (including saving and installed sharing apps); the app cannot guarantee an Instagram destination. Where native file sharing is unavailable, the button downloads the image. OS share UI is not another app-owned design screen.

## Handoff timing

Each new phone tab/session receives a recipient-specific sequence, scheduled by the socket server:

1. Connection gets a 450 ms scheduling lead-in.
2. Tablet photo exits upward over 750 ms.
3. Leave a 350 ms gap after the tablet exit; then start phone arrival (1,100 ms after the tablet animation starts).
4. Phone photo slides in from below over 700 ms.
5. At 1,950 ms, the tablet photo returns at its center, scaling from 88% and fading in over 450 ms.
6. Keep QR visible throughout. Further phones repeat the sequence; close arrivals queue until the tablet has returned. Already-delivered phones keep their photos and do not animate again when someone else scans.

Reconnecting/reloading a delivered phone tab retains its sequence rather than triggering another tablet departure. A fresh tab/device can trigger a fresh sequence. A direct link opened without a connected booth shows the photo immediately. Reduced-motion users get static state changes instead of sliding/scaling.

## Figma artifacts and implementation notes

Import `photobooth-flow.svg` into Figma for nine blank labeled screen placeholders with visual arrows. It is an editable vector board, not a native `.fig` file or clickable prototype. Design tablet frames at 924 × 1480 and a representative phone frame such as 390 × 844.

The backend dashboard is separate from these requested designs. Its developer label remains D01 / BACKEND STATUS; it shows completed totals/today, active jobs, failures, printer-disabled status, AI configuration, uptime and recent jobs.

The source currently still includes unused alternate-brand branches; the design handoff is Every only. Printing is disabled. F1 is an optional operator prompt/fullscreen overlay, not an additional guest screen.

Relevant source: `every-photobooth-frontend/src/App.jsx`, `components/Results.jsx`, `components/HandoffStage.jsx`, `components/Takeaway.jsx`, `components/DeveloperScreenLabel.jsx`, `hooks/usePhotoSync.js`, `styles.scss`; socket scheduling is in `every-photobooth-backend/realtime.js`. Component/hook paths are relative to the frontend `src/` directory.
