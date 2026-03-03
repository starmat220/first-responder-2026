import React from 'react'
import FleetPanel from './FleetPanel'
import StaffRoster from './StaffRoster'
import { PROGRESSION_MILESTONES } from '../game/constants'
import { DEPARTMENTS } from '../game/departments'
import '../Theme.css'

const StatItem = ({ label, value }) => (
  <div className="station-stat-item">
    <span className="station-stat-item__label">{label}</span>
    <span className="station-stat-item__value">{value}</span>
  </div>
)

const ModuleCard = ({ title, children, action }) => (
  <div className="module-card">
    <div className="module-card__header">
      <h3 className="module-card__title">{title}</h3>
      {action}
    </div>
    <div className="module-card__body">{children}</div>
  </div>
)

const StationPanel = ({
  stationPanelTab,
  setStationPanelTab,
  station,
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
  kennelUpgradeCost,
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
  onKennelUpgrade,
  onTransferDetention,
  onDeleteStation,
  stationSummary,
  onUpdateShiftPreset,
  onUpdateMinOnDuty,
  onAssignCrewMember,
  onUnassignCrewMember,
}) => {
  const departmentId = station?.department || DEPARTMENTS.police.id
  const isPolice = departmentId === DEPARTMENTS.police.id
  const isFire = departmentId === DEPARTMENTS.fire.id
  const isEms = departmentId === DEPARTMENTS.ems.id
  const isTow = departmentId === DEPARTMENTS.tow.id
  const isPW = departmentId === DEPARTMENTS.public_works.id

  const glyphText = isPolice ? 'P' : isFire ? 'F' : isEms ? 'E' : isPW ? 'PW' : 'T'

  const activeVehicles = vehicles.filter(v => v.status === vehicleStatus.enroute || v.status === vehicleStatus.on_scene).length
  const availableCount = vehicles.filter(v => v.status === vehicleStatus.available).length

  const DEPT_RGB = {
    police: '96, 171, 255',
    fire: '255, 122, 101',
    ems: '255, 178, 84',
    tow: '255, 209, 125',
    public_works: '160, 174, 192',
  }

  return (
    <div
      className="panel-content-only station-panel-content"
      style={{
        '--station-accent-rgb': DEPT_RGB[departmentId] || DEPT_RGB.police,
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
    >
      {/* 1. Hero Section */}
      <div className="station-hero" style={{ padding: '8px 0 16px' }}>
        <div className="station-hero__info">
          <div className="station-hero__glyph" style={{ background: 'rgba(var(--station-accent-rgb), 0.15)' }}>{glyphText}</div>
          <div className="station-hero__name-group">
            <div className="station-hero__name-wrap">
              <input
                className="station-hero__name"
                value={stationNameDraft}
                onChange={(e) => setStationNameDraft(e.target.value)}
                onBlur={onRenameStation}
                spellCheck={false}
              />
              <svg className="edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <p className="muted">{DEPARTMENTS[departmentId].label} Operations · Level {station?.level || 1}</p>
          </div>
        </div>
        <div className="station-hero__actions">
          <div className="readiness-indicator">
            <div className="readiness-dot" style={{ background: availableCount > 0 ? 'var(--color-success)' : 'var(--color-urgent)' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: '700' }}>{availableCount} UNITS READY</span>
          </div>
        </div>
      </div>

      {/* 2. Quick Stats Bar */}
      <div className="station-stats-grid" style={{ marginBottom: '12px' }}>
        <StatItem label="Fleet" value={`${vehicles.length}/${station?.garageCapacity || 3}`} />
        <StatItem label="Personnel" value={`${personnelAssigned}/${personnelCapacity}`} />
        <StatItem label="Efficiency" value={`${Math.round((station?.responseBonus || 0) * 100)}%`} />
        <StatItem label="Radius" value={`${station?.operationRadiusKm || 0}km`} />
      </div>

      {/* 3. Navigation Tabs */}
      <div className="tabs tabs--inner" style={{ marginBottom: '16px' }}>
        <button className={`tab ${stationPanelTab === 'overview' ? 'tab--active' : ''}`} onClick={() => setStationPanelTab('overview')}>Overview</button>
        <button className={`tab ${stationPanelTab === 'vehicles' ? 'tab--active' : ''}`} onClick={() => setStationPanelTab('vehicles')}>Fleet</button>
        <button className={`tab ${stationPanelTab === 'staffing' ? 'tab--active' : ''}`} onClick={() => setStationPanelTab('staffing')}>Personnel</button>
        {isPolice && <button className={`tab ${stationPanelTab === 'detention' ? 'tab--active' : ''}`} onClick={() => setStationPanelTab('detention')}>Detention</button>}
        <button className={`tab ${stationPanelTab === 'extensions' ? 'tab--active' : ''}`} onClick={() => setStationPanelTab('extensions')}>Upgrades</button>
      </div>

      {/* 4. Content Area */}
      <div className="list-container station-content" style={{ padding: '0' }}>
        {stationPanelTab === 'overview' && (
          <div className="department-module">
            {/* Left Column: Department Specific */}
            <div style={{ display: 'grid', gap: '16px' }}>
              {isPolice && (
                <ModuleCard title="Booking & Detention" action={<button className="cmd-btn cmd-btn--small" onClick={onTransferDetention}>Transfer</button>}>
                  <div className="station-kpi">
                    <p className="station-kpi__label">Short-term Cells</p>
                    <p className="station-kpi__value">{station?.jailCount || 0} / {station?.jailCapacity || 4}</p>
                  </div>
                  <div className="station-list station-list--compact" style={{ marginTop: '8px' }}>
                    {station?.detentionLog?.slice(0, 3).map(log => (
                      <div key={log.id} className="station-list__row">
                        <span>{log.type}</span>
                        <span className="muted">{log.time}</span>
                      </div>
                    ))}
                  </div>
                </ModuleCard>
              )}

              {isFire && (
                <ModuleCard title="Fireground Command">
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <div className="station-kpi">
                      <p className="station-kpi__label">Active Hydrants in Range</p>
                      <p className="station-kpi__value">12</p>
                    </div>
                    <div className="station-kpi">
                      <p className="station-kpi__label">Water Reserve</p>
                      <p className="station-kpi__value">100%</p>
                    </div>
                  </div>
                </ModuleCard>
              )}

              {isEms && (
                <ModuleCard title="Triage Center">
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <div className="station-kpi">
                      <p className="station-kpi__label">Critical Transports</p>
                      <p className="station-kpi__value">0</p>
                    </div>
                    <div className="station-kpi">
                      <p className="station-kpi__label">Medical Supplies</p>
                      <p className="station-kpi__value">Stocked</p>
                    </div>
                  </div>
                </ModuleCard>
              )}

              {isPW && (
                <ModuleCard title="City Infrastructure">
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <div className="station-kpi">
                      <p className="station-kpi__label">Grid Status</p>
                      <p className="station-kpi__value">Stable</p>
                    </div>
                    <div className="station-kpi">
                      <p className="station-kpi__label">Material Stockpile</p>
                      <p className="station-kpi__value">94%</p>
                    </div>
                  </div>
                </ModuleCard>
              )}

              <ModuleCard title="Procurement">
                <div className="procurement-row">
                  {availableUnits?.map((unit) => (
                    <div key={unit.id} className="procurement-btn" onClick={() => handleBuyVehicle(unit.id)}>
                      <span className="procurement-btn__label">{unit.label}</span>
                      <span className="procurement-btn__cost">${unitTypes[unit.id]?.cost ?? unit.cost}</span>
                    </div>
                  ))}
                </div>
              </ModuleCard>
            </div>

            {/* Right Column: General Ops */}
            <div style={{ display: 'grid', gap: '16px' }}>
              <ModuleCard title="Operations Status">
                <div className="station-grid">
                  <div className="station-tile">
                    <p className="station-tile__title">Active Calls</p>
                    <p className="muted">{stationSummary?.nearbyIncidents || 0} in sector</p>
                  </div>
                  <div className="station-tile">
                    <p className="station-tile__title">Unit Utilization</p>
                    <p className="muted">{activeVehicles} responding</p>
                  </div>
                </div>
              </ModuleCard>

              <ModuleCard title="Facility Management">
                <div style={{ display: 'grid', gap: '8px' }}>
                  <button className="cmd-btn cmd-btn--ghost cmd-btn--small" onClick={handleGarageUpgrade}>Expand Garage (${garageUpgradeCost})</button>
                  <button className="cmd-btn cmd-btn--ghost cmd-btn--small" onClick={handleHQUpgrade}>Upgrade Station HQ (${hqUpgradeCost})</button>
                  <button className="cmd-btn cmd-btn--urgent cmd-btn--small" style={{ marginTop: '8px' }} onClick={() => {
                    if (window.confirm(`Decommission ${station.name}?`)) onDeleteStation()
                  }}>Decommission Station</button>
                </div>
              </ModuleCard>
            </div>
          </div>
        )}

        {stationPanelTab === 'vehicles' && (
          <FleetPanel
            vehicles={vehicles}
            formatSeconds={formatSeconds}
            vehicleStatus={vehicleStatus}
            onAssignCrew={onAssignCrew}
            onReleaseCrew={onReleaseCrew}
            unitTypes={unitTypes}
          />
        )}

        {stationPanelTab === 'staffing' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            <ModuleCard title="Recruitment Center">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p className="muted">Total Personnel: {personnelAssigned} / {personnelCapacity}</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="cmd-btn cmd-btn--small" onClick={onHirePersonnel} disabled={personnelAssigned >= personnelCapacity}>Hire (${personnelHireCost})</button>
                  <button className="cmd-btn cmd-btn--small" onClick={onUpgradePersonnel}>Expand (${personnelUpgradeCost})</button>
                </div>
              </div>
            </ModuleCard>

            <StaffRoster
              crewMembers={station.crewMembers || []}
              vehicles={vehicles}
              onAssign={onAssignCrewMember}
              onUnassign={onUnassignCrewMember}
              departmentId={departmentId}
            />

            <div className="department-module">
              <ModuleCard title="Shift Schedule">
                <select
                  className="cmd-select"
                  value={station?.shiftPreset || '24_7'}
                  onChange={(event) => onUpdateShiftPreset?.(event.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="24_7">24/7 Full Coverage</option>
                  <option value="day">Day Shift (08:00-20:00)</option>
                  <option value="night">Night Shift (20:00-08:00)</option>
                </select>
              </ModuleCard>

              <ModuleCard title="Minimum Deployment">
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label className="muted">Day: <input className="cmd-select" type="number" value={station?.minOnDutyDay ?? 1} onChange={(e) => onUpdateMinOnDuty?.('minOnDutyDay', e.target.value)} style={{ width: '50px' }} /></label>
                  <label className="muted">Night: <input className="cmd-select" type="number" value={station?.minOnDutyNight ?? 1} onChange={(e) => onUpdateMinOnDuty?.('minOnDutyNight', e.target.value)} style={{ width: '50px' }} /></label>
                </div>
              </ModuleCard>
            </div>
          </div>
        )}

        {stationPanelTab === 'extensions' && (
          <div className="department-module">
            <ModuleCard title="Technical Upgrades">
              <div style={{ display: 'grid', gap: '8px' }}>
                <div className="station-tile">
                  <p className="station-tile__title">Training Academy</p>
                  <p className="muted">Reduces fatigue accumulation for all stationed units.</p>
                  <button className="cmd-btn cmd-btn--small" onClick={onTrainingUpgrade}>Upgrade (${trainingUpgradeCost})</button>
                </div>
                {isPolice && (
                  <div className="station-tile">
                    <p className="station-tile__title">K-9 Kennel</p>
                    <p className="muted">Houses K-9 units for search and rescue operations.</p>
                    {station.hasKennel ? (
                      <button className="cmd-btn cmd-btn--small" disabled style={{ opacity: 0.7 }}>ACTIVE</button>
                    ) : (
                      <button className="cmd-btn cmd-btn--small" onClick={onKennelUpgrade}>Construct (${kennelUpgradeCost})</button>
                    )}
                  </div>
                )}
                {isFire && (
                  <div className="station-tile">
                    <p className="station-tile__title">Apparatus Refit Bay</p>
                    <p className="muted">Reduces turnaround (cooldown) time by 20%.</p>
                    <button className="cmd-btn cmd-btn--small" disabled>UPGRADED</button>
                  </div>
                )}
                {isEms && (
                  <div className="station-tile">
                    <p className="station-tile__title">Med-Link Telemetry</p>
                    <p className="muted">Increases resolution rewards by 10%.</p>
                    <button className="cmd-btn cmd-btn--small" disabled>ACTIVE</button>
                  </div>
                )}
                {isTow && (
                  <div className="station-tile">
                    <p className="station-tile__title">Heavy Lift Cert</p>
                    <p className="muted">Unlocks specialized recovery equipment.</p>
                    <button className="cmd-btn cmd-btn--small" disabled>CERTIFIED</button>
                  </div>
                )}
              </div>
            </ModuleCard>
            <ModuleCard title="Operational Perks">
              {isPolice && (
                <div style={{ display: 'grid', gap: '4px' }}>
                  <span className="status-badge" style={{ borderColor: 'var(--color-police)', color: 'var(--color-police)' }}>Traffic Unit</span>
                  <p className="muted" style={{ fontSize: '0.65rem' }}>
                    {progression.trafficUnitUnlocked
                      ? 'STATION AUTHORIZED'
                      : `Resolve ${PROGRESSION_MILESTONES.trafficUnitUnlockedAt} calls to unlock`}
                  </p>
                </div>
              )}
              {isFire && (
                <div style={{ display: 'grid', gap: '4px' }}>
                  <span className="status-badge" style={{ borderColor: 'var(--color-fire)', color: 'var(--color-fire)' }}>Ladder Company</span>
                  <p className="muted" style={{ fontSize: '0.65rem' }}>
                    {progression.fireRescueUnlocked
                      ? 'UNIT UNLOCKED'
                      : `Resolve ${PROGRESSION_MILESTONES.fireRescueUnlockedAt} fire calls`}
                  </p>
                </div>
              )}
              {isEms && (
                <div style={{ display: 'grid', gap: '4px' }}>
                  <span className="status-badge" style={{ borderColor: 'var(--color-ems)', color: 'var(--color-ems)' }}>ALS Care</span>
                  <p className="muted" style={{ fontSize: '0.65rem' }}>
                    {progression.emsAdvancedCareUnlocked
                      ? 'CERTIFIED'
                      : `Resolve ${PROGRESSION_MILESTONES.emsAdvancedCareUnlockedAt} EMS calls`}
                  </p>
                </div>
              )}
              {isTow && (
                <div style={{ display: 'grid', gap: '4px' }}>
                  <span className="status-badge" style={{ borderColor: 'var(--color-tow)', color: 'var(--color-tow)' }}>Impound Lot</span>
                  <p className="muted" style={{ fontSize: '0.65rem' }}>
                    {progression.towHeavyRecoveryUnlocked
                      ? 'REVENUE ACTIVE'
                      : `Resolve ${PROGRESSION_MILESTONES.towHeavyRecoveryUnlockedAt} tow calls`}
                  </p>
                </div>
              )}
            </ModuleCard>
          </div>
        )}
      </div>
    </div>
  )
}

export default StationPanel
