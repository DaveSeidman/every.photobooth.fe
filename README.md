# Every Photobooth Frontend

React/Vite camera kiosk for four Every style-transfer treatments.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:8080` for camera access. When `VITE_API_URL` is omitted, the frontend calls port `8000` on the same hostname, so both localhost and same-Wi-Fi phone testing work.

Choose the branded experience with `http://localhost:8080/?brand=every#/` or `http://localhost:8080/?brand=posthog#/`. Missing and unknown values are normalized to `brand=every`, and the selected brand is carried into the QR takeaway URL.

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
