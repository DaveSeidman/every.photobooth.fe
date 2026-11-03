import { downloadLogs, clearLogs, logEvent } from "./lib/logger.js";
import { timers } from "./lib/timers.js";
import { useLoggedState } from "./hooks/useLoggedState.js";
import { useCallback, useEffect, useRef } from "react";
import { HashRouter, Route, Routes, useParams } from "react-router-dom";
import { button, Leva, useControls } from "leva";
import { flushSync } from "react-dom";
import { fetchExperience, photoUrl, submitPhoto } from "./api.js";
import { appConfig, defaultExperience } from "./config.js";
import CameraDebug from "./components/CameraDebug.jsx";
import { defaultFraming } from "./lib/cameraFraming.js";
import Camera from "./components/Camera.jsx";
import CaptureReview from "./components/CaptureReview.jsx";
import KioskChrome from "./components/KioskChrome.jsx";
import Processing from "./components/Processing.jsx";
import Results from "./components/Results.jsx";
import StylePicker from "./components/StylePicker.jsx";
import Takeaway from "./components/Takeaway.jsx";
import DeveloperScreenLabel from "./components/DeveloperScreenLabel.jsx";
import DesignPreview from "./components/DesignPreview.jsx";

function replaceHash(path) {
  const url = new URL(window.location.href);
  url.hash = path;
  window.history.replaceState(window.history.state, "", url);
}

