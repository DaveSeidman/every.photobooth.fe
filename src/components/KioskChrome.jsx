export default function KioskChrome({ phase, cameraStatus }) {
  const statusLabel = {
    attract: "Waiting",
    camera: cameraStatus === "ready" ? "Camera ready" : "Camera setup",
    countdown: "Hold still",
    processing: "Rendering",
    results: "Complete",
    error: "Needs attention",
  }[phase];

  return (
    <div className="chrome" aria-hidden="true">
      <div className="chrome__wordmark">EV<em>E</em>RY</div>
      <div className="chrome__status"><span>✳</span>{statusLabel}</div>
      <div className="chrome__mark">THESIS: 2027 / PORTRAIT 001</div>
    </div>
  );
}
