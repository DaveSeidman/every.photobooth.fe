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
    original: { x: 0.7, y: 0.3, phoneX: 2, phoneY: 0.3, rotation: -3, layer: 1, settled: false },
    styled: { x: 0.76, y: 0.62, phoneX: 2, phoneY: 0.62, rotation: 2, layer: 2, settled: false },
  },
  moved: false,
  completed: null,
  activeCard: null,
};

export function usePhotoSync(photoId, role) {
  const socketRef = useRef(null);
  const reconnectRef = useRef(null);
  const attemptsRef = useRef(0);
  const outboundMovesRef = useRef(new Map());
  const outboundFrameRef = useRef(null);
  const inboundMovesRef = useRef(new Map());
  const inboundFrameRef = useRef(null);
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
        if (message.type === "cards:move" || message.type === "card:move") {
          const moves = message.type === "cards:move" ? message.cards : [message];
          moves.forEach((move) => inboundMovesRef.current.set(move.card, move));
          if (!inboundFrameRef.current) {
            inboundFrameRef.current = window.requestAnimationFrame(() => {
              const frameMoves = [...inboundMovesRef.current.values()];
              inboundMovesRef.current.clear();
              inboundFrameRef.current = null;
              setState((latest) => {
                const cards = { ...latest.cards };
                frameMoves.forEach((move) => {
                  cards[move.card] = {
                    x: move.x,
                    y: move.y,
                    phoneX: move.phoneX,
                      phoneY: move.phoneY,
                      rotation: move.rotation,
                      layer: move.layer,
                      settled: move.settled,
                  };
                });
                const activeMove = [...frameMoves].reverse().find((move) => move.dragging);
                return { ...latest, moved: true, activeCard: activeMove?.card || null, cards };
              });
            });
          }
          return;
        }
        setState((current) => {
          if (message.type === "session") {
            const sharedSession = role === "phone"
              ? { phones: message.phones, kiosks: message.kiosks }
              : { cards: message.cards, moved: message.moved, phones: message.phones, kiosks: message.kiosks };
            return {
              ...current,
              ...sharedSession,
              status: "connected",
            };
          }
          if (message.type === "presence") {
            return { ...current, phones: message.phones, kiosks: message.kiosks };
          }
          if (message.type === "handoff:complete") {
            return { ...current, completed: message.version };
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
      window.cancelAnimationFrame(outboundFrameRef.current);
      window.cancelAnimationFrame(inboundFrameRef.current);
      outboundMovesRef.current.clear();
      inboundMovesRef.current.clear();
      socketRef.current?.close();
    };
  }, [photoId, role]);

  const send = useCallback((message) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  const sendCards = useCallback((updates) => {
    setState((current) => ({
      ...current,
      moved: true,
      activeCard: [...updates].reverse().find((update) => update.dragging)?.card || null,
      cards: updates.reduce((cards, update) => ({ ...cards, [update.card]: update.position }), current.cards),
    }));
    updates.forEach(({ card, position, dragging = false }) => {
      outboundMovesRef.current.set(card, { card, ...position, dragging });
    });
    if (!outboundFrameRef.current) {
      outboundFrameRef.current = window.requestAnimationFrame(() => {
        const cards = [...outboundMovesRef.current.values()];
        outboundMovesRef.current.clear();
        outboundFrameRef.current = null;
        if (cards.length) send({ type: "cards:move", cards });
      });
    }
  }, [send]);

  const sendCard = useCallback((card, position, dragging = false) => {
    sendCards([{ card, position, dragging }]);
  }, [sendCards]);

  const completeHandoff = useCallback(() => {
    send({ type: "handoff:complete" });
  }, [send]);

  return {
    ...state,
    phoneConnected: state.phones > 0,
    sendCard,
    sendCards,
    completeHandoff,
  };
}
