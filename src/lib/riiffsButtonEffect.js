const sparkleColors = ["#fff7ff", "#b9eaff", "#ffc6df", "#c8a9ff"];

// Keep the RiiFFS button exit visible while the booth changes screens.
export function animateRiiffsButton(button, { reduced = false } = {}) {
  if (reduced) return Promise.resolve();

  const doc = button.ownerDocument;
  const view = doc.defaultView;
  const rect = button.getBoundingClientRect();
  if (!rect.width || !rect.height) return Promise.resolve();

  const width = button.offsetWidth || rect.width;
  const height = button.offsetHeight || rect.height;
  const scaleX = rect.width / width;
  const scaleY = rect.height / height;
  const layer = doc.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.inert = true;
  Object.assign(layer.style, {
    position: "fixed",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${width}px`,
    height: `${height}px`,
    transform: `scale(${scaleX}, ${scaleY})`,
    transformOrigin: "top left",
    zIndex: "1000",
    pointerEvents: "none",
    overflow: "visible",
  });

  const copy = button.cloneNode(true);
  const originals = [button, ...button.querySelectorAll("*")];
  const copies = [copy, ...copy.querySelectorAll("*")];
  originals.forEach((node, index) => {
    const computed = view.getComputedStyle(node);
    for (const property of Array.from(computed)) {
      copies[index].style.setProperty(property, computed.getPropertyValue(property));
    }
    copies[index].removeAttribute("id");
    copies[index].style.animation = "none";
    copies[index].style.transition = "none";
    copies[index].style.pointerEvents = "none";
  });
  Object.assign(copy.style, {
    position: "relative",
    inset: "auto",
    left: "0",
    top: "0",
    width: `${width}px`,
    height: `${height}px`,
    margin: "0",
    transform: "none",
    transformOrigin: "center",
    visibility: "visible",
    opacity: "1",
    filter: "none",
  });
  copy.tabIndex = -1;
  copy.removeAttribute("disabled");
  copy.setAttribute("aria-hidden", "true");
  layer.append(copy);

  const sparkles = [];
  for (let index = 0; index < 12; index += 1) {
    const particle = doc.createElement("span");
    const size = 3 + Math.random() * 4;
    const angle = (Math.PI * 2 * index) / 12 + (Math.random() - .5) * .48;
    const distance = 38 + Math.random() * 72;
    Object.assign(particle.style, {
      position: "absolute",
      left: `${Math.random() * 86 + 7}%`,
      top: `${Math.random() * 74 + 13}%`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: index % 3 === 0 ? "0" : "50%",
      clipPath: index % 3 === 0
        ? "polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)"
        : "none",
      background: sparkleColors[index % sparkleColors.length],
      boxShadow: `0 0 6px ${sparkleColors[index % sparkleColors.length]}, 0 0 15px ${sparkleColors[index % sparkleColors.length]}`,
      pointerEvents: "none",
    });
    layer.append(particle);
    sparkles.push(particle.animate([
      { transform: "translate3d(0,0,0) scale(.35)", opacity: 0, filter: "blur(1px)" },
      { transform: "translate3d(0,0,0) scale(1)", opacity: 1, filter: "blur(0)", offset: .22 },
      { transform: `translate3d(${Math.cos(angle) * distance}px,${Math.sin(angle) * distance}px,0) scale(0)`, opacity: 0, filter: "blur(1.5px)" },
    ], {
      duration: 480 + Math.random() * 210,
      delay: Math.random() * 65,
      easing: "cubic-bezier(.16,.72,.28,1)",
      fill: "forwards",
    }));
  }

  doc.body.append(layer);
  const buttonExit = copy.animate([
    { opacity: 1, filter: "blur(0px)", transform: "translate3d(0,0,0) scale(1)" },
    { opacity: .8, filter: "blur(1px)", transform: "translate3d(0,-2px,0) scale(.99)", offset: .2 },
    { opacity: 0, filter: "blur(8px)", transform: "translate3d(0,-7px,0) scale(.96)" },
  ], { duration: 360, easing: "cubic-bezier(.2,.65,.25,1)", fill: "forwards" });

  return Promise.all([buttonExit.finished, ...sparkles.map((animation) => animation.finished)])
    .catch(() => {})
    .finally(() => layer.remove());
}
