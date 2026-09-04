import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const SNAP_OVERLAP = 0.25;
const SNAP_SPEED = 0.42;
const STOP_SPEED = 0.025;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function DraggablePhoto({ card, label, src, position, active, stageSize, onDragStart, onMove, onRelease }) {
  const dragRef = useRef(null);

  const positionFromEvent = (event) => {
    const stage = event.currentTarget.closest(".handoff-stage");
    const bounds = stage.getBoundingClientRect();
    return {
      x: clamp((event.clientX - bounds.left) / bounds.width, 0.02, 0.98),
      y: clamp((event.clientY - bounds.top) / bounds.height, 0.02, 0.98),
    };
  };

  const startDrag = (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      layer: onDragStart(card),
      lastPosition: positionFromEvent(event),
      lastTime: performance.now(),
      velocity: { x: 0, y: 0 },
      moved: false,
    };
  };

  const moveDrag = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    const now = performance.now();
    const next = positionFromEvent(event);
    const elapsed = Math.max(8, now - drag.lastTime) / 1000;
    const measured = {
      x: (next.x - drag.lastPosition.x) / elapsed,
      y: (next.y - drag.lastPosition.y) / elapsed,
    };
    drag.velocity = {
      x: drag.velocity.x * 0.58 + measured.x * 0.42,
      y: drag.velocity.y * 0.58 + measured.y * 0.42,
    };
    drag.lastPosition = next;
    drag.lastTime = now;
    drag.moved = true;
    onMove(card, next, drag.velocity, drag.layer);
  };

  const stopDrag = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (!drag.moved) return;
    const finalPosition = positionFromEvent(event);
    onRelease(card, finalPosition, drag.velocity, drag.layer, event.currentTarget.getBoundingClientRect());
  };

  return (
    <button
      type="button"
      className={`handoff-card handoff-card--${card} ${active ? "is-dragging" : ""} ${position.settled ? "is-settled" : ""}`}
      style={{
        left: 0,
        top: 0,
        zIndex: 4 + (position.layer || 0),
        transform: `translate3d(${position.x * stageSize.width}px, ${position.y * stageSize.height}px, 0) translate(-50%, -50%) rotate(${position.rotation || 0}deg)`,
      }}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      disabled={position.settled}
      aria-label={position.settled ? `${label} transferred to phone` : `Drag ${label}`}
    >
      <img src={src} alt="" draggable="false" />
      <span className="handoff-card__label">{position.settled ? "On phone" : label}</span>
    </button>
  );
}

