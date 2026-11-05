const waitingPhases=new Set(['camera','review','styles','error']);

// This clock only owns waiting-for-input screens. Results owns its separate
// countdown, and capture/generation must never be interrupted by inactivity.
export function createBoothInactivity({onTimeout,delayMs=30000,now=Date.now,schedule=setTimeout,cancel=clearTimeout,paused=()=>false,log=()=>{}}) {
  let phase,handle,deadline=0,version=0,lastActivityLog=-Infinity;
  const clear=()=>{if(handle!==undefined)cancel(handle);handle=undefined;version++;};
  const arm=()=>{
    const current=version;
    const check=()=>{
      if(current!==version || !waitingPhases.has(phase))return;
      handle=undefined;
      if(paused()){deadline=now()+delayMs;handle=schedule(check,delayMs);return;}
      const remaining=deadline-now();
      if(remaining>0){handle=schedule(check,remaining);return;}
      log('flow.inactivity-expired',{phase,delayMs});
      clear();onTimeout();
    };
    handle=schedule(check,Math.max(0,deadline-now()));
  };
  return {
    setPhase(next) {
      if(next===phase)return;
      clear();phase=next;
      if(waitingPhases.has(phase)){deadline=now()+delayMs;log('flow.inactivity-started',{phase,delayMs});arm();}
    },
    activity() {
      if(!waitingPhases.has(phase))return;
      deadline=now()+delayMs;
      if(now()-lastActivityLog>=1000){lastActivityLog=now();log('flow.inactivity-refreshed',{phase,delayMs});}
    },
    dispose(){clear();phase=undefined;},
  };
}
