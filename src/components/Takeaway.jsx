import { track } from "../lib/analytics.js";
import TicketButton from "./TicketButton.jsx";
import StampFrame from "./StampFrame.jsx";
import { timers } from "../lib/timers.js";
import { useLoggedState } from "../hooks/useLoggedState.js";
import { useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { appConfig, defaultExperience } from "../config.js";
import { photoUrl } from "../api.js";
import { useHandoffTiming, usePhotoSync } from "../hooks/usePhotoSync.js";
import DeveloperScreenLabel from "./DeveloperScreenLabel.jsx";

export default function Takeaway() {
  const { photoId } = useParams();
  const analyticsVisit = useRef(null);
  const analyticsLoaded = useRef(null);
  const [searchParams] = useSearchParams();
  const fallback = searchParams.get("fallback") === "1";
  const [sharing, setSharing] = useLoggedState("Takeaway.sharing", false);
  const [message, setMessage] = useLoggedState("Takeaway.message", "");
  const [revealed, setRevealed] = useLoggedState("Takeaway.revealed", false);
  const [imageStatus, setImageStatus] = useLoggedState("Takeaway.imageStatus", "loading");
  const [retry, setRetry] = useLoggedState("Takeaway.retry", 0);
  const imageRef = useRef(null);
  const fileRef = useRef(null);
  const gestureRef = useRef(null);
  const [fileReady, setFileReady] = useLoggedState("Takeaway.fileReady", false);
  const [prepareRetry, setPrepareRetry] = useLoggedState("Takeaway.prepareRetry", 0);
  const [tearDone, setTearDone] = useLoggedState("Takeaway.tearDone", false);
  const [attempt, setAttempt] = useLoggedState("Takeaway.attempt", 0);
  const previewStyle = defaultExperience.everyStyles.find((style) => style.id === searchParams.get("style")) || defaultExperience.everyStyles[0];
  const stillUrl = fallback ? previewStyle.preview : (photoId ? photoUrl(photoId) : null);
  const sync = usePhotoSync(fallback ? null : photoId, "phone");
  const timing = useHandoffTiming(sync.handoff, sync.clockOffset, "phone");

  useEffect(() => {
    if (photoId && !fallback && analyticsVisit.current !== photoId) { analyticsVisit.current=photoId; track("takeaway_view"); }
  }, [photoId, fallback]);
  useEffect(() => {
    if (photoId && !fallback && imageStatus === "loaded" && analyticsLoaded.current !== photoId) { analyticsLoaded.current=photoId; track("portrait_loaded"); }
  }, [photoId, fallback, imageStatus]);
  useEffect(() => {
    setRevealed(false); setMessage("");
    setImageStatus(imageRef.current?.complete && imageRef.current.naturalWidth ? "loaded" : "loading");
  }, [photoId, stillUrl]);
  useEffect(() => {
    if (fallback || timing.started || (sync.status === "connected" && sync.kiosks === 0)) setRevealed(true);
  }, [fallback, timing.started, sync.status, sync.kiosks]);
  const ready = revealed || fallback || timing.started;

  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    fileRef.current = null; setFileReady(false);
    if (!ready || imageStatus !== "loaded") return;
    // Prepare before the gesture: native sharing must start synchronously.
    fetch(stillUrl, {signal:controller.signal}).then(async (response) => {
      if (!response.ok) throw new Error("Your image could not be prepared. Please try again.");
      const blob = await response.blob();
      if (!live) return;
      fileRef.current = new File([blob], `every-portrait-${photoId}.jpg`, {type:blob.type});
      setFileReady(true); setMessage("");
    }).catch((error) => { if(live && error.name !== "AbortError") setMessage(error.message); });
    return () => { live=false; controller.abort(); };
  }, [stillUrl, ready, imageStatus, prepareRetry]);
  useEffect(() => {
    if (tearDone && !sharing) { setTearDone(false); setAttempt(value=>value+1); }
  }, [tearDone,sharing]);
  const interaction = (event) => {
    gestureRef.current = event;
    sync.sendTakeawayInteraction(event);
  };
  const notify = (action) => {
    if (!fallback) track(action.replaceAll("-", "_"));
    sync.sendTakeawayInteraction({...gestureRef.current, action});
  };
  const share = () => {
    const file = fileRef.current;
    if (sharing || !ready || !file) return;
    setSharing(true); setMessage(""); notify("share-start");
    let task;
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))) {
        task = navigator.share({files:[file], title:appConfig.title, text:"My Every portrait"});
        Promise.resolve(task).then(()=>{notify("share-complete");setMessage("Share complete. You can share again anytime.");})
          .catch(error=>{notify(error.name === "AbortError" ? "share-cancelled" : "share-error");if(error.name!=="AbortError")setMessage(error.message);})
          .finally(()=>setSharing(false));
      } else {
        const objectUrl = URL.createObjectURL(file);
        const anchor = document.createElement("a");
        anchor.href=objectUrl; anchor.download=file.name;
        document.body.append(anchor); anchor.click(); anchor.remove();
        timers.setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
        notify("download-started");setMessage("Download started.");setSharing(false);
      }
    } catch(error) { notify("share-error");setMessage(error.message);setSharing(false); }
  };

  return (
    <main className="takeaway-page">
      <DeveloperScreenLabel name="M01 / TAKEAWAY" />
      <header className="takeaway-page__header">
        <img src={`${import.meta.env.BASE_URL}thesis/img/thesis27.svg`} alt="Thesis: 2027" />
        <span>{fallback ? "Preview" : sync.status === "connected" ? "Connected" : sync.status === "reconnecting" ? "Reconnecting…" : "Connecting…"}</span>
      </header>
      <h1 className="takeaway-page__title">Yours <em>to keep</em></h1>
      <section className="takeaway-page__gallery" aria-label="Your Every portrait">
        <div className={`takeaway-page__portrait ${timing.animating ? "is-transferring-in" : ""}`} style={{ animationDelay: timing.animationDelay }}><StampFrame />
          {photoId && <img ref={imageRef} key={`${stillUrl}-${retry}`} src={`${stillUrl}${retry ? `?retry=${retry}` : ""}`} alt="Your Every portrait" hidden={!ready || imageStatus !== "loaded"}
            onLoad={() => setImageStatus("loaded")} onError={() => setImageStatus("error")} />}
          {!photoId ? <div className="takeaway-page__image-status"><p>This portrait link is incomplete.</p><p>Scan the QR code on the booth.</p></div>
            : imageStatus === "error" ? <div className="takeaway-page__image-status" role="alert"><p>This portrait could not be loaded.</p><button type="button" className="secondary-button" onClick={() => { setImageStatus("loading"); setRetry((value) => value + 1); }}>Try again</button></div>
            : (!ready || imageStatus === "loading") && <p className="takeaway-page__image-status" role="status">{ready ? "Loading your portrait…" : "Your portrait is on its way…"}</p>}
          <p className="takeaway-page__caption">{fallback ? previewStyle.label : searchParams.get("label") || "Every portrait"}</p>
        </div>
        <div className="takeaway-page__actions">
          <TicketButton key={attempt} className="primary-button takeaway-save-ticket" disabled={sharing || !ready || timing.animating || !fileReady}
            onInteraction={interaction} onActivate={share} onSelect={()=>setTearDone(true)}>{fileReady ? "Save or Share Portrait" : "Preparing…"}</TicketButton>
          {message && <p className="takeaway-page__error" role="status">{message}</p>}
          {message && !fileReady && <button className="text-link-button" onClick={()=>setPrepareRetry(value=>value+1)}>Try Again</button>}
          {!ready && sync.status === "reconnecting" && <button type="button" className="text-link-button" onClick={() => setRevealed(true)}>View my portrait</button>}
        </div>
      </section>
    </main>
  );
}
