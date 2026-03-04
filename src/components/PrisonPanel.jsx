const PrisonPanel = ({
  prison,
  prisons,
  activePrisonId,
  setActivePrisonId,
  prisonNameDraft,
  setPrisonNameDraft,
  onRenamePrison,
  onHireStaff,
  onUpgradeStaffCapacity,
  onUpgradeCapacity,
  staffHireCost,
  staffUpgradeCost,
  capacityUpgradeCost,
}) => (
  <div className="panel-content-only menu-shell">
    <div className="menu-shell__header">
      <div>
        <p className="menu-shell__title">{prison?.name || 'Prison Facility'}</p>
        <p className="menu-shell__hint">Manage detention capacity, staffing, and intake operations.</p>
      </div>
      <div className="menu-shell__metrics">
        <span className="menu-stat-badge">
          {prison?.count || 0}/{prison?.capacity || 0} occupied
        </span>
        <span className="menu-stat-badge">
          {prison?.staffAssigned || 0}/{prison?.staffCapacity || 0} staff
        </span>
      </div>
    </div>

    <div className="menu-shell__body" style={{ display: 'grid', gap: '10px' }}>
      {prisons?.length > 1 && (
        <div className="station-card station-card--compact">
          <p className="station-card__title">Active Facility</p>
          <div className="station-action-row">
            <select
              className="station-input"
              value={activePrisonId || ''}
              onChange={(event) => setActivePrisonId(Number(event.target.value))}
            >
              {prisons.map((item) => (
                <option key={`prison-${item.id}`} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="station-card station-card--compact">
        <p className="station-card__title">Facility Name</p>
        <div className="station-action-row">
          <input
            className="station-input"
            value={prisonNameDraft}
            onChange={(event) => setPrisonNameDraft(event.target.value)}
            placeholder="Prison Facility"
          />
          <button className="btn btn--small" onClick={onRenamePrison}>
            Save
          </button>
        </div>
      </div>

      <div className="department-module">
        <div className="station-card">
          <p className="station-card__title">Detention Capacity</p>
          <p className="muted">
            {prison?.count || 0} / {prison?.capacity || 0} occupied
          </p>
          <button className="btn btn--small" onClick={onUpgradeCapacity}>
            Expand (${capacityUpgradeCost})
          </button>
        </div>
        <div className="station-card">
          <p className="station-card__title">Staffing</p>
          <p className="muted">
            {prison?.staffAssigned || 0} / {prison?.staffCapacity || 0} staffed
          </p>
          <div className="station-action-row">
            <button className="btn btn--small" onClick={onHireStaff}>
              Hire (${staffHireCost})
            </button>
            <button className="btn btn--ghost btn--small" onClick={onUpgradeStaffCapacity}>
              Expand (${staffUpgradeCost})
            </button>
          </div>
        </div>
      </div>

      <div className="station-card">
        <p className="station-card__title">Recent Intakes</p>
        <div className="station-list">
          {prison?.detentionLog?.length ? (
            prison.detentionLog.map((entry) => (
              <div key={entry.id} className="station-list__row">
                <span>{entry.type}</span>
                <span className="muted">{entry.time}</span>
              </div>
            ))
          ) : (
            <p className="menu-empty">No detainees booked yet.</p>
          )}
        </div>
      </div>
    </div>
  </div>
)

export default PrisonPanel
