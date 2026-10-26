import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { photoUrl, takeawayUrl } from "../api.js";
import { useHandoffTiming, usePhotoSync } from "../hooks/usePhotoSync.js";
import DeveloperScreenLabel from "./DeveloperScreenLabel.jsx";
import HandoffStage from "./HandoffStage.jsx";
import KioskChrome from "./KioskChrome.jsx";

export default function Results({ result, onReset, onActivity, timeoutVersion = 0, timeoutMs = 30_000, previewSync, isResetting = false }) {
  const shareUrl = `${takeawayUrl(result.photoId)}?label=${encodeURIComponent(result.styleLabel || "Every portrait")}${previewSync ? `&fallback=1&style=${encodeURIComponent(result.styleId || "black-white")}` : ""}`;
  const originalUrl = result.original || photoUrl(`${result.photoId}-source`);
  const liveSync = usePhotoSync(previewSync ? null : result.photoId, "kiosk");
  const sync = previewSync || liveSync;
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(timeoutMs / 1000));
  useEffect(() => {
    const deadline = Date.now() + timeoutMs;
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update();
    if (!onActivity) return;
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [timeoutVersion, timeoutMs, onActivity]);
  const timing = useHandoffTiming(sync.handoff, sync.clockOffset);
  const screen = sync.handoff && (!timing.started || timing.active)
    ? "08 / PHONE CONNECTED" : "07 / FINISHED PORTRAIT + QR";

  useEffect(() => {
    if (sync.phoneConnected || sync.handoff) onActivity?.();
  }, [sync.phoneConnected, sync.handoff, onActivity]);

  return (
    <section className={`results ${isResetting ? "results--resetting" : ""}`} aria-labelledby="results-title">
      <KioskChrome phase="results" />
      <DeveloperScreenLabel name={screen} />
      <header className="results__heading">
        <div>
          <p className="eyebrow">{`${result.styleLabel || "Every portrait"} / complete`}</p>
          <h1 id="results-title">You, <em>after automation</em></h1>
        </div>
        <div className="results__actions">
          <button type="button" className="secondary-button" onClick={onReset}>Start again</button>
          {(onActivity || previewSync) && (
            <div className="results__reset-timer">
              <span>Booth resets in {secondsLeft}s</span>
              <div
                key={timeoutVersion}
                className="timeout-line"
                style={{ "--timeout-duration": `${timeoutMs}ms`, "--timer-play-state": previewSync ? "paused" : "running" }}
                role="timer"
                aria-label="Time remaining before this screen resets"
              />
            </div>
          )}
        </div>
      </header>
      <div className="results__experience">
        <HandoffStage result={result} originalUrl={originalUrl} sync={sync} />
          <aside className="share-card">
            <span className="share-card__star">✳</span>
            <div className="share-card__qr"><QRCodeSVG value={shareUrl} size={190} level="M" /></div>
            <div>
              <p className="eyebrow">Connect your phone</p>
              <h2>Scan to take<br />it home</h2>
              <p className="share-card__instruction">Scan with your phone. Your portrait arrives on its own.</p>
              {sync.status !== "connected" && <p className="share-card__connection" role="status">Connecting booth…</p>}
            </div>
          </aside>
      </div>
    </section>
  );
}
