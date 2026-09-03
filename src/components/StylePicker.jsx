export default function StylePicker({ photo, styles, onSelect, onRetake }) {
  return (
    <section className="style-picker" aria-labelledby="style-picker-title">
      <header className="style-picker__header">
        <div>
          <p className="eyebrow">Four possible futures</p>
          <h1 id="style-picker-title">Choose your<br /><em>transformation.</em></h1>
        </div>
        <button type="button" className="text-link-button" onClick={onRetake}>Retake photo</button>
      </header>
      <div className="style-picker__graph">
        <svg className="node-wires" viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden="true">
          <path d="M 225 260 C 330 260, 310 125, 425 125" />
          <path d="M 225 260 C 330 260, 310 395, 425 395" />
          <path d="M 225 260 C 400 260, 545 125, 665 125" />
          <path d="M 225 260 C 400 260, 545 395, 665 395" />
        </svg>
        <figure className="photo-node">
          <div className="node-title"><span>Input / 01</span><i aria-hidden="true" /></div>
          <img src={photo} alt="Your captured portrait" />
          <figcaption>Captured photo</figcaption>
          <span className="node-port node-port--out" aria-hidden="true" />
        </figure>
        <div className="style-picker__grid">
          {styles.map((style, index) => (
            <button
              type="button"
              className="style-card"
              key={style.id}
              onClick={() => onSelect(style)}
              data-testid={`style-${style.id}`}
              style={{ "--node-delay": `${80 + index * 45}ms` }}
            >
              <span className="node-port node-port--in" aria-hidden="true" />
              <span className="style-card__number">Transform / 0{index + 1}</span>
              <img src={style.preview} alt={`${style.label} example`} />
              <span className="style-card__copy">
                <strong>{style.label}</strong>
                <small>{style.description}</small>
                <span>Run node <b>↗</b></span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
