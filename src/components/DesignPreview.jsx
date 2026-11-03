import { timers } from "../lib/timers.js";
import { useLoggedState } from "../hooks/useLoggedState.js";
import { useEffect, useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { defaultExperience } from "../config.js";
import BoothTitle from "./BoothTitle.jsx";
import CameraPhoto from "./CameraPhoto.jsx";
import KioskChrome from "./KioskChrome.jsx";
import TicketButton from "./TicketButton.jsx";
import CaptureReview, { ReviewActions } from "./CaptureReview.jsx";
import StylePicker from "./StylePicker.jsx";
import { ProcessingSurface } from "./Processing.jsx";
import Results from "./Results.jsx";

const screens = [
  ["attract", "01 Attract"], ["camera", "02 Camera setup"],
  ["countdown", "03 Countdown"], ["flash", "03b Flash"],
  ["review", "04 Review"], ["styles", "05 Choose style"],
  ["processing", "06 Generating"], ["error", "06b Error"],
  ["results", "07 Finished + QR"], ["connected", "08 Phone connected"],
  ["resetting", "09 Controls fall away"], ["camera-reveal", "10 Camera power-on"],
];
const original = `${import.meta.env.BASE_URL}test-frames/image1.png`;

// Isolated design review: no camera permission, uploads, generation or sockets.
export default function DesignPreview() {
  const { screen: requested = "attract" } = useParams();
  const screen = screens.some(([id]) => id === requested) ? requested : "attract";
  const [style, setStyle] = useLoggedState("DesignPreview.style", defaultExperience.everyStyles[0]);
  const imageRef = useRef(null);
  const surfaceRef = useRef(null);
  const actionsRef = useRef(null);
  const [developed, setDeveloped] = useLoggedState("DesignPreview.developed", false);
  const [processingStarted, setProcessingStarted] = useLoggedState("DesignPreview.processingStarted", false);
  const [replay, setReplay] = useLoggedState("DesignPreview.replay", 0);
  const go = (id) => {
    if (id === "processing") { setDeveloped(false); setProcessingStarted(true); }
    if (["attract", "camera", "review", "styles"].includes(id)) { setDeveloped(false); setProcessingStarted(false); imageRef.current?.style.removeProperty("--image-opacity"); }
    window.location.hash = `/preview/${id}`;
  };
  useEffect(() => {
    if (screen !== "resetting" && screen !== "camera-reveal") return;
    const timer = timers.setTimeout(() => go(screen === "resetting" ? "camera-reveal" : "attract"), screen === "resetting" ? 720 : 900);
    return () => timers.clearTimeout(timer);
  },[screen]);
  const sync = useMemo(() => ({
    status: "connected", phones: screen === "connected" ? 1 : 0,
    phoneConnected: screen === "connected", clockOffset: 0,
    handoff: screen === "connected" ? {
      id: `preview-${replay}`, startsAt: Date.now() + 450, durationMs: 2400,
    } : null,
  }), [screen, replay]);
  useEffect(() => {
    const keydown = (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key) || event.target.matches("select, input, button")) return;
      event.preventDefault();
      const index = screens.findIndex(([id]) => id === screen);
      go(screens[Math.max(0, Math.min(screens.length - 1, index + (event.key === "ArrowRight" ? 1 : -1)))][0]);
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [screen]);
  const result = { photoId: "preview", styled: style.preview, styleLabel: style.label, styleId: style.id, original };
  return <>
    <nav className="design-controls" aria-label="Design preview controls">
      <Link to="/">← Live booth</Link>
      <select aria-label="Preview screen" value={screen} onChange={(event) => go(event.target.value)}>
        {screens.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
      <select aria-label="Portrait style" value={style.id} onChange={(event) => setStyle(defaultExperience.everyStyles.find((item) => item.id === event.target.value))}>
        {defaultExperience.everyStyles.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
      {screen === "connected" && <button onClick={() => setReplay((value) => value + 1)}>Replay handoff</button>}
      <Link to={`/takeaway/preview?fallback=1&style=${style.id}`}>M01 Phone takeaway ↗</Link>
    </nav>
    <main className={`booth booth--mode-every booth--${screen}`} data-title-phase={screen}><BoothTitle phase={screen} />
      <KioskChrome phase={screen} />
      <CameraPhoto wobble={screen === "processing"} actionsRef={actionsRef} depth={["attract", "styles", "camera-reveal"].includes(screen) ? "back" : ["camera", "countdown", "flash"].includes(screen) ? "closeup" : "normal"}
        developing={screen === "review"} caption={screen === "review" ? "Is everyone in frame?" : ["processing", "results", "connected", "resetting"].includes(screen) ? style.label : null}
        actions={screen === "review" ? <ReviewActions onRetake={() => go("camera")} onApprove={() => go("styles")} /> : screen === "attract" ? <TicketButton key="start" onSelect={() => go("camera")}>Start your Thesis</TicketButton> : screen === "camera" ? <TicketButton key="capture" className="shutter-button" onSelect={() => go("countdown")}>Take portrait</TicketButton> : null}>
        <div className={`camera camera--captured ${screen === "camera-reveal" ? "camera--revealing" : ""}`} ref={surfaceRef} data-result-ready={developed || ["results", "connected", "resetting", "camera-reveal"].includes(screen) || undefined}>
          <div className="camera__frame"><div className="camera__reveal"><img className="preview-camera" src={original} alt="Simulated live camera" /></div></div>
          <img className="camera__still" ref={imageRef} src={developed || ["results", "connected", "resetting", "camera-reveal"].includes(screen) ? style.preview : original} alt="Preview portrait" />
          {(screen === "processing" || (processingStarted && ["results", "connected", "resetting", "camera-reveal"].includes(screen))) && <ProcessingSurface source={original} result={{styled:style.preview}} imageRef={imageRef} onDeveloped={() => setDeveloped(true)} onComplete={() => go("results")} />}
          {screen === "countdown" && <strong className="camera__countdown">3</strong>}
        </div>
        {screen === "processing" && <div className="progress" role="progressbar" aria-valuenow={58}><div className="progress__track"><span style={{width:"58%"}} /></div></div>}
      </CameraPhoto>
      {screen === "attract" && <section className="attract-panel"><h1>Welcome to <em className="thesis-italic">the future</em></h1></section>}
      {screen === "camera" && <section className="capture-panel"><h1>Frame <em>the Humans</em></h1></section>}
      {screen === "countdown" && <section className="countdown"><h1>Hold <em>the pose</em></h1></section>}
      {["review", "flash"].includes(screen) && <CaptureReview photo={original} showPhoto={false} showActions={false} onRetake={() => go("camera")} onApprove={() => go("styles")} />}
      {screen === "styles" && <StylePicker styles={defaultExperience.everyStyles} onSelect={(item) => { setStyle(item); go("processing"); }} />}
      {screen === "processing" && <section className="processing"><h1>Becoming <em>something else</em></h1></section>}
      {screen === "error" && <section className="flow-error" role="alert"><h1>Keep the photo.<em>Try again.</em></h1><p className="error-message">That took longer than expected.</p><div className="flow-error__actions"><button className="secondary-button" onClick={() => go("attract")}>Restart</button><button className="primary-button" onClick={() => go("styles")}>Choose a style</button></div></section>}
      {["results", "connected", "resetting"].includes(screen) && <Results result={result} previewSync={sync} imageRef={imageRef} surfaceRef={surfaceRef} actionsRef={actionsRef} isResetting={screen === "resetting"} onReset={() => go("resetting")} />}
    </main>
  </>;
}
