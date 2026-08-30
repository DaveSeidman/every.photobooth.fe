import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Leva, useControls } from "leva";
import { fetchExperience, resetSession, submitPhoto } from "./api.js";
import { appConfig, defaultExperience } from "./config.js";
import Camera from "./components/Camera.jsx";
import KioskChrome from "./components/KioskChrome.jsx";
import Results from "./components/Results.jsx";
import Takeaway from "./components/Takeaway.jsx";
import DeveloperModeMenu from "./components/DeveloperModeMenu.jsx";
import DesignerPanel from "./components/DesignerPanel.jsx";
import PosthogDesktop from "./components/PosthogDesktop.jsx";
import FutureChoice from "./components/FutureChoice.jsx";
import MarkerMagic from "./components/MarkerMagic.jsx";

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
  const [mode, setMode] = useState(() => localStorage.getItem("every.photobooth.mode") || "thesis.editorial");
  const [sessionId] = useState(() => {
    const existing = localStorage.getItem("every.photobooth.session");
    if (existing) return existing;
    const next = `booth-${crypto.randomUUID()}`;
    localStorage.setItem("every.photobooth.session", next);
    return next;
  });
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [oracleContext, setOracleContext] = useState({ city: "", industry: "", role: "" });
  const [designerOptions, setDesignerOptions] = useState({ palette: "blue", brushX: 50, brushY: 50, texture: "coarse" });
  const [futureChoice, setFutureChoice] = useState(() => localStorage.getItem("every.photobooth.choice") || "builder");
  const [demoProgress, setDemoProgress] = useState(0);
  const [prompts, setPromptControls] = useControls("AI direction", () => ({
    variantA: { label: "Variation one", value: "", rows: 5 },
    variantB: { label: "Variation two", value: "", rows: 5 },
    transition: { label: "Animation", value: "", rows: 5 },
  }));

  useEffect(() => {
    fetchExperience().then((nextExperience) => {
      setExperience(nextExperience);
      if (nextExperience.modes?.length) {
        const knownMode = nextExperience.modes.some((candidate) => candidate.id === mode);
        if (!knownMode) setMode("thesis.editorial");
      }
      setPromptControls(nextExperience.prompts);
    });
  }, [setPromptControls]);

  const clearResetTimer = () => {
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = null;
  };

  const reset = useCallback((toAttract = false) => {
    clearResetTimer();
    if (originalPhoto) URL.revokeObjectURL(originalPhoto);
    setOriginalPhoto(null);
    setResult(null);
    setPendingPhoto(null);
    setError("");
    setCount(appConfig.countdownSeconds);
    captureStartedRef.current = false;
    setPhase(toAttract ? "attract" : "camera");
  }, [originalPhoto]);

  const processPhoto = useCallback(async (blob, options = {}) => {
    if (!originalPhoto) setOriginalPhoto(URL.createObjectURL(blob));
    setPendingPhoto(null);
    setPhase("processing");
    try {
      const response = await submitPhoto(blob, {
        prompts,
        mode,
        sessionId,
        oracleContext,
        designerOptions: options.designerOptions || designerOptions,
        futureChoice,
      });
      const output = response.output;
      setResult({
        variantA: output.variantA || output.past,
        variantB: output.variantB || output.future,
        photoId: output.photoId,
        mode: output.mode,
        groupCount: output.groupCount,
        oracle: output.oracle,
      });
      setPhase("results");
      resetTimerRef.current = window.setTimeout(reset, appConfig.resetDelayMs);
    } catch (requestError) {
      setError(requestError.message);
      setPhase("error");
    }
  }, [designerOptions, futureChoice, mode, oracleContext, originalPhoto, prompts, reset, sessionId]);

  useEffect(() => {
    if (phase !== "countdown") return undefined;
    if (count > 0) {
      const timer = window.setTimeout(() => setCount((value) => value - 1), 1000);
      return () => window.clearTimeout(timer);
    }
    if (captureStartedRef.current) return undefined;
    captureStartedRef.current = true;
    cameraRef.current.capture()
      .then((blob) => {
        if (mode === "every.designer") {
          setOriginalPhoto(URL.createObjectURL(blob));
          setPendingPhoto(blob);
          setPhase("designer");
          return;
        }
        processPhoto(blob);
      })
      .catch((captureError) => {
        setError(captureError.message);
        setPhase("error");
      });
    return undefined;
  }, [mode, phase, count, processPhoto]);

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

  const handleModeChange = (nextMode) => {
    localStorage.setItem("every.photobooth.mode", nextMode);
    setMode(nextMode);
    reset(true);
  };

  const handleDeveloperReset = async () => {
    await resetSession(sessionId).catch(() => {});
    reset(true);
  };

  const runDemoSequence = async () => {
    if (mode !== "every.one.in") return;
    await resetSession(sessionId).catch(() => {});
    setResult(null);
    setError("");
    for (let index = 1; index <= 12; index += 1) {
      try {
        setDemoProgress(index);
        const frame = await fetch(`/test-frames/frame-${String(index).padStart(2, "0")}.jpg`).then((response) => {
          if (!response.ok) throw new Error(`Test frame ${index} is unavailable.`);
          return response.blob();
        });
        const preview = URL.createObjectURL(frame);
        setOriginalPhoto((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return preview;
        });
        setPhase("processing");
        const response = await submitPhoto(frame, { mode, sessionId, oracleContext: {}, designerOptions, prompts });
        const output = response.output;
        setResult({ variantA: output.variantA || output.past, variantB: output.variantB || output.future, photoId: output.photoId, mode: output.mode, groupCount: output.groupCount, oracle: output.oracle });
        setPhase("results");
      } catch (requestError) {
        setError(requestError.message);
        setPhase("error");
        break;
      }
    }
    setDemoProgress(0);
  };

  const startCountdown = useCallback(() => {
    captureStartedRef.current = false;
    setCount(appConfig.countdownSeconds);
    setPhase("countdown");
  }, []);

  const choosePhoto = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      if (mode === "every.designer") {
        setOriginalPhoto(URL.createObjectURL(file));
        setPendingPhoto(file);
        setPhase("designer");
      } else processPhoto(file);
    }
    event.target.value = "";
  };

  const showCaptureControls = phase === "camera" || phase === "error";
  const modeCopy = {
    "every.one.in": {
      eyebrow: "Every One In / cumulative portrait",
      title: <>The room<br /><em>remembers.</em></>,
      intro: "Each new capture joins everyone who came before. The latest people stay in the middle; the room squeezes in around them.",
      note: "Every person becomes part of the next portrait.",
    },
    "every.oracle": {
      eyebrow: "Every Oracle / contextual portrait",
      title: <>A portrait<br /><em>with signals.</em></>,
      intro: "A few volunteered details become subtle visual clues—enough to feel personal, never invasive.",
      note: "Context, carefully used.",
    },
    "every.designer": {
      eyebrow: "Every Designer / directed portrait",
      title: <>Direct<br /><em>the image.</em></>,
      intro: "Place the mark, choose the color, then let the editor turn your gesture into a print.",
      note: "A little authorship before the machine takes over.",
    },
    "branded.posthog": {
      eyebrow: "Branded / PostHog",
      title: <>Capture the<br /><em>event.</em></>,
      intro: "A sponsor-ready portrait station with an analytics-native skin and a little product magic.",
      note: "Observe. Transform. Share.",
    },
    "every.future.familiar": {
      eyebrow: "Every Future Familiar / phone-powered portrait",
      title: <>Bring your<br /><em>future with you.</em></>,
      intro: "Choose a future on your phone, then hold it up. A little creature will escape the screen and dance through the photograph.",
      note: "Scan to choose your familiar before you enter.",
    },
  }[mode] || {
    eyebrow: appConfig.kicker,
    title: <>Portraits<br /><em>after automation.</em></>,
    intro: "Step into the Thesis portrait studio. One photograph becomes two high-contrast, screenprinted futures. Print edition coming soon.",
    note: "Thursday, November 5, 2026 ✳ Pioneer Works, Brooklyn",
  };

  return (
    <main className={`booth booth--${phase} booth--mode-${mode.replaceAll(".", "-")}`} data-testid="booth">
      <Camera ref={cameraRef} visible={phase !== "results"} onStatusChange={setCameraStatus} />
      <MarkerMagic active={mode === "every.future.familiar" && phase === "camera"} choice={futureChoice} onAutoCapture={startCountdown} />
      <KioskChrome phase={phase} cameraStatus={cameraStatus} />
      <DeveloperModeMenu modes={experience.modes || defaultExperience.modes} mode={mode} onModeChange={handleModeChange} onReset={handleDeveloperReset} onRunDemo={runDemoSequence} demoProgress={demoProgress} oracleContext={oracleContext} onOracleContextChange={(patch) => setOracleContext((current) => ({ ...current, ...patch }))} />
      {mode === "branded.posthog" && <PosthogDesktop />}

      {phase === "attract" && (
        <section className="attract-panel">
          <div className="attract-panel__copy">
            <p className="eyebrow">{modeCopy.eyebrow}</p>
            <h1>{modeCopy.title}</h1>
            <p className="attract-panel__intro">{modeCopy.intro}</p>
            <button type="button" className="primary-button" onClick={begin} data-testid="begin-button">
              Make your portrait <span>↗</span>
            </button>
            {mode === "every.future.familiar" && <div className="future-choice__qr"><QRCodeSVG value={`${appConfig.publicAppUrl}/#/choose/${sessionId}`} size={116} level="M" /><span>Scan / choose your future</span></div>}
            <p className="attract-panel__note">{modeCopy.note}</p>
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
            <p className="eyebrow">{mode === "every.future.familiar" ? `Future Familiar / ${futureChoice}` : "Thesis portrait study / 001"}</p>
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

      {phase === "designer" && originalPhoto && pendingPhoto && (
        <DesignerPanel preview={originalPhoto} options={designerOptions} onChange={(patch) => setDesignerOptions((current) => ({ ...current, ...patch }))} onSubmit={() => processPhoto(pendingPhoto, { designerOptions })} onBack={() => { setPendingPhoto(null); setPhase("camera"); }} />
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
        <Results result={result} originalPhoto={originalPhoto} labels={experience.labels} onReset={() => reset(true)} />
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
        <Route path="/choose/:sessionId?" element={<FutureChoice />} />
      </Routes>
    </HashRouter>
  );
}
