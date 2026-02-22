import FleetPanel from './FleetPanel'
import { DEPARTMENTS, STATION_TYPES } from '../game/departments'

const OverviewRow = ({ label, value }) => (
  <div className="station-kpi">
    <p className="station-kpi__label">{label}</p>
    <p className="station-kpi__value">{value}</p>
  </div>
)

const getStationTypeLabel = (stationTypeId) =>
  Object.values(STATION_TYPES).find((item) => item.id === stationTypeId)?.label || 'Station'

const getDepartmentLabel = (departmentId) =>
  Object.values(DEPARTMENTS).find((item) => item.id === departmentId)?.label || 'Operations'

const StationPanel = ({
  stationPanelTab,
  setStationPanelTab,
  station,
  stations,
  activeStationId,
  setActiveStationId,
  handleBuyVehicle,
  handleGarageUpgrade,
  handleHQUpgrade,
  vehicles,
  formatSeconds,
  vehicleStatus,
  progression,
  unitTypes,
  availableUnits,
  garageUpgradeCost,
  hqUpgradeCost,
  trainingUpgradeCost,
  stationNameDraft,
  setStationNameDraft,
  onRenameStation,
  personnelAssigned,
  personnelCapacity,
  onHirePersonnel,
  onUpgradePersonnel,
  personnelHireCost,
  personnelUpgradeCost,
  onAssignCrew,
  onReleaseCrew,
  onTrainingUpgrade,
  prisonSummary,
  onTransferDetention,
  onDeleteStation,
  stationSummary,
  onUpdateShiftPreset,
  onUpdateMinOnDuty,
}) => {
  const stationTypeLabel = getStationTypeLabel(station?.stationType)
  const departmentLabel = getDepartmentLabel(station?.department)
  const departmentId = station?.department || DEPARTMENTS.police.id
  const isPolice = departmentId === DEPARTMENTS.police.id
  const isFire = departmentId === DEPARTMENTS.fire.id
  const isEms = departmentId === DEPARTMENTS.ems.id
  const isTow = departmentId === DEPARTMENTS.tow.id

  const staffingPrimaryLabel = isPolice
    ? 'Patrol Officers'
    : isFire
    ? 'Firefighters'
    : isEms
    ? 'Paramedics'
    : isTow
    ? 'Recovery Operators'
    : 'Operators'
  const staffingSecondaryLabel = isPolice
    ? 'Dispatch Staff'
    : isFire
    ? 'Incident Command'
    : isEms
    ? 'Triage Staff'
    : isTow
    ? 'Roadside Dispatch'
    : 'Dispatch Staff'
  const staffingThirdLabel = isPolice
    ? 'Supervisors'
    : isFire
    ? 'Rescue Specialists'
    : isEms
    ? 'Field Medics'
    : isTow
    ? 'Heavy Recovery'
    : 'Field Leads'
  const tabVehicleLabel = isFire ? 'Apparatus' : isEms ? 'Response Units' : isTow ? 'Recovery Fleet' : 'Vehicles'
  const stationGlyph = isPolice ? 'P' : isFire ? 'F' : isEms ? 'E' : isTow ? 'T' : 'O'
  const headerMetrics = [
    { label: 'Level', value: station?.level || 1 },
    { label: 'Status', value: 'In service' },
    { label: 'Vehicles', value: `${vehicles.length} / ${station?.garageCapacity || 3}` },
    { label: 'Response', value: `${Math.round((station?.responseBonus || 0) * 100)}%` },
    { label: 'Training', value: `${Math.round((station?.trainingBonus || 0) * 100)}%` },
    { label: 'Ops Radius', value: `${Math.round(station?.operationRadiusKm || 0)}km` },
    {
      label: isPolice ? 'Cells' : 'Ready',
      value: isPolice
        ? `${station?.jailCount || 0} / ${station?.jailCapacity || 0}`
        : `${stationSummary?.statusCounts?.available || 0}`,
    },
    { label: 'Personnel', value: `${personnelAssigned} / ${personnelCapacity}` },
  ]

  return (
    <div className={`panel station-panel station-panel--${departmentId}`}>
      <div className="station-sticky-bar">
        <div className="station-header">
          <div>
            <span className={`station-dept-glyph station-dept-glyph--${departmentId}`}>{stationGlyph}</span>
            <p className="station-name">{station?.name || 'Unassigned Station'}</p>
            <p className="muted">{`${stationTypeLabel} - ${departmentLabel} Operations`}</p>
          </div>
          <div className="station-header__meta">
            {headerMetrics.map((metric) => (
              <OverviewRow key={`header-metric-${metric.label}`} label={metric.label} value={metric.value} />
            ))}
          </div>
        </div>
        <div className="tabs tabs--inner">
          <button
            className={`tab ${stationPanelTab === 'overview' ? 'tab--active' : ''}`}
            onClick={() => setStationPanelTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab ${stationPanelTab === 'vehicles' ? 'tab--active' : ''}`}
            onClick={() => setStationPanelTab('vehicles')}
          >
            {tabVehicleLabel}
          </button>
          <button
            className={`tab ${stationPanelTab === 'staffing' ? 'tab--active' : ''}`}
            onClick={() => setStationPanelTab('staffing')}
          >
            Staffing
          </button>
          {isPolice && (
            <button
              className={`tab ${stationPanelTab === 'detention' ? 'tab--active' : ''}`}
              onClick={() => setStationPanelTab('detention')}
            >
              Detention
            </button>
          )}
          <button
            className={`tab ${stationPanelTab === 'extensions' ? 'tab--active' : ''}`}
            onClick={() => setStationPanelTab('extensions')}
          >
            Extensions
          </button>
          <button
            className={`tab ${stationPanelTab === 'complex' ? 'tab--active' : ''}`}
            onClick={() => setStationPanelTab('complex')}
          >
            Building Complex
          </button>
          <button
            className={`tab ${stationPanelTab === 'storage' ? 'tab--active' : ''}`}
            onClick={() => setStationPanelTab('storage')}
          >
            Storage
          </button>
        </div>
      </div>
      <div className="station-card station-card--compact station-command-desk">
        <div className="station-command-desk__header">
          <p className="station-card__title">Command Desk</p>
        </div>
        <div className="station-management-grid">
          <div className="station-management-cell">
            <p className="station-card__title">Active Station</p>
            <div className="station-action-row">
              {stations?.length > 1 ? (
                <select
                  className="station-input"
                  value={activeStationId || ''}
                  onChange={(event) => setActiveStationId(Number(event.target.value))}
                >
                  {stations.map((item) => (
                    <option key={`station-${item.id}`} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input className="station-input" value={station?.name || 'Station'} readOnly />
              )}
              <button
                className="btn btn--danger btn--small"
                onClick={() => {
                  if (!onDeleteStation || !station) return
                  const confirmText = `Delete station "${station.name}"? This cannot be undone.`
                  if (window.confirm(confirmText)) {
                    onDeleteStation()
                  }
                }}
              >
                Delete Station
              </button>
            </div>
          </div>
          <div className="station-management-cell">
            <p className="station-card__title">Station Name</p>
            <div className="station-action-row">
              <input
                className="station-input"
                value={stationNameDraft}
                onChange={(event) => setStationNameDraft(event.target.value)}
                placeholder="Oromocto HQ"
              />
              <button className="btn btn--small" onClick={onRenameStation}>
                Save
              </button>
            </div>
          </div>
        </div>
        <div className="station-management-cell station-management-cell--full">
          <p className="station-card__title">Fleet Procurement</p>
          <div className="station-action-row">
            {availableUnits?.map((unit) => (
              <button key={unit.id} className="btn" onClick={() => handleBuyVehicle(unit.id)}>
                Buy {unit.label} Unit (${unitTypes[unit.id]?.cost ?? unit.cost})
              </button>
            ))}
          </div>
        </div>
      </div>

      {stationPanelTab === 'overview' && (
        <>
          <div className="section-title">Operational Overview</div>
          <div className="station-tab-grid station-tab-grid--overview">
            <div className="station-card">
              <p className="station-card__title">Readiness</p>
              <div className="station-grid">
                <div className="station-tile">
                  <p className="station-tile__title">Units Ready</p>
                  <p className="muted">
                    {stationSummary?.statusCounts?.available || 0} available
                  </p>
                  <span className="station-tag">
                    {stationSummary?.statusCounts?.enroute || 0} enroute
                  </span>
                </div>
                <div className="station-tile">
                  <p className="station-tile__title">Active Calls</p>
                  <p className="muted">{stationSummary?.nearbyIncidents || 0} in coverage</p>
                  <span className="station-tag">
                    {stationSummary?.statusCounts?.on_scene || 0} on scene
                  </span>
                </div>
              </div>
            </div>
            <div className="station-card">
              <p className="station-card__title">Staffing</p>
              <div className="station-grid">
                <div className="station-tile">
                  <p className="station-tile__title">Crew Availability</p>
                  <p className="muted">
                    {personnelAssigned} / {personnelCapacity} assigned
                  </p>
                  <span className="station-tag">
                    {vehicles.length} units in fleet
                  </span>
                </div>
                <div className="station-tile">
                  <p className="station-tile__title">Response Boost</p>
                  <p className="muted">HQ bonus {Math.round((station?.responseBonus || 0) * 100)}%</p>
                  <span className="station-tag">
                    Training {Math.round((station?.trainingBonus || 0) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          {isPolice ? (
            <div className="station-card">
              <p className="station-card__title">Detention</p>
              <div className="station-grid">
                <div className="station-tile">
                  <p className="station-tile__title">Cells</p>
                  <p className="muted">
                    {station?.jailCount || 0} / {station?.jailCapacity || 0} occupied
                  </p>
                  {station?.jailCapacity && (station?.jailCount || 0) >= station.jailCapacity && (
                    <span className="station-tag station-tag--alert">Cells full</span>
                  )}
                </div>
                <div className="station-tile">
                  <p className="station-tile__title">Prison Capacity</p>
                  <p className="muted">
                    {prisonSummary?.totalCapacity
                      ? `${prisonSummary.totalCount} / ${prisonSummary.totalCapacity} occupied`
                      : 'No prison facilities'}
                  </p>
                  {prisonSummary?.totalCapacity > 0 && prisonSummary.available <= 0 && (
                    <span className="station-tag station-tag--alert">Prison full</span>
                  )}
                </div>
              </div>
              <div className="station-list station-list--compact">
                <p className="muted">Recent intakes</p>
                {station?.detentionLog?.length ? (
                  station.detentionLog.slice(0, 4).map((entry) => (
                    <div key={entry.id} className="station-list__row">
                      <span>{entry.type}</span>
                      <span className="muted">
                        {entry.destination === 'prison' ? 'Prison' : 'Cells'} - {entry.time}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="muted">No detainees booked yet.</p>
                )}
              </div>
            </div>
          ) : isFire ? (
            <div className="station-card">
              <p className="station-card__title">Fireground Status</p>
              <div className="station-grid">
                <div className="station-tile">
                  <p className="station-tile__title">Coverage Calls</p>
                  <p className="muted">{stationSummary?.nearbyIncidents || 0} in coverage</p>
                  <span className="station-tag">
                    {stationSummary?.statusCounts?.enroute || 0} enroute
                  </span>
                </div>
                <div className="station-tile">
                  <p className="station-tile__title">Units On Scene</p>
                  <p className="muted">{stationSummary?.statusCounts?.on_scene || 0} active</p>
                  <span className="station-tag">
                    {stationSummary?.statusCounts?.available || 0} available
                  </span>
                </div>
              </div>
            </div>
          ) : isEms ? (
            <div className="station-card">
              <p className="station-card__title">Medical Operations</p>
              <div className="station-grid">
                <div className="station-tile">
                  <p className="station-tile__title">Medical Calls</p>
                  <p className="muted">{stationSummary?.nearbyIncidents || 0} in coverage</p>
                  <span className="station-tag">
                    {stationSummary?.statusCounts?.enroute || 0} responding
                  </span>
                </div>
                <div className="station-tile">
                  <p className="station-tile__title">Patient Care</p>
                  <p className="muted">{stationSummary?.statusCounts?.on_scene || 0} on scene</p>
                  <span className="station-tag">
                    {stationSummary?.statusCounts?.available || 0} units available
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="station-card">
              <p className="station-card__title">Recovery Operations</p>
              <div className="station-grid">
                <div className="station-tile">
                  <p className="station-tile__title">Roadside Queue</p>
                  <p className="muted">{stationSummary?.nearbyIncidents || 0} active requests</p>
                  <span className="station-tag">
                    {stationSummary?.statusCounts?.enroute || 0} enroute
                  </span>
                </div>
                <div className="station-tile">
                  <p className="station-tile__title">Recovery Progress</p>
                  <p className="muted">{stationSummary?.statusCounts?.on_scene || 0} at scene</p>
                  <span className="station-tag">
                    {stationSummary?.statusCounts?.available || 0} trucks available
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {stationPanelTab === 'vehicles' && (
        <>
          <div className="section-title">Fleet Status</div>
          <FleetPanel
            vehicles={vehicles}
            formatSeconds={formatSeconds}
            vehicleStatus={vehicleStatus}
            onAssignCrew={onAssignCrew}
            onReleaseCrew={onReleaseCrew}
            unitTypes={unitTypes}
          />
        </>
      )}

      {stationPanelTab === 'staffing' && (
        <>
          <div className="section-title">Shift Schedule</div>
          <div className="station-tab-grid station-tab-grid--staffing">
            <div className="station-card">
              <div className="station-action-row station-action-row--spaced">
                <div>
                  <p className="station-card__title">Coverage</p>
                  <p className="muted">
                    Choose when this station is staffed (local time).
                  </p>
                </div>
                <select
                  className="station-input"
                  value={station?.shiftPreset || '24_7'}
                  onChange={(event) => onUpdateShiftPreset?.(event.target.value)}
                >
                  <option value="24_7">24/7 Coverage</option>
                  <option value="day">Day Shift (08:00-20:00)</option>
                  <option value="night">Night Shift (20:00-08:00)</option>
                </select>
              </div>
              <p className="muted">
                Off-duty units return to station until the next shift.
              </p>
            </div>

            <div className="station-card">
              <p className="station-card__title">Minimum On-Duty Units</p>
              <div className="station-action-row station-action-row--spaced">
                <label className="muted">
                  Day shift
                  <input
                    className="station-input"
                    type="number"
                    min="0"
                    max="10"
                    value={station?.minOnDutyDay ?? 1}
                    onChange={(event) => onUpdateMinOnDuty?.('minOnDutyDay', event.target.value)}
                  />
                </label>
                <label className="muted">
                  Night shift
                  <input
                    className="station-input"
                    type="number"
                    min="0"
                    max="10"
                    value={station?.minOnDutyNight ?? 1}
                    onChange={(event) => onUpdateMinOnDuty?.('minOnDutyNight', event.target.value)}
                  />
                </label>
              </div>
              <p className="muted">Stations will auto-activate this many units when on duty.</p>
            </div>
          </div>

          <div className="section-title">Personnel Roster</div>
          <div className="station-card">
            <div className="station-action-row station-action-row--spaced">
              <div>
                <p className="muted">Assigned: {personnelAssigned} / {personnelCapacity}</p>
                <p className="muted">Crew units to unlock dispatch.</p>
              </div>
              <div className="station-action-row">
                <button
                  className="btn btn--small"
                  onClick={onHirePersonnel}
                  disabled={personnelAssigned >= personnelCapacity}
                >
                  Hire (${personnelHireCost})
                </button>
                <button className="btn btn--small" onClick={onUpgradePersonnel}>
                  Expand (${personnelUpgradeCost})
                </button>
              </div>
            </div>
            <div className="station-grid">
              <div className="station-tile station-tile--disabled">
                <p className="station-tile__title">{staffingPrimaryLabel}</p>
                <p className="muted">0 assigned - Hire personnel to crew units.</p>
                <span className="station-tag station-tag--disabled">Coming soon</span>
              </div>
              <div className="station-tile station-tile--disabled">
                <p className="station-tile__title">{staffingSecondaryLabel}</p>
                <p className="muted">0 assigned - Improves response efficiency.</p>
                <span className="station-tag station-tag--disabled">Coming soon</span>
              </div>
              <div className="station-tile station-tile--disabled">
                <p className="station-tile__title">{staffingThirdLabel}</p>
                <p className="muted">0 assigned - Required for high-risk calls.</p>
                <span className="station-tag station-tag--disabled">Coming soon</span>
              </div>
            </div>
          </div>
        </>
      )}


      {isPolice && stationPanelTab === 'detention' && (
        <>
          <div className="section-title">Detention Operations</div>
          <div className="station-card">
            <div className="station-action-row station-action-row--spaced">
              <div>
                <p className="station-card__title">Capacity Status</p>
                <p className="muted">
                  Cells {station?.jailCount || 0}/{station?.jailCapacity || 0} - Prison{' '}
                  {prisonSummary?.totalCapacity
                    ? `${prisonSummary.totalCount}/${prisonSummary.totalCapacity}`
                    : 'None'}
                </p>
              </div>
              {prisonSummary?.available > 0 &&
                (station?.jailCapacity || 0) > 0 &&
                (station?.jailCount || 0) >= station.jailCapacity &&
                (
                  <button className="btn btn--small" onClick={onTransferDetention}>
                    Transfer to Prison
                  </button>
                )}
            </div>
            {station?.jailCapacity &&
              (station?.jailCount || 0) >= station.jailCapacity && (
                <span className="station-tag station-tag--alert">Cells at capacity</span>
              )}
            {prisonSummary?.totalCapacity > 0 && prisonSummary.available <= 0 && (
              <span className="station-tag station-tag--alert">Prison at capacity</span>
            )}
          </div>
          <div className="station-card">
            <p className="station-card__title">Detention History</p>
            <div className="station-list">
              {station?.detentionLog?.length ? (
                station.detentionLog.map((entry) => (
                  <div key={entry.id} className="station-list__row">
                    <span>{entry.type}</span>
                    <span className="muted">
                      {entry.destination === 'prison' ? 'Prison' : 'Cells'} - {entry.time}
                    </span>
                  </div>
                ))
              ) : (
                <p className="muted">No detention records yet.</p>
              )}
            </div>
          </div>
        </>
      )}

      {stationPanelTab === 'extensions' && (
        <div className="station-card">
          <p className="station-card__title">Extensions</p>
          <div className="station-grid">
            <div className="station-tile">
              <p className="station-tile__title">Garage Expansion</p>
              <p className="muted">Adds 2 parking bays.</p>
              <div className="station-action-row">
                <button className="btn btn--small" onClick={handleGarageUpgrade}>
                  Upgrade (${garageUpgradeCost})
                </button>
              </div>
            </div>
            <div className="station-tile">
              <p className="station-tile__title">HQ Upgrade</p>
              <p className="muted">Boosts response speed by 5%.</p>
              <div className="station-action-row">
                <button className="btn btn--small" onClick={handleHQUpgrade}>
                  Upgrade (${hqUpgradeCost})
                </button>
              </div>
            </div>
            <div className="station-tile">
              <p className="station-tile__title">Training Program</p>
              <p className="muted">Reduces fatigue buildup for this station.</p>
              <div className="station-action-row">
                <button className="btn btn--small" onClick={onTrainingUpgrade}>
                  Upgrade (${trainingUpgradeCost})
                </button>
              </div>
            </div>
            <div className="station-tile">
              <p className="station-tile__title">Regional Outpost</p>
              <p className="muted">Add a secondary station.</p>
              <span className="station-tag">Requires Level 5</span>
            </div>
            {isPolice && (
              <div className="station-tile">
                <p className="station-tile__title">Traffic Unit</p>
                <p className="muted">Unlock traffic response vehicle.</p>
                <span className="station-tag">
                  {progression.trafficUnitUnlocked ? 'Unlocked' : 'Resolve 3 calls'}
                </span>
              </div>
            )}
            {isFire && (
              <div className="station-tile">
                <p className="station-tile__title">Ladder Company</p>
                <p className="muted">Adds vertical rescue capability.</p>
                <span className="station-tag">
                  {progression.fireRescueUnlocked ? 'Unlocked' : 'Resolve 4 fire calls'}
                </span>
              </div>
            )}
            {isEms && (
              <div className="station-tile">
                <p className="station-tile__title">ALS Response Unit</p>
                <p className="muted">Improves response for critical medical calls.</p>
                <span className="station-tag">
                  {progression.emsAdvancedCareUnlocked ? 'Unlocked' : 'Resolve 4 EMS calls'}
                </span>
              </div>
            )}
            {isTow && (
              <div className="station-tile">
                <p className="station-tile__title">Heavy Wrecker Bay</p>
                <p className="muted">Supports large vehicle and trailer recoveries.</p>
                <span className="station-tag">
                  {progression.towHeavyRecoveryUnlocked ? 'Unlocked' : 'Resolve 4 tow calls'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {stationPanelTab === 'complex' && (
        <div className="station-card">
          <p className="station-card__title">Building Complex</p>
          <div className="station-grid">
            <div className="station-tile station-tile--alert">
              <p className="station-tile__title">Upgrade HQ to Complex Base</p>
              <p className="muted">Requires station level 5.</p>
              <span className="station-tag">
                {progression.precinctUpgradeUnlocked ? 'Ready to build' : 'Resolve 8 calls'}
              </span>
            </div>
            <div className="station-tile station-tile--alert">
              <p className="station-tile__title">Add New Wing</p>
              <p className="muted">Requires station level 7.</p>
            </div>
          </div>
        </div>
      )}

      {stationPanelTab === 'storage' && (
        <div className="station-card">
          <p className="station-card__title">Storage</p>
          <p className="muted">
            Equipment, evidence lockers, and supply inventory will appear here.
          </p>
          <div className="station-pill-row">
            {isPolice && <span className="station-pill">Evidence: 0</span>}
            {isFire && <span className="station-pill">Hose Packs: 12</span>}
            {isFire && <span className="station-pill">SCBA Sets: 8</span>}
            {isEms && <span className="station-pill">Trauma Kits: 6</span>}
            {isEms && <span className="station-pill">Oxygen Cylinders: 14</span>}
            {isTow && <span className="station-pill">Recovery Gear: 10</span>}
            {isTow && <span className="station-pill">Tow Straps: 18</span>}
            {!isPolice && !isFire && !isEms && !isTow && <span className="station-pill">Field Supplies: 10</span>}
            <span className="station-pill">Medical Kits: 4</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default StationPanel
