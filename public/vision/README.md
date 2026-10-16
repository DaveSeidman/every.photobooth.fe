# Attract-screen vision assets

These assets are served from the booth's own origin. Camera frames stay in a local browser worker; the worker does not upload them.

- `wasm/vision_wasm_module_internal.{js,wasm}`: copied from the pinned `@mediapipe/tasks-vision@1.1.1` npm package. When upgrading that dependency, update this pair together. The effect uses the module/SIMD WASM build on the target tablet; unsupported browsers retain the regular camera UI without particles.
- `face-detector.tflite`: MediaPipe BlazeFace short-range, float16, version 1. Source: https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite
- Integration reference: https://developers.google.com/edge/mediapipe/solutions/vision/face_detector/web_js

Face locations seed particles near face edges. Motion is computed with the app's two-level sparse Lucas–Kanade optical flow, not random cursor motion. Vision runs at 160 × 256 with at most one frame in flight, around 12 fps for flow and 3 fps for detection. Rendering is capped at 30 fps / 240 particles and a 1.5 device-pixel ratio. Tracking/worker/rendering stop when leaving attract; the last particle frame fades over 850 ms and clears after 900 ms. Reduced motion disables the effect. The raw camera capture never includes the overlay.
