const paletteOptions = [
  ["blue", "Blue"],
  ["coral", "Coral"],
  ["cyan", "Cyan"],
  ["gold", "Gold"],
];

export default function DesignerPanel({ preview, options, onChange, onSubmit, onBack }) {
  const swatchColor = { blue: "#2b83ee", coral: "#ff7b70", cyan: "#31c8f5", gold: "#ffde3d" }[options.palette];
  return (
    <section className="designer-panel" aria-labelledby="designer-title">
      <div className="designer-panel__preview" style={{ "--designer-color": swatchColor, "--brush-x": `${options.brushX}%`, "--brush-y": `${options.brushY}%` }}>
        <img src={preview} alt="Your source portrait" />
        <span className="designer-panel__brush" />
        <span className="designer-panel__crosshair">✳</span>
      </div>
      <div className="designer-panel__controls">
        <p className="eyebrow">Every Designer / art direction</p>
        <h1 id="designer-title">Make the<br /><em>backplate yours.</em></h1>
        <p>Choose a color and move the brush before the AI sets the people into the world.</p>
        <div className="designer-panel__swatches">
          {paletteOptions.map(([value, label]) => <button key={value} type="button" className={`designer-swatch designer-swatch--${value} ${options.palette === value ? "is-active" : ""}`} onClick={() => onChange({ palette: value })}>{label}</button>)}
        </div>
        <label className="designer-slider">Brush left / right <input type="range" min="10" max="90" value={options.brushX} onChange={(event) => onChange({ brushX: event.target.value })} /></label>
        <label className="designer-slider">Brush up / down <input type="range" min="10" max="90" value={options.brushY} onChange={(event) => onChange({ brushY: event.target.value })} /></label>
        <div className="designer-panel__actions"><button type="button" className="text-button text-button--dark" onClick={onBack}>Back</button><button type="button" className="primary-button" onClick={onSubmit}>Generate design <span>↗</span></button></div>
      </div>
    </section>
  );
}
