import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";
import { createFaceFlowProcessor } from "../lib/faceFlowProcessor.js";
let processFrame;
self.onmessage = async ({data}) => {
  if (data.type === "init") {
    try {
      const files = await FilesetResolver.forVisionTasks(`${data.assetsUrl}wasm`, true);
      const detector = await FaceDetector.createFromOptions(files, {
        baseOptions: {modelAssetPath:`${data.assetsUrl}face-detector.tflite`, delegate:"CPU"},
        runningMode:"VIDEO", minDetectionConfidence:.55,
      });
      processFrame = createFaceFlowProcessor(detector, new OffscreenCanvas(data.width, data.height));
      self.postMessage({type:"ready"});
    } catch(error) {self.postMessage({type:"error",message:error.message});}
    return;
  }
  if (data.type !== "frame") return;
  if (!processFrame) {data.bitmap.close();return;}
  try {self.postMessage({type:"flow",faces:processFrame(data.bitmap,data.timestamp)});}
  catch(error) {data.bitmap.close();self.postMessage({type:"error",message:error.message});}
};
