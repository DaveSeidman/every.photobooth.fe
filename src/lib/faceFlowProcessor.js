import { downsample, faceMotion, grayscale } from "./opticalFlow.js";

export function createFaceFlowProcessor(detector, canvas) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Face analysis canvas is unavailable.");
  let previous, faces = [], previousTime = 0, lastDetection = -Infinity, smoothMotion = [];
  return (bitmap, timestamp) => {
    context.drawImage(bitmap, 0, 0); bitmap.close?.();
    const { width, height } = canvas;
    const current = grayscale(context.getImageData(0, 0, width, height).data);
    if (timestamp - lastDetection >= 280) {
      const result = detector.detectForVideo(canvas, timestamp);
      const detected = result.detections.slice(0, 4).map(({ boundingBox: b }) => ({
        x: b.originX / width, y: b.originY / height, width: b.width / width, height: b.height / height,
      }));
      // Smooth nearby boxes without ever retaining a face after it leaves the frame.
      faces = detected.map((face) => {
        const old = faces.find((f) => Math.hypot(f.x - face.x, f.y - face.y) < .12);
        if (!old) return face;
        return Object.fromEntries(Object.keys(face).map((key) => [key, old[key] * .25 + face[key] * .75]));
      });
      lastDetection = timestamp;
    }
    if (timestamp - previousTime > 400) previous = null;
    const dt = Math.max(.03, Math.min(.2, (timestamp - previousTime) / 1000));
    const pyramid = previous ? { previous: downsample(previous, width, height), current: downsample(current, width, height) } : null;
    const output = faces.map((face, index) => {
      const flow = previous ? faceMotion(previous, current, width, height, face, pyramid) : { x: 0, y: 0 };
      const old = smoothMotion[index] || { x: 0, y: 0 };
      const motion = { x: old.x * .45 + flow.x / width / dt * .55, y: old.y * .45 + flow.y / height / dt * .55 };
      smoothMotion[index] = motion;
      return { ...face, flowX: motion.x, flowY: motion.y };
    });
    smoothMotion.length = output.length;
    previous = current; previousTime = timestamp;
    return output;
  };
}
