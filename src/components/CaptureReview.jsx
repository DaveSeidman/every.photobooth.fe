import { useRef } from "react";
import StampFrame from "./StampFrame.jsx";
import TicketButton from "./TicketButton.jsx";

export function ReviewActions({ onRetake, onApprove }) {
  const locked = useRef(false);
  const select = (action) => { if (!locked.current) { locked.current = true; action?.(); } };
  return <div className="ticket-actions">
    <TicketButton className="secondary-button" onSelect={() => select(onRetake)}>Retake</TicketButton>
    <TicketButton className="primary-button" onSelect={() => select(onApprove)}>Use this photo</TicketButton>
  </div>;
}

export default function CaptureReview({ photo, onRetake, onApprove, showPhoto = true, showActions = true }) {
  return (
    <section className="capture-review" aria-labelledby="review-title">
      <header className="capture-review__header">
        <div><p className="eyebrow">Photo captured</p><h1 id="review-title">Keep <em>it?</em></h1></div>
        <p>Take a second. Make sure everyone is in frame and feels like themselves.</p>
      </header>
      {showPhoto && <div className="capture-review__stage"><StampFrame /><img src={photo} alt="Your captured portrait" /><p className="stamp-caption">Is everyone in frame?</p></div>}
      {showActions && <footer className="capture-review__actions"><ReviewActions onRetake={onRetake} onApprove={onApprove} /></footer>}
    </section>
  );
}
