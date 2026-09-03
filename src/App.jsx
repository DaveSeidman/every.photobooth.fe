import { useCallback, useEffect, useRef, useState } from "react";
import { HashRouter, Route, Routes, useParams } from "react-router-dom";
import { fetchExperience, photoUrl, submitPhoto } from "./api.js";
import { appConfig, defaultExperience } from "./config.js";
import Camera from "./components/Camera.jsx";
import CaptureReview from "./components/CaptureReview.jsx";
import KioskChrome from "./components/KioskChrome.jsx";
import Processing from "./components/Processing.jsx";
import Results from "./components/Results.jsx";
import StylePicker from "./components/StylePicker.jsx";
import Takeaway from "./components/Takeaway.jsx";
import PosthogWorld from "./components/PosthogWorld.jsx";
import { currentBrand } from "./brand.js";

function Booth() {
  const brand = currentBrand();
  const cameraRef = useRef(null);
  const resetTimerRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const captureStartedRef = useRef(false);
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

  useEffect(() => {
    fetchExperience().then(setExperience);
    cameraRef.current?.start().catch(() => {
      setError("Camera access is unavailable. Choose a photo below or check browser permissions.");
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
    cameraRef.current?.stop();
    clearCapture();
    setSelectedStyle(null);
    setResult(null);
    setError("");
    setProgress(0);
    setCount(appConfig.countdownSeconds);
    captureStartedRef.current = false;
    setPhase(toAttract ? "attract" : "camera");
    if (toAttract) {
      cameraRef.current?.start().catch(() => {
        setError("Camera access is unavailable. Choose a photo below or check browser permissions.");
      });
    }
  }, []);

  const refreshResultTimeout = useCallback(() => {
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
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
      setError("Camera access is unavailable. Choose a photo below or check browser permissions.");
    }
  };

  const startCountdown = useCallback(() => {
    captureStartedRef.current = false;
    setCount(appConfig.countdownSeconds);
    setPhase("countdown");
  }, []);

  const acceptCapture = useCallback((blob, withFlash = false) => {
    clearCapture();
    setCaptureBlob(blob);
    setOriginalPhoto(URL.createObjectURL(blob));
    if (withFlash) {
      setPhase("flash");
      transitionTimerRef.current = window.setTimeout(() => setPhase("review"), 420);
    } else {
      setPhase("review");
    }
  }, []);

  useEffect(() => {
    if (phase !== "countdown") return undefined;
    if (count > 0) {
      const timer = window.setTimeout(() => setCount((value) => value - 1), 1000);
      return () => window.clearTimeout(timer);
    }
    if (captureStartedRef.current) return undefined;
    captureStartedRef.current = true;
    cameraRef.current.capture()
      .then((blob) => acceptCapture(blob, true))
      .catch((captureError) => {
        setError(captureError.message);
        setPhase("error");
      });
    return undefined;
  }, [phase, count, acceptCapture]);

  useEffect(() => {
    if (phase !== "processing") return undefined;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsedSeconds = (Date.now() - startedAt) / 1000;
      setProgress(Math.min(92, Math.round(8 + elapsedSeconds * 7.2)));
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
      setError("Camera access is unavailable. Choose a photo below or check browser permissions.");
    }
  };

  const approvePhoto = () => {
    cameraRef.current?.stop();
    if (brand === "posthog") {
      processPhoto({ id: "paper-hedgehogs", label: "Paper Hedgehog World" });
    } else {
      setPhase("styles");
    }
  };

  const processPhoto = async (style) => {
    if (!captureBlob) return;
    setSelectedStyle(style);
    setProgress(5);
    setError("");
    setPhase("processing");
    try {
      const response = await submitPhoto(captureBlob, { mode: brand, style: style.id });
      const output = response.output;
      setProgress(100);
      setResult({
        styled: output.photoId ? photoUrl(output.photoId) : (output.styled || output.variantA || output.past),
        photoId: output.photoId,
        mode: output.mode,
        styleProfile: output.styleProfile,
        styleLabel: output.styleLabel || style.label,
      });
      transitionTimerRef.current = window.setTimeout(() => {
        setPhase("results");
        refreshResultTimeout();
      }, 450);
    } catch (requestError) {
      setError(requestError.message);
      setPhase("error");
    }
  };

  const cameraVisible = ["attract", "camera", "countdown", "flash"].includes(phase);
  const styles = experience.everyStyles || defaultExperience.everyStyles;

  return (
    <main className={`booth booth--${phase} booth--mode-${brand}`} data-testid="booth">
      <Camera ref={cameraRef} visible={cameraVisible} onStatusChange={setCameraStatus} />
      <KioskChrome phase={phase} cameraStatus={cameraStatus} brand={brand} />

      {phase === "attract" && (
        <section className="attract-panel">
          {brand === "posthog" && <div className="posthog-attract-world"><PosthogWorld image="" label="" /></div>}
          <div className="attract-orbits" aria-hidden="true">
            <i /><i /><i /><i />
          </div>
          <div className="attract-panel__copy">
            <p className="eyebrow">{brand === "posthog" ? "PostHog / Paper Lab" : appConfig.kicker}</p>
            <h1>{brand === "posthog" ? <>Become a<br /><em>tiny hedgehog.</em></> : <>Step into<br /><em>the future.</em></>}</h1>
            <p className="attract-panel__intro">{brand === "posthog" ? "Step into a playful paper micro-world, then meet the hedgehog version of your group." : "The camera is ready. Keep your expression, choose a future, and leave with an Every portrait made by AI."}</p>
            <button type="button" className="primary-button" onClick={begin} data-testid="begin-button">
              {brand === "posthog" ? "Enter the garden" : "Start your Thesis"} <span>↗</span>
            </button>
          </div>
        </section>
      )}

      {(phase === "camera" || (phase === "error" && !captureBlob)) && (
        <section className="capture-panel">
          <div>
            <p className="eyebrow">Every portrait / 001</p>
            <h1>{cameraStatus === "ready" ? <>Frame <em>the human.</em></> : "Camera setup."}</h1>
            {error && <p className="error-message" role="alert">{error}</p>}
          </div>
          <div className="capture-panel__actions">
            <button type="button" className="shutter-button" onClick={startCountdown} disabled={cameraStatus !== "ready"} aria-label="Take portrait">
              <span className="shutter-button__lens" />
              <span>Take portrait</span>
            </button>
          </div>
        </section>
      )}

      {phase === "countdown" && (
        <section className="countdown" aria-live="assertive">
          <p>Hold the pose</p>
          <strong>{count || "•"}</strong>
        </section>
      )}

      {phase === "flash" && <div className="camera-flash" aria-hidden="true" />}

      {phase === "review" && originalPhoto && (
        <CaptureReview photo={originalPhoto} onRetake={retake} onApprove={approvePhoto} />
      )}

      {phase === "styles" && (
        <StylePicker styles={styles} onSelect={processPhoto} onRetake={retake} />
      )}

      {phase === "processing" && (
        <Processing progress={progress} photo={originalPhoto} style={selectedStyle} />
      )}

      {phase === "error" && captureBlob && (
        <section className="flow-error" role="alert">
          <p className="eyebrow">Something interrupted the transformation</p>
          <h1>Keep the photo.<br /><em>Try again.</em></h1>
          <p>{error}</p>
          <div className="flow-error__actions">
            <button type="button" className="primary-button" onClick={() => setPhase("styles")}>Choose a style</button>
            <button type="button" className="secondary-button" onClick={() => reset(true)}>Restart</button>
          </div>
        </section>
      )}

      {phase === "results" && result && (
        <Results result={result} brand={brand} onReset={() => reset(true)} onActivity={refreshResultTimeout} />
      )}
    </main>
  );
}

function HandoffPreview() {
  const brand = currentBrand();
  const { photoId } = useParams();
  const result = {
    photoId,
    styled: photoUrl(photoId),
    styleLabel: "Future of Work",
  };

  return (
    <main className="booth booth--results booth--mode-every">
      <Results result={result} brand={brand} onReset={() => { window.location.hash = "/"; }} />
    </main>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Booth />} />
        <Route path="/handoff/:photoId" element={<HandoffPreview />} />
        <Route path="/takeaway/:photoId?" element={<Takeaway />} />
      </Routes>
    </HashRouter>
  );
}
