const shortcuts = [["⌂", "Home"], ["◌", "Self-driving\nproduct"], ["◈", "Events"], ["▣", "Experiments"], ["$", "Pricing"], ["▤", "Docs"], ["▥", "Trash"]];

export default function PosthogDesktop() {
  return (
    <div className="posthog-desktop" aria-hidden="true">
      <nav className="posthog-menubar"><strong>▰ PostHog</strong><span>Products</span><span>Pricing</span><span>Docs</span><span>Community</span><span>Company</span><span>More</span><b>Get started →</b><i>⌕</i><i>◎</i></nav>
      <div className="posthog-shortcuts">{shortcuts.map(([icon, label]) => <div key={label}><span>{icon}</span>{label.split("\n").map((line) => <small key={line}>{line}</small>)}</div>)}</div>
      <div className="posthog-window"><div className="posthog-window__bar"><span>●</span><span>●</span><span>●</span><strong>Every / Live insight</strong></div><div className="posthog-window__content"><p>EVENT STREAM / PORTRAIT BOOTH</p><h1>Watch the<br /><em>room learn.</em></h1><div className="posthog-chart"><i /><i /><i /><i /><i /><i /><i /></div><button>Capture event →</button></div></div>
    </div>
  );
}
