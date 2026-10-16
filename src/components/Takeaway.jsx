import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { appConfig } from "../config.js";
import { photoUrl } from "../api.js";
import { useHandoffTiming, usePhotoSync } from "../hooks/usePhotoSync.js";
import DeveloperScreenLabel from "./DeveloperScreenLabel.jsx";

export default function Takeaway() {
  const { photoId } = useParams();
  const [searchParams] = useSearchParams();
  const fallback = searchParams.get("fallback") === "1";
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [imageStatus, setImageStatus] = useState("loading");
  const [retry, setRetry] = useState(0);
  const stillUrl = fallback ? `${import.meta.env.BASE_URL}style-previews/future-of-work.jpg` : (photoId ? photoUrl(photoId) : null);
  const sync = usePhotoSync(fallback ? null : photoId, "phone");
  const timing = useHandoffTiming(sync.handoff, sync.clockOffset, "phone");

  useEffect(() => {
    setRevealed(false); setMessage(""); setImageStatus("loading");
  }, [photoId]);
  useEffect(() => {
    if (fallback || timing.started || (sync.status === "connected" && sync.kiosks === 0)) setRevealed(true);
  }, [fallback, timing.started, sync.status, sync.kiosks]);
  const ready = revealed || fallback || timing.started;

  const share = async () => {
    if (sharing || !ready || imageStatus !== "loaded") return;
    setSharing(true); setMessage("");
    try {
      const response = await fetch(stillUrl);
      if (!response.ok) throw new Error("Your image could not be downloaded. Please try again.");
      const blob = await response.blob();
      const file = new File([blob], `every-portrait-${photoId}.jpg`, { type: blob.type });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ files: [file], title: appConfig.title, text: "My Every portrait" });
      } else {
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl; anchor.download = file.name;
        document.body.append(anchor); anchor.click(); anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      }
    } catch (error) {
      if (error.name !== "AbortError") setMessage(error.message);
    } finally { setSharing(false); }
  };

  return (
    <main className="takeaway-page">
      <DeveloperScreenLabel name="M01 / TAKEAWAY" />
      <header className="takeaway-page__header">
        <img src={`${import.meta.env.BASE_URL}every-logo.svg`} alt="Every" />
        <span>{fallback ? "Preview" : sync.status === "connected" ? "Connected" : sync.status === "reconnecting" ? "Reconnecting…" : "Connecting…"}</span>
      </header>
      <section className="takeaway-page__gallery" aria-label="Your Every portrait">
        <div className={`takeaway-page__portrait ${timing.animating ? "is-transferring-in" : ""}`} style={{ animationDelay: timing.animationDelay }}>
          {photoId && <img key={retry} src={`${stillUrl}${retry ? `?retry=${retry}` : ""}`} alt="Your Every portrait" hidden={!ready || imageStatus !== "loaded"}
            onLoad={() => setImageStatus("loaded")} onError={() => setImageStatus("error")} />}
          {!photoId ? <div className="takeaway-page__image-status"><p>This portrait link is incomplete.</p><p>Scan the QR code on the booth.</p></div>
            : imageStatus === "error" ? <div className="takeaway-page__image-status" role="alert"><p>This portrait could not be loaded.</p><button type="button" className="secondary-button" onClick={() => { setImageStatus("loading"); setRetry((value) => value + 1); }}>Try again</button></div>
            : (!ready || imageStatus === "loading") && <p className="takeaway-page__image-status" role="status">{ready ? "Loading your portrait…" : "Your portrait is on its way…"}</p>}
        </div>
        <div className="takeaway-page__actions">
          <button type="button" className="primary-button" disabled={sharing || !ready || timing.animating || imageStatus !== "loaded"} onClick={share}>{sharing ? "Preparing…" : "Save or share portrait"}<span aria-hidden="true">↓</span></button>
          {message && <p className="takeaway-page__error" role="status">{message} Tap save to try again.</p>}
          {!ready && sync.status === "reconnecting" && <button type="button" className="text-link-button" onClick={() => setRevealed(true)}>View my portrait</button>}
        </div>
      </section>
      <footer className="takeaway-page__footer">Every / Thesis: 2027 <span>Yours to keep.</span></footer>
    </main>
  );
}
