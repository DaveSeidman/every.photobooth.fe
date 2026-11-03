import { useEffect, useRef } from "react";
import { logEvent } from "../lib/logger.js";
import { ticketPull, ticketLightPoint } from "../lib/ticketPull.js";

// Native touch events permit a real pull while preserving native tap/keyboard clicks.
export default function TicketButton({ onSelect, className = "primary-button", children, disabled = false, onActivate, onInteraction, ...props }) {
  const buttonRef = useRef(null);
  const latest = useRef({ onSelect, disabled, onActivate, onInteraction });
  latest.current = { onSelect, disabled, onActivate, onInteraction };
  const blocked = useRef(false);
  const suppressClickUntil = useRef(0);
  const animateSelection = useRef(null);
  const lastGrabX = useRef(.8);
  useEffect(() => {
    const button = buttonRef.current;
    let drag, animation, disposed = false, gestureId;
    const emit = (action, pull = {}, method) => {
      gestureId ||= `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const width = button.offsetWidth || 300;
      latest.current.onInteraction?.({ action, gestureId, method, progress: pull.progress || 0,
        x: (pull.x || 0) / width, y: (pull.y || 0) / width, angle: pull.angle || 0,
        origin: pull.origin ?? (lastGrabX.current >= .5 ? 0 : 100),
        grabX: lastGrabX.current, grabY: drag ? drag.startY / (button.offsetHeight || 88) : .5 });
    };
    const reset = () => {
      button.style.transform = "";
      button.style.transformOrigin = "";
      button.style.removeProperty("--tear-progress");
      delete button.dataset.pulling;
      delete button.dataset.illuminated;
    };
    const start = (x, y, id, kind) => {
      if (blocked.current || latest.current.disabled || drag) return;
      animation?.cancel(); reset();
      gestureId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const rect = button.getBoundingClientRect();
      drag = { x, y, id, kind, moved: false, dx: 0, dy: 0, width: button.offsetWidth || rect.width, screenScale: rect.width / (button.offsetWidth || rect.width), grabX: Math.max(0, Math.min(1, (x - rect.left) / rect.width)), loggedAt: 0 };
      drag.startX = drag.grabX * drag.width;
      drag.startY = (y - rect.top) / drag.screenScale;
      button.style.setProperty("--grab-x", `${drag.startX}px`);
      button.style.setProperty("--grab-y", `${drag.startY}px`);
      button.dataset.illuminated = "true";
      lastGrabX.current = drag.grabX;
      emit("grab");
      logEvent("ticket.grab", { label: button.textContent, kind, grabX: drag.grabX });
    };
    const move = (x, y) => {
      if (!drag) return;
      drag.dx = (x - drag.x) / drag.screenScale; drag.dy = (y - drag.y) / drag.screenScale;
      drag.moved ||= Math.hypot(drag.dx, drag.dy) > 8;
      const pull = drag.moved ? ticketPull(drag) : { origin: 0, x: 0, y: 0, angle: 0 };
      const light = ticketLightPoint({ ...drag, pull });
      button.style.setProperty("--grab-x", `${light.x}px`);
      button.style.setProperty("--grab-y", `${light.y}px`);
      if (!drag.moved) return;
      button.dataset.pulling = "true";
      button.style.transformOrigin = `${pull.origin}% 0%`;
      button.style.transform = `translate3d(${pull.x}px, ${pull.y}px, 0) rotate(${pull.angle}deg)`;
      button.style.setProperty("--tear-progress", String(pull.progress));
      emit("pull", pull);
      if (performance.now() - drag.loggedAt > 100) {
        drag.loggedAt = performance.now();
        logEvent("ticket.pull", { label: button.textContent, progress: pull.progress });
      }
    };
    const detach = (method, pull) => {
      if (blocked.current || latest.current.disabled) return;
      blocked.current = true;
      animation?.cancel();
      suppressClickUntil.current = performance.now() + 1000;
      const origin = pull?.origin ?? (lastGrabX.current >= .5 ? 0 : 100);
      const direction = origin === 0 ? 1 : -1;
      const x = pull?.x || 0; const y = pull?.y || 0; const angle = pull?.angle || 0;
      button.style.transformOrigin = `${origin}% 0%`;
      button.dataset.pulling = "true";
      button.dataset.illuminated = "true";
      emit("detach", { ...pull, progress: 1 }, method);
      // A native share sheet must be invoked while this trusted gesture is live.
      try { latest.current.onActivate?.(); }
      catch(error) { logEvent("ticket.activation-failed", {error}, "error"); }
      logEvent("ticket.detached", { label: button.textContent, method });
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      animation = button.animate([
        { transform: button.style.transform || "translate3d(0,0,0) rotate(0deg)", opacity: 1, offset: 0, "--tear-progress": String(pull?.progress || 0) },
        { transform: `translate3d(${x + direction * 3}px, ${y + 8}px, 0) rotate(${angle + direction * 8}deg)`, opacity: 1, offset: .28, "--tear-progress": ".45" },
        { transform: `translate3d(${x + direction * 8}px, ${y + 38}px, 0) rotate(${angle + direction * 16}deg)`, opacity: 1, offset: .55, "--tear-progress": "1" },
        { transform: `translate3d(${x + direction * 24}px, ${y + 190}px, 0) rotate(${angle + direction * 28}deg)`, opacity: 0, offset: 1, "--tear-progress": "1" },
      ], { duration: reduced ? 1 : pull ? 300 : 480, easing: "cubic-bezier(.4,0,.8,.4)", fill: "forwards" });
      animation.finished.then(() => { if (!disposed) latest.current.onSelect?.(); }).catch(() => {});
    };
    animateSelection.current = (method) => detach(method);
    const finish = (cancelled = false) => {
      if (!drag) return false;
      const current = drag; drag = null;
      if (!current.moved) { if (cancelled) { delete button.dataset.illuminated; emit("cancel"); } logEvent(cancelled ? "ticket.cancel" : "ticket.tap-ready", { label: button.textContent }); return false; }
      suppressClickUntil.current = performance.now() + 1000;
      const pull = ticketPull(current);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!cancelled && pull.complete && !latest.current.disabled) {
        detach("pull", pull);
      } else {
        delete button.dataset.illuminated;
        emit("cancel", pull);
        logEvent(cancelled ? "ticket.cancel" : "ticket.reattach", { label: button.textContent, progress: pull.progress });
        animation = button.animate([{ transform: button.style.transform }, { transform: "translate3d(0,0,0) rotate(0deg)" }], { duration: reduced ? 1 : 380, easing: "cubic-bezier(.16,1.2,.3,1)" });
        animation.finished.then(() => { if (!disposed) reset(); }).catch(() => {});
      }
      return true;
    };
    const touchStart = (event) => {
      if (event.touches.length !== 1) { finish(true); return; }
      const t = event.changedTouches[0]; start(t.clientX, t.clientY, t.identifier, "touch");
    };
    const touchMove = (event) => {
      if (drag?.kind !== "touch") return;
      const t = Array.from(event.changedTouches).find(t => t.identifier === drag.id);
      if (t) { move(t.clientX, t.clientY); if (drag?.moved) event.preventDefault(); }
    };
    const touchEnd = (event) => {
      if (drag?.kind !== "touch") return;
      const touch = Array.from(event.changedTouches).find(t => t.identifier === drag.id);
      if (!touch) return;
      if (event.type !== "touchcancel") move(touch.clientX, touch.clientY);
      if (finish(event.type === "touchcancel")) event.preventDefault();
    };
    const pointerDown = (event) => {
      if (event.pointerType === "touch" || event.button !== 0) return;
      start(event.clientX, event.clientY, event.pointerId, event.pointerType || "mouse");
      if (drag) button.setPointerCapture(event.pointerId);
    };
    const pointerMove = (event) => { if (drag?.kind !== "touch" && drag?.id === event.pointerId) move(event.clientX, event.clientY); };
    const pointerEnd = (event) => { if (drag?.kind !== "touch" && drag?.id === event.pointerId) { if (event.type === "pointerup") move(event.clientX, event.clientY); finish(event.type !== "pointerup"); } };
    const listeners = { touchstart: touchStart, touchmove: touchMove, touchend: touchEnd, touchcancel: touchEnd, pointerdown: pointerDown, pointermove: pointerMove, pointerup: pointerEnd, pointercancel: pointerEnd, lostpointercapture: pointerEnd };
    for (const [name, listener] of Object.entries(listeners)) button.addEventListener(name, listener, { passive: false });
    return () => {
      disposed = true; animateSelection.current = null; animation?.cancel();
      for (const [name, listener] of Object.entries(listeners)) button.removeEventListener(name, listener);
    };
  }, []);
  return <button {...props} type="button" ref={buttonRef} disabled={disabled} className={`${className} ticket-button`} onClick={(event) => {
    if (blocked.current || performance.now() < suppressClickUntil.current) { event.preventDefault(); return; }
    logEvent("ticket.select", { label: event.currentTarget.textContent, method: event.detail === 0 ? "keyboard" : "tap" });
    animateSelection.current?.(event.detail === 0 ? "keyboard" : "tap");
  }}><span className="ticket-button__glow" aria-hidden="true" /><span className="ticket-button__label" key={typeof children === "string" ? children : undefined}>{children}</span></button>;
}
