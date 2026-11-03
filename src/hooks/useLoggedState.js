import { useEffect, useRef, useState } from "react";
import { logEvent, sanitize } from "../lib/logger.js";

export function useLoggedState(label, initialValue) {
  const [value, setValue] = useState(initialValue);
  const previous = useRef({ initialized: false });
  useEffect(() => {
    if (!previous.current.initialized || !Object.is(previous.current.value, value)) {
      const next = sanitize({ [label.split(".").at(-1)]: value });
      logEvent(previous.current.initialized ? "state.changed" : "state.initialized", { state: label, previous: previous.current.snapshot, next });
      previous.current = { initialized: true, value, snapshot: next };
    }
  });
  return [value, setValue];
}
