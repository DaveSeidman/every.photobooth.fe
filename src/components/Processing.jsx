function progressCopy(progress) {
  if (progress < 28) return "Preparing the portrait";
  if (progress < 58) return "Holding faces and expressions";
  if (progress < 84) return "Building the editorial world";
  if (progress < 100) return "Finishing the details";
  return "Portrait complete";
}

export default function Processing({ progress, photo, style }) {
  const finishing = progress >= 100;

  return (
    <section className="processing" aria-live="polite">
      <div className="processing__portrait">
        <img className="processing__source" src={photo} alt="Approved portrait being transformed" />
        <img
          className={`processing__spinner ${finishing ? "is-leaving" : ""}`}
          src={`${import.meta.env.BASE_URL}rockspin.gif`}
          alt=""
          draggable="false"
        />
      </div>
      <div className="processing__copy">
        <p className="eyebrow">Every / {style?.label || "Editorial transformation"}</p>
        <h1>Your portrait is becoming<br /><em>something else.</em></h1>
        <div className="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
          <div className="progress__track"><span style={{ width: `${progress}%` }} /></div>
          <div className="progress__meta"><span>{progressCopy(progress)}</span><strong>{progress}%</strong></div>
        </div>
      </div>
    </section>
  );
}
