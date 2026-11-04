# Analytics

Open https://every-photobooth-backend.onrender.com/status and find **Live analytics**. Counts update every three seconds. Choose Production or Local / test and download a CSV of all counts. Local testing appears on the local backend status page (port 8000); deployed traffic appears on Render.

Tracks page opens, booth starts, captures, retakes, approvals, generation requests/results/errors, AI versus local fallback completions, phone image loads, save/share taps, native share completion, download starts, cancellations and errors. These are event counts, not unique people. A repeat scan is another phone visit, and a download start does not prove the file was saved. A client timeout can appear as a request error even if the backend later finishes; the existing completed-photo count remains the server's source of truth.

Only named funnel events are sent, never pixel frames or touch coordinates. The event payload excludes photos, photo IDs, prompts, full URLs and personal details. Pending events (up to 100 per browser) survive reloads and retry every five seconds after network failures. IDs prevent duplicate counting on retries. Counts persist on the backend's data disk; analytics start when this release is installed, with no historical backfill. Recent events are bounded to 40 and retry IDs to 10,000. They do not reset when the completed-photo total is reset.

## Optional Google Analytics 4

The first-party dashboard works without Google. To also use GA4:

1. Create a GA4 web stream for https://photobooth.lightboxlive.io.
2. Disable Enhanced measurement on that stream. The app sends its own page views and events, using generic booth/takeaway page locations that omit portrait IDs.
3. Set the frontend GitHub repository variable `VITE_GA_MEASUREMENT_ID` to the stream's public `G-…` ID and rebuild/redeploy. For a local build, use the same Vite environment variable. Google events are enabled only at the production origin.
4. See Reports → Realtime for events. Mark `share_complete` (and optionally `download_started`) as key events if desired. Realtime reporting can take minutes; the booth status page is better for immediate event operations.

No Google script loads when the measurement ID is absent. The first-party dashboard keeps working when Google is unavailable or blocked.
