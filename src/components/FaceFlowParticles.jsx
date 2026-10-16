import { useEffect, useRef, useState } from "react";

const ANALYSIS_WIDTH = 160;
const ANALYSIS_HEIGHT = 256;
const MAX_PARTICLES = 240;
const COLORS = ["238,247,255", "238,247,255", "130,212,255", "74,174,255"];

export default function FaceFlowParticles({ videoRef, active, ready }) {
  const canvasRef = useRef(null);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const enabled = active && ready && !reducedMotion;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReducedMotion(preference.matches);
    preference.addEventListener("change", change);
    return () => preference.removeEventListener("change", change);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context) return undefined;
    if (!enabled) {
      canvas.dataset.effectState = "fading";
      const timeout = window.setTimeout(() => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        canvas.dataset.effectState = "inactive";
        canvas.dataset.particleCount = "0";
      }, 900);
      return () => window.clearTimeout(timeout);
    }
    if (!window.Worker || !window.OffscreenCanvas || !window.createImageBitmap) {
      canvas.dataset.effectState = "unavailable";
      return undefined;
    }

    const analysis = document.createElement("canvas");
    analysis.width = ANALYSIS_WIDTH; analysis.height = ANALYSIS_HEIGHT;
    const analysisContext = analysis.getContext("2d");
    if (!analysisContext) return undefined;
    let worker;
    try { worker = new Worker(new URL("../workers/faceFlow.worker.js", import.meta.url), { type: "module" }); }
    catch { canvas.dataset.effectState = "unavailable"; return undefined; }
    let stopped = false, workerReady = false, busy = false;
    let faces = [], particles = [], credit = 0;
    let width = 0, height = 0, raf = 0, lastTime = 0;
    let lastAnalysis = -Infinity, lastVideoTime = -1, lastFaceTime = 0, lastDiagnostics = 0, lastPaint = -Infinity;
    canvas.dataset.effectState = "loading";
    delete canvas.dataset.effectError;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width; height = bounds.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas); resize();

    worker.onmessage = ({ data }) => {
      if (stopped) return;
      if (data.type === "ready") { workerReady = true; canvas.dataset.effectState = "tracking"; }
      if (data.type === "flow") {
        faces = data.faces; busy = false; lastFaceTime = performance.now();
        canvas.dataset.faceCount = String(faces.length);
      }
      if (data.type === "error") {
        faces = []; busy = false; workerReady = false;
        canvas.dataset.effectState = "unavailable";
        canvas.dataset.effectError = data.message;
        worker.terminate();
      }
    };
    worker.onerror = () => {
      faces = []; busy = false; workerReady = false;
      canvas.dataset.effectState = "unavailable";
      worker.terminate();
    };
    worker.postMessage({
      type: "init", width: ANALYSIS_WIDTH, height: ANALYSIS_HEIGHT,
      assetsUrl: new URL(`${import.meta.env.BASE_URL}vision/`, window.location.href).href,
    });

    const analyze = async (video, timestamp) => {
      busy = true;
      try {
        // Match object-fit: cover and the mirrored video exactly, including its crop.
        const scale = Math.max(ANALYSIS_WIDTH / video.videoWidth, ANALYSIS_HEIGHT / video.videoHeight);
        const cropWidth = ANALYSIS_WIDTH / scale, cropHeight = ANALYSIS_HEIGHT / scale;
        analysisContext.save();
        analysisContext.setTransform(-1, 0, 0, 1, ANALYSIS_WIDTH, 0);
        analysisContext.drawImage(video, (video.videoWidth - cropWidth) / 2, (video.videoHeight - cropHeight) / 2,
          cropWidth, cropHeight, 0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT);
        analysisContext.restore();
        const bitmap = await createImageBitmap(analysis);
        if (stopped) { bitmap.close(); return; }
        worker.postMessage({ type: "frame", bitmap, timestamp }, [bitmap]);
      } catch { busy = false; }
    };

    const emit = (face) => {
      const angle = Math.random() * Math.PI * 2;
      const nx = Math.cos(angle), ny = Math.sin(angle);
      const speed = .025 + Math.random() * .035;
      const life = 1.1 + Math.random() * 1.5;
      particles.push({
        x: face.x + face.width * (.5 + nx * .47),
        y: face.y + face.height * (.5 + ny * .47),
        vx: nx * speed + face.flowX * .65,
        vy: ny * speed * .6 - .022 + face.flowY * .65,
        age: 0, life, radius: .00065 + Math.random() * .00065,
        seed: Math.random() * 20, color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    };

    const render = (time) => {
      if (stopped) return;
      if (time - lastPaint < 1000 / 30) { raf = requestAnimationFrame(render); return; }
      lastPaint = time;
      const dt = Math.min(.05, Math.max(0, (time - (lastTime || time)) / 1000));
      lastTime = time;
      const video = videoRef.current;
      if (!document.hidden && workerReady && !busy && video?.readyState >= 2 && video.videoWidth
        && time - lastAnalysis >= 80 && video.currentTime !== lastVideoTime) {
        lastAnalysis = time; lastVideoTime = video.currentTime;
        analyze(video, time);
      }
      if (time - lastFaceTime > 550) faces = [];
      const motion = faces.reduce((sum, face) => sum + Math.min(.4, Math.hypot(face.flowX, face.flowY)), 0);
      credit = Math.min(6, credit + dt * (faces.length * 32 + motion * 75));
      while (faces.length && credit >= 1 && particles.length < MAX_PARTICLES) {
        emit(faces[Math.floor(Math.random() * faces.length)]); credit--;
      }
      context.clearRect(0, 0, width, height);
      context.lineCap = "round";
      for (const particle of particles) {
        const oldX = particle.x, oldY = particle.y;
        particle.age += dt;
        particle.vx += Math.sin(time * .00055 + particle.seed + particle.y * 9) * .006 * dt;
        particle.vy -= .006 * dt;
        particle.x += particle.vx * dt; particle.y += particle.vy * dt;
        const alpha = Math.max(0, Math.sin(Math.PI * particle.age / particle.life)) * .7;
        context.strokeStyle = `rgba(${particle.color},${alpha * .45})`;
        context.lineWidth = height * .00042;
        context.beginPath();
        context.moveTo((oldX - particle.vx * .035) * width, (oldY - particle.vy * .035) * height);
        context.lineTo(particle.x * width, particle.y * height);
        context.stroke();
        context.fillStyle = `rgba(${particle.color},${alpha})`;
        context.beginPath(); context.arc(particle.x * width, particle.y * height, particle.radius * height, 0, Math.PI * 2); context.fill();
      }
      particles = particles.filter((p) => p.age < p.life && p.x > -.1 && p.x < 1.1 && p.y > -.1 && p.y < 1.1);
      if (time - lastDiagnostics > 250) { canvas.dataset.particleCount = String(particles.length); lastDiagnostics = time; }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => {
      stopped = true; cancelAnimationFrame(raf); observer.disconnect(); worker.terminate();
      canvas.dataset.faceCount = "0";
    };
  }, [enabled, videoRef]);

  return <canvas ref={canvasRef} className={`face-flow ${enabled ? "face-flow--active" : ""}`} aria-hidden="true" />;
}
