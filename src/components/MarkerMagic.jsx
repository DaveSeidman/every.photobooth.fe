import { useEffect, useRef, useState } from "react";
import aruco from "js-aruco";

const familiars = { builder: "🦊", designer: "🦋", inventor: "🦉" };

export default function MarkerMagic({ active, choice = "builder", onAutoCapture }) {
  const canvasRef = useRef(null);
  const firedRef = useRef(false);
  const stableSinceRef = useRef(0);
  const [markerCount, setMarkerCount] = useState(0);
  useEffect(() => {
    if (!active) { firedRef.current = false; stableSinceRef.current = 0; setMarkerCount(0); return undefined; }
    const detector = new aruco.AR.Detector();
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    let frame;
    const tick = () => {
      const video = document.querySelector(".camera video");
      if (video?.videoWidth) {
        const scale = 0.35;
        canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        let markers = [];
        try { markers = detector.detect(context.getImageData(0, 0, canvas.width, canvas.height)); } catch { markers = []; }
        setMarkerCount(markers.length);
        context.clearRect(0, 0, canvas.width, canvas.height);
        markers.forEach((marker) => {
          const xs = marker.corners.map((corner) => corner.x); const ys = marker.corners.map((corner) => corner.y);
          const x = xs.reduce((sum, value) => sum + value, 0) / xs.length; const y = ys.reduce((sum, value) => sum + value, 0) / ys.length;
          const radius = Math.max(24, Math.abs(xs[1] - xs[0]) * 1.4);
          context.strokeStyle = "#A8F0D0"; context.lineWidth = 3; context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.stroke();
          context.font = `${Math.round(radius)}px serif`; context.textAlign = "center"; context.textBaseline = "middle"; context.fillText(familiars[choice] || familiars.builder, x, y);
          context.strokeStyle = "rgba(168,240,208,.75)"; context.lineWidth = 2; context.beginPath();
          for (let trail = 0; trail < 4; trail += 1) context.arc(x, y, radius * (1.3 + trail * .28), trail * .8, trail * .8 + 1.1);
          context.stroke();
        });
        if (markers.length > 0) {
          if (!stableSinceRef.current) stableSinceRef.current = performance.now();
          if (!firedRef.current && performance.now() - stableSinceRef.current > 900) { firedRef.current = true; onAutoCapture?.(); }
        } else stableSinceRef.current = 0;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, choice, onAutoCapture]);
  if (!active) return null;
  return <><canvas ref={canvasRef} className="marker-magic__canvas" aria-hidden="true" /><div className="marker-magic__status">{markerCount ? `${markerCount} familiar${markerCount > 1 ? "s" : ""} awake` : "Hold up your marked phone"}</div></>;
}
