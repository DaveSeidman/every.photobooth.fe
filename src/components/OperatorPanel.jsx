import { useEffect, useState } from 'react';
import { createOperatorGesture, refreshUrl } from '../lib/operatorGesture.js';
import { logEvent } from '../lib/logger.js';

export default function OperatorPanel() {
  const [open,setOpen]=useState(false);
  useEffect(()=>{
    const gesture=createOperatorGesture({
      viewport:()=>({width:window.innerWidth}),
      trigger:()=>{logEvent('operator.panel-opened',{method:'two-corner-hold'});setOpen(true);},
    });
    const touch=event=>{
      if(!document.querySelector('.booth') || window.location.hash.startsWith('#/takeaway/')) {gesture.update([],true);return;}
      if(gesture.update(event.touches,event.type==='touchcancel') && event.cancelable)event.preventDefault();
    };
    for(const type of ['touchstart','touchmove','touchend','touchcancel'])document.addEventListener(type,touch,{capture:true,passive:false});
    const hide=()=>{if(document.hidden)gesture.update([],true);};
    document.addEventListener('visibilitychange',hide);
    return ()=>{gesture.dispose();document.removeEventListener('visibilitychange',hide);for(const type of ['touchstart','touchmove','touchend','touchcancel'])document.removeEventListener(type,touch,true);};
  },[]);
  const close=()=>{logEvent('operator.panel-closed');setOpen(false);};
  useEffect(()=>{
    if(!open)return;
    const escape=event=>{if(event.key==='Escape'){logEvent('operator.panel-closed');setOpen(false);}};
    window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);
  },[open]);
  if(!open)return null;
  return <div className="operator-panel">
    <section role="dialog" aria-modal="true" aria-labelledby="operator-title">
      <h2 id="operator-title">Booth controls</h2>
      <p>Reload the latest app and return to the start screen. The current session will end.</p>
      <button type="button" autoFocus onClick={()=>{logEvent('operator.refresh-requested');window.location.replace(refreshUrl(window.location.href));}}>Reload Latest Version</button>
      <button type="button" onClick={close}>Cancel</button>
    </section>
  </div>;
}
