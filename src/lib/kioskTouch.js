// Reserve booth drags for the app, starting with the first movement. Waiting
// for a tear threshold lets Safari claim the gesture as page scrolling first.
export function installKioskTouchGuard({ doc = document, viewportWidth = () => window.innerWidth } = {}) {
  const isBooth = target => target?.closest?.('.booth') && !target.closest('.developer-controls');
  const start = event => {
    if (!isBooth(event.target) || !event.cancelable || event.touches?.length !== 1) return;
    const x = event.touches[0].clientX;
    if (x <= 24 || x >= viewportWidth() - 24) event.preventDefault();
  };
  const move = (event) => {
    const target = event.target;
    if (!isBooth(target)) return;
    if (event.cancelable) event.preventDefault();
  };
  doc.addEventListener('touchstart', start, {capture:true, passive:false});
  doc.addEventListener('touchmove', move, {capture:true, passive:false});
  return () => {doc.removeEventListener('touchstart', start, true);doc.removeEventListener('touchmove', move, true);};
}
