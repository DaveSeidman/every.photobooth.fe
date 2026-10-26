import { useEffect, useRef, useState } from "react";

function progressCopy(progress) {
  if (progress < 28) return "Preparing the portrait";
  if (progress < 58) return "Holding faces and expressions";
  if (progress < 84) return "Building the editorial world";
  if (progress < 100) return "Finishing the details";
  return "Portrait complete";
}

const GRID_W = 76;
const GRID_H = 76;
const DRIFT_MS = 2000;
const COLOR_MS = 2000;
const DOCK_STAGGER_MS = 700;
const DOCK_DURATION_MS = 1000;
const FINISH_MS = COLOR_MS + DOCK_STAGGER_MS + DOCK_DURATION_MS;
const GRAVITY = 2400;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smooth = (value) => value * value * (3 - 2 * value);

function readPixels(image, width, height) {
  const sample = document.createElement("canvas");
  sample.width = width;
  sample.height = height;
  const ctx = sample.getContext("2d", { willReadFrequently: true });
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  return ctx.getImageData(0, 0, width, height).data;
}

function loadPixels(src, width, height) {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try { resolve(readPixels(image, width, height)); } catch { resolve(null); }
    };
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function PixelStorm({ source, result, active, onComplete }) {
  const backRef = useRef(null);
  const frontRef = useRef(null);
  const pixelsRef = useRef({ source: null, result: null, resultReadyAt: null });
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const particlesRef = useRef(null);
  if (!particlesRef.current) {
    particlesRef.current = Array.from({ length: GRID_W * GRID_H }, () => ({
      phase: Math.random() * Math.PI * 2,
      phase2: Math.random() * Math.PI * 2,
      noiseX: Math.random() * Math.PI * 2,
      noiseY: Math.random() * Math.PI * 2,
      noiseRate: 0.45 + Math.random() * 2.4,
      noiseRate2: 0.35 + Math.random() * 1.8,
      noiseAmount: 0.2 + Math.random() * 0.8,
      colorDelay: Math.random() * 500,
      dockDelay: Math.random() * DOCK_STAGGER_MS,
      size: 0.8 + Math.random() * 0.55,
    }));
  }

  useEffect(() => {
    let live = true;
    loadPixels(source, GRID_W, GRID_H).then((before) => {
      if (live) pixelsRef.current.source = before;
    });
    return () => { live = false; };
  }, [source]);

  useEffect(() => {
    let live = true;
    pixelsRef.current.result = null;
    pixelsRef.current.resultReadyAt = null;
    if (!result) return () => { live = false; };
    loadPixels(result, GRID_W, GRID_H).then((after) => {
      if (!live) return;
      pixelsRef.current.result = after;
      pixelsRef.current.resultReadyAt = performance.now();
    });
    return () => { live = false; };
  }, [result]);

  useEffect(() => {
    if (!active) return undefined;
    const startedAt = performance.now();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvases = [backRef.current, frontRef.current];
    const count = GRID_W * GRID_H;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const initialFieldWidth = Math.ceil(GRID_W / 8) + 1;
    const initialFieldHeight = Math.ceil(GRID_H / 8) + 1;
    const velocityField = Array.from({ length: initialFieldWidth * initialFieldHeight }, () => Math.random() * 2 - 1);
    const spinDirection = Math.random() < 0.5 ? -1 : 1;
    const sampleVelocityField = (x, y) => {
      const fx = x / 8; const fy = y / 8;
      const x0 = Math.min(initialFieldWidth - 1, Math.floor(fx));
      const y0 = Math.min(initialFieldHeight - 1, Math.floor(fy));
      const x1 = Math.min(initialFieldWidth - 1, x0 + 1);
      const y1 = Math.min(initialFieldHeight - 1, y0 + 1);
      const tx = fx - x0; const ty = fy - y0;
      const a = velocityField[y0 * initialFieldWidth + x0] * (1 - tx) + velocityField[y0 * initialFieldWidth + x1] * tx;
      const b = velocityField[y1 * initialFieldWidth + x0] * (1 - tx) + velocityField[y1 * initialFieldWidth + x1] * tx;
      return a * (1 - ty) + b * ty;
    };
    for (let i = 0; i < count; i += 1) {
      const p = i * 3;
      const x = i % GRID_W + 0.5; const y = Math.floor(i / GRID_W) + 0.5;
      const dx = x - GRID_W / 2; const dy = y - GRID_H / 2;
      const radial = Math.max(1, Math.hypot(dx, dy));
      const inwardX = -dx / radial; const inwardY = -dy / radial;
      const coherence = sampleVelocityField(x, y);
      const turn = coherence * 0.12 + (Math.random() - 0.5) * 0.07;
      const inwardTurnX = inwardX * Math.cos(turn) - inwardY * Math.sin(turn);
      const inwardTurnY = inwardX * Math.sin(turn) + inwardY * Math.cos(turn);
      const orbitalSpeed = Math.sqrt(GRAVITY / Math.max(9, radial));
      const radialSpeed = orbitalSpeed * (0.72 + (Math.random() - 0.5) * 0.08);
      const tangentSpeed = orbitalSpeed * (0.58 + coherence * 0.06 + (Math.random() - 0.5) * 0.03);
      positions[p] = x; positions[p + 1] = y; positions[p + 2] = (Math.random() - 0.5) * 0.8;
      velocities[p] = inwardTurnX * radialSpeed - inwardTurnY * tangentSpeed * spinDirection;
      velocities[p + 1] = inwardTurnY * radialSpeed + inwardTurnX * tangentSpeed * spinDirection;
      velocities[p + 2] = coherence * orbitalSpeed * 0.95 + (Math.random() - 0.5) * orbitalSpeed * 0.25;
    }
    let frame;
    let disposed = false;
    let completed = false;
    let lastPaint = 0;
    const sizeCanvases = () => canvases.forEach((canvas) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    });

    const paint = (now) => {
      if (disposed) return;
      if (!reduceMotion && now - lastPaint < 1000 / 30) {
        frame = requestAnimationFrame(paint);
        return;
      }
      const delta = lastPaint ? Math.min(0.05, Math.max(0.012, (now - lastPaint) / 1000)) : 1 / 30;
      lastPaint = now;
      sizeCanvases();
      const { source: before, result: after, resultReadyAt } = pixelsRef.current;
      const elapsed = now - startedAt;
      const afterReady = resultReadyAt === null ? null : now - resultReadyAt;
      const colorElapsed = afterReady === null ? 0 : afterReady;
      const width = canvases[0]?.width || 1;
      const height = canvases[0]?.height || 1;
      const cellW = width / GRID_W;
      const cellH = height / GRID_H;
      const ctxs = canvases.map((canvas) => canvas?.getContext("2d"));
      ctxs.forEach((ctx) => ctx?.clearRect(0, 0, width, height));
      const time = elapsed / 1000;
      const launch = smooth(clamp01(elapsed / DRIFT_MS));
      const mu = GRAVITY;
      for (let i = 0; i < count; i += 1) {
        const p = i * 3;
        const particle = particlesRef.current[i];
        const dock = afterReady === null ? 0 : reduceMotion ? 1 : smooth(clamp01((afterReady - COLOR_MS - particle.dockDelay) / DOCK_DURATION_MS));
        if (dock >= 0.999) {
          positions[p] = i % GRID_W + 0.5;
          positions[p + 1] = Math.floor(i / GRID_W) + 0.5;
          positions[p + 2] = 0;
          velocities[p] = 0; velocities[p + 1] = 0; velocities[p + 2] = 0;
          continue;
        }
        const rx = positions[p] - GRID_W / 2;
        const ry = positions[p + 1] - GRID_H / 2;
        const rz = positions[p + 2];
        const distanceSq = rx * rx + ry * ry + rz * rz + 16;
        const gravity = mu / (distanceSq * Math.sqrt(distanceSq)) * launch * (1 - dock);
        const phase = time * particle.noiseRate + particle.phase;
        let ax = -rx * gravity + Math.sin(phase) * particle.noiseAmount * launch;
        let ay = -ry * gravity + Math.cos(phase * 0.83 + particle.phase2) * particle.noiseAmount * launch;
        let az = -rz * gravity + Math.sin(phase * 0.57 + particle.noiseY) * particle.noiseAmount * launch;
        if (dock > 0) {
          const tx = i % GRID_W + 0.5; const ty = Math.floor(i / GRID_W) + 0.5;
          const dockForce = dock * 10;
          ax += ((tx - positions[p]) * 6 - velocities[p] * 4) * dockForce;
          ay += ((ty - positions[p + 1]) * 6 - velocities[p + 1] * 4) * dockForce;
          az += ((-positions[p + 2]) * 6 - velocities[p + 2] * 4) * dockForce;
        }
        velocities[p] += ax * delta * launch;
        velocities[p + 1] += ay * delta * launch;
        velocities[p + 2] += az * delta * launch;
        const speed = Math.hypot(velocities[p], velocities[p + 1], velocities[p + 2]);
        if (speed > 105) {
          const scale = 105 / speed;
          velocities[p] *= scale; velocities[p + 1] *= scale; velocities[p + 2] *= scale;
        }
        positions[p] += velocities[p] * delta * launch;
        positions[p + 1] += velocities[p + 1] * delta * launch;
        positions[p + 2] += velocities[p + 2] * delta * launch;
      }

      const cameraDistance = 75;
      for (let i = 0; i < count; i += 1) {
        const offset = i * 4;
        const colorFrom = before && before[offset + 3] ? before : after;
        const colorTo = after && after[offset + 3] ? after : colorFrom;
        if (!colorFrom || !colorTo) continue;
        const particle = particlesRef.current[i];
        const p = i * 3;
        const x = i % GRID_W + 0.5; const y = Math.floor(i / GRID_W) + 0.5;
        const dock = afterReady === null ? 0 : reduceMotion ? 1 : smooth(clamp01((afterReady - COLOR_MS - particle.dockDelay) / DOCK_DURATION_MS));
        const drawX = positions[p] * (1 - dock) + x * dock;
        const drawY = positions[p + 1] * (1 - dock) + y * dock;
        const z = positions[p + 2] * (1 - dock);
        const perspective = cameraDistance / Math.max(28, cameraDistance - z);
        const screenX = GRID_W / 2 + (drawX - GRID_W / 2) * perspective;
        const screenY = GRID_H / 2 + (drawY - GRID_H / 2) * perspective - z * 0.3;
        const colorMix = reduceMotion ? 1 : smooth(clamp01((colorElapsed - particle.colorDelay) / (COLOR_MS - 500)));
        const ctx = ctxs[z > 0 ? 1 : 0];
        if (!ctx) continue;
        const shade = z > 0 ? 1 + Math.min(0.16, z / 240) : 0.8 + Math.max(-0.12, z / 320);
        const particleW = cellW * particle.size * perspective;
        const particleH = cellH * particle.size * perspective;
        const sourceR = colorFrom[offset]; const sourceG = colorFrom[offset + 1]; const sourceB = colorFrom[offset + 2];
        const targetR = colorTo[offset]; const targetG = colorTo[offset + 1]; const targetB = colorTo[offset + 2];
        ctx.fillStyle = `rgb(${Math.round((sourceR + (targetR - sourceR) * colorMix) * shade)} ${Math.round((sourceG + (targetG - sourceG) * colorMix) * shade)} ${Math.round((sourceB + (targetB - sourceB) * colorMix) * shade)})`;
        ctx.globalAlpha = 0.65 + dock * 0.35;
        ctx.fillRect(screenX * cellW - particleW / 2, screenY * cellH - particleH / 2, particleW, particleH);
      }
      ctxs.forEach((ctx) => { if (ctx) ctx.globalAlpha = 1; });
      if (afterReady !== null && (reduceMotion || afterReady >= FINISH_MS)) {
        if (!completed) {
          completed = true;
          onCompleteRef.current?.();
        }
        return;
      }
      frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);
    return () => { disposed = true; cancelAnimationFrame(frame); };
  }, [active]);

  return (
    <>
      <canvas className="processing__pixels processing__pixels--back" ref={backRef} aria-hidden="true" />
      <canvas className="processing__pixels processing__pixels--front" ref={frontRef} aria-hidden="true" />
    </>
  );
}

