import { useCallback, useEffect, useRef, useState } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Leva, useControls } from "leva";
import { fetchExperience, submitPhoto } from "./api.js";
import { appConfig, defaultExperience } from "./config.js";
import Camera from "./components/Camera.jsx";
import KioskChrome from "./components/KioskChrome.jsx";
import Results from "./components/Results.jsx";
import Takeaway from "./components/Takeaway.jsx";

function Booth() {
  const cameraRef = useRef(null);
  const resetTimerRef = useRef(null);
  const captureStartedRef = useRef(false);
  const [phase, setPhase] = useState("attract");
  const [cameraStatus, setCameraStatus] = useState("idle");
  const [count, setCount] = useState(appConfig.countdownSeconds);
  const [originalPhoto, setOriginalPhoto] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [controlsVisible, setControlsVisible] = useState(false);
  const [experience, setExperience] = useState(defaultExperience);
  const [prompts, setPromptControls] = useControls("AI direction", () => ({
    variantA: { label: "Variation one", value: "", rows: 5 },
    variantB: { label: "Variation two", value: "", rows: 5 },
    transition: { label: "Animation", value: "", rows: 5 },
  }));

  useEffect(() => {
    fetchExperience().then((nextExperience) => {
      setExperience(nextExperience);
      setPromptControls(nextExperience.prompts);
    });
  }, [setPromptControls]);

  const clearResetTimer = () => {
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = null;
  };

  const reset = useCallback(() => {
    clearResetTimer();
    if (originalPhoto) URL.revokeObjectURL(originalPhoto);
    setOriginalPhoto(null);
    setResult(null);
    setError("");
    setCount(appConfig.countdownSeconds);
    captureStartedRef.current = false;
    setPhase("camera");
  }, [originalPhoto]);

  const processPhoto = useCallback(async (blob) => {
    const localUrl = URL.createObjectURL(blob);
    setOriginalPhoto(localUrl);
    setPhase("processing");
    try {
      const response = await submitPhoto(blob, prompts);
      const output = response.output;
      setResult({
        variantA: output.variantA || output.past,
        variantB: output.variantB || output.future,
        photoId: output.photoId,
      });
      setPhase("results");
      resetTimerRef.current = window.setTimeout(reset, appConfig.resetDelayMs);
    } catch (requestError) {
      setError(requestError.message);
      setPhase("error");
    }
  }, [prompts, reset]);

  useEffect(() => {
    if (phase !== "countdown") return undefined;
    if (count > 0) {
      const timer = window.setTimeout(() => setCount((value) => value - 1), 1000);
      return () => window.clearTimeout(timer);
    }
    if (captureStartedRef.current) return undefined;
    captureStartedRef.current = true;
    cameraRef.current.capture()
      .then(processPhoto)
      .catch((captureError) => {
        setError(captureError.message);
        setPhase("error");
      });
    return undefined;
  }, [phase, count, processPhoto]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "F1") {
        event.preventDefault();
        setControlsVisible((visible) => !visible);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearResetTimer();
    };
  }, []);

  const begin = async () => {
    setError("");
    setPhase("camera");
    try {
      await cameraRef.current.start();
    } catch {
      setError("Camera access is unavailable. Choose a photo below or check browser permissions.");
    }
  };

  const startCountdown = () => {
    captureStartedRef.current = false;
    setCount(appConfig.countdownSeconds);
    setPhase("countdown");
  };

  const choosePhoto = (event) => {
    const file = event.target.files?.[0];
    if (file) processPhoto(file);
    event.target.value = "";
  };

  const showCaptureControls = phase === "camera" || phase === "error";

  return (
    <main className={`booth booth--${phase}`} data-testid="booth">
      <Camera ref={cameraRef} visible={phase !== "results"} onStatusChange={setCameraStatus} />
      <KioskChrome phase={phase} cameraStatus={cameraStatus} />

      {phase === "attract" && (
        <section className="attract-panel">
          <div className="attract-panel__copy">
            <p className="eyebrow">{appConfig.kicker}</p>
            <h1><span>Portraits</span><em>after automation.</em></h1>
            <p className="attract-panel__intro">Step into the Thesis portrait studio. One photograph becomes two high-contrast, screenprinted futures.</p>
            <button type="button" className="primary-button" onClick={begin} data-testid="begin-button">
              Make your portrait <span>↗</span>
            </button>
            <p className="attract-panel__note">Thursday, November 5, 2026&nbsp;&nbsp;✳&nbsp;&nbsp;Pioneer Works, Brooklyn</p>
          </div>
          <aside className="thesis-poster" aria-hidden="true">
            <div className="thesis-poster__swash" />
            <span className="thesis-poster__star">✳</span>
            <strong>THESIS:<br />2027</strong>
            <p>One portrait<br /><em>on the edge of AI</em></p>
          </aside>
        </section>
      )}

      {showCaptureControls && (
        <section className="capture-panel">
          <div>
            <p className="eyebrow">Thesis portrait study / 001</p>
            <h1>{cameraStatus === "ready" ? <>Frame <em>the human.</em></> : "Camera setup."}</h1>
            {error && <p className="error-message" role="alert">{error}</p>}
          </div>
          <div className="capture-panel__actions">
            <button type="button" className="shutter-button" onClick={startCountdown} disabled={cameraStatus !== "ready"} aria-label="Take portrait">
              <span className="shutter-button__lens" />
              <span>Take portrait</span>
            </button>
            <label className="file-button">
              Use a photo instead
              <input type="file" accept="image/*" capture="user" onChange={choosePhoto} />
            </label>
          </div>
        </section>
      )}

      {phase === "countdown" && (
        <section className="countdown" aria-live="assertive">
          <p>Hold the thesis</p>
          <strong>{count || "•"}</strong>
        </section>
      )}

      {phase === "processing" && (
        <section className="processing" aria-live="polite">
          <div className="processing__star">✳</div>
          <p className="eyebrow">Making two color studies</p>
          <h1>The portrait is<br /><em>going to press.</em></h1>
        </section>
      )}

      {phase === "results" && result && (
        <Results result={result} originalPhoto={originalPhoto} labels={experience.labels} onReset={reset} />
      )}

      <Leva hidden={!controlsVisible} collapsed={false} titleBar={{ title: "Experience controls" }} />
    </main>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Booth />} />
        <Route path="/takeaway/:photoId?" element={<Takeaway />} />
      </Routes>
    </HashRouter>
  );
}
