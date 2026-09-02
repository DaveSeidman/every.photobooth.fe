import { useCallback, useEffect, useRef, useState } from "react";
import { appConfig } from "../config.js";

function websocketUrl() {
  const url = new URL(appConfig.apiUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/$/, "")}/ws`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

const initialState = {
  status: "connecting",
  phones: 0,
  kiosks: 0,
  cards: {
    original: { x: 0.7, y: 0.3 },
    styled: { x: 0.76, y: 0.62 },
  },
  moved: false,
  transfer: null,
  clockOffset: 0,
  activeCard: null,
};

export function usePhotoSync(photoId, role) {
  const socketRef = useRef(null);
  const reconnectRef = useRef(null);
  const attemptsRef = useRef(0);
  const [state, setState] = useState(initialState);

  useEffect(() => {
    if (!photoId) return undefined;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      setState((current) => ({ ...current, status: attemptsRef.current ? "reconnecting" : "connecting" }));
      const socket = new WebSocket(websocketUrl());
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        attemptsRef.current = 0;
        socket.send(JSON.stringify({ type: "join", photoId, role }));
      });

      socket.addEventListener("message", (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        setState((current) => {
          if (message.type === "session") {
            return {
              ...current,
              ...message,
              status: "connected",
              clockOffset: message.serverTime - Date.now(),
            };
          }
          if (message.type === "presence") {
            return { ...current, phones: message.phones, kiosks: message.kiosks };
          }
          if (message.type === "card:move") {
            return {
              ...current,
              moved: true,
              activeCard: message.dragging ? message.card : null,
              cards: { ...current.cards, [message.card]: { x: message.x, y: message.y } },
            };
          }
          if (message.type === "handoff:transfer") {
            return { ...current, transfer: { startAt: message.startAt, version: message.version } };
          }
          return current;
        });
      });

      socket.addEventListener("close", () => {
        if (stopped) return;
        setState((current) => ({ ...current, status: "reconnecting" }));
        const delay = Math.min(5000, 400 * (2 ** attemptsRef.current));
        attemptsRef.current += 1;
        reconnectRef.current = window.setTimeout(connect, delay);
      });
    };

    connect();
    return () => {
      stopped = true;
      window.clearTimeout(reconnectRef.current);
      socketRef.current?.close();
    };
  }, [photoId, role]);

  const send = useCallback((message) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  return {
    ...state,
    phoneConnected: state.phones > 0,
    sendCard(card, position, dragging = false) {
      send({ type: "card:move", card, x: position.x, y: position.y, dragging });
    },
    transferPhoto() {
      send({ type: "handoff:transfer" });
    },
  };
}
