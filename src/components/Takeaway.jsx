import { useState } from "react";
import { useParams } from "react-router-dom";
import { appConfig } from "../config.js";
import { photoUrl } from "../api.js";

export default function Takeaway() {
  const { photoId } = useParams();
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState("");
  const stillUrl = photoId ? photoUrl(photoId, "jpg") : null;

  const share = async () => {
    if (!photoId) return;
    setSharing(true);
    setMessage("");
    try {
      const response = await fetch(stillUrl);
      const extension = "jpg";
      if (!response.ok) throw new Error("Your image is still being prepared.");
      const blob = await response.blob();
      const file = new File([blob], `every-portrait-${photoId}.${extension}`, { type: blob.type });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({
          files: [file],
          title: appConfig.title,
          text: "My portrait study",
        });
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

  return (
    <main className="takeaway">
      <header className="takeaway__header"><span className="takeaway__wordmark">EV<em>E</em>RY</span><span>Thesis: 2027 / {photoId.slice(-6)}</span></header>
      <div className="takeaway__image-wrap">
        <img src={stillUrl} alt="Your completed styled portrait" />
      </div>
      <section className="takeaway__copy">
        <p className="eyebrow">Portrait study / complete</p>
        <h1>Keep the<br /><em>thesis.</em></h1>
        <p>Save the styled portrait to your phone, or open your share sheet to send it on.</p>
        <button type="button" className="primary-button" onClick={share} disabled={sharing}>
          {sharing ? "Preparing…" : "Save or share"}<span>↓</span>
        </button>
        {message && <p className="takeaway__message" role="status">{message}</p>}
      </section>
    </main>
  );
}
