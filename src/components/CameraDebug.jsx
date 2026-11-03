import { useEffect, useRef } from "react";
import { button, useControls } from "leva";
import { useLoggedState } from "../hooks/useLoggedState.js";
import { defaultFraming } from "../lib/cameraFraming.js";
import { logEvent } from "../lib/logger.js";

export default function CameraDebug(props) {
  const { diagnostics, framing, disabled } = props;
  const latest = useRef(props);
  latest.current = props;
  const [busy, setBusy] = useLoggedState("CameraDebug.busy", false);
  const [error, setError] = useLoggedState("CameraDebug.error", "");
  const run = async (action) => {
    setBusy(true);
    setError("");
    try { await action(); } catch (err) {
      setError(err.message);
      logEvent("camera.controls-failed", { error: err }, "error");
    } finally { setBusy(false); }
  };
  const capabilities = diagnostics?.capabilities;
  const ranges = JSON.stringify(["pan", "tilt", "zoom"].map((key) => capabilities?.[key]));
  const [, set] = useControls("Camera", () => {
    const schema = {};
    for (const [key, label, min, max, step] of [["zoom", "Digital zoom", 1, 3, .05], ["x", "Horizontal", 0, 100, 1], ["y", "Vertical", 0, 100, 1]]) {
      schema[key] = { value: latest.current.framing[key], label, min, max, step, disabled,
        onChange: (value, _path, context) => {
          if (context.initial || !context.fromPanel || latest.current.disabled) return;
          latest.current.onFramingChange({ ...latest.current.framing, [key]: value });
        },
      };
    }
    schema["Reset framing"] = button(() => latest.current.onFramingChange({ ...defaultFraming }), { disabled });
    schema["Request PTZ / reconnect"] = button(() => run(() => latest.current.cameraRef.current.requestHardware()), { disabled: disabled || busy });
    for (const key of ["pan", "tilt", "zoom"]) {
      const range = capabilities?.[key];
      if (range && Number.isFinite(range.min) && range.max > range.min) {
        schema[`hardware_${key}`] = { label: `Hardware ${key}`, value: diagnostics.settings[key] ?? range.min, min: range.min, max: range.max, step: range.step || .01, disabled: disabled || busy,
          onEditEnd: (value) => {
            if (!latest.current.disabled) run(() => latest.current.cameraRef.current.applyHardware(key, value));
          },
        };
      }
    }
    schema["Log camera diagnostics"] = button(() => logEvent("camera.diagnostics-requested", latest.current.diagnostics || {}));
    schema["PTZ status"] = { value: ["pan", "tilt", "zoom"].filter((key) => capabilities?.[key]?.max > capabilities?.[key]?.min).join(", ") || "Unavailable; use digital framing", editable: false };
    schema["Camera error"] = { value: error || "None", editable: false };
    return schema;
  }, [disabled, busy, ranges]);

  useEffect(() => {
    const values = { ...framing, "Camera error": error || "None" };
    for (const key of ["pan", "tilt", "zoom"]) {
      if (capabilities?.[key]?.max > capabilities?.[key]?.min) values[`hardware_${key}`] = diagnostics.settings[key] ?? capabilities?.[key]?.min;
    }
    set(values);
  }, [framing, diagnostics, error, set]);
  return null;
}
