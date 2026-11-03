import { createLatestMotionSender } from "../lib/remoteMotion.js";
import { logEvent } from "../lib/logger.js";
import { timers } from "../lib/timers.js";
import { useLoggedState } from "../hooks/useLoggedState.js";
import { useEffect, useRef, useCallback } from "react";
import { appConfig } from "../config.js";

function websocketUrl() {
  const url = new URL(appConfig.apiUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/$/, "")}/ws`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

const initialState = { status: "connecting", phones: 0, kiosks: 0, handoff: null, takeawayInteraction: null, clockOffset: 0 };

export function usePhotoSync(photoId, role) {
  const socketRef = useRef(null);
  const motionSender = useRef(null);
  const motionListeners = useRef(new Set());
  const motionStats = useRef({count:0,lastAt:0,maxGap:0,totalGap:0});
  const [state, setState] = useLoggedState("usePhotoSync.state", initialState);
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
      logEvent("socket.connecting", { photoId, role, attempts, url: websocketUrl() });
      const socket = new WebSocket(websocketUrl());
      socketRef.current = socket;
      socket.addEventListener("open", () => {
        logEvent("socket.open", { photoId, role });
        attempts = 0;
        logEvent("socket.send", { type: "join", photoId, role });
        socket.send(JSON.stringify({ type: "join", photoId, role, clientId }));
      });
      socket.addEventListener("message", (event) => {
        if (stopped) return;
        let message;
        try { message = JSON.parse(event.data); } catch { logEvent("socket.invalid-message", { bytes: event.data?.length }, "warn"); return; }
        const motion = message.type === "takeaway:interaction";
        const pull = motion && message.action === "pull";
        logEvent("socket.message", { photoId, role, message }, "info", {console:!pull});
        if(motion) {
          if(message.action==="grab")motionStats.current={count:0,lastAt:0,maxGap:0,totalGap:0};
          if(pull) {
            const stats=motionStats.current,now=performance.now();
            if(stats.lastAt){const gap=now-stats.lastAt;stats.maxGap=Math.max(stats.maxGap,gap);stats.totalGap+=gap;}
            stats.count++;stats.lastAt=now;
          }
          for(const listener of motionListeners.current) {
            try { listener(message); } catch(error) {logEvent("socket.motion-handler-failed",{error},"error");}
          }
          if(["detach","cancel"].includes(message.action) && motionStats.current.count) {
            const stats=motionStats.current;
            logEvent("socket.motion-summary",{received:stats.count,meanGapMs:Math.round(stats.totalGap/Math.max(1,stats.count-1)),maxGapMs:Math.round(stats.maxGap)});
          }
          if(pull)return; // Motion updates bypass React and its state logging.
        }
        setState((current) => {
          if (message.type === "session") return {
            ...current, status: "connected", phones: message.phones, kiosks: message.kiosks,
            handoff: message.handoff, clockOffset: message.serverTime - Date.now(),
          };
          if (message.type === "presence") return { ...current, phones: message.phones, kiosks: message.kiosks };
          if (message.type === "takeaway:interaction") return { ...current, takeawayInteraction: message };
          if (message.type === "handoff:transfer") return { ...current, handoff: message.handoff };
          return current;
        });
      });
      socket.addEventListener("error", () => logEvent("socket.error", { photoId, role }, "error"));
      socket.addEventListener("close", (event) => {
        motionSender.current?.clear();
        logEvent("socket.closed", { photoId, role, code: event.code, reason: event.reason, stopped });
        if (stopped) return;
        setState((current) => ({ ...current, status: "reconnecting" }));
        reconnect = timers.setTimeout(connect, Math.min(5000, 400 * (2 ** attempts++)));
      });
    };
    connect();
    return () => { logEvent("socket.cleanup", { photoId, role }); stopped = true; motionSender.current?.clear(); timers.clearTimeout(reconnect); socketRef.current?.close(); };
  }, [photoId, role]);
  const subscribeTakeawayInteraction = useCallback((listener) => {
    motionListeners.current.add(listener);
    return () => motionListeners.current.delete(listener);
  },[]);
  const sendTakeawayInteraction = useCallback((interaction) => {
    if(role!=="phone")return;
    if(!motionSender.current)motionSender.current=createLatestMotionSender({
      isOpen:()=>socketRef.current?.readyState===WebSocket.OPEN,
      bufferedAmount:()=>socketRef.current?.bufferedAmount||0,
      send:(value)=>{
        logEvent("socket.send",{type:"takeaway:interaction",...value},"info",{console:value.action!=="pull"});
        socketRef.current.send(JSON.stringify({type:"takeaway:interaction",...value}));
      },
    });
    motionSender.current.send(interaction);
  },[role]);
  return { ...state, sendTakeawayInteraction, subscribeTakeawayInteraction, phoneConnected: state.status === "connected" && state.phones > 0 };
}

// A new recipient gets a sequence: tablet exit, phone arrival, tablet restoration.
// Reconnecting phones keep their own finished sequence and do not reanimate.
export function useHandoffTiming(handoff, clockOffset = 0, device = "kiosk") {
  const empty = { started: false, animating: false, restoring: false, active: false, animationDelay: "0ms", restoreDelay: "0ms" };
  const [timing, setTiming] = useLoggedState("usePhotoSync.timing", empty);
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
    const scheduledTimers = [0, exitMs, phoneDelay, phoneDelay + phoneDuration, returnDelay, returnDelay + returnDuration, handoff.durationMs]
      .map((offset) => timers.setTimeout(update, Math.max(0, delay + offset)));
    return () => scheduledTimers.forEach((timer) => timers.clearTimeout(timer));
  }, [handoff, clockOffset, device]);
  return timing;
}
