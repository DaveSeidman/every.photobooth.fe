export default function KioskChrome({ phase, cameraStatus, brand = "every" }) {
  const statusLabel = {
    attract: "Waiting",
    camera: cameraStatus === "ready" ? "Camera ready" : "Camera setup",
    countdown: "Hold still",
    flash: "Captured",
    review: "Review photo",
    styles: "Choose a future",
    processing: "Rendering",
    results: "Complete",
    error: "Needs attention",
  }[phase];

  return (
    <div className="chrome" aria-hidden="true">
      <div className="chrome__wordmark">
        {brand === "posthog"
          ? <>POST<span>HOG</span></>
          : <img src={`${import.meta.env.BASE_URL}every-logo.svg`} alt="" />}
      </div>
      <div className="chrome__status"><span>✳</span>{statusLabel}</div>
      <div className="chrome__mark">{brand === "posthog" ? "PAPER LAB / HEDGEHOG PORTRAIT" : "THESIS: 2027 / EVERY PORTRAIT"}</div>
    </div>
  );
}
