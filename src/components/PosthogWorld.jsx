import { useRef, useState } from "react";

const snacks = ["●", "▲", "✦", "◆"];

export default function PosthogWorld({ image, label = "Your paper twin" }) {
  const nextSnack = useRef(0);
  const [food, setFood] = useState([]);

  const dropFood = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const item = {
      id: `${Date.now()}-${nextSnack.current}`,
      glyph: snacks[nextSnack.current % snacks.length],
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    };
    nextSnack.current += 1;
    setFood((items) => [...items.slice(-11), item]);
  };

  return (
    <button type="button" className="posthog-world" onClick={dropFood} aria-label="Tap to feed the paper hedgehogs">
      <span className="posthog-world__sun" />
      <span className="posthog-world__cloud posthog-world__cloud--one" />
      <span className="posthog-world__cloud posthog-world__cloud--two" />
      <span className="posthog-world__hill posthog-world__hill--back" />
      <span className="posthog-world__hill posthog-world__hill--front" />
      <span className="posthog-world__grass" />
      {image && (
        <figure className="posthog-world__portrait">
          <img src={image} alt={label} />
          <figcaption>THE HEDGEHOG SANCTUARY / TAP TO DROP A SNACK</figcaption>
        </figure>
      )}
      <span className="paper-hog paper-hog--one"><i>●</i></span>
      <span className="paper-hog paper-hog--two"><i>●</i></span>
      <span className="paper-hog paper-hog--three"><i>●</i></span>
      {food.map((item) => (
        <span key={item.id} className="posthog-world__food" style={{ left: `${item.x}%`, top: `${item.y}%` }}>{item.glyph}</span>
      ))}
      <span className="posthog-world__hint">Tap anywhere to feed the garden</span>
    </button>
  );
}
