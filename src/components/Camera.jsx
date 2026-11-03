import { logEvent } from "../lib/logger.js";
import { useLoggedState } from "../hooks/useLoggedState.js";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import { captureRegion, defaultFraming } from "../lib/cameraFraming.js";
import FaceFlowParticles from "./FaceFlowParticles.jsx";

const Camera = forwardRef(function Camera({ visible = true, particlesActive = false, onStatusChange, framing = defaultFraming, onDiagnostics }, ref) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const framingRef = useRef(framing);
  framingRef.current = framing;
  const startingRef = useRef(null);
  const [status, setStatus] = useLoggedState("Camera.status", "idle");

  const publishStatus = (nextStatus) => {
    setStatus(nextStatus);
    onStatusChange?.(nextStatus);
  };

  const stop = () => {
    logEvent("camera.stop");
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    publishStatus("idle");
  };

  const diagnostics = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    const info = { label: track?.label, settings: track?.getSettings?.() || {}, capabilities: track?.getCapabilities?.() || {} };
    logEvent("camera.diagnostics", info);
    onDiagnostics?.(info);
    return info;
  };

  const startCamera = async (requestPTZ = false) => {
    if (streamRef.current) return diagnostics();
    if (!navigator.mediaDevices?.getUserMedia) {
      publishStatus("unavailable");
      throw new Error("This browser does not provide camera access.");
    }
    logEvent("camera.start-requested", { requestPTZ });
    publishStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          ...(requestPTZ ? { pan: true, tilt: true, zoom: true } : {}),
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      publishStatus("ready");
      return diagnostics();
    } catch (error) {
      logEvent("camera.failed", { error }, "error");
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      publishStatus("denied");
      throw error;
    }
  };

  const start = (requestPTZ = false) => {
    if (!startingRef.current) {
      startingRef.current = startCamera(requestPTZ).finally(() => { startingRef.current = null; });
    }
    return startingRef.current;
  };

  const requestHardware = async () => {
    await startingRef.current;
    stop();
    return start(true);
  };

  const applyHardware = async (key, value) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) throw new Error("Enable the camera first.");
    logEvent("camera.hardware-requested", { key, value });
    await track.applyConstraints({ ...track.getConstraints(), advanced: [{ [key]: value }] });
    return diagnostics();
  };

  const capture = () => new Promise((resolve, reject) => {
    logEvent("camera.capture-requested", { framing: framingRef.current });
    const video = videoRef.current;
    if (!video?.videoWidth || !video?.videoHeight) {
      reject(new Error("The camera is not ready yet."));
      return;
    }
    const canvas = document.createElement("canvas");
    const region = captureRegion(video.videoWidth, video.videoHeight, framingRef.current);
    canvas.width = Math.round(region.size);
    canvas.height = canvas.width;
    const context = canvas.getContext("2d");
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, region.x, region.y, region.size, region.size, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) { logEvent("camera.captured", { width: canvas.width, height: canvas.height, bytes: blob.size, framing: framingRef.current }); resolve(blob); }
      else reject(new Error("The photo could not be captured."));
    }, "image/jpeg", 0.92);
  });

  useImperativeHandle(ref, () => ({ start, stop, capture, requestHardware, applyHardware, diagnostics }), []);

  useEffect(() => () => {
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
  }, []);

  return (
    <div className={`camera ${visible ? "" : "camera--muted"}`} data-camera-status={status}>
      <div className="camera__frame">
        <video ref={videoRef} autoPlay muted playsInline aria-label="Live camera preview" style={{
          width: `${framing.zoom * 100}%`, height: `${framing.zoom * 100}%`,
          left: `${-(framing.zoom - 1) * framing.x}%`, top: `${-(framing.zoom - 1) * framing.y}%`,
          objectPosition: `${framing.x}% ${framing.y}%`,
        }} />
      </div>
      <div className="camera__wash" />
      <FaceFlowParticles videoRef={videoRef} active={particlesActive && framing.zoom === 1 && framing.x === 50 && framing.y === 50} ready={status === "ready"} />
    </div>
  );
});

export default Camera;
