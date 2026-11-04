// Keep the tear visible after its button's screen unmounts. This copy has no
// input handlers and never delays the real button action.
export function animateDetachedTicket(button, {reduced=false, doc=button.ownerDocument, computed=node=>doc.defaultView.getComputedStyle(node)}={}) {
  if(reduced)return;
  const rect=button.getBoundingClientRect();
  if(!rect.width || !rect.height)return;
  const copy=button.cloneNode(true);
  const originals=[button,...button.querySelectorAll('*')];
  const copies=[copy,...copy.querySelectorAll('*')];
  originals.forEach((node,index)=>{
    const style=computed(node);
    for(const property of Array.from(style))copies[index].style.setProperty(property,style.getPropertyValue(property));
    copies[index].removeAttribute('id');
    copies[index].style.animation='none';copies[index].style.transition='none';
    copies[index].style.pointerEvents='none';
  });
  const width=button.offsetWidth || rect.width, height=button.offsetHeight || rect.height;
  Object.assign(copy.style,{position:'relative',inset:'auto',left:'0',top:'0',width:`${width}px`,height:`${height}px`,margin:'0',transform:'none',visibility:'visible',opacity:'1'});
  copy.tabIndex=-1;copy.setAttribute('aria-hidden','true');
  const layer=doc.createElement('div');
  layer.inert=true;layer.setAttribute('aria-hidden','true');
  Object.assign(layer.style,{position:'fixed',left:`${rect.left}px`,top:`${rect.top}px`,width:`${width}px`,height:`${height}px`,transformOrigin:'top left',transform:`scale(${rect.width/width},${rect.height/height})`,zIndex:'1000',pointerEvents:'none'});
  layer.append(copy);doc.body.append(layer);
  try {
    const direction=button.style.transformOrigin.startsWith('100')?-1:1;
    const animation=copy.animate([
      {transform:'translateY(0) rotate(0deg)',opacity:1},
      {transform:`translate(${direction*8}px,24px) rotate(${direction*12}deg)`,opacity:1,offset:.35},
      {transform:`translate(${direction*24}px,190px) rotate(${direction*28}deg)`,opacity:0},
    ],{duration:260,easing:'cubic-bezier(.3,0,.7,.5)',fill:'forwards'});
    animation.finished.then(()=>layer.remove(),()=>layer.remove());
  }catch {layer.remove();}
}
