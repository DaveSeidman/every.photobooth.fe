export default function StylePicker({ styles, onSelect, onRetake }) {
  return (
    <section className="style-picker" aria-labelledby="style-picker-title">
      <header className="style-picker__header">
        <div>
          <p className="eyebrow">Four possible futures</p>
          <h1 id="style-picker-title">Choose your<br /><em>transformation.</em></h1>
        </div>
        <button type="button" className="text-link-button" onClick={onRetake}>Retake photo</button>
      </header>
      <div className="style-picker__grid">
        {styles.map((style, index) => (
          <button
            type="button"
            className="style-card"
            key={style.id}
            onClick={() => onSelect(style)}
            data-testid={`style-${style.id}`}
          >
            <span className="style-card__number">0{index + 1}</span>
            <img src={style.preview} alt={`${style.label} example`} />
            <span className="style-card__copy">
              <strong>{style.label}</strong>
              <small>{style.description}</small>
              <span>Choose <b>↗</b></span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
