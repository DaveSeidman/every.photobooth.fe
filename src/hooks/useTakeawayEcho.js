import { useEffect, useRef } from "react";
import { useLoggedState } from "./useLoggedState.js";
import { timers } from "../lib/timers.js";

export function useTakeawayEcho(interaction, cardRef, onActivity, enabled = true) {
  const [feedback, setFeedback] = useLoggedState("Results.phoneFeedback", "");
  const animation = useRef(null);
  const restoreTimer = useRef(null);
  const activity = useRef(onActivity);
  activity.current = onActivity;
  useEffect(() => () => { animation.current?.cancel(); timers.clearTimeout(restoreTimer.current); }, []);
  useEffect(() => {
    if (enabled) return;
    animation.current?.cancel(); timers.clearTimeout(restoreTimer.current);
    if(cardRef.current) {
      cardRef.current.style.transform="";cardRef.current.style.transformOrigin="";
      delete cardRef.current.dataset.remotePull;
    }
  },[enabled,cardRef]);
  useEffect(() => {
    if (!enabled || !interaction || !cardRef.current) return;
    const card = cardRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const restore = () => {
      const current = getComputedStyle(card);
      const from = { transform:current.transform, opacity:current.opacity };
      animation.current?.cancel();
      card.style.transform="";
      animation.current=card.animate([from,{transform:"translate3d(0,0,0) rotate(0deg)",opacity:1}],{duration:reduced?1:500,easing:"cubic-bezier(.16,1,.3,1)"});
      animation.current.finished.then(()=>{card.style.transformOrigin="";delete card.dataset.remotePull;}).catch(()=>{});
    };
    const scheduleRestore = (delay) => { timers.clearTimeout(restoreTimer.current); restoreTimer.current=timers.setTimeout(restore,delay); };
    const {action}=interaction;
    if (action!=="pull") activity.current?.();
    if (action==="grab" || action==="pull") {
      timers.clearTimeout(restoreTimer.current); animation.current?.cancel();
      card.dataset.remotePull="true";
      card.style.transformOrigin=`${interaction.origin}% 0%`;
      const width=card.offsetWidth || 600;
      card.style.transform=`translate3d(${interaction.x*width}px,${interaction.y*width}px,0) rotate(${interaction.angle}deg)`;
      setFeedback("Someone is taking their portrait home…");
      scheduleRestore(8000);
    } else if(action==="cancel") {
      scheduleRestore(0);setFeedback("");
    } else if(action==="detach") {
      card.dataset.remotePull="true";
      const width=card.offsetWidth || 600;
      const direction=interaction.origin===100?-1:1;
      const x=interaction.x*width,y=interaction.y*width;
      animation.current?.cancel();
      card.style.transformOrigin=`${interaction.origin}% 0%`;
      animation.current=card.animate([
        {transform:card.style.transform || "translate3d(0,0,0) rotate(0deg)",opacity:1},
        {transform:`translate3d(${x+direction*24}px,${y+190}px,0) rotate(${interaction.angle+direction*28}deg)`,opacity:0},
      ],{duration:reduced?1:interaction.method==="pull"?300:480,easing:"ease-in",fill:"forwards"});
      scheduleRestore(1600);
    } else {
      const messages={"share-start":"Sharing from your phone…","share-complete":"Shared from your phone. Enjoy your portrait!","download-started":"Your phone’s download has started.","share-cancelled":"Share cancelled. You can try again on your phone.","share-error":"Try saving again on your phone."};
      if(messages[action])setFeedback(messages[action]);
    }
  },[interaction,cardRef,enabled]);
  return feedback;
}
