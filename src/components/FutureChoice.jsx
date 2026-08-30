import { useState } from "react";
import { useParams } from "react-router-dom";

const choices = [
  ["builder", "I am a builder", "fox"],
  ["designer", "I am a designer", "moth"],
  ["inventor", "I am an inventor", "owl"],
];

export default function FutureChoice() {
  const { sessionId = "local-booth" } = useParams();
  const [selected, setSelected] = useState(() => localStorage.getItem(`every.photobooth.choice.${sessionId}`) || "");
  const choose = (value) => {
    localStorage.setItem(`every.photobooth.choice.${sessionId}`, value);
    localStorage.setItem("every.photobooth.choice", value);
    setSelected(value);
  };
  const selectedChoice = choices.find(([id]) => id === selected);
  return <main className="future-choice"><p className="eyebrow">Every Future Familiar</p><h1>After automation,<br /><em>what are you?</em></h1><p>Choose a future. Bring your phone into the booth. Something will escape.</p><div className="future-choice__options">{choices.map(([id, label, animal]) => <button key={id} className={selected === id ? "is-selected" : ""} type="button" onClick={() => choose(id)}><span>{animal}</span>{label}<i>↗</i></button>)}</div>{selectedChoice && <p className="future-choice__confirmation" role="status">Your familiar is the <strong>{selectedChoice[2]}</strong>. Keep this choice, then hold your marked phone up when the booth says “ready.”</p>}</main>;
}
