export default function StylePicker({ photo, styles, onSelect, onRetake }) {
  return (
    <section className="style-picker" aria-labelledby="style-picker-title">
      <header className="style-picker__header">
        <div>
          <p className="eyebrow">Four possible futures</p>
          <h1 id="style-picker-title">Choose your<br /><em>transformation.</em></h1>
        </div>
        <div className="style-picker__source">
          <img src={photo} alt="Your captured portrait" />
          <button type="button" className="text-link-button" onClick={onRetake}>Retake photo</button>
        </div>
      </header>
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
            <img src={style.preview} alt={`${style.label} example`} />
            <strong>{style.label}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
