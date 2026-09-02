const devVisible = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEV_MENU === "true";

export default function DeveloperModeMenu({ modes, mode, onModeChange, onReset }) {
  if (!devVisible) return null;
  return (
    <aside className="developer-menu" data-testid="developer-menu">
      <div className="developer-menu__label"><span>●</span> Art direction</div>
      <label className="developer-menu__select-label" htmlFor="mode-select">Mode</label>
      <select id="mode-select" value={mode} onChange={(event) => onModeChange(event.target.value)}>
        {modes.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}
      </select>
      <button type="button" className="developer-menu__reset" onClick={onReset}>Reset booth</button>
    </aside>
  );
}
