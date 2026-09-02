const shortcuts = [["⌂", "Home"], ["◌", "Self-driving\nproduct"], ["◈", "Events"], ["▣", "Experiments"], ["$", "Pricing"], ["▤", "Docs"], ["▥", "Trash"]];

export default function PosthogDesktop() {
  return (
    <div className="posthog-desktop" aria-hidden="true">
      <nav className="posthog-desktop__menubar"><strong>▰ PostHog</strong><span>Products</span><span>Pricing</span><span>Docs</span><span>Community</span><span>Company</span><span>More</span><b>Get started →</b><i>⌕</i><i>◎</i></nav>
      <div className="posthog-desktop__shortcuts">{shortcuts.map(([icon, label]) => <div className="posthog-desktop__shortcut" key={label}><span className="posthog-desktop__icon">{icon}</span>{label.split("\n").map((line) => <small key={line}>{line}</small>)}</div>)}</div>
      <div className="posthog-desktop__window"><div className="posthog-desktop__windowbar"><span>● ● ●</span><strong>Every / Live insight</strong></div><div><p>EVENT STREAM / PORTRAIT BOOTH</p><h1>Watch the<br /><em>room learn.</em></h1><div className="posthog-desktop__chart" /><button className="posthog-desktop__cta">Capture event →</button></div></div>
    </div>
  );
}
