import { useEffect, useRef, useState } from "react";
import { appConfig } from "../config.js";

function websocketUrl() {
  const url = new URL(appConfig.apiUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/$/, "")}/ws`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

const initialState = { status: "connecting", phones: 0, kiosks: 0, handoff: null, clockOffset: 0 };

export function usePhotoSync(photoId, role) {
  const socketRef = useRef(null);
  const [state, setState] = useState(initialState);
  useEffect(() => {
    setState(initialState);
    if (!photoId) return undefined;
    let clientId;
    const storageKey = `every-${role}-client`;
    try {
      clientId = sessionStorage.getItem(storageKey);
      if (!clientId) {
        clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        sessionStorage.setItem(storageKey, clientId);
      }
    } catch { clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
    let stopped = false;
    let reconnect;
    let attempts = 0;
    const connect = () => {
      if (stopped) return;
      setState((current) => ({ ...current, status: attempts ? "reconnecting" : "connecting" }));
      const socket = new WebSocket(websocketUrl());
      socketRef.current = socket;
      socket.addEventListener("open", () => {
        attempts = 0;
        socket.send(JSON.stringify({ type: "join", photoId, role, clientId }));
      });
      socket.addEventListener("message", (event) => {
        if (stopped) return;
        let message;
        try { message = JSON.parse(event.data); } catch { return; }
        setState((current) => {
          if (message.type === "session") return {
            ...current, status: "connected", phones: message.phones, kiosks: message.kiosks,
            handoff: message.handoff, clockOffset: message.serverTime - Date.now(),
          };
          if (message.type === "presence") return { ...current, phones: message.phones, kiosks: message.kiosks };
          if (message.type === "handoff:transfer") return { ...current, handoff: message.handoff };
          return current;
        });
      });
      socket.addEventListener("close", () => {
        if (stopped) return;
        setState((current) => ({ ...current, status: "reconnecting" }));
        reconnect = window.setTimeout(connect, Math.min(5000, 400 * (2 ** attempts++)));
      });
    };
    connect();
    return () => { stopped = true; window.clearTimeout(reconnect); socketRef.current?.close(); };
  }, [photoId, role]);
  return { ...state, phoneConnected: state.status === "connected" && state.phones > 0 };
}

// A new recipient gets a sequence: tablet exit, phone arrival, tablet restoration.
// Reconnecting phones keep their own finished sequence and do not reanimate.
export function useHandoffTiming(handoff, clockOffset = 0, device = "kiosk") {
  const empty = { started: false, animating: false, restoring: false, active: false, animationDelay: "0ms", restoreDelay: "0ms" };
  const [timing, setTiming] = useState(empty);
  useEffect(() => {
    if (!handoff) { setTiming(empty); return undefined; }
    const phoneDelay = handoff.phoneDelayMs ?? 1100;
    const exitMs = handoff.exitMs ?? 750;
    const phoneDuration = handoff.phoneDurationMs ?? 700;
    const returnDelay = handoff.returnDelayMs ?? 1950;
    const returnDuration = handoff.returnDurationMs ?? 450;
    const update = () => {
      const elapsed = Date.now() + clockOffset - handoff.startsAt;
      const start = device === "phone" ? phoneDelay : 0;
      const end = start + (device === "phone" ? phoneDuration : exitMs);
      setTiming({
        started: elapsed >= start, animating: elapsed >= start && elapsed < end,
        restoring: device === "kiosk" && elapsed >= returnDelay && elapsed < returnDelay + returnDuration,
        active: elapsed >= 0 && elapsed < handoff.durationMs,
        animationDelay: `${-Math.max(0, elapsed - start)}ms`,
        restoreDelay: `${-Math.max(0, elapsed - returnDelay)}ms`,
        away: device === "kiosk" && elapsed >= exitMs && elapsed < returnDelay,
      });
    };
    update();
    const delay = handoff.startsAt - (Date.now() + clockOffset);
    const timers = [0, exitMs, phoneDelay, phoneDelay + phoneDuration, returnDelay, returnDelay + returnDuration, handoff.durationMs]
      .map((offset) => window.setTimeout(update, Math.max(0, delay + offset)));
    return () => timers.forEach(window.clearTimeout);
  }, [handoff, clockOffset, device]);
  return timing;
}
