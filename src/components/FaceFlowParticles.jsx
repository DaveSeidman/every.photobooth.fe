import { captureRegion, defaultFraming } from "../lib/cameraFraming.js";
import { createFacePresence } from "../lib/facePresence.js";
import { logEvent } from "../lib/logger.js";
import { timers } from "../lib/timers.js";
import { useLoggedState } from "../hooks/useLoggedState.js";
import { useEffect, useRef } from "react";

const ANALYSIS_WIDTH = 160;
const ANALYSIS_HEIGHT = 160;
const MAX_PARTICLES = 240;
const COLORS = ["238,247,255", "238,247,255", "130,212,255", "74,174,255"];

export default function FaceFlowParticles({ videoRef, active, ready, showParticles = true, onPresenceChange, framing = defaultFraming }) {
  const canvasRef = useRef(null);
  const framingRef = useRef(framing);
  framingRef.current = framing;
  const [reducedMotion, setReducedMotion] = useLoggedState("FaceFlowParticles.reducedMotion", () => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const enabled = active && ready;
  const presenceCallback = useRef(onPresenceChange);
  presenceCallback.current = onPresenceChange;

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
      const timeout = timers.setTimeout(() => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        canvas.dataset.effectState = "inactive";
        canvas.dataset.particleCount = "0";
      }, 900);
      return () => timers.clearTimeout(timeout);
    }
    const analysis = document.createElement("canvas");
    analysis.width = ANALYSIS_WIDTH; analysis.height = ANALYSIS_HEIGHT;
    const analysisContext = analysis.getContext("2d");
    if (!analysisContext) return undefined;
    let worker, fallbackStarted=false, initTimeout;
    let stopped = false, workerReady = false, busy = false;
    const init = {type:"init", width:ANALYSIS_WIDTH, height:ANALYSIS_HEIGHT,
      assetsUrl:new URL(`${import.meta.env.BASE_URL}vision/`, window.location.href).href};
    let faces = [], particles = [], credit = 0;
    let present = false;
    const updatePresence = createFacePresence();
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

    const fail = (message) => {
      logEvent("face-flow.failed", {message}, "error");
      faces=[];busy=false;workerReady=false;
      canvas.dataset.effectState="unavailable";canvas.dataset.effectError=message;
      worker?.terminate();
    };
    const receive = ({data}) => {
      if(stopped)return;
      if(data.type==="ready") {
        timers.clearTimeout(initTimeout);
        logEvent("face-flow.ready", {engine:fallbackStarted?"main-thread":"worker"});
        workerReady=true;canvas.dataset.effectState="tracking";
      }
      if(data.type==="flow") {faces=data.faces;busy=false;lastFaceTime=performance.now();canvas.dataset.faceCount=String(faces.length);}
      if(data.type==="error") { if(!fallbackStarted)void startFallback(data.message);else fail(data.message); }
    };
    const startFallback = async (reason) => {
      if(stopped || fallbackStarted)return;
      fallbackStarted=true;timers.clearTimeout(initTimeout);worker?.terminate();
      workerReady=false;busy=false;faces=[];
      canvas.dataset.effectState="loading";
      logEvent("face-flow.fallback", {reason}, "warn");
      try {
        const {createMainThreadFaceFlow}=await import("../lib/mainThreadFaceFlow.js");
        if(stopped)return;
        const engine=await createMainThreadFaceFlow(init);
        if(stopped){engine.terminate();return;}
        worker=engine;worker.onmessage=receive;receive({data:{type:"ready"}});
      }catch(error){if(!stopped)fail(error.message);}
    };
    try {
      if(!window.Worker || !window.OffscreenCanvas || !window.createImageBitmap)throw new Error("Worker canvas unavailable");
      worker=new Worker(new URL("../workers/faceFlow.worker.js", import.meta.url),{type:"module"});
      worker.onmessage=receive;
      worker.onerror=event=>{event.preventDefault();void startFallback(event.message || "Worker failed");};
      worker.postMessage(init);
      initTimeout=timers.setTimeout(()=>void startFallback("Worker startup timed out"),12000);
    }catch(error){void startFallback(error.message);}

    const analyze = async (video, timestamp) => {
      busy = true;
      try {
        // Match object-fit: cover and the mirrored video exactly, including its crop.
        const region = captureRegion(video.videoWidth, video.videoHeight, framingRef.current);
        analysisContext.save();
        analysisContext.setTransform(-1, 0, 0, 1, ANALYSIS_WIDTH, 0);
        analysisContext.drawImage(video, region.x, region.y, region.size, region.size, 0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT);
        analysisContext.restore();
        const bitmap = fallbackStarted ? analysis : await createImageBitmap(analysis);
        if (stopped) { bitmap.close?.(); return; }
        worker.postMessage({ type: "frame", bitmap, timestamp }, fallbackStarted ? [] : [bitmap]);
      } catch(error) { busy=false;logEvent("face-flow.frame-failed", {message:error.message}, "warn"); }
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
        age: 0, life, radius: .00195 + Math.random() * .00195,
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
        && time - lastAnalysis >= (fallbackStarted ? 200 : 80) && video.currentTime !== lastVideoTime) {
        lastAnalysis = time; lastVideoTime = video.currentTime;
        analyze(video, time);
      }
      if (time - lastFaceTime > 550) faces = [];
      const nextPresence = updatePresence(faces.length > 0, time);
      if (nextPresence !== present) { present = nextPresence; presenceCallback.current?.(present); }
      const motion = faces.reduce((sum, face) => sum + Math.min(.4, Math.hypot(face.flowX, face.flowY)), 0);
      credit = Math.min(6, credit + dt * (faces.length * 32 + motion * 75));
      while (showParticles && !reducedMotion && faces.length && credit >= 1 && particles.length < MAX_PARTICLES) {
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
        context.lineWidth = height * .00126;
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
      stopped = true; cancelAnimationFrame(raf); observer.disconnect(); timers.clearTimeout(initTimeout); worker?.terminate();
      presenceCallback.current?.(false);
      canvas.dataset.faceCount = "0";
    };
  }, [enabled, videoRef, showParticles, reducedMotion]);

  return <canvas ref={canvasRef} className={`face-flow ${enabled ? "face-flow--active" : ""}`} aria-hidden="true" />;
}
