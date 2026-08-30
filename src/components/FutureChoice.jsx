import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const choices = [
  ["builder", "I am a builder", "fox"],
  ["designer", "I am a designer", "moth"],
  ["inventor", "I am an inventor", "owl"],
];

export default function FutureChoice() {
  const { sessionId = "local-booth" } = useParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState("");
  const choose = (value) => {
    localStorage.setItem(`every.photobooth.choice.${sessionId}`, value);
    localStorage.setItem("every.photobooth.choice", value);
    setSelected(value);
    window.setTimeout(() => navigate("/"), 280);
  };
  return <main className="future-choice"><p className="eyebrow">Every Future Familiar</p><h1>After automation,<br /><em>what are you?</em></h1><p>Choose a future. Bring your phone into the booth. Something will escape.</p><div className="future-choice__options">{choices.map(([id, label, animal]) => <button key={id} className={selected === id ? "is-selected" : ""} type="button" onClick={() => choose(id)}><span>{animal}</span>{label}<i>↗</i></button>)}</div></main>;
}
