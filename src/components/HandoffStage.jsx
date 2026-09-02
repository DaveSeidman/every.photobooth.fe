import { useEffect, useRef, useState } from "react";

function DraggablePhoto({ card, label, src, position, active, exiting, onMove }) {
  const draggingRef = useRef(false);

  const positionFromEvent = (event) => {
    const stage = event.currentTarget.closest(".handoff-stage");
    const bounds = stage.getBoundingClientRect();
    return {
      x: Math.max(0.08, Math.min(0.92, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0.12, Math.min(0.88, (event.clientY - bounds.top) / bounds.height)),
    };
  };

  const startDrag = (event) => {
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    onMove(card, positionFromEvent(event), true);
  };

  const moveDrag = (event) => {
    if (draggingRef.current) onMove(card, positionFromEvent(event), true);
  };

  const stopDrag = (event) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    onMove(card, positionFromEvent(event), false);
  };

  return (
    <button
      type="button"
      className={`handoff-card handoff-card--${card} ${active ? "is-dragging" : ""} ${exiting ? "is-exiting" : ""}`}
      style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      aria-label={`Drag ${label}`}
    >
      <img src={src} alt="" draggable="false" />
      <span>{label}</span>
    </button>
  );
}

export default function HandoffStage({ result, originalUrl, sync }) {
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (!sync.transfer) return undefined;
    setTransferring(false);
    const delay = Math.max(0, sync.transfer.startAt - (Date.now() + sync.clockOffset));
    const timer = window.setTimeout(() => setTransferring(true), delay);
    return () => window.clearTimeout(timer);
  }, [sync.transfer?.version, sync.clockOffset]);

  return (
    <section className={`handoff-stage ${transferring ? "is-transferring" : ""}`} aria-label="Phone photo handoff">
      <div className="phone-target" aria-hidden="true">
        <span className="phone-target__camera" />
        <div><strong>Place phone here</strong><small>Upright / screen facing out</small></div>
      </div>
      <div className="handoff-stage__copy">
        <p className="eyebrow">Two screens / one canvas</p>
        <h2>Move the portraits.<br /><em>Then send one through.</em></h2>
      </div>
      <DraggablePhoto
        card="original"
        label="Original"
        src={originalUrl}
        position={sync.cards.original}
        active={sync.activeCard === "original"}
        onMove={sync.sendCard}
      />
      <DraggablePhoto
        card="styled"
        label={result.styleLabel || "After"}
        src={result.styled}
        position={sync.cards.styled}
        active={sync.activeCard === "styled"}
        exiting={transferring}
        onMove={sync.sendCard}
      />
      <button type="button" className="handoff-transfer" onClick={sync.transferPhoto} disabled={transferring}>
        {transferring ? "Sending…" : "Download photo"}<span>←</span>
      </button>
    </section>
  );
}
