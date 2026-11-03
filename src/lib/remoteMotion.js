// Send the newest unsent position; never build a queue of obsolete drag points.
export function createLatestMotionSender({ send, isOpen, bufferedAmount = () => 0, now = () => performance.now(), schedule = setTimeout, cancel = clearTimeout, intervalMs = 1000 / 30, bufferLimit = 1024 }) {
  let latest, timer, lastSent = -Infinity;
  const clear = () => { if(timer!==undefined)cancel(timer);timer=undefined;latest=undefined; };
  const flush = () => {
    timer=undefined;
    if(!latest || !isOpen()){latest=undefined;return;}
    const wait=Math.max(0,intervalMs-(now()-lastSent));
    if(bufferedAmount()>bufferLimit){timer=schedule(flush,intervalMs);return;}
    if(wait>0){timer=schedule(flush,wait);return;}
    const value=latest;latest=undefined;lastSent=now();send(value);
  };
  return {
    send(value) {
      if(!isOpen()){clear();return;}
      if(value.action!=="pull") { clear();if(value.action==="grab")lastSent=-Infinity;send(value);return; }
      latest=value;
      if(timer===undefined)flush();
    }, clear,
  };
}

// Time-based interpolation makes sparse/uneven network samples continuous.
export function createMotionSmoother(responseMs = 45) {
  let current={x:0,y:0,angle:0}, target={...current}, lastFrame;
  return {
    target(value, immediate=false) {
      target={x:value.x||0,y:value.y||0,angle:value.angle||0};
      if(immediate){current={...target};lastFrame=undefined;}
    },
    sample(now) {
      const dt=lastFrame===undefined?0:Math.max(0,Math.min(64,now-lastFrame));lastFrame=now;
      const amount=1-Math.exp(-dt/responseMs);
      for(const key of ["x","y","angle"])current[key]+=(target[key]-current[key])*amount;
      return {...current};
    },
  };
}
