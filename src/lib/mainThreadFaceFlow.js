import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import { createFaceFlowProcessor } from './faceFlowProcessor.js';

// Some iPad WebKit versions can draw a 2D OffscreenCanvas but cannot run the
// MediaPipe graph in a worker. Reuse the same detector on a regular DOM canvas.
export async function createMainThreadFaceFlow({assetsUrl, width, height}) {
  const files = await FilesetResolver.forVisionTasks(`${assetsUrl}wasm`, true);
  const detector = await FaceDetector.createFromOptions(files, {
    canvas:document.createElement('canvas'),
    baseOptions:{modelAssetPath:`${assetsUrl}face-detector.tflite`,delegate:'CPU'},
    runningMode:'VIDEO',minDetectionConfidence:.55,
  });
  const canvas = document.createElement('canvas');canvas.width=width;canvas.height=height;
  const processFrame=createFaceFlowProcessor(detector,canvas);
  let closed=false;
  return {
    onmessage:null,
    postMessage(data) {
      if (closed || data.type!=='frame') {data.bitmap?.close?.();return;}
      try {this.onmessage?.({data:{type:'flow',faces:processFrame(data.bitmap,data.timestamp)}});}
      catch(error) {data.bitmap.close?.();this.onmessage?.({data:{type:'error',message:error.message}});}
    },
    terminate() {if(!closed){closed=true;detector.close();}},
  };
}
