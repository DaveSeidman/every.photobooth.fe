import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { defaultExperience } from "../config.js";
import KioskChrome from "./KioskChrome.jsx";
import CaptureReview from "./CaptureReview.jsx";
import StylePicker from "./StylePicker.jsx";
import Processing from "./Processing.jsx";
import Results from "./Results.jsx";

const screens = [
  ["attract", "01 Attract"], ["camera", "02 Camera setup"],
  ["countdown", "03 Countdown"], ["flash", "03b Flash"],
  ["review", "04 Review"], ["styles", "05 Choose style"],
  ["processing", "06 Generating"], ["error", "06b Error"],
  ["results", "07 Finished + QR"], ["connected", "08 Phone connected"],
];
const original = `${import.meta.env.BASE_URL}thesis/img/profile.svg`;

// Isolated design review: no camera permission, uploads, generation or sockets.
export default function DesignPreview() {
  const { screen: requested = "attract" } = useParams();
  const screen = screens.some(([id]) => id === requested) ? requested : "attract";
  const [style, setStyle] = useState(defaultExperience.everyStyles[3]);
  const [replay, setReplay] = useState(0);
  const go = (id) => { window.location.hash = `/preview/${id}`; };
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
    <main className={`booth booth--mode-every booth--${screen}`}>
      {!["results", "connected"].includes(screen) && <KioskChrome phase={screen} />}
      {["attract", "camera", "countdown", "flash"].includes(screen) && <div className="camera"><img className="preview-camera" src={original} alt="Simulated camera for design review" /></div>}
      {screen === "attract" && <section className="attract-panel"><h1>Welcome to <em className="thesis-italic">the future</em></h1><button className="primary-button" onClick={() => go("camera")}>Start your Thesis</button></section>}
      {screen === "camera" && <section className="capture-panel"><h1>Frame <em>the human</em></h1><div className="capture-panel__actions"><button className="shutter-button" onClick={() => go("countdown")}>Take portrait</button></div></section>}
      {screen === "countdown" && <section className="countdown"><h1>Hold <em>the pose</em></h1><strong>3</strong></section>}
      {["review", "flash"].includes(screen) && <CaptureReview photo={original} onRetake={() => go("camera")} onApprove={() => go("styles")} />}
      {screen === "flash" && <div key={screen} className="camera-flash" />}
      {screen === "styles" && <StylePicker photo={original} styles={defaultExperience.everyStyles} onRetake={() => go("camera")} onSelect={(item) => { setStyle(item); go("processing"); }} />}
      {screen === "processing" && <Processing progress={58} source={original} result={{ styled: style.preview }} style={style} />}
      {screen === "error" && <section className="flow-error" role="alert"><h1>Keep the photo.<em>Try again.</em></h1><div className="flow-error__portrait"><img src={original} alt="Your captured portrait" /><p>That took longer than 30 seconds.</p></div><div className="flow-error__actions"><button className="secondary-button" onClick={() => go("attract")}>Restart</button><button className="primary-button" onClick={() => go("styles")}>Choose a style</button></div></section>}
      {["results", "connected"].includes(screen) && <Results result={result} previewSync={sync} onReset={() => go("attract")} />}
    </main>
  </>;
}
