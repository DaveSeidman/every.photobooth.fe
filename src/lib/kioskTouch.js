// Reserve booth drags for the app, starting with the first movement. Waiting
// for a tear threshold lets Safari claim the gesture as page scrolling first.
export function installKioskTouchGuard({ doc = document, viewportWidth = () => window.innerWidth } = {}) {
  const isBooth = target => target?.closest?.('.booth') && !target.closest('.developer-controls');
  let tap;
  const start = event => {
    tap = null;
    if (!isBooth(event.target) || !event.cancelable || event.touches?.length !== 1) return;
    const touch = event.touches[0];
    const button = event.target.closest('button');
    if (button && typeof button.click === 'function' && !button.disabled && !button.matches('.ticket-button')) {
      tap={button,id:touch.identifier,x:touch.clientX,y:touch.clientY,maxTravel:0,started:performance.now()};
    }
    const x = touch.clientX;
    if (x <= 24 || x >= viewportWidth() - 24) event.preventDefault();
  };
  const move = (event) => {
    if(tap) {
      const touch=Array.from(event.touches || []).find(t=>t.identifier===tap.id);
      if(touch)tap.maxTravel=Math.max(tap.maxTravel,Math.hypot(touch.clientX-tap.x,touch.clientY-tap.y));
    }
    const target = event.target;
    if (!isBooth(target)) return;
    if (event.cancelable) event.preventDefault();
  };
  const end=event=>{
    const current=tap;tap=null;
    if(!current || event.type==='touchcancel' || event.touches?.length || !event.cancelable)return;
    const touch=Array.from(event.changedTouches || []).find(t=>t.identifier===current.id);
    if(!touch)return;
    const distance=Math.max(current.maxTravel,Math.hypot(touch.clientX-current.x,touch.clientY-current.y));
    if(distance<=18 && performance.now()-current.started<=600 && !current.button.disabled && current.button.isConnected) {
      event.preventDefault();current.button.click();
    }
  };
  doc.addEventListener('touchend',end,{capture:true,passive:false});
  doc.addEventListener('touchcancel',end,{capture:true,passive:false});
  doc.addEventListener('touchstart', start, {capture:true, passive:false});
  doc.addEventListener('touchmove', move, {capture:true, passive:false});
  return () => {doc.removeEventListener('touchend',end,true);doc.removeEventListener('touchcancel',end,true);doc.removeEventListener('touchstart', start, true);doc.removeEventListener('touchmove', move, true);};
}
