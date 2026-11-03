# Every Photobooth Frontend

React/Vite camera kiosk for four Every style-transfer treatments.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:8080` for camera access. When `VITE_API_URL` is omitted, the frontend calls port `8000` on the same hostname, so both localhost and same-Wi-Fi phone testing work.

The camera stream stays open throughout the booth session, including review, style selection, generation, results, and resets. Its preview is hidden on screens that do not use it. The stream is released when the booth unmounts or the page closes.

### Thesis design review

Open `http://localhost:8080/#/preview/attract` to review the complete design flow without camera permissions, API requests, or portrait generation. The screen selector covers attract, framing, countdown, flash, review, four styles, generation, error, results, and phone handoff. The style selector changes the example portrait; Replay handoff repeats the departure and return animation. The M01 link opens the phone takeaway with a sample portrait. Arrow keys step through tablet screens when a form control is not focused.

The implementation follows [the Thesis photobooth prototype](https://internal-every.hi-23d.workers.dev/photobooth/), using its Signifier and Founders fonts, outlined branding, Brooklyn illustration, perforated SVG frames and buttons, and transparent stone animation, served locally from `public/thesis/`. The tablet preserves the reference's 1848 × 2960 proportions and fits both available height and width. The phone page uses the reference's 430 × 932 spacing and allows scrolling on short displays. Live routes retain camera capture, generation, QR delivery, and native sharing.

The booth uses one Every Thesis experience at `http://localhost:8080/`. Legacy `?brand=` links are cleaned up automatically, and QR takeaway links no longer include a brand parameter.

### Test the handoff over Wi-Fi

1. Keep the kiosk open at `http://localhost:8080` so browser camera access remains available.
2. Set `VITE_PUBLIC_APP_URL=http://<laptop-wifi-ip>:8080` in `.env`; either omit `VITE_API_URL` or set it to `http://<laptop-wifi-ip>:8000`.
3. Restart Vite after changing `.env`.
4. Connect the phone to the same Wi-Fi network and scan the result QR code.

Both dev servers bind to `0.0.0.0`. The phone uses ordinary HTTP and `ws://` on the local network; the deployed GitHub Pages app uses HTTPS and `wss://` automatically.

The tablet app always uses a centered 924 × 1480 portrait canvas, scaled with viewport height (100vh × 62.432432vh). Dark gray surrounds it in landscape browsers. Tablet dimensions/type/spacing use vh; the phone takeaway remains fluid.

The backend receives the camera portrait and chosen style. The result keeps its QR code visible throughout phone handoffs. Each new phone session automatically triggers a sequence: tablet photo exits over 750 ms, phone starts entering 350 ms after that exit finishes and arrives over 700 ms, then the tablet photo returns at center with a 450 ms scale/fade. Close arrivals queue so the photo can return before repeating. Existing delivered phones do not replay when someone else scans; reconnects retain their own delivery. A direct link without a connected booth shows the photo immediately. There is no send button or dragging.

The takeaway is one page: generated photo plus **Save or share portrait**. Supported browsers open the native share sheet; others download the image. There is no Original tab. Developer IDs are limited to 01–08 on the tablet and M01 on the phone. The full designer list is `docs/design-handoff/SCREEN-INVENTORY.md`.

### Attract-screen face particles

The attract fade is restricted to the bottom 38vh, leaving the camera view above it clear. Face detection and two-level sparse Lucas–Kanade optical flow run in a browser worker against a mirrored 160 × 256 crop that matches the visible video. Fine particles stream from detected face edges, following local motion. The overlay fades out over 850 ms when entering camera setup; the worker and render loop stop immediately. It never appears in the captured portrait. Reduced-motion users see the regular camera view.

The face model and WASM runtime are served locally from `public/vision/`; see its README for asset provenance and update instructions. No camera frames are uploaded for this effect. Rendering is limited to 30 fps and 240 particles, and analysis keeps only one frame in flight. Run `npm test` for optical-flow translation/static-frame checks. Actual tablet performance should still be assessed on the Samsung hardware.

### Later PostHog interaction phase

Build a small set of optimized, rigged 3D hedgehogs with baked walk/play and mask-removal animations. Apply each generated photographic paper face as a lightweight mask material, including separate string/tape geometry. Keep this out of the current CSS-first build until the visual direction is approved and tablet GPU performance has been profiled.

## GitHub Pages

The included Pages workflow builds from `main`, publishes the app at `/every/`, and deliberately fails if the backend URL is missing. The production build uses `https://photobooth.lightboxlive.io/every` for QR takeaway links and redirects the custom-domain root to the app.

1. Deploy the backend Blueprint and copy its `https://…onrender.com` URL.
2. In `DaveSeidman/every.photobooth.fe`, open **Settings → Secrets and variables → Actions → Variables**.
3. Add `VITE_API_URL` with the Render URL and no trailing slash.
4. Under **Settings → Pages**, choose **GitHub Actions** as the deployment source and set the custom domain to `photobooth.lightboxlive.io`.
5. At the DNS provider, point a `photobooth` CNAME to `daveseidman.github.io`.
6. Push `main` or run the workflow manually, then enable **Enforce HTTPS** after GitHub issues the certificate.

The Render backend must include `https://photobooth.lightboxlive.io` in `ALLOWED_ORIGINS` for both API and WebSocket access.

### iPad layout and on-site camera framing

The booth fills the viewport, with portrait as the primary iPad layout and a landscape fallback. For permission-free layout checks open `/#/preview/attract`, then select each screen using the preview toolbar. Useful portrait viewport sizes: 768×1024, 820×1180, 834×1194, and 1024×1366.

On the live booth, press **F1** to show developer controls, then expand **Camera**. Press **F1** again to hide the entire panel. Camera adjustments are enabled on the welcome and camera screens. Digital zoom and horizontal/vertical framing affect both the mirrored live preview and the captured square photo. These settings persist in this browser’s local storage, including across booth resets; **Reset framing** restores defaults. Digital zoom crops pixels and reduces resolution. Horizontal framing is expressed in camera coordinates (the preview is mirrored). At 1×, movement is limited to the source area outside the square crop; zoom in to gain room on both axes.

Hardware pan/tilt/zoom sliders appear only when the active video track reports usable capability ranges. **Request PTZ / reconnect** restarts the camera with PTZ constraints so supporting browsers can request permission. iPad hardware/browser combinations may expose none of these controls; digital framing remains available. Hardware settings are not persisted. Use **Log camera diagnostics** to record actual settings and capabilities in the diagnostic logs.

Camera access requires a secure context. Desktop `http://localhost:8080` works, but an iPad visiting `http://<computer-LAN-IP>:8080` cannot access its camera. Use an HTTPS deployment or a trusted HTTPS development proxy/tunnel for live iPad testing.

### Diagnostic logs

Structured logs run in development and production. Open the browser console and enable **Verbose/Debug** to see `[booth #…]` entries. Press **F1**, expand **Diagnostics**, and choose **Download logs** for a JSON export, or **Clear logs** to start a fresh recording. The console also exposes `window.boothLogs.get()`, `.download()`, and `.clear()`.

Entries include UTC timestamps, elapsed time, session IDs, user input events (without text input contents), committed React state changes, app timer scheduling/firing/cancellation, fetch metadata and sanitized API payloads, camera lifecycle and captures, WebSocket messages/reconnects, resource loads, and browser lifecycle/errors. Animation frames and per-pixel particle calculations are excluded. Photo bytes, prompt text, credentials and camera device identifiers are redacted. Logs are kept in memory, capped at 10,000 entries; older entries are dropped in batches and counted in the export. Download before refreshing or closing the page.

Backend stdout contains structured HTTP request start/completion/disconnect logs and generation milestones. `X-Request-Id` connects backend requests to frontend `fetch.response` records. Backend logs contain timing and photo IDs, without uploaded images or generation prompts.

The local Mac backend now applies classic photo filters if either AI treatment fails or exceeds twice the normal generation duration. The normal duration starts at 17 seconds and learns from recent successful AI calls. Each capture refreshes the deadline from `/config`, and the frontend timeout allows 15 additional seconds for the local result to arrive. Classic treatments are identified in the returned style label. This requires the iPad to retain its local connection to the Mac; it is not a browser-only fallback for an unreachable backend.

F1 → **Fallback testing → Simulate** can select **No internet (AI only)**,
**AI generation error**, or **AI generation timeout (2×)**. The selection applies
on each new capture until switched back to **Normal operation** (or page reload).
These tests bypass all paid AI requests on the Mac, keeping the local connection
and printing active. Timeout uses the real adaptive fallback deadline. The
internet simulation tests AI unavailability, not loss of the iPad-to-Mac LAN or
cold-loading an uncached website without internet. Normal automatic printing
still applies to simulated captures.

The live Polaroid has three centered depths: **back** on an empty attract screen,
**normal** once a face is detected, and **closeup** during camera setup/countdown.
Presence needs 200 ms of continuous detection; brief tracking gaps are ignored
before the photo recedes. The existing local face detector uses the same square
crop as capture. Size changes ease with overshoot, with a short 3D tilt on the
whole photo; reduced-motion settings disable these movements. Pixel-storm tiles
round and gain a small highlight only while in flight, preserving the original
photo intro and completed portrait.

Capture keeps the same live Polaroid container through countdown, exposure, and review. The countdown is centered in the preview image. After freezing the camera frame, an exposure filter blooms to white and develops back to color over 4.2 seconds, with a light iridescent sheen while the photo retreats to normal depth. No view-transition snapshot or duplicate review photo is used. Reduced-motion preferences skip the development effects. Paper edges use the original complete stamp artwork, so the cutouts stay attached to the frame as it scales.

Start, capture, and review controls are attached ticket buttons. Tap or activate with the keyboard normally, or pull downward about 90 CSS pixels and release to tear off and select. Native touchstart/touchmove/touchend/touchcancel handlers track the pull; cancellation or an incomplete tear springs back without selecting. Pulling from either side pivots the ticket around the opposite attachment corner. Mouse/pen dragging is supported as well.

The live Polaroid and its tickets share fixed design geometry: a 600 × 648 frame, 600 × 88 full-width ticket, or two 300 × 88 tickets. Their artwork is generated at those exact dimensions with matching circular perforations. Only the complete group is scaled for depth and viewport fit, so buttons and cutouts cannot stretch independently. Run `node scripts/generate-ticket-art.mjs` to regenerate those SVGs.

The Polaroid container and its `.camera__still` image now remain mounted through the entire live flow. Processing paints its particles around that image and reveals the generated `src` in place; results add QR controls and the source thumbnail without mounting another frame. The normal width/center stay fixed across review, style selection, processing, and results. Style choices float above the dimmed original as two un-stretched 600 × 300 cards with coral titles and no retake action. They enter from opposite sides with a small 3D tilt, while the original returns to back depth. The phone handoff animates that same image element.

Back depth dims the photo and paper to half brightness on both the empty attract screen and style selection. The foreground choice cards remain fully lit. Document-wide view-transition snapshots are avoided so the persistent Polaroid keeps moving as the same object under the cards.

Phase titles now use one persistent heading, blurring/fading out for 110 ms and resolving the next title over 170 ms. The Polaroid center is raised slightly across every phase; results portal the 600 × 200 QR card and attached 600 × 88 action row into the same scaled object. The 156px QR has equal 22px top, bottom, and left paper margins in the shared design space. Countdown digits and the capture button enter from zero opacity.

At `https://photobooth.lightboxlive.io`, the first genuine tap/click requests fullscreen on the document while preserving that control's normal activation. The request runs synchronously before ticket animations, once per page load. Local and other origins are unchanged. Standard fullscreen and the legacy Safari method are supported; unsupported or rejected requests are logged without interrupting the booth.

On the phone, **Save or Share Portrait** is a reusable tear-away ticket. Its image file is prepared before interaction so the native share sheet can open directly from the real tap/release gesture. The tablet mirrors grab/pull/cancel/detach on its QR card and shows sharing/download feedback. A room grants one phone gesture ownership through the tear and return animation; concurrent phones still save/share locally without taking over that tablet movement. Phone takeaway routes skip auto-fullscreen to preserve their native-share activation.

Manual reset and the idle timeout use the same sequence: QR card and both tabs fall away for 720 ms, then the centered camera square powers on over 900 ms with a vertically expanding live feed and restrained brightness/scale pulse. The reveal is clipped by the square preview. Only after the reveal finishes are the old capture/result cleared and the attract controls restored. Phone activity cannot restart the idle timer mid-reset. Design previews include the resetting and camera-reveal phases.

Takeaway motion uses a direct socket subscription outside React state, a newest-position-only 30fps sender, and time-based tablet interpolation on animation frames. End/cancel events bypass the motion queue, and stale unsent positions are cleared on disconnect. Motion samples remain in exported logs but skip console printing; `socket.motion-summary` reports packet count and mean/maximum arrival gaps after a tear. This avoids making DevTools or per-packet component renders part of the animation loop. Network latency is still visible on WAN connections; the local LAN backend avoids that round trip.
