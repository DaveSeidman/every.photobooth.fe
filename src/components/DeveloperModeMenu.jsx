const devVisible = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEV_MENU === "true";

export default function DeveloperModeMenu({ modes, mode, onModeChange, onReset, oracleContext, onOracleContextChange }) {
  if (!devVisible) return null;
  const oracle = mode === "every.oracle";
  return (
    <aside className="developer-menu" data-testid="developer-menu">
      <div className="developer-menu__label"><span>●</span> Creative lab</div>
      <label className="developer-menu__select-label" htmlFor="mode-select">Mode</label>
      <select id="mode-select" value={mode} onChange={(event) => onModeChange(event.target.value)}>
        {modes.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}
      </select>
      {oracle && (
        <div className="developer-menu__oracle">
          <label>Oracle seed (safe demo)</label>
          <input placeholder="City" value={oracleContext.city} onChange={(event) => onOracleContextChange({ city: event.target.value })} />
          <input placeholder="Industry" value={oracleContext.industry} onChange={(event) => onOracleContextChange({ industry: event.target.value })} />
          <input placeholder="Role" value={oracleContext.role} onChange={(event) => onOracleContextChange({ role: event.target.value })} />
        </div>
      )}
      <button type="button" className="developer-menu__reset" onClick={onReset}>Reset memory / canvas</button>
    </aside>
  );
}
