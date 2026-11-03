import { useLayoutEffect, useRef } from "react";
import StampFrame from "./StampFrame.jsx";

export function StyleChoices({ styles, onSelect }) {
  const layout = useRef(null);
  const deck = useRef(null);
  useLayoutEffect(() => {
    const update = () => deck.current?.style.setProperty("--style-scale", String(layout.current.getBoundingClientRect().width / 600));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(layout.current);
    return () => observer.disconnect();
  }, []);
  return <div className="style-choice-layout" ref={layout}><div className="style-choice-deck" ref={deck}>
    {styles.map((style, index) => <div className={`style-option-layer style-option-layer--${index === 0 ? "left" : "right"}`} key={style.id}>
      <button type="button" className="style-card" onClick={() => onSelect(style)} data-testid={`style-${style.id}`}>
        <StampFrame />
        <img src={style.preview} alt={`${style.label} example`} />
        <span className="style-card__copy"><strong>{style.label}</strong><span>{style.description}</span></span>
      </button>
    </div>)}
  </div></div>;
}

export default function StylePicker({ styles, onSelect }) {
  return <section className="style-picker" aria-labelledby="style-picker-title">
    <header className="style-picker__header"><h1 id="style-picker-title">Choose your <em>Empire</em></h1></header>
    <StyleChoices styles={styles} onSelect={onSelect} />
  </section>;
}
