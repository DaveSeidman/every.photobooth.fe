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

The backend receives the camera portrait and selected style. The results page shows the completed notched portrait and a QR takeaway link. When a phone opens that link, the booth and every connected phone join a photo-specific WebSocket room. Dragged portraits mirror live; dropping a card mostly inside the phone target snaps it to center; and **Send to phone** performs the same movement automatically. The phone does not reveal the portrait until movement begins. Printing remains a coming-soon message.

### Later PostHog interaction phase

Build a small set of optimized, rigged 3D hedgehogs with baked walk/play and mask-removal animations. Apply each generated photographic paper face as a lightweight mask material, including separate string/tape geometry. Keep this out of the current CSS-first build until the visual direction is approved and tablet GPU performance has been profiled.

## GitHub Pages

The included Pages workflow builds from `main` and deliberately fails if the backend URL is missing.

1. Deploy the backend Blueprint and copy its `https://…onrender.com` URL.
2. In `DaveSeidman/every.photobooth.fe`, open **Settings → Secrets and variables → Actions → Variables**.
3. Add `VITE_API_URL` with the Render URL and no trailing slash.
4. Optionally add `VITE_PUBLIC_APP_URL` if the final site uses a custom domain. The default correctly resolves to the GitHub Pages project path.
5. Under **Settings → Pages**, choose **GitHub Actions** as the deployment source, then push `main` or run the workflow manually.
