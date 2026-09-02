import { QRCodeSVG } from "qrcode.react";
import { takeawayUrl } from "../api.js";

export default function Results({ result, onReset }) {
  const shareUrl = takeawayUrl(result.photoId);
  return (
    <section className="results" aria-labelledby="results-title">
      <header className="results__heading">
        <div>
          <p className="eyebrow">{result.styleLabel || "Every portrait"} / complete</p>
          <h1 id="results-title">This is you,<br /><em>after automation.</em></h1>
        </div>
        <button type="button" className="secondary-button" onClick={onReset}>Start again</button>
      </header>
      <div className="results__experience">
        <figure className="result-hero">
          <img src={result.styled} alt={`Your ${result.styleLabel || "Every"} portrait, with the original camera photo inset`} />
          <figcaption><span>Every / Thesis: 2027</span><span>{result.styleLabel}</span></figcaption>
        </figure>
        <aside className="share-card">
          <span className="share-card__star">✳</span>
          <div className="share-card__qr"><QRCodeSVG value={shareUrl} size={190} level="M" /></div>
          <div>
            <p className="eyebrow">Your takeaway</p>
            <h2>Scan to save<br /><em>the portrait.</em></h2>
            <p className="share-card__instruction">Open the link on your phone to download or share the full-resolution image.</p>
            <p className="share-card__print-note">Print edition coming soon.</p>
          </div>
          <button type="button" className="text-button" onClick={onReset}>Start again <span>↗</span></button>
        </aside>
      </div>
    </section>
  );
}
