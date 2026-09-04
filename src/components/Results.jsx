import { useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { photoUrl, takeawayUrl } from "../api.js";
import { usePhotoSync } from "../hooks/usePhotoSync.js";
import HandoffStage from "./HandoffStage.jsx";
import PosthogWorld from "./PosthogWorld.jsx";

export default function Results({ result, onReset, onActivity, brand = "every", timeoutVersion = 0, timeoutMs = 30_000 }) {
  const shareUrl = takeawayUrl(result.photoId, brand);
  const originalUrl = photoUrl(`${result.photoId}-source`);
  const sync = usePhotoSync(result.photoId, "kiosk");

  useEffect(() => {
    if (sync.phoneConnected || sync.moved || sync.completed) onActivity?.();
  }, [sync.phoneConnected, sync.moved, sync.completed, onActivity]);

  return (
    <section className={`results ${sync.phoneConnected ? "results--phone-connected" : ""}`} aria-labelledby="results-title">
      {onActivity && (
        <div
          key={timeoutVersion}
          className="timeout-line"
          style={{ "--timeout-duration": `${timeoutMs}ms` }}
          role="timer"
          aria-label="Time remaining before this screen resets"
        />
      )}
      <header className="results__heading">
        <div>
          <p className="eyebrow">{sync.phoneConnected ? "Phone connected / ready to cross" : `${result.styleLabel || "Every portrait"} / complete`}</p>
          <h1 id="results-title">{sync.phoneConnected ? <>Hold it<br /><em>to the outline.</em></> : brand === "posthog" ? <>Meet your<br /><em>paper selves.</em></> : <>This is you,<br /><em>after automation.</em></>}</h1>
        </div>
        <button type="button" className="secondary-button" onClick={onReset}>Start again</button>
      </header>
      {sync.phoneConnected ? (
        <HandoffStage result={result} originalUrl={originalUrl} sync={sync} />
      ) : (
        <div className="results__experience">
          {brand === "posthog" ? (
            <PosthogWorld image={result.styled} label="Your PostHog paper-world portrait" />
          ) : (
            <figure className="result-hero">
              <div className="result-hero__images">
                <img className="result-hero__styled" src={result.styled} alt={`Your ${result.styleLabel || "Every"} portrait`} />
                <img className="result-hero__source" src={originalUrl} alt="Original camera portrait" />
              </div>
              <figcaption><span>Every / Thesis: 2027</span><span>{result.styleLabel}</span></figcaption>
            </figure>
          )}
          <aside className="share-card">
            <span className="share-card__star">✳</span>
            <div className="share-card__qr"><QRCodeSVG value={shareUrl} size={190} level="M" /></div>
            <div>
              <p className="eyebrow">Connect your phone</p>
              <h2>Scan to begin<br /><em>the handoff.</em></h2>
              <p className="share-card__instruction">Keep this screen open. Your phone and the booth will become one canvas.</p>
              <p className="share-card__connection">{sync.status === "connected" ? "Waiting for phone…" : "Connecting booth…"}</p>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
