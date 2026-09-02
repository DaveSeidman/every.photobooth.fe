import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { appConfig } from "../config.js";
import { photoUrl } from "../api.js";
import { usePhotoSync } from "../hooks/usePhotoSync.js";

export default function Takeaway() {
  const { photoId } = useParams();
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState("");
  const [arrived, setArrived] = useState(false);
  const stillUrl = photoId ? photoUrl(photoId, "jpg") : null;
  const originalUrl = photoId ? photoUrl(`${photoId}-source`, "jpg") : null;
  const sync = usePhotoSync(photoId, "phone");

  useEffect(() => {
    setArrived(false);
  }, [photoId]);

  useEffect(() => {
    if (sync.completed) setArrived(true);
  }, [sync.completed]);

  const share = async () => {
    if (!photoId) return;
    setSharing(true);
    setMessage("");
    try {
      const response = await fetch(stillUrl);
      if (!response.ok) throw new Error("Your image is still being prepared.");
      const blob = await response.blob();
      const file = new File([blob], `every-portrait-${photoId}.jpg`, { type: blob.type });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ files: [file], title: appConfig.title, text: "My portrait study" });
      } else {
        const anchor = document.createElement("a");
        anchor.href = URL.createObjectURL(blob);
        anchor.download = file.name;
        anchor.click();
        URL.revokeObjectURL(anchor.href);
      }
    } catch (error) {
      if (error.name !== "AbortError") setMessage(error.message);
    } finally {
      setSharing(false);
    }
  };

  if (!photoId) {
    return <main className="takeaway takeaway--missing"><p>This portrait link is incomplete.</p></main>;
  }

  const cardStyle = (position) => ({
    left: `${(position.phoneX ?? position.x) * 100}%`,
    top: `${(position.phoneY ?? position.y) * 100}%`,
    transform: `translate(-50%, -50%) rotate(${position.rotation || 0}deg)`,
  });

  return (
    <main className={`takeaway-sync ${arrived ? "takeaway-sync--arrived" : ""}`}>
      <header className="takeaway-sync__brand">EV<em>E</em>RY <span>✳</span></header>
      <section
        className={`takeaway-sync__prompt ${sync.moved ? "is-hidden" : ""}`}
        aria-hidden={sync.moved}
      >
        <p>{sync.status === "connected" ? "Phone and booth connected" : "Connecting to the booth"}</p>
        <h1>Hold your phone up<br /><em>to the screen.</em></h1>
        <small>Keep this page open and hold your phone upright.</small>
      </section>

      {sync.moved && (
        <div className="takeaway-sync__mirrors" aria-label="Synced portrait positions">
          <img
            className={`takeaway-sync__card takeaway-sync__card--original ${sync.activeCard === "original" ? "is-active" : ""}`}
            src={originalUrl}
            alt="Original portrait moving with the booth"
            style={cardStyle(sync.cards.original)}
          />
          <img
            className={`takeaway-sync__card takeaway-sync__card--styled ${sync.activeCard === "styled" ? "is-active" : ""}`}
            src={stillUrl}
            alt="Styled portrait moving with the booth"
            style={cardStyle(sync.cards.styled)}
          />
        </div>
      )}

      {arrived && (
        <section className="takeaway-sync__actions">
          <p>Your portrait crossed the screen.</p>
          <button type="button" className="primary-button" onClick={share} disabled={sharing}>
            {sharing ? "Preparing…" : "Save or share"}<span>↓</span>
          </button>
          {message && <p className="takeaway__message" role="status">{message}</p>}
        </section>
      )}
      <div className="takeaway-sync__status"><i className={sync.status === "connected" ? "is-live" : ""} />{sync.status}</div>
    </main>
  );
}
