import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

const Camera = forwardRef(function Camera({ visible = true, onStatusChange }, ref) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("idle");

  const publishStatus = (nextStatus) => {
    setStatus(nextStatus);
    onStatusChange?.(nextStatus);
  };

  const stop = () => {
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    publishStatus("idle");
  };

  const start = async () => {
    if (streamRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      publishStatus("unavailable");
      throw new Error("This browser does not provide camera access.");
    }
    publishStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      publishStatus("ready");
    } catch (error) {
      publishStatus("denied");
      throw error;
    }
  };

  const capture = () => new Promise((resolve, reject) => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video?.videoHeight) {
      reject(new Error("The camera is not ready yet."));
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The photo could not be captured."));
    }, "image/jpeg", 0.92);
  });

  useImperativeHandle(ref, () => ({ start, stop, capture }), []);

  useEffect(() => () => {
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
  }, []);

  return (
    <div className={`camera ${visible ? "" : "camera--muted"}`} data-camera-status={status}>
      <video ref={videoRef} autoPlay muted playsInline aria-label="Live camera preview" />
      <div className="camera__wash" />
    </div>
  );
});

export default Camera;
