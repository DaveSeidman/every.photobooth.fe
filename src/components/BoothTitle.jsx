import { useLayoutEffect, useRef } from "react";
import { useLoggedState } from "../hooks/useLoggedState.js";

const titles = {
  attract: <>Welcome to <em className="thesis-italic">the future</em></>,
  camera: <>Frame <em>the Humans</em></>,
  countdown: <>Hold <em>the pose</em></>,
  review: <>Keep <em>it?</em></>,
  styles: <>Choose your <em>Empire</em></>,
  processing: <>Becoming <em>something else</em></>,
  results: <>You, <em>after automation</em></>,
  error: <>Keep the photo.<em>Try again.</em></>,
};
export default function BoothTitle({ phase, hasPhoto = true }) {
  const requested = phase === 'flash' ? 'countdown' : ['connected','resetting'].includes(phase) ? 'results' : phase === 'error' && !hasPhoto ? 'camera' : phase;
  const [shown, setShown] = useLoggedState('BoothTitle.shown', requested);
  const ref = useRef(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { if(shown!==requested) setShown(requested); return; }
    const outgoing = shown !== requested;
    const animation = node.animate(outgoing ? [
      {opacity:1,filter:'blur(0px)',transform:'translateY(0)'},
      {opacity:0,filter:'blur(6px)',transform:'translateY(-3px)'},
    ] : [
      {opacity:0,filter:'blur(6px)',transform:'translateY(3px)'},
      {opacity:1,filter:'blur(0px)',transform:'translateY(0)'},
    ], {duration:outgoing?110:170,easing:'ease-out',fill:'both'});
    animation.finished.then(()=>{if(outgoing)setShown(requested);}).catch(()=>{});
    return ()=>animation.cancel();
  }, [requested,shown]);
  return <h1 ref={ref} className={`booth-title booth-title--${shown}`} id="booth-title" aria-live="polite">{titles[shown] || titles.camera}</h1>;
}
