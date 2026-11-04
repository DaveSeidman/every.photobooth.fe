export function createOperatorGesture({trigger, viewport, schedule=setTimeout, cancel=clearTimeout, holdMs=2000}) {
  let timer, origin, fired=false;
  const clear=()=>{if(timer!==undefined)cancel(timer);timer=undefined;origin=null;};
  const update=(touches,cancelled=false)=>{
    const points=Array.from(touches);
    if(cancelled || !points.length){clear();fired=false;return false;}
    const {width}=viewport();
    const left=points.find(t=>t.clientX>=0 && t.clientX<=96 && t.clientY>=0 && t.clientY<=140);
    const right=points.find(t=>t.clientX>=width-96 && t.clientX<=width && t.clientY>=0 && t.clientY<=140);
    if(points.length!==2 || !left || !right || left.identifier===right.identifier){clear();return false;}
    if(fired)return true;
    if(origin && [left,right].some((point,index)=>point.identifier!==origin[index].identifier || Math.hypot(point.clientX-origin[index].clientX,point.clientY-origin[index].clientY)>24)) {clear();return true;}
    if(timer===undefined) {
      origin=[left,right].map(t=>({identifier:t.identifier,clientX:t.clientX,clientY:t.clientY}));
      timer=schedule(()=>{timer=undefined;fired=true;trigger();},holdMs);
    }
    return true;
  };
  return {update,dispose:clear};
}

export function refreshUrl(href, now=Date.now()) {
  const url=new URL(href);
  url.searchParams.set('_booth_refresh',String(now));
  url.hash='/';
  return url.href;
}
