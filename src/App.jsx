import OperatorPanel from "./components/OperatorPanel.jsx";
import { track } from "./lib/analytics.js";
import { downloadLogs, clearLogs, logEvent } from "./lib/logger.js";
import { timers } from "./lib/timers.js";
import { useLoggedState } from "./hooks/useLoggedState.js";
import { useCallback, useEffect, useRef } from "react";
import { HashRouter, Route, Routes, useParams } from "react-router-dom";
import { button, Leva, useControls } from "leva";
import { fetchExperience, photoUrl, submitPhoto } from "./api.js";
import { appConfig, defaultExperience } from "./config.js";
import BoothTitle from "./components/BoothTitle.jsx";
import CameraPhoto from "./components/CameraPhoto.jsx";
import CameraDebug from "./components/CameraDebug.jsx";
import { defaultFraming } from "./lib/cameraFraming.js";
import Camera from "./components/Camera.jsx";
import TicketButton from "./components/TicketButton.jsx";
import CaptureReview, { ReviewActions } from "./components/CaptureReview.jsx";
import KioskChrome from "./components/KioskChrome.jsx";
import { ProcessingSurface } from "./components/Processing.jsx";
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
  const portraitImageRef = useRef(null);
  const portraitSurfaceRef = useRef(null);
  const portraitActionsRef = useRef(null);
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
  const resetInProgress = useRef(false);
  const transitionTimerRef = useRef(null);
  const captureStartedRef = useRef(false);
  const exposureStartedAtRef = useRef(0);
  const processPhotoRef = useRef(null);
  const [phase, setPhase] = useLoggedState("App.phase", "attract");
  const [facePresent, setFacePresent] = useLoggedState("App.facePresent", false);
  const [startLeaving, setStartLeaving] = useLoggedState("App.startLeaving", false);
  const [cameraStatus, setCameraStatus] = useLoggedState("App.cameraStatus", "idle");
  const [count, setCount] = useLoggedState("App.count", appConfig.countdownSeconds);
  const [captureBlob, setCaptureBlob] = useLoggedState("App.captureBlob", null);
  const [originalPhoto, setOriginalPhoto] = useLoggedState("App.originalPhoto", null);
  const [selectedStyle, setSelectedStyle] = useLoggedState("App.selectedStyle", null);
  const [portraitDeveloped, setPortraitDeveloped] = useLoggedState("App.portraitDeveloped", false);
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
    setPhase(nextPhase);
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
    resetInProgress.current = false;
    clearTimers();
    setStartLeaving(false);
    setFacePresent(false);
    clearCapture();
    setSelectedStyle(null);
    setResult(null);
    setError("");
    setProgress(0);
    setPortraitDeveloped(false);
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

  const beginReset = useCallback(() => {
    if (resetInProgress.current) return;
    resetInProgress.current = true;
    clearTimers();
    logEvent("flow.reset-exit-started");
    setPhase("resetting");
    transitionTimerRef.current = timers.setTimeout(() => {
      logEvent("flow.camera-reveal-started");
      setPhase("camera-reveal");
      transitionTimerRef.current = timers.setTimeout(() => reset(true), 900);
    }, 720);
  }, [reset]);

  const refreshResultTimeout = useCallback(() => {
    if (resetInProgress.current) return;
    logEvent("flow.reset-timer-refreshed", { delayMs: appConfig.resetDelayMs });
    if (resetTimerRef.current) timers.clearTimeout(resetTimerRef.current);
    setTimeoutVersion((version) => version + 1);
    resetTimerRef.current = timers.setTimeout(beginReset, appConfig.resetDelayMs);
  }, [beginReset]);

  useEffect(() => () => {
    clearTimers();
    cameraRef.current?.stop();
  }, []);

  const begin = async () => {
    track("booth_start");
    setError("");
    if (phase === "attract") {
      setStartLeaving(true);
      transitionTimerRef.current = timers.setTimeout(() => {
        setStartLeaving(false);
        transitionTimerRef.current = null;
      }, 800);
    }
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

  const acceptCapture = useCallback(async (blob) => {
    const photo = URL.createObjectURL(blob);
    const decoded = new Image();
    decoded.src = photo;
    try { await decoded.decode(); }
    catch (error) { URL.revokeObjectURL(photo); throw error; }
    clearCapture();
    setCaptureBlob(blob);
    track("photo_captured");
    setOriginalPhoto(photo);
    // Swap to the frozen exposure inside the existing photo, then develop it.
    transitionTimerRef.current = timers.setTimeout(() => {
      transitionTimerRef.current = null;
      setPhase("review");
    }, Math.max(0, 420 - (performance.now() - exposureStartedAtRef.current)));
  }, []);

  useEffect(() => {
    if (phase !== "countdown") return undefined;
    if (count > 0) {
      const timer = timers.setTimeout(() => setCount((value) => value - 1), 1000);
      return () => timers.clearTimeout(timer);
    }
    if (captureStartedRef.current) return undefined;
    captureStartedRef.current = true;
    exposureStartedAtRef.current = performance.now();
    setPhase("flash");
    cameraRef.current.capture()
      .then(acceptCapture)
      .catch((captureError) => {
        setError(captureError.message);
        setPhase("error");
      });
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
    track("photo_retake");
    clearCapture();
    setError("");
    setPhase("camera");
    try {
      await cameraRef.current.start();
      startCountdown();
    } catch {
      setError("Camera access is unavailable. Check browser permissions and try again.");
    }
  };

  const approvePhoto = () => {
    track("photo_approved");
    transitionTo("styles");
  };

  const processPhoto = async (style) => {
    if (!captureBlob) return;
    const analyticsStarted = performance.now();
    track("generation_start", {style:style.id});
    setSelectedStyle(style);
    setPortraitDeveloped(false);
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
      track("generation_complete", {style:style.id, mode:output.generationMode, durationMs:performance.now()-analyticsStarted});
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
      track("generation_error", {style:style.id, durationMs:performance.now()-analyticsStarted});
      setError(requestError.message);
      setPhase("error");
    }
  };
  processPhotoRef.current = processPhoto;

  const cameraVisible = true;
  const cameraDepth = ["styles", "camera-reveal"].includes(phase) ? "back" : phase === "attract" ? (facePresent ? "normal" : "back")
    : ["camera", "countdown", "flash"].includes(phase) || (phase === "error" && !captureBlob) ? "closeup" : "normal";
  const styles = experience.everyStyles || defaultExperience.everyStyles;
  const screenLabels = {
    attract: "01 / ATTRACT", camera: "02 / CAMERA SETUP",
    countdown: "03 / COUNTDOWN + FLASH", flash: "03 / COUNTDOWN + FLASH", review: "04 / REVIEW PHOTO",
    styles: "05 / CHOOSE EVERY STYLE", processing: "06 / GENERATING PORTRAIT",
    error: captureBlob ? "06 / GENERATING PORTRAIT" : "02 / CAMERA SETUP",
  };

  return (
    <main className={`booth booth--${phase} booth--mode-every`} data-testid="booth" data-title-phase={phase}>
      <BoothTitle phase={phase} hasPhoto={Boolean(captureBlob)} />
      {!['results', 'resetting'].includes(phase) && <DeveloperScreenLabel name={screenLabels[phase]} />}
      <aside hidden={!showPromptControls} className="developer-controls" aria-label="Developer controls">
        <Leva hidden={!showPromptControls} fill collapsed={false} titleBar={{ title: "Developer controls", drag: false }} />
        <CameraDebug cameraRef={cameraRef} diagnostics={cameraDiagnostics} framing={framing} onFramingChange={updateFraming} disabled={cameraStatus === "requesting" || !["attract", "camera"].includes(phase)} />
      </aside>
      <CameraPhoto wobble={phase === "processing"} actionsRef={portraitActionsRef} depth={cameraDepth} visible={cameraVisible} developing={phase === "review"} caption={phase === "review" ? "Is everyone in frame?" : ["processing", "results", "resetting"].includes(phase) ? selectedStyle?.label : null} actions={
        phase === "review" ? <ReviewActions onRetake={retake} onApprove={approvePhoto} /> :
        phase === "attract" ? <TicketButton key="start" className="primary-button" onSelect={begin} data-testid="begin-button">Start your Thesis</TicketButton> :
        phase === "camera" || (phase === "error" && !captureBlob) ? <>
          <TicketButton key="capture" className="shutter-button" onSelect={cameraStatus === "ready" ? startCountdown : begin} disabled={cameraStatus === "requesting"} aria-label={cameraStatus === "ready" ? "Take portrait" : "Enable camera"}>{cameraStatus === "ready" ? "Take portrait" : cameraStatus === "requesting" ? "Connecting…" : "Enable camera"}</TicketButton>
        </> : null
      }>
        <Camera ref={cameraRef} visible={cameraVisible} particlesActive={phase === "attract"} onStatusChange={setCameraStatus} framing={framing} photo={portraitDeveloped && result ? result.styled : originalPhoto} imageRef={portraitImageRef} surfaceRef={portraitSurfaceRef} resultReady={portraitDeveloped} revealing={phase === "camera-reveal"} countdown={phase === "countdown" ? count : null} onDiagnostics={setCameraDiagnostics} onPresenceChange={setFacePresent}>
          {["processing", "results", "resetting"].includes(phase) && <ProcessingSurface source={originalPhoto} result={result} imageRef={portraitImageRef}
            onDeveloped={() => setPortraitDeveloped(true)} onComplete={() => {
              setPhase("results"); refreshResultTimeout();
            }} />}
        </Camera>
        {phase === "processing" && <div className="progress" role="progressbar" aria-label="Generating portrait" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}><div className="progress__track"><span style={{width:`${progress}%`}} /></div></div>}
      </CameraPhoto>
      <KioskChrome phase={phase} cameraStatus={cameraStatus} />

      {(phase === "attract" || startLeaving) && (
        <section className={`attract-panel ${startLeaving ? "is-leaving" : ""}`} aria-hidden={startLeaving || undefined}>
          <div className="attract-panel__copy">
            <p className="eyebrow">{appConfig.kicker}</p>
            <h1>Welcome to <em className="thesis-italic">the future</em></h1>
            <p className="attract-panel__intro">The camera is ready. Keep your expression, choose a future, and leave with an Every portrait made by AI.</p>
          </div>
        </section>
      )}

      {(phase === "camera" || (phase === "error" && !captureBlob)) && (
        <section className="capture-panel">
          <div>
            <p className="eyebrow">Every portrait / 001</p>
            <h1>Frame <em>the Humans</em></h1>
            {error && <p className="error-message" role="alert">{error}</p>}
          </div>
        </section>
      )}

      {phase === "countdown" && (
        <section className="countdown" aria-live="assertive">
          <h1>Hold <em>the pose</em></h1>
        </section>
      )}

      {phase === "review" && originalPhoto && (
        <CaptureReview photo={originalPhoto} showPhoto={false} showActions={false} onRetake={retake} onApprove={approvePhoto} />
      )}

      {phase === "styles" && (
        <StylePicker styles={styles} onSelect={processPhoto} />
      )}

      {phase === "processing" && <section className="processing" aria-live="polite"><h1>Becoming <em>something else</em></h1></section>}

      {phase === "error" && captureBlob && (
        <section className="flow-error" role="alert">
          <h1>Keep the photo.<em>Try again.</em></h1>
          <p className="error-message">{error}</p>
          <div className="flow-error__actions">
            <button type="button" className="secondary-button" onClick={() => reset(true)}>Restart</button>
            <button type="button" className="primary-button" onClick={() => setPhase("styles")}>Choose a style</button>
          </div>
        </section>
      )}

      {["results", "resetting"].includes(phase) && result && (
        <Results
          result={result}
          imageRef={portraitImageRef} surfaceRef={portraitSurfaceRef} actionsRef={portraitActionsRef}
          onReset={beginReset}
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
    <main className="booth booth--results booth--mode-every" data-title-phase="results"><BoothTitle phase="results" />
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
      <OperatorPanel />
      <Routes>
        <Route path="/" element={<Booth />} />
        <Route path="/handoff/:photoId" element={<HandoffPreview />} />
        <Route path="/takeaway/:photoId?" element={<Takeaway />} />
        <Route path="/preview/:screen?" element={<DesignPreview />} />
      </Routes>
    </HashRouter>
  );
}
