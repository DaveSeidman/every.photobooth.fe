import { useHandoffTiming } from "../hooks/usePhotoSync.js";

export default function HandoffStage({ result, originalUrl, sync }) {
  const timing = useHandoffTiming(sync.handoff, sync.clockOffset);
  const state = timing.animating ? "is-transferring-out" : timing.away ? "is-away" : timing.restoring ? "is-restoring" : "";
  return (
    <figure className="result-hero" aria-label="Your portrait and automatic phone handoff">
      <div className="result-hero__images">
        <div key={`${sync.handoff?.id || "initial"}-${state}`} className={`transfer-photo ${state}`} style={{ animationDelay: timing.restoring ? timing.restoreDelay : timing.animationDelay }}>
          <img className="result-hero__styled" src={result.styled} alt={`Your ${result.styleLabel || "Every"} portrait`} />
          <img className="result-hero__source" src={originalUrl} alt="Original camera portrait" />
        </div>
      </div>
      <figcaption><span>Every / Thesis: 2027</span><span>{result.styleLabel}</span></figcaption>
    </figure>
  );
}