export default function Processing({ progress, result, source, style, onComplete }) {
  const [stormComplete, setStormComplete] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  useEffect(() => {
    if (!stormComplete) return undefined;
    const timer = window.setTimeout(() => onCompleteRef.current?.(), 900);
    return () => window.clearTimeout(timer);
  }, [stormComplete]);

  return (
    <section className="processing" aria-live="polite">
      <div className="processing__copy">
        <div className="processing__art" aria-label="Your portrait pixels orbit the spinning stone and gather into their new form">
          <PixelStorm source={source} result={result?.styled} active onComplete={() => setStormComplete(true)} />
          <video
            className={`processing__spinner ${stormComplete ? "is-leaving" : ""}`}
            src={`${import.meta.env.BASE_URL}thesis/stone.${safari ? "mov" : "webm"}`}
            autoPlay loop muted playsInline aria-hidden="true"
          />
          {result && <img className={`processing__result ${stormComplete ? "is-visible" : ""}`} src={result.styled} alt="Your finished portrait" />}
        </div>
        <p className="eyebrow">Every / {style?.label || "Editorial transformation"}</p>
        <h1>Becoming <em>something else</em></h1>
        <div className="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
          <div className="progress__track"><span style={{ width: `${progress}%` }} /></div>
          <div className="progress__meta"><span>{progressCopy(progress)}</span><strong>{progress}%</strong></div>
        </div>
        <p className="stamp-caption">{style?.label || "Every portrait"}</p>
      </div>
    </section>
  );
}
