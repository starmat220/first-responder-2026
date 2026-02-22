const BUILDING_DEPT_META = {
  police: { short: 'PD', className: 'police' },
  fire: { short: 'FD', className: 'fire' },
  ems: { short: 'EMS', className: 'ems' },
  tow: { short: 'TOW', className: 'tow' },
  detention: { short: 'JAIL', className: 'detention' },
}

const getBuildMeta = (building) => {
  if (!building) return BUILDING_DEPT_META.police
  if (building.category === 'detention') return BUILDING_DEPT_META.detention
  return BUILDING_DEPT_META[building.department] || BUILDING_DEPT_META.police
}

const getBuildOptionLabel = (building) => {
  const meta = getBuildMeta(building)
  return building.enabled
    ? `[${meta.short}] ${building.label} ($${building.cost})`
    : `[${meta.short}] ${building.label} (Coming soon)`
}

const Topbar = ({
  money,
  activeIncidentCount,
  publicTrust,
  score,
  level,
  parkedCount,
  totalVehicles,
  showIncidents,
  setShowIncidents,
  station,
  hasStations,
  onToggleLedger,
  saveSlot,
  setSaveSlot,
  saveSlotCount,
  onStartPlaceStation,
  stationBuildCost,
  placingStation,
  onCancelPlacement,
  showCases,
  onToggleCases,
  showBuildMenu,
  onToggleBuildMenu,
  buildOptions,
  placingBuildingType,
  onChangeBuildingType,
  onStartBuildingPlacement,
  onCancelBuildMenu,
  selectedBuildOption,
}) => (
  <header className="topbar">
    <div className="topbar__title">
      <p className="eyebrow">First Responder 2026</p>
      <h1>Oromocto Mission Control</h1>
      {station && <p className="subhead">Active Station: {station.name}</p>}
      {!station && hasStations && <p className="subhead">Active Station: None</p>}
    </div>
    <div className="topbar__right">
      <div className="topbar__stats">
        <button className="stat stat--button" onClick={onToggleLedger}>
          <p className="label">Cash</p>
          <p className="value">${money.toLocaleString()}</p>
        </button>
        <div className="stat stat--level">
          <p className="label">Level</p>
          <p className="value">{level}</p>
        </div>
        <div className="stat">
          <p className="label">Active Incidents</p>
          <p className="value">{activeIncidentCount}</p>
        </div>
        <div className="stat">
          <p className="label">Trust</p>
          <p className="value">{publicTrust}</p>
        </div>
        <div className="stat">
          <p className="label">Score</p>
          <p className="value">{score}</p>
        </div>
        <div className="stat">
          <p className="label">Garage</p>
          <p className="value">
            {parkedCount}/{totalVehicles}
          </p>
        </div>
      </div>
      <div className="topbar__tabs">
        <div className="topbar__slot">
          <span className="label">Save</span>
          <select
            value={saveSlot}
            onChange={(event) => setSaveSlot(Number(event.target.value))}
          >
            {Array.from({ length: saveSlotCount }).map((_, index) => (
              <option key={`slot-${index + 1}`} value={index + 1}>
                Slot {index + 1}
              </option>
            ))}
          </select>
        </div>
        <button
          className={`tab ${placingStation ? 'tab--active' : ''}`}
          onClick={
            placingStation
              ? onCancelPlacement
              : station
              ? onToggleBuildMenu
              : onStartPlaceStation
          }
        >
          {placingStation
            ? 'Cancel Placement'
            : station
            ? 'Add Building'
            : `Place Station ($${stationBuildCost})`}
        </button>
        {showBuildMenu && !placingStation && (
          <div className="topbar__build-menu">
            <span
              className={`topbar__build-badge topbar__build-badge--${getBuildMeta(selectedBuildOption).className}`}
            >
              {getBuildMeta(selectedBuildOption).short}
            </span>
            <select
              className="filter-select"
              value={placingBuildingType}
              onChange={(event) => onChangeBuildingType(event.target.value)}
            >
              {buildOptions.map((building) => (
                <option key={building.id} value={building.id}>
                  {getBuildOptionLabel(building)}
                </option>
              ))}
            </select>
            <button className="btn btn--small" onClick={onStartBuildingPlacement}>
              Start
            </button>
            <button className="btn btn--ghost btn--small" onClick={onCancelBuildMenu}>
              Cancel
            </button>
          </div>
        )}
        <button
          className={`tab ${showIncidents ? 'tab--active' : ''}`}
          onClick={() => setShowIncidents((prev) => !prev)}
        >
          Incidents
        </button>
        <button
          className={`tab ${showCases ? 'tab--active' : ''}`}
          onClick={onToggleCases}
        >
          History
        </button>
      </div>
    </div>
  </header>
)

export default Topbar
