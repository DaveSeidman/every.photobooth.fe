import { useEffect, useRef } from "react";
import { useLoggedState } from "./useLoggedState.js";
import { timers } from "../lib/timers.js";
import { createMotionSmoother } from "../lib/remoteMotion.js";

export function useTakeawayEcho(interaction, cardRef, onActivity, enabled = true, subscribe) {
  const [feedback, setFeedback] = useLoggedState("Results.phoneFeedback", "");
  const activity = useRef(onActivity), handler = useRef(null);
  activity.current=onActivity;
  useEffect(() => {
    const card=cardRef.current;
    if(!card)return;
    if(!enabled){card.style.transform="";card.style.transformOrigin="";delete card.dataset.remotePull;return;}
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const smoother=createMotionSmoother();
    const width=card.offsetWidth || 600;
    let frame,watchdog,restoreTimer,animation,dragging=false,lastPacket=0,disposed=false;
    const stopMotion=()=>{
      dragging=false;cancelAnimationFrame(frame);
      if(watchdog!==undefined)timers.clearInterval(watchdog);watchdog=undefined;
    };
    const paint=(now)=>{
      if(!dragging||disposed)return;
      const pose=smoother.sample(now);
      card.style.transform=`translate3d(${(pose.x*width).toFixed(2)}px,${(pose.y*width).toFixed(2)}px,0) rotate(${pose.angle.toFixed(3)}deg)`;
      frame=requestAnimationFrame(paint);
    };
    const restore=()=>{
      stopMotion();
      const current=getComputedStyle(card),from={transform:current.transform,opacity:current.opacity};
      animation?.cancel();card.style.transform="";
      animation=card.animate([from,{transform:"translate3d(0,0,0) rotate(0deg)",opacity:1}],{duration:reduced?1:500,easing:"cubic-bezier(.16,1,.3,1)"});
      animation.finished.then(()=>{if(!disposed){card.style.transformOrigin="";delete card.dataset.remotePull;}}).catch(()=>{});
    };
    const scheduleRestore=(delay)=>{timers.clearTimeout(restoreTimer);restoreTimer=timers.setTimeout(restore,delay);};
    const receive=(event)=>{
      if(disposed)return;
      const {action}=event;
      if(action!=="pull")activity.current?.();
      if(action==="grab"||action==="pull") {
        lastPacket=performance.now();
        if(!dragging){
          timers.clearTimeout(restoreTimer);animation?.cancel();
          card.dataset.remotePull="true";card.style.transformOrigin=`${event.origin}% 0%`;
          smoother.target({x:0,y:0,angle:0},true);
          dragging=true;frame=requestAnimationFrame(paint);
          watchdog=timers.setInterval(()=>{if(performance.now()-lastPacket>8000)restore();},1000);
          setFeedback("Someone is taking their portrait home…");
        }
        smoother.target(event,reduced);
      } else if(action==="cancel") {
        scheduleRestore(0);setFeedback("");
      } else if(action==="detach") {
        stopMotion();card.dataset.remotePull="true";
        const pose=smoother.sample(performance.now());
        const direction=event.origin===100?-1:1;
        animation?.cancel();card.style.transformOrigin=`${event.origin}% 0%`;
        animation=card.animate([
          {transform:card.style.transform||"translate3d(0,0,0) rotate(0deg)",opacity:1},
          {transform:`translate3d(${pose.x*width+direction*24}px,${pose.y*width+190}px,0) rotate(${pose.angle+direction*28}deg)`,opacity:0},
        ],{duration:reduced?1:event.method==="pull"?300:480,easing:"ease-in",fill:"forwards"});
        scheduleRestore(1600);
      } else {
        const messages={"share-start":"Sharing from your phone…","share-complete":"Shared from your phone. Enjoy your portrait!","download-started":"Your phone’s download has started.","share-cancelled":"Share cancelled. You can try again on your phone.","share-error":"Try saving again on your phone."};
        if(messages[action])setFeedback(messages[action]);
      }
    };
    handler.current=receive;
    const unsubscribe=subscribe?.(receive);
    return ()=>{disposed=true;handler.current=null;unsubscribe?.();stopMotion();timers.clearTimeout(restoreTimer);animation?.cancel();};
  },[cardRef,enabled,subscribe]);
  useEffect(()=>{if(!subscribe&&interaction)handler.current?.(interaction);},[interaction,subscribe]);
  return feedback;
}
