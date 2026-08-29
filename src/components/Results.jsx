import { QRCodeSVG } from "qrcode.react";
import { takeawayUrl } from "../api.js";

function PhotoCard({ src, label, kind, delay = 0 }) {
  return (
    <figure className={`result-card result-card--${kind}`} style={{ "--delay": `${delay}ms` }}>
      <img src={src} alt={label} />
      <figcaption><span>{label}</span><span>Thesis: 2027</span></figcaption>
    </figure>
  );
}

export default function Results({ result, originalPhoto, labels, onReset }) {
  const shareUrl = takeawayUrl(result.photoId);
  return (
    <section className="results" aria-labelledby="results-title">
      <div className="results__heading">
        <p className="eyebrow">Portrait study / complete</p>
        <h1 id="results-title">One human.<br /><em>Two futures.</em></h1>
      </div>
      <div className="results__grid">
        <PhotoCard src={result.variantA} label={labels.variantA} kind="blue" />
        <PhotoCard src={originalPhoto} label={labels.original} kind="source" delay={100} />
        <PhotoCard src={result.variantB} label={labels.variantB} kind="coral" delay={200} />
        <aside className="share-card" style={{ "--delay": "300ms" }}>
          <span className="share-card__star">✳</span>
          <div className="share-card__qr"><QRCodeSVG value={shareUrl} size={176} level="M" /></div>
          <div>
            <p className="eyebrow">Your takeaway</p>
            <h2>Scan to save<br /><em>the thesis.</em></h2>
            <p className="share-card__print-note">Print edition coming soon.</p>
          </div>
          <button type="button" className="text-button" onClick={onReset}>Start again <span>↗</span></button>
        </aside>
      </div>
    </section>
  );
}
