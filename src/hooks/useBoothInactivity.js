import { useLayoutEffect, useRef } from 'react';
import { createBoothInactivity } from '../lib/boothInactivity.js';
import { timers } from '../lib/timers.js';
import { logEvent } from '../lib/logger.js';

export function useBoothInactivity(phase,onTimeout,delayMs) {
  const latest=useRef(onTimeout);latest.current=onTimeout;
  const clock=useRef(null);
  useLayoutEffect(()=>{
    const idle=createBoothInactivity({
      onTimeout:()=>latest.current(),delayMs,
      schedule:timers.setTimeout,cancel:timers.clearTimeout,log:logEvent,
      paused:()=>Boolean(document.querySelector('.operator-panel, .developer-controls:not([hidden])')),
    });
    clock.current=idle;
    const activity=event=>{
      if(event.isTrusted===false)return;
      if(event.type==='pointermove' && !event.buttons)return;
      if(event.target?.closest?.('.booth, .operator-panel'))idle.activity();
    };
    const events=['pointerdown','pointerup','pointermove','touchstart','touchend','touchmove','keydown','input'];
    for(const name of events)document.addEventListener(name,activity,{capture:true,passive:true});
    return()=>{idle.dispose();clock.current=null;for(const name of events)document.removeEventListener(name,activity,true);};
  },[delayMs]);
  useLayoutEffect(()=>clock.current?.setPhase(phase),[phase,delayMs]);
}
