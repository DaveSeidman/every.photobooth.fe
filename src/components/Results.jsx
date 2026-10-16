import { useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { photoUrl, takeawayUrl } from "../api.js";
import { useHandoffTiming, usePhotoSync } from "../hooks/usePhotoSync.js";
import DeveloperScreenLabel from "./DeveloperScreenLabel.jsx";
import HandoffStage from "./HandoffStage.jsx";
import PosthogWorld from "./PosthogWorld.jsx";

export default function Results({ result, onReset, onActivity, brand = "every", timeoutVersion = 0, timeoutMs = 30_000 }) {
  const shareUrl = takeawayUrl(result.photoId, brand);
  const originalUrl = photoUrl(`${result.photoId}-source`);
  const sync = usePhotoSync(result.photoId, "kiosk");
  const timing = useHandoffTiming(sync.handoff, sync.clockOffset);
  const screen = sync.handoff && (!timing.started || timing.active)
    ? "08 / PHONE CONNECTED" : "07 / FINISHED PORTRAIT + QR";

  useEffect(() => {
    if (sync.phoneConnected || sync.handoff) onActivity?.();
  }, [sync.phoneConnected, sync.handoff, onActivity]);

  return (
    <section className="results" aria-labelledby="results-title">
      <DeveloperScreenLabel name={screen} />
      <header className="results__heading">
        <div>
          <p className="eyebrow">{`${result.styleLabel || "Every portrait"} / complete`}</p>
          <h1 id="results-title">{brand === "posthog" ? <>Meet your<br /><em>paper selves.</em></> : <>This is you,<br /><em>after automation.</em></>}</h1>
        </div>
        <div className="results__actions">
          <button type="button" className="secondary-button" onClick={onReset}>Start again</button>
          {onActivity && (
            <div className="results__reset-timer">
              <span>Time until booth resets</span>
              <div
                key={timeoutVersion}
                className="timeout-line"
                style={{ "--timeout-duration": `${timeoutMs}ms` }}
                role="timer"
                aria-label="Time remaining before this screen resets"
              />
            </div>
          )}
        </div>
      </header>
      <div className="results__experience">
        {brand === "posthog" ? (
          <PosthogWorld image={result.styled} label="Your PostHog paper-world portrait" />
        ) : (
          <HandoffStage result={result} originalUrl={originalUrl} sync={sync} />
        )}
          <aside className="share-card">
            <span className="share-card__star">✳</span>
            <div className="share-card__qr"><QRCodeSVG value={shareUrl} size={190} level="M" /></div>
            <div>
              <p className="eyebrow">Connect your phone</p>
              <h2>Scan to begin<br /><em>the handoff.</em></h2>
              <p className="share-card__instruction">Scan with your phone. Your portrait will arrive automatically.</p>
              <p className="share-card__connection">{sync.status !== "connected" ? "Connecting booth…" : sync.phoneConnected ? `${sync.phones} phone${sync.phones === 1 ? "" : "s"} connected · scan to get yours` : "Waiting for phone…"}</p>
            </div>
          </aside>
      </div>
    </section>
  );
}
