# Every Photobooth Frontend

React/Vite camera kiosk for four Every style-transfer treatments.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:8080` for camera access. When `VITE_API_URL` is omitted, the frontend calls port `8000` on the same hostname, so both localhost and same-Wi-Fi phone testing work.

The backend receives the camera portrait and selected style. The results page shows the completed notched portrait and a QR takeaway link. Printing remains a coming-soon message.

## GitHub Pages

The included Pages workflow builds from `main` and deliberately fails if the backend URL is missing.

1. Deploy the backend Blueprint and copy its `https://…onrender.com` URL.
2. In `DaveSeidman/every.photobooth.fe`, open **Settings → Secrets and variables → Actions → Variables**.
3. Add `VITE_API_URL` with the Render URL and no trailing slash.
4. Optionally add `VITE_PUBLIC_APP_URL` if the final site uses a custom domain. The default correctly resolves to the GitHub Pages project path.
5. Under **Settings → Pages**, choose **GitHub Actions** as the deployment source, then push `main` or run the workflow manually.
