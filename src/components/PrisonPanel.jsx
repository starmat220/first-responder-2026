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
  <div className="panel station-panel">
    <div className="station-header">
      <div>
        <p className="station-name">{prison?.name || 'Prison Facility'}</p>
        <p className="muted">Detention Facility</p>
      </div>
      <div className="station-header__meta">
        <div className="overview-row">
          <span className="overview-row__label">Capacity</span>
          <span className="overview-row__value">
            {prison?.count || 0} / {prison?.capacity || 0}
          </span>
        </div>
        <div className="overview-row">
          <span className="overview-row__label">Staff</span>
          <span className="overview-row__value">
            {prison?.staffAssigned || 0} / {prison?.staffCapacity || 0}
          </span>
        </div>
      </div>
    </div>

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

    <div className="station-card">
      <p className="station-card__title">Operations</p>
      <div className="station-grid">
        <div className="station-tile">
          <p className="station-tile__title">Detention Capacity</p>
          <p className="muted">
            {prison?.count || 0} / {prison?.capacity || 0} occupied
          </p>
          <button className="btn btn--small" onClick={onUpgradeCapacity}>
            Expand (${capacityUpgradeCost})
          </button>
        </div>
        <div className="station-tile">
          <p className="station-tile__title">Staffing</p>
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
          <p className="muted">No detainees booked yet.</p>
        )}
      </div>
    </div>
  </div>
)

export default PrisonPanel
