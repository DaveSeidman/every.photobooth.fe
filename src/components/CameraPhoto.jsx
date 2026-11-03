import { logEvent } from "../lib/logger.js";
import StampFrame from "./StampFrame.jsx";
import { useEffect, useLayoutEffect, useRef } from "react";

const depths = { back: 0, normal: 1, closeup: 2 };

// Keep the mat and camera registered while the whole photo moves in depth.
export default function CameraPhoto({ depth = "normal", visible = true, developing = false, caption, actions, actionsRef, wobble = false, children }) {
  const photoRef = useRef(null);
  const motionRef = useRef(null);
  const layoutRef = useRef(null);
  const scaleRef = useRef(null);
  useLayoutEffect(() => {
    const layout = layoutRef.current;
    const update = () => scaleRef.current?.style.setProperty("--photo-scale", String(layout.getBoundingClientRect().width / 600));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(layout);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!wobble || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const node = motionRef.current;
    const phases = Array.from({length:6},()=>Math.random()*Math.PI*2);
    const started = performance.now();
    let frame, lastPaint = 0;
    node.style.transition = "none";
    const paint = (now) => {
      if(now-lastPaint>=1000/30) {
        lastPaint=now;
        const t=(now-started)/1000;
        const blend=Math.min(1,t);
        const z=(Math.sin(t*.6+phases[0])*5+Math.sin(t*1.13+phases[1])*2)*blend;
        const rx=(Math.sin(t*.37+phases[2])*.65+Math.sin(t*.89+phases[4])*.15)*blend;
        const ry=(Math.sin(t*.43+phases[3])*.8+Math.sin(t*1.07+phases[5])*.18)*blend;
        const rz=Math.sin(t*.31+phases[4])*.22*blend;
        node.style.transform=`perspective(1200px) translateZ(${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`;
      }
      frame=requestAnimationFrame(paint);
    };
    logEvent("polaroid.wobble-started");
    frame=requestAnimationFrame(paint);
    return ()=>{
      cancelAnimationFrame(frame);
      node.style.transition="transform 900ms ease-out";
      node.style.transform="perspective(1200px) translateZ(0) rotateX(0deg) rotateY(0deg) rotateZ(0deg)";
      logEvent("polaroid.wobble-settling");
    };
  },[wobble]);
  const previousDepth = useRef(depth);
  useEffect(() => {
    const previous = previousDepth.current;
    previousDepth.current = depth;
    if (previous === depth || !visible || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const direction = Math.sign(depths[depth] - depths[previous]);
    const transform = (tilt, z) => `perspective(1200px) translateZ(${z}px) rotateX(${tilt * direction}deg) rotateY(${-tilt * direction * .6}deg)`;
    const animation = photoRef.current?.animate([
      { transform: transform(0, 0), offset: 0 },
      { transform: transform(2.5, -8), offset: .16 },
      { transform: transform(-1.5, 18), offset: .65 },
      { transform: transform(.5, -3), offset: .86 },
      { transform: transform(0, 0), offset: 1 },
    ], { duration: developing ? 1600 : 1000, easing: "ease-in-out" });
    return () => animation?.cancel();
  }, [depth, visible]);
  return <div ref={layoutRef} data-depth={depth} data-developing={developing || undefined} className={`camera-photo ${visible ? "" : "camera-photo--muted"}`}><div ref={scaleRef} className="camera-photo__scale"><div ref={motionRef} className="camera-photo__motion"><div ref={photoRef} className="camera-photo__object"><StampFrame />{children}<span className="camera-photo__sheen" aria-hidden="true" />{caption && <p className="camera-photo__caption">{caption}</p>}<div ref={actionsRef} className="camera-photo__actions">{actions}</div></div></div></div></div>;
}