function Booth() {
  const cameraRef = useRef(null);
  const [cameraDiagnostics, setCameraDiagnostics] = useLoggedState("App.cameraDiagnostics", null);
  const [framing, setFraming] = useLoggedState("App.framing", () => {
    try {
      const saved = JSON.parse(localStorage.getItem("booth-camera-framing"));
      return Object.fromEntries(Object.entries(defaultFraming).map(([key, fallback]) => [key,
        Number.isFinite(saved?.[key]) ? Math.max(key === "zoom" ? 1 : 0, Math.min(key === "zoom" ? 3 : 100, saved[key])) : fallback]));
    } catch { return { ...defaultFraming }; }
  });
  const updateFraming = (value) => {
    setFraming(value);
    try { localStorage.setItem("booth-camera-framing", JSON.stringify(value)); } catch { /* Private browsing may disable storage. */ }
  };
  const resetTimerRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const captureStartedRef = useRef(false);
  const processPhotoRef = useRef(null);
  const [phase, setPhase] = useLoggedState("App.phase", "attract");
  const [cameraStatus, setCameraStatus] = useLoggedState("App.cameraStatus", "idle");
  const [count, setCount] = useLoggedState("App.count", appConfig.countdownSeconds);
  const [captureBlob, setCaptureBlob] = useLoggedState("App.captureBlob", null);
  const [originalPhoto, setOriginalPhoto] = useLoggedState("App.originalPhoto", null);
  const [selectedStyle, setSelectedStyle] = useLoggedState("App.selectedStyle", null);
  const [progress, setProgress] = useLoggedState("App.progress", 0);
  const [result, setResult] = useLoggedState("App.result", null);
  const [error, setError] = useLoggedState("App.error", "");
  const [experience, setExperience] = useLoggedState("App.experience", defaultExperience);
  const [timeoutVersion, setTimeoutVersion] = useLoggedState("App.timeoutVersion", 0);
  const [showPromptControls, setShowPromptControls] = useLoggedState("App.showPromptControls", false);
  const { promptOverride } = useControls("Generation", {
    promptOverride: {
      value: "",
      label: "Prompt override",
      rows: 12,
    },
    "Transform with custom prompt": button(
      () => processPhotoRef.current?.({ id: "custom", label: "Custom prompt" }),
      { disabled: !captureBlob },
    ),
    "Toggle fullscreen": button(() => {
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      } else {
        document.documentElement.requestFullscreen?.();
      }
    }),
  }, [Boolean(captureBlob)]);

  useEffect(() => {
    logEvent("generation.settings", { customPrompt: Boolean(promptOverride?.trim()), promptCharacters: promptOverride?.length || 0 });
  }, [promptOverride]);

  const { failureSimulation } = useControls("Fallback testing", {
    failureSimulation: {
      value: "none",
      label: "Simulate",
      options: { "Normal operation": "none", "No internet (AI only)": "offline", "AI generation error": "error", "AI generation timeout (2×)": "timeout" },
    },
  });

  useEffect(() => {
    logEvent("generation.failure-simulation", { failureSimulation });
  }, [failureSimulation]);

  useControls("Diagnostics", {
    "Download logs": button(downloadLogs),
    "Clear logs": button(clearLogs),
  });

  const transitionTo = useCallback((nextPhase) => {
    logEvent("flow.transition-requested", { nextPhase });
    if (!document.startViewTransition) {
      setPhase(nextPhase);
      return;
    }
    document.startViewTransition(() => flushSync(() => setPhase(nextPhase)));
  }, []);

  useEffect(() => {
    const togglePromptControls = (event) => {
      if (event.key !== "F1") return;
      event.preventDefault();
      setShowPromptControls((visible) => !visible);
    };
    window.addEventListener("keydown", togglePromptControls);
    return () => window.removeEventListener("keydown", togglePromptControls);
  }, []);

  useEffect(() => {
    fetchExperience().then(setExperience);
    cameraRef.current?.start().catch(() => {
      setError("Camera access is unavailable. Check browser permissions and try again.");
    });
  }, []);

  const clearTimers = () => {
    if (resetTimerRef.current) timers.clearTimeout(resetTimerRef.current);
    if (transitionTimerRef.current) timers.clearTimeout(transitionTimerRef.current);
    resetTimerRef.current = null;
    transitionTimerRef.current = null;
  };

  const clearCapture = () => {
    setCaptureBlob(null);
    setOriginalPhoto((currentPhoto) => {
      if (currentPhoto) URL.revokeObjectURL(currentPhoto);
      return null;
    });
  };

  const reset = useCallback((toAttract = true) => {
    logEvent("flow.reset", { toAttract });
    clearTimers();
    clearCapture();
    setSelectedStyle(null);
    setResult(null);
    setError("");
    setProgress(0);
    setCount(appConfig.countdownSeconds);
    captureStartedRef.current = false;
    replaceHash("/");
    setPhase(toAttract ? "attract" : "camera");
    if (toAttract) {
      cameraRef.current?.start().catch(() => {
        setError("Camera access is unavailable. Check browser permissions and try again.");
      });
    }
  }, []);

  const refreshResultTimeout = useCallback(() => {
    logEvent("flow.reset-timer-refreshed", { delayMs: appConfig.resetDelayMs });
    if (resetTimerRef.current) timers.clearTimeout(resetTimerRef.current);
    setTimeoutVersion((version) => version + 1);
    resetTimerRef.current = timers.setTimeout(() => reset(true), appConfig.resetDelayMs);
  }, [reset]);

  useEffect(() => () => {
    clearTimers();
    cameraRef.current?.stop();
  }, []);

  const begin = async () => {
    setError("");
    setPhase("camera");
    try {
      await cameraRef.current.start();
    } catch {
      setError("Camera access is unavailable. Check browser permissions and try again.");
    }
  };

  const startCountdown = useCallback(() => {
    captureStartedRef.current = false;
    setCount(appConfig.countdownSeconds);
    setPhase("countdown");
  }, []);

  const acceptCapture = useCallback((blob) => {
    clearCapture();
    setCaptureBlob(blob);
    setOriginalPhoto(URL.createObjectURL(blob));
    transitionTo("review");
  }, [transitionTo]);

  useEffect(() => {
    if (phase !== "countdown") return undefined;
    if (count > 0) {
      const timer = timers.setTimeout(() => setCount((value) => value - 1), 1000);
      return () => timers.clearTimeout(timer);
    }
    if (captureStartedRef.current) return undefined;
    captureStartedRef.current = true;
    setPhase("flash");
    transitionTimerRef.current = timers.setTimeout(() => {
      cameraRef.current.capture()
        .then(acceptCapture)
        .catch((captureError) => {
          setError(captureError.message);
          setPhase("error");
        });
    }, 200);
    return undefined;
  }, [phase, count, acceptCapture]);

  useEffect(() => {
    if (phase !== "processing") return undefined;
    const startedAt = Date.now();
    const timer = timers.setInterval(() => {
      const elapsedSeconds = (Date.now() - startedAt) / 1000;
      setProgress((current) => current >= 100 ? current : Math.min(92, Math.round(8 + elapsedSeconds * 7.2)));
    }, 250);
    return () => timers.clearInterval(timer);
  }, [phase]);

  const retake = async () => {
    clearCapture();
    setError("");
    setPhase("camera");
    try {
      await cameraRef.current.start();
    } catch {
      setError("Camera access is unavailable. Check browser permissions and try again.");
    }
  };

  const approvePhoto = () => {
    transitionTo("styles");
  };

  const processPhoto = async (style) => {
    if (!captureBlob) return;
    setSelectedStyle(style);
    setProgress(5);
    setError("");
    transitionTo("processing");
    try {
      const response = await submitPhoto(captureBlob, {
        mode: "every",
        style: style.id,
        promptOverride,
        failureSimulation,
      });
      const output = response.output;
      setProgress(100);
      setResult({
        styled: output.photoId ? photoUrl(output.photoId) : (output.styled || output.variantA || output.past),
        photoId: output.photoId,
        mode: output.mode,
        styleProfile: output.styleProfile,
        styleLabel: output.styleLabel || style.label,
        generationMode: output.generationMode,
      });
    } catch (requestError) {
      setError(requestError.message);
      setPhase("error");
    }
  };
  processPhotoRef.current = processPhoto;

  const cameraVisible = ["attract", "camera", "countdown", "flash", "resetting"].includes(phase);
  const styles = experience.everyStyles || defaultExperience.everyStyles;
  const screenLabels = {
    attract: "01 / ATTRACT", camera: "02 / CAMERA SETUP",
    countdown: "03 / COUNTDOWN + FLASH", flash: "03 / COUNTDOWN + FLASH", review: "04 / REVIEW PHOTO",
    styles: "05 / CHOOSE EVERY STYLE", processing: "06 / GENERATING PORTRAIT",
    error: captureBlob ? "06 / GENERATING PORTRAIT" : "02 / CAMERA SETUP",
  };

  return (
    <main className={`booth booth--${phase} booth--mode-every`} data-testid="booth">
      {!['results', 'resetting'].includes(phase) && <DeveloperScreenLabel name={screenLabels[phase]} />}
      <aside hidden={!showPromptControls} className="developer-controls" aria-label="Developer controls">
        <Leva hidden={!showPromptControls} fill collapsed={false} titleBar={{ title: "Developer controls", drag: false }} />
        <CameraDebug cameraRef={cameraRef} diagnostics={cameraDiagnostics} framing={framing} onFramingChange={updateFraming} disabled={cameraStatus === "requesting" || !["attract", "camera"].includes(phase)} />
      </aside>
      <Camera ref={cameraRef} visible={cameraVisible} particlesActive={phase === "attract"} onStatusChange={setCameraStatus} framing={framing} onDiagnostics={setCameraDiagnostics} />
      {phase !== "results" && <KioskChrome phase={phase} cameraStatus={cameraStatus} />}

      {phase === "attract" && (
        <section className="attract-panel">
          <div className="attract-panel__copy">
            <p className="eyebrow">{appConfig.kicker}</p>
            <h1>Welcome to <em className="thesis-italic">the future</em></h1>
            <p className="attract-panel__intro">The camera is ready. Keep your expression, choose a future, and leave with an Every portrait made by AI.</p>
            <button type="button" className="primary-button" onClick={begin} data-testid="begin-button">
              Start your Thesis
            </button>
          </div>
        </section>
      )}

      {(phase === "camera" || (phase === "error" && !captureBlob)) && (
        <section className="capture-panel">
          <div>
            <p className="eyebrow">Every portrait / 001</p>
            <h1>Frame <em>the human</em></h1>
            {error && <p className="error-message" role="alert">{error}</p>}
          </div>
          <div className="capture-panel__actions">
            <button type="button" className="shutter-button" onClick={cameraStatus === "ready" ? startCountdown : begin} disabled={cameraStatus === "requesting"} aria-label={cameraStatus === "ready" ? "Take portrait" : "Enable camera"}>{cameraStatus === "ready" ? "Take portrait" : cameraStatus === "requesting" ? "Connecting…" : "Enable camera"}</button>
            <span className="shutter-button__label" aria-hidden="true">Take portrait</span>
          </div>
        </section>
      )}

      {phase === "countdown" && (
        <section className="countdown" aria-live="assertive">
          <div className="countdown__wash" aria-hidden="true" />
          <h1>Hold <em>the pose</em></h1>
          <strong key={count}>{count || "•"}</strong>
        </section>
      )}

      {phase === "flash" && <div className="camera-flash" aria-hidden="true" />}

      {phase === "review" && originalPhoto && (
        <CaptureReview photo={originalPhoto} onRetake={retake} onApprove={approvePhoto} />
      )}

      {phase === "styles" && (
        <StylePicker photo={originalPhoto} styles={styles} onSelect={processPhoto} onRetake={retake} />
      )}

      {phase === "processing" && (
        <Processing
          progress={progress}
          result={result}
          source={originalPhoto}
          style={selectedStyle}
          onComplete={() => {
            if (!result) return;
            setPhase("results");
            refreshResultTimeout();
          }}
        />
      )}

      {phase === "error" && captureBlob && (
        <section className="flow-error" role="alert">
          <h1>Keep the photo.<em>Try again.</em></h1>
          {originalPhoto && <div className="flow-error__portrait"><img src={originalPhoto} alt="Your captured portrait" /><p>{error}</p></div>}
          <div className="flow-error__actions">
            <button type="button" className="secondary-button" onClick={() => reset(true)}>Restart</button>
            <button type="button" className="primary-button" onClick={() => setPhase("styles")}>Choose a style</button>
          </div>
        </section>
      )}

      {["results", "resetting"].includes(phase) && result && (
        <Results
          result={result}
          onReset={() => {
            if (resetTimerRef.current) timers.clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
            setPhase("resetting");
            transitionTimerRef.current = timers.setTimeout(() => reset(true), 450);
          }}
          isResetting={phase === "resetting"}
          onActivity={refreshResultTimeout}
          timeoutVersion={timeoutVersion}
          timeoutMs={appConfig.resetDelayMs}
        />
      )}
    </main>
  );
}

function HandoffPreview() {
  const { photoId } = useParams();
  const result = {
    photoId,
    styled: photoUrl(photoId),
    styleLabel: "Future of Work",
  };

  return (
    <main className="booth booth--results booth--mode-every">
      <Results result={result} onReset={() => { window.location.hash = "/"; }} />
    </main>
  );
}

export default function App() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("brand")) return;
    url.searchParams.delete("brand");
    window.history.replaceState(window.history.state, "", url);
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Booth />} />
        <Route path="/handoff/:photoId" element={<HandoffPreview />} />
        <Route path="/takeaway/:photoId?" element={<Takeaway />} />
        <Route path="/preview/:screen?" element={<DesignPreview />} />
      </Routes>
    </HashRouter>
  );
}
