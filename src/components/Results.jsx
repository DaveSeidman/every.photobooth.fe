import { QRCodeSVG } from "qrcode.react";
import { takeawayUrl } from "../api.js";

function PhotoCard({ src, label, delay = 0 }) {
  return (
    <figure className="result-card" style={{ "--delay": `${delay}ms` }}>
      <img src={src} alt={label} />
      <figcaption><span>{label}</span><span>Portrait study</span></figcaption>
    </figure>
  );
}

export default function Results({ result, originalPhoto, labels, onReset }) {
  const shareUrl = takeawayUrl(result.photoId);
  return (
    <section className="results" aria-labelledby="results-title">
      <div className="results__heading">
        <p className="eyebrow">Your three studies</p>
        <h1 id="results-title">One moment, reimagined.</h1>
      </div>
      <div className="results__grid">
        <PhotoCard src={result.variantA} label={labels.variantA} />
        <PhotoCard src={originalPhoto} label={labels.original} delay={100} />
        <PhotoCard src={result.variantB} label={labels.variantB} delay={200} />
        <aside className="share-card" style={{ "--delay": "300ms" }}>
          <div className="share-card__qr"><QRCodeSVG value={shareUrl} size={176} level="M" /></div>
          <div>
            <p className="eyebrow">Take it with you</p>
            <h2>Scan to save<br />and share.</h2>
          </div>
          <button type="button" className="text-button" onClick={onReset}>Start again <span>↗</span></button>
        </aside>
      </div>
    </section>
  );
}
