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
      <div className="chrome__corner chrome__corner--tl" />
      <div className="chrome__corner chrome__corner--tr" />
      <div className="chrome__corner chrome__corner--bl" />
      <div className="chrome__corner chrome__corner--br" />
      <div className="chrome__status"><span />{statusLabel}</div>
      <div className="chrome__mark">EVERY / 001</div>
    </div>
  );
}
