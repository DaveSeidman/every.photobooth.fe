import { useCallback, useEffect, useRef, useState } from "react";

function DraggablePhoto({ card, label, src, position, active, onMove }) {
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
    event.preventDefault();
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
      className={`handoff-card handoff-card--${card} ${active ? "is-dragging" : ""}`}
      style={{
        left: `${position.x * 100}%`,
        top: `${position.y * 100}%`,
        transform: `translate(-50%, -50%) rotate(${position.rotation || 0}deg)`,
      }}
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
  const stageRef = useRef(null);
  const phoneRef = useRef(null);
  const animationRef = useRef(null);
  const [transferring, setTransferring] = useState(false);

  const withPhoneCoordinates = useCallback((position) => {
    const stageBounds = stageRef.current?.getBoundingClientRect();
    const phoneBounds = phoneRef.current?.getBoundingClientRect();
    if (!stageBounds || !phoneBounds) return { ...position, phoneX: 2, phoneY: position.y };
    const centerX = stageBounds.left + position.x * stageBounds.width;
    const centerY = stageBounds.top + position.y * stageBounds.height;
    return {
      ...position,
      phoneX: (centerX - phoneBounds.left) / phoneBounds.width,
      phoneY: (centerY - phoneBounds.top) / phoneBounds.height,
    };
  }, []);

  const moveCard = useCallback((card, position, dragging) => {
    const rotation = sync.cards[card]?.rotation ?? (card === "original" ? -3 : 2);
    sync.sendCard(card, withPhoneCoordinates({ ...position, rotation }), dragging);
  }, [sync.cards, sync.sendCard, withPhoneCoordinates]);

  const sendToPhone = () => {
    if (transferring || !stageRef.current || !phoneRef.current) return;
    setTransferring(true);
    const stageBounds = stageRef.current.getBoundingClientRect();
    const phoneBounds = phoneRef.current.getBoundingClientRect();
    const phoneLeft = (phoneBounds.left - stageBounds.left) / stageBounds.width;
    const phoneWidth = phoneBounds.width / stageBounds.width;
    const starts = {
      original: { ...sync.cards.original },
      styled: { ...sync.cards.styled },
    };
    const ends = {
      original: phoneLeft + phoneWidth * 0.34,
      styled: phoneLeft + phoneWidth * 0.66,
    };
    const startedAt = performance.now();
    const duration = 1550;

    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - ((1 - progress) ** 3);
      ["original", "styled"].forEach((card) => {
        const position = {
          ...starts[card],
          x: starts[card].x + (ends[card] - starts[card].x) * eased,
        };
        sync.sendCard(card, withPhoneCoordinates(position), progress < 1);
      });
      if (progress < 1) {
        animationRef.current = window.requestAnimationFrame(tick);
      } else {
        sync.completeHandoff();
        setTransferring(false);
      }
    };

    animationRef.current = window.requestAnimationFrame(tick);
  };

  useEffect(() => () => window.cancelAnimationFrame(animationRef.current), []);

  return (
    <section ref={stageRef} className={`handoff-stage ${transferring ? "is-transferring" : ""}`} aria-label="Phone photo handoff">
      <div ref={phoneRef} className="phone-target" aria-hidden="true">
        <span className="phone-target__camera" />
        <div><strong>Place phone here</strong><small>Upright / screen facing out</small></div>
      </div>
      <div className="handoff-stage__copy">
        <p className="eyebrow">Two screens / one canvas</p>
        <h2>Drag the portraits<br /><em>to your device.</em></h2>
      </div>
      <DraggablePhoto
        card="original"
        label="Original"
        src={originalUrl}
        position={sync.cards.original}
        active={sync.activeCard === "original"}
        onMove={moveCard}
      />
      <DraggablePhoto
        card="styled"
        label={result.styleLabel || "After"}
        src={result.styled}
        position={sync.cards.styled}
        active={sync.activeCard === "styled"}
        onMove={moveCard}
      />
      <button type="button" className="handoff-transfer" onClick={sendToPhone} disabled={transferring}>
        {transferring ? "Sending…" : "Send to phone"}<span>←</span>
      </button>
    </section>
  );
}
