import TicketButton from "./TicketButton.jsx";
import StampFrame from "./StampFrame.jsx";
import { createPortal } from "react-dom";
import { timers } from "../lib/timers.js";
import { useLoggedState } from "../hooks/useLoggedState.js";
import { useTakeawayEcho } from "../hooks/useTakeawayEcho.js";
import { useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { photoUrl, takeawayUrl } from "../api.js";
import { useHandoffTiming, usePhotoSync } from "../hooks/usePhotoSync.js";
import DeveloperScreenLabel from "./DeveloperScreenLabel.jsx";
import HandoffStage from "./HandoffStage.jsx";
import { appConfig } from "../config.js";
import KioskChrome from "./KioskChrome.jsx";

export default function Results({ result, onReset, onActivity, timeoutVersion = 0, timeoutMs = 30_000, previewSync, isResetting = false, imageRef, surfaceRef, actionsRef }) {
  const shareUrl = `${takeawayUrl(result.photoId)}?label=${encodeURIComponent(result.styleLabel || "Every portrait")}${previewSync ? `&fallback=1&style=${encodeURIComponent(result.styleId || "black-white")}` : ""}`;
  const originalUrl = result.original || photoUrl(`${result.photoId}-source`);
  const liveSync = usePhotoSync(previewSync ? null : result.photoId, "kiosk");
  const sync = previewSync || liveSync;
  const [secondsLeft, setSecondsLeft] = useLoggedState("Results.secondsLeft", Math.ceil(timeoutMs / 1000));
  useEffect(() => {
    const deadline = Date.now() + timeoutMs;
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update();
    if (!onActivity) return;
    const timer = timers.setInterval(update, 250);
    return () => timers.clearInterval(timer);
  }, [timeoutVersion, timeoutMs, onActivity]);
  const scanCardRef = useRef(null);
  const phoneFeedback = useTakeawayEcho(sync.takeawayInteraction, scanCardRef, onActivity, !isResetting, sync.subscribeTakeawayInteraction);
  const timing = useHandoffTiming(sync.handoff, sync.clockOffset);
  const visualState = timing.animating ? "is-transferring-out" : timing.away ? "is-away" : timing.restoring ? "is-restoring" : "";
  useEffect(() => {
    const image = imageRef?.current;
    if (!image) return;
    image.classList.add("transfer-photo");
    image.classList.remove("is-transferring-out", "is-away", "is-restoring");
    if (visualState) image.classList.add(visualState);
    image.style.animationDelay = timing.restoring ? timing.restoreDelay : timing.animationDelay;
    return () => {
      image.classList.remove("transfer-photo", "is-transferring-out", "is-away", "is-restoring");
      image.style.animationDelay = "";
    };
  }, [imageRef, visualState, sync.handoff?.id]);
  const screen = sync.handoff && (!timing.started || timing.active)
    ? "08 / PHONE CONNECTED" : "07 / FINISHED PORTRAIT + QR";

  useEffect(() => {
    if (sync.phoneConnected || sync.handoff) onActivity?.();
  }, [sync.phoneConnected, sync.handoff, onActivity]);

  const lockup = <div className={`results-lockup ${actionsRef ? "results-lockup--attached" : ""} ${isResetting ? "is-resetting" : ""}`}>
          <aside className="share-card" ref={scanCardRef}><StampFrame />
            <span className="share-card__star">✳</span>
            <div className="share-card__qr"><QRCodeSVG value={shareUrl} size={156} level={appConfig.brand === "riiffs" ? "H" : "M"} fgColor={appConfig.brand === "riiffs" ? "#21153a" : "#000000"} imageSettings={appConfig.brand === "riiffs" ? { src: `${import.meta.env.BASE_URL}riiffs/riiffs-favicon.svg`, width: 28, height: 28, excavate: true } : undefined} /></div>
            <div>
              <p className="eyebrow">Connect your phone</p>
              <h2>{appConfig.brand === "riiffs" ? <>Your moonlit<br />moment</> : <>Scan to take<br />it home</>}</h2>
              <p className="share-card__instruction">{phoneFeedback || (appConfig.brand === "riiffs" ? "Scan to save your RiiFFS portrait to your phone." : "Scan with your phone. Your portrait arrives on its own.")}</p>
              {sync.status !== "connected" && <p className="share-card__connection" role="status">Connecting booth…</p>}
            </div>
          </aside>
        <div className="results__actions ticket-actions">
          <TicketButton className="secondary-button" onSelect={onReset}>Start again</TicketButton>
          {(onActivity || previewSync) && (
            <TicketButton className="primary-button results__reset-timer" onSelect={onReset} aria-label={`Reset booth now (${secondsLeft} seconds remaining)`}>
              <span>Booth resets in {secondsLeft}<span className="seconds-unit">s</span></span>
              <div
                key={timeoutVersion}
                className="timeout-line"
                style={{ "--timeout-duration": `${timeoutMs}ms`, "--timer-play-state": previewSync ? "paused" : "running" }}
                role="timer"
                aria-label="Time remaining before this screen resets"
              />
            </TicketButton>
          )}
        </div>

  </div>;

  return (
    <section className={`results ${isResetting ? "results--resetting" : ""}`} aria-labelledby="results-title">
      {!imageRef && <KioskChrome phase="results" />}
      <DeveloperScreenLabel name={screen} />
      <header className="results__heading">
        <div>
          <p className="eyebrow">{`${result.styleLabel || "Every portrait"} / complete`}</p>
          <h1 id="results-title">{appConfig.brand === "riiffs" ? <>A portrait <em>from another orbit</em></> : <>You, <em>after automation</em></>}</h1>
        </div>
      </header>
      <div className="results__experience">
        {actionsRef?.current ? createPortal(lockup, actionsRef.current) : lockup}
        {!imageRef && <HandoffStage result={result} originalUrl={originalUrl} sync={sync} />}
        {surfaceRef?.current && createPortal(<>
          <div className={`handoff-away persistent-handoff ${timing.animating || timing.away ? "is-visible" : ""}`} aria-hidden={!(timing.animating || timing.away)}><span className="handoff-away__star" /><span>On its way<br />to your phone</span></div>
          <img className="persistent-original" src={originalUrl} alt="Original camera portrait" hidden={timing.animating || timing.away} />
        </>, surfaceRef.current)}

      </div>
    </section>
  );
}
