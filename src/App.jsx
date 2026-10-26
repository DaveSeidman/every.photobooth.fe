import { useCallback, useEffect, useRef, useState } from "react";
import { HashRouter, Route, Routes, useParams } from "react-router-dom";
import { button, Leva, useControls } from "leva";
import { flushSync } from "react-dom";
import { fetchExperience, photoUrl, submitPhoto } from "./api.js";
import { appConfig, defaultExperience } from "./config.js";
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
  const resetTimerRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const captureStartedRef = useRef(false);
  const processPhotoRef = useRef(null);
  const [phase, setPhase] = useState("attract");
  const [cameraStatus, setCameraStatus] = useState("idle");
  const [count, setCount] = useState(appConfig.countdownSeconds);
  const [captureBlob, setCaptureBlob] = useState(null);
  const [originalPhoto, setOriginalPhoto] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [experience, setExperience] = useState(defaultExperience);
  const [timeoutVersion, setTimeoutVersion] = useState(0);
  const [showPromptControls, setShowPromptControls] = useState(false);
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

  const transitionTo = useCallback((nextPhase) => {
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
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
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
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    setTimeoutVersion((version) => version + 1);
    resetTimerRef.current = window.setTimeout(() => reset(true), appConfig.resetDelayMs);
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
      const timer = window.setTimeout(() => setCount((value) => value - 1), 1000);
      return () => window.clearTimeout(timer);
    }
    if (captureStartedRef.current) return undefined;
    captureStartedRef.current = true;
    setPhase("flash");
    transitionTimerRef.current = window.setTimeout(() => {
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
    const timer = window.setInterval(() => {
      const elapsedSeconds = (Date.now() - startedAt) / 1000;
      setProgress((current) => current >= 100 ? current : Math.min(92, Math.round(8 + elapsedSeconds * 7.2)));
    }, 250);
    return () => window.clearInterval(timer);
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
      });
      const output = response.output;
      setProgress(100);
      setResult({
        styled: output.photoId ? photoUrl(output.photoId) : (output.styled || output.variantA || output.past),
        photoId: output.photoId,
        mode: output.mode,
        styleProfile: output.styleProfile,
        styleLabel: output.styleLabel || style.label,
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
      <Leva hidden={!showPromptControls} collapsed={false} titleBar={{ title: "Prompt override" }} />
      <Camera ref={cameraRef} visible={cameraVisible} particlesActive={phase === "attract"} onStatusChange={setCameraStatus} />
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
            if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
            setPhase("resetting");
            transitionTimerRef.current = window.setTimeout(() => reset(true), 450);
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
