export default function CaptureReview({ photo, onRetake, onApprove }) {
  return (
    <section className="capture-review" aria-labelledby="review-title">
      <header className="capture-review__header">
        <div>
          <p className="eyebrow">Photo captured</p>
          <h1 id="review-title">Keep it?</h1>
        </div>
        <p>Take a second. Make sure everyone is in frame and feels like themselves.</p>
      </header>
      <div className="capture-review__stage">
        <img src={photo} alt="Your captured portrait" />
      </div>
      <footer className="capture-review__actions">
        <button type="button" className="secondary-button" onClick={onRetake}>Retake</button>
        <button type="button" className="primary-button" onClick={onApprove}>Use this photo <span>↗</span></button>
      </footer>
    </section>
  );
}
