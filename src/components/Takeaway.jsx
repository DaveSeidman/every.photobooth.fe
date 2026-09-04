import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { appConfig } from "../config.js";
import { photoUrl } from "../api.js";
import { usePhotoSync } from "../hooks/usePhotoSync.js";
import { currentBrand } from "../brand.js";

export default function Takeaway() {
  const { photoId } = useParams();
  const [sharing, setSharing] = useState(null);
  const [message, setMessage] = useState("");
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const stillUrl = photoId ? photoUrl(photoId, "jpg") : null;
  const originalUrl = photoId ? photoUrl(`${photoId}-source`, "jpg") : null;
  const sync = usePhotoSync(photoId, "phone");
  const brand = currentBrand();

  useEffect(() => {
    const updateViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const share = async (card, imageUrl) => {
    if (!photoId) return;
    setSharing(card);
    setMessage("");
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error("Your image is still being prepared.");
      const blob = await response.blob();
      const file = new File([blob], `${brand}-${card}-${photoId}.jpg`, { type: blob.type });
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
      setSharing(null);
    }
  };

  if (!photoId) {
    return <main className="takeaway takeaway--missing"><p>This portrait link is incomplete.</p></main>;
  }

  const cardStyle = (position) => ({
    left: 0,
    top: 0,
    zIndex: 4 + (position.layer || 0),
    transform: `translate3d(${(position.phoneX ?? position.x) * viewport.width}px, ${(position.phoneY ?? position.y) * viewport.height}px, 0) translate(-50%, -50%) rotate(${position.rotation || 0}deg)`,
  });

  const phoneCard = (card, position, imageUrl, label) => (
    <button
      type="button"
      className={`takeaway-sync__card takeaway-sync__card--${card} ${sync.activeCard === card ? "is-active" : ""} ${position.settled ? "is-settled" : ""}`}
      style={cardStyle(position)}
      onClick={() => {
        if (position.settled) share(card, imageUrl);
      }}
      aria-label={position.settled ? `Save or share ${label}` : `${label} moving from the booth`}
    >
      <img src={imageUrl} alt="" draggable="false" />
      {position.settled && (
        <span className="takeaway-sync__save">
          <i aria-hidden="true">↓</i>
          <b>{sharing === card ? "Preparing your thesis…" : "Click to save or share your thesis"}</b>
        </span>
      )}
    </button>
  );

  return (
    <main className={`takeaway-sync takeaway-sync--${brand}`}>
      <header className="takeaway-sync__brand">
        {brand === "posthog"
          ? <>POSTHOG <span>◆</span></>
          : <><img src={`${import.meta.env.BASE_URL}every-logo.svg`} alt="Every" /><span>✳</span></>}
      </header>
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
          {phoneCard("original", sync.cards.original, originalUrl, "original portrait")}
          {phoneCard("styled", sync.cards.styled, stillUrl, "styled portrait")}
        </div>
      )}

      {message && <p className="takeaway-sync__message" role="status">{message}</p>}
      <div className="takeaway-sync__status"><i className={sync.status === "connected" ? "is-live" : ""} />{sync.status}</div>
    </main>
  );
}