export default function HandoffStage({ result, originalUrl, sync }) {
  const stageRef = useRef(null);
  const phoneRef = useRef(null);
  const animationFramesRef = useRef(new Map());
  const automationRef = useRef(null);
  const layerRef = useRef(2);
  const cardsRef = useRef(sync.cards);
  const [transferring, setTransferring] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 1, height: 1 });

  useEffect(() => { cardsRef.current = sync.cards; }, [sync.cards]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const updateSize = () => {
      const bounds = stage.getBoundingClientRect();
      setStageSize({ width: bounds.width, height: bounds.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const cancelMotion = useCallback((card) => {
    window.cancelAnimationFrame(animationFramesRef.current.get(card));
    animationFramesRef.current.delete(card);
  }, []);

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

  const phoneCenter = useCallback(() => {
    const stageBounds = stageRef.current.getBoundingClientRect();
    const phoneBounds = phoneRef.current.getBoundingClientRect();
    return {
      x: (phoneBounds.left + phoneBounds.width / 2 - stageBounds.left) / stageBounds.width,
      y: (phoneBounds.top + phoneBounds.height / 2 - stageBounds.top) / stageBounds.height,
    };
  }, []);

  const overlapWithPhone = useCallback((position, cardBounds) => {
    const phoneBounds = phoneRef.current?.getBoundingClientRect();
    const stageBounds = stageRef.current?.getBoundingClientRect();
    if (!phoneBounds || !stageBounds) return 0;
    const centerX = stageBounds.left + position.x * stageBounds.width;
    const centerY = stageBounds.top + position.y * stageBounds.height;
    const left = centerX - cardBounds.width / 2;
    const right = centerX + cardBounds.width / 2;
    const top = centerY - cardBounds.height / 2;
    const bottom = centerY + cardBounds.height / 2;
    const overlapWidth = Math.max(0, Math.min(right, phoneBounds.right) - Math.max(left, phoneBounds.left));
    const overlapHeight = Math.max(0, Math.min(bottom, phoneBounds.bottom) - Math.max(top, phoneBounds.top));
    return (overlapWidth * overlapHeight) / (cardBounds.width * cardBounds.height);
  }, []);

  const beginDrag = useCallback((card) => {
    cancelMotion(card);
    window.cancelAnimationFrame(automationRef.current);
    setTransferring(false);
    layerRef.current += 1;
    return layerRef.current;
  }, [cancelMotion]);

  const moveCard = useCallback((card, position, velocity, layer) => {
    const current = cardsRef.current[card];
    const rotation = clamp((current.rotation || 0) * 0.82 + velocity.x * 2.8, -18, 18);
    sync.sendCard(card, withPhoneCoordinates({ ...position, rotation, layer, settled: false }), true);
  }, [sync.sendCard, withPhoneCoordinates]);

  const snapCard = useCallback((card, start, layer, onComplete) => {
    cancelMotion(card);
    const center = phoneCenter();
    const startedAt = performance.now();
    const duration = 380;
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - ((1 - progress) ** 3);
      const position = {
        ...start,
        x: start.x + (center.x - start.x) * eased,
        y: start.y + (center.y - start.y) * eased,
        rotation: start.rotation * (1 - eased * 0.28),
        layer,
        settled: progress === 1,
      };
      sync.sendCard(card, withPhoneCoordinates(position), progress < 1);
      if (progress < 1) {
        animationFramesRef.current.set(card, window.requestAnimationFrame(tick));
      } else {
        animationFramesRef.current.delete(card);
        onComplete?.();
      }
    };
    animationFramesRef.current.set(card, window.requestAnimationFrame(tick));
  }, [cancelMotion, phoneCenter, sync.sendCard, withPhoneCoordinates]);

  const releaseCard = useCallback((card, position, velocity, layer, cardBounds) => {
    const current = cardsRef.current[card];
    const speed = Math.hypot(velocity.x, velocity.y);
    const start = withPhoneCoordinates({
      ...position,
      rotation: current.rotation || 0,
      layer,
      settled: false,
    });
    if (overlapWithPhone(position, cardBounds) >= SNAP_OVERLAP && speed <= SNAP_SPEED) {
      snapCard(card, start, layer);
      return;
    }

    const stageBounds = stageRef.current.getBoundingClientRect();
    const halfWidth = cardBounds.width / stageBounds.width / 2;
    const halfHeight = cardBounds.height / stageBounds.height / 2;
    const motion = {
      position: start,
      velocity: {
        x: clamp(velocity.x, -2.6, 2.6),
        y: clamp(velocity.y, -2.6, 2.6),
      },
      angularVelocity: clamp(velocity.x * 15, -38, 38),
      lastTime: performance.now(),
    };

    const tick = (now) => {
      const elapsed = Math.min(0.034, Math.max(0.001, (now - motion.lastTime) / 1000));
      motion.lastTime = now;
      motion.velocity.x *= Math.exp(-1.35 * elapsed);
      motion.velocity.y *= Math.exp(-1.35 * elapsed);
      motion.angularVelocity *= Math.exp(-1.1 * elapsed);
      motion.position.x += motion.velocity.x * elapsed;
      motion.position.y += motion.velocity.y * elapsed;
      motion.position.rotation = clamp(motion.position.rotation + motion.angularVelocity * elapsed, -22, 22);

      if (motion.position.x < halfWidth || motion.position.x > 1 - halfWidth) {
        motion.position.x = clamp(motion.position.x, halfWidth, 1 - halfWidth);
        motion.velocity.x *= -0.72;
        motion.angularVelocity += motion.velocity.x * 9;
      }
      if (motion.position.y < halfHeight || motion.position.y > 1 - halfHeight) {
        motion.position.y = clamp(motion.position.y, halfHeight, 1 - halfHeight);
        motion.velocity.y *= -0.72;
        motion.angularVelocity -= motion.velocity.y * 7;
      }

      const nextSpeed = Math.hypot(motion.velocity.x, motion.velocity.y);
      if (overlapWithPhone(motion.position, cardBounds) >= SNAP_OVERLAP && nextSpeed <= SNAP_SPEED) {
        snapCard(card, motion.position, layer);
        return;
      }

      const moving = nextSpeed > STOP_SPEED || Math.abs(motion.angularVelocity) > 0.8;
      sync.sendCard(card, withPhoneCoordinates({ ...motion.position, layer, settled: false }), moving);
      if (moving) {
        animationFramesRef.current.set(card, window.requestAnimationFrame(tick));
      } else {
        animationFramesRef.current.delete(card);
      }
    };
    animationFramesRef.current.set(card, window.requestAnimationFrame(tick));
  }, [overlapWithPhone, snapCard, sync.sendCard, withPhoneCoordinates]);

  const sendToPhone = () => {
    if (transferring || !stageRef.current || !phoneRef.current) return;
    setTransferring(true);
    ["original", "styled"].forEach(cancelMotion);
    const starts = {
      original: { ...cardsRef.current.original },
      styled: { ...cardsRef.current.styled },
    };
    const center = phoneCenter();
    const startedAt = performance.now();
    const duration = 1550;
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - ((1 - progress) ** 3);
      const updates = ["original", "styled"].map((card) => {
        const start = starts[card];
        const position = {
          ...start,
          x: start.x + (center.x - start.x) * eased,
          y: start.y + (center.y - start.y) * eased,
          rotation: start.rotation * (1 - eased * 0.28),
          settled: progress === 1,
        };
        return { card, position: withPhoneCoordinates(position), dragging: progress < 1 };
      });
      sync.sendCards(updates);
      if (progress < 1) {
        automationRef.current = window.requestAnimationFrame(tick);
      } else {
        setTransferring(false);
      }
    };
    automationRef.current = window.requestAnimationFrame(tick);
  };

  useEffect(() => () => {
    window.cancelAnimationFrame(automationRef.current);
    animationFramesRef.current.forEach((frame) => window.cancelAnimationFrame(frame));
  }, []);

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
        stageSize={stageSize}
        onDragStart={beginDrag}
        onMove={moveCard}
        onRelease={releaseCard}
      />
      <DraggablePhoto
        card="styled"
        label={result.styleLabel || "After"}
        src={result.styled}
        position={sync.cards.styled}
        active={sync.activeCard === "styled"}
        stageSize={stageSize}
        onDragStart={beginDrag}
        onMove={moveCard}
        onRelease={releaseCard}
      />
      <button type="button" className="handoff-transfer" onClick={sendToPhone} disabled={transferring}>
        {transferring ? "Sending…" : "Send to phone"}<span>←</span>
      </button>
    </section>
  );
}
