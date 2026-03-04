import React from 'react'
import FleetPanel from './FleetPanel'
import StaffRoster from './StaffRoster'
import { PROGRESSION_MILESTONES } from '../game/constants'
import { DEPARTMENTS } from '../game/departments'
import '../Theme.css'

const TAB_META = {
  overview: {
    label: 'Overview',
    hint: 'Immediate actions, operational risk, and resource status.',
  },
  vehicles: {
    label: 'Fleet',
    hint: 'Unit readiness, crew assignment, and response status.',
  },
  staffing: {
    label: 'Personnel',
    hint: 'Hiring, roster assignment, and shift coverage controls.',
  },
  extensions: {
    label: 'Upgrades',
    hint: 'Capability upgrades, specialization, and unlock progress.',
  },
}

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
  specializationOptions,
  onUpdateSpecialization,
  specializationDoctrineUnlocked,
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
  const visibleTabs = ['overview', 'vehicles', 'staffing', 'extensions']
  const resolvedStationTab = visibleTabs.includes(stationPanelTab)
    ? stationPanelTab
    : 'overview'
  const activeTabMeta = TAB_META[resolvedStationTab] || TAB_META.overview
  const fleetCapacity = station?.garageCapacity || 3
  const freeFleetSlots = Math.max(0, fleetCapacity - vehicles.length)
  const freePersonnelSlots = Math.max(0, personnelCapacity - personnelAssigned)
  const incidentPressure = stationSummary?.nearbyIncidents || 0
  const detentionCount = station?.jailCount || 0
  const detentionCapacity = station?.jailCapacity || 0
  const detentionLoad = isPolice
    ? detentionCount / Math.max(1, detentionCapacity || 1)
    : 0
  const unitLoad = vehicles.length > 0 ? activeVehicles / vehicles.length : 0
  const personnelLoad = personnelCapacity > 0 ? personnelAssigned / personnelCapacity : 0
  const riskSignals = []
  if (incidentPressure >= 3) riskSignals.push(`High local call pressure (${incidentPressure})`)
  if (unitLoad > 0.7) riskSignals.push('Most units are committed')
  if (freePersonnelSlots === 0) riskSignals.push('Personnel at capacity')
  if (isPolice && detentionLoad >= 0.85) riskSignals.push('Detention nearing capacity')
  const riskLevel = riskSignals.length >= 3 ? 'High' : riskSignals.length > 0 ? 'Elevated' : 'Stable'
  const activeSpecialization = (specializationOptions || []).find(
    (item) => item.id === (station?.specialization || 'standard')
  )

  const quickActions = [
    {
      id: 'hire',
      label: 'Hire +1',
      onClick: onHirePersonnel,
      disabled: personnelAssigned >= personnelCapacity,
      variant: 'primary',
      title:
        personnelAssigned >= personnelCapacity
          ? 'Personnel capacity reached. Expand personnel capacity first.'
          : `Hire personnel ($${personnelHireCost})`,
    },
    {
      id: 'garage',
      label: 'Expand Garage',
      onClick: handleGarageUpgrade,
      disabled: false,
      variant: 'ghost',
      title: `Expand garage ($${garageUpgradeCost})`,
    },
    {
      id: 'hq',
      label: 'Upgrade HQ',
      onClick: handleHQUpgrade,
      disabled: false,
      variant: 'ghost',
      title: `Upgrade station HQ ($${hqUpgradeCost})`,
    },
  ]
  if (isPolice) {
    quickActions.push({
      id: 'detention',
      label: 'Transfer Intake',
      onClick: onTransferDetention,
      disabled: detentionCount <= 0,
      variant: 'ghost',
      title:
        detentionCount <= 0
          ? 'No detainees waiting transfer'
          : 'Transfer detainees to prison facility',
    })
  }

  return (
    <div
      className="panel-content-only station-panel-content menu-shell"
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
      <div className="menu-tab-rail menu-tab-rail--station" style={{ marginBottom: '6px' }}>
        {visibleTabs.map((tabId) => (
          <button
            key={tabId}
            className={`menu-tab ${resolvedStationTab === tabId ? 'menu-tab--active' : ''}`}
            onClick={() => setStationPanelTab(tabId)}
          >
            {TAB_META[tabId].label}
          </button>
        ))}
      </div>
      <p className="menu-shell__hint">{activeTabMeta.hint}</p>

      {/* 4. Content Area */}
      <div className="list-container station-content" style={{ padding: '0' }}>
        {resolvedStationTab === 'overview' && (
          <div className="department-module">
            <div style={{ display: 'grid', gap: '16px' }}>
              <ModuleCard title="Immediate Actions">
                <div className="station-action-row">
                  {quickActions.map((action) => (
                    <button
                      key={action.id}
                      className={`cmd-btn cmd-btn--small ${action.variant === 'primary' ? 'cmd-btn--primary' : 'cmd-btn--ghost'}`}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      title={action.title}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
                <div className="station-grid" style={{ marginTop: '10px' }}>
                  <div className="station-tile">
                    <p className="station-tile__title">Command Focus</p>
                    <p className="muted">
                      {isPolice && 'Patrol coverage and custody flow management.'}
                      {isFire && 'Suppression readiness and rapid apparatus deployment.'}
                      {isEms && 'Patient stabilization and transport continuity.'}
                      {isTow && 'Clearance flow and roadway recovery throughput.'}
                      {isPW && 'Infrastructure continuity and utility response readiness.'}
                    </p>
                  </div>
                </div>
              </ModuleCard>

              <ModuleCard title="Procurement" action={<span className="muted">{freeFleetSlots} slots free</span>}>
                <div className="procurement-row">
                  {(availableUnits || []).length > 0 ? (
                    availableUnits.map((unit) => (
                      <button
                        key={unit.id}
                        className="procurement-btn"
                        onClick={() => handleBuyVehicle(unit.id)}
                        disabled={freeFleetSlots <= 0}
                        title={
                          freeFleetSlots <= 0
                            ? 'No garage slots available. Expand garage first.'
                            : `Purchase ${unit.label}`
                        }
                      >
                        <span className="procurement-btn__label">{unit.label}</span>
                        <span className="procurement-btn__cost">${unitTypes[unit.id]?.cost ?? unit.cost}</span>
                      </button>
                    ))
                  ) : (
                    <p className="muted">No additional unit types are available yet.</p>
                  )}
                </div>
              </ModuleCard>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              <ModuleCard
                title="Operational Risk"
                action={
                  <span className="station-pill">
                    {riskLevel}
                  </span>
                }
              >
                <div className="station-grid" style={{ marginBottom: '8px' }}>
                  <div className="station-tile">
                    <p className="station-tile__title">Incident Pressure</p>
                    <p className="muted">{incidentPressure} active calls in sector</p>
                  </div>
                  <div className="station-tile">
                    <p className="station-tile__title">Unit Utilization</p>
                    <p className="muted">{Math.round(unitLoad * 100)}% committed ({activeVehicles}/{Math.max(1, vehicles.length)})</p>
                  </div>
                  <div className={`station-tile ${isPolice && detentionLoad >= 0.85 ? 'station-tile--alert' : ''}`}>
                    <p className="station-tile__title">Personnel Load</p>
                    <p className="muted">{Math.round(personnelLoad * 100)}% staffed ({personnelAssigned}/{personnelCapacity})</p>
                  </div>
                </div>
                <div className="station-list station-list--compact">
                  {riskSignals.length > 0 ? (
                    riskSignals.map((signal) => (
                      <div key={signal} className="station-list__row">
                        <span>{signal}</span>
                        <span className="muted">Monitor</span>
                      </div>
                    ))
                  ) : (
                    <div className="station-list__row">
                      <span>No active risk signals</span>
                      <span className="muted">Stable</span>
                    </div>
                  )}
                </div>
              </ModuleCard>

              <ModuleCard title="Resources">
                <div className="station-grid">
                  <div className="station-tile">
                    <p className="station-tile__title">Ready Units</p>
                    <p className="muted">{availableCount} available now</p>
                  </div>
                  <div className="station-tile">
                    <p className="station-tile__title">Garage Capacity</p>
                    <p className="muted">{vehicles.length}/{fleetCapacity} ({freeFleetSlots} free)</p>
                  </div>
                  <div className="station-tile">
                    <p className="station-tile__title">Personnel Slots</p>
                    <p className="muted">{personnelAssigned}/{personnelCapacity} ({freePersonnelSlots} open)</p>
                  </div>
                  {isPolice && (
                    <div className={`station-tile ${detentionLoad >= 0.85 ? 'station-tile--alert' : ''}`}>
                      <p className="station-tile__title">Detention Capacity</p>
                      <p className="muted">{detentionCount}/{detentionCapacity || 0} in holding</p>
                    </div>
                  )}
                </div>
                <div className="station-kpi" style={{ marginTop: '8px' }}>
                  <p className="station-kpi__label">Active Doctrine</p>
                  <p className="station-kpi__value">{activeSpecialization?.label || 'Standard Operations'}</p>
                  <p className="muted" style={{ margin: 0, fontSize: '0.64rem' }}>
                    {activeSpecialization?.description || 'Balanced station operations profile.'}
                  </p>
                </div>
              </ModuleCard>
            </div>
          </div>
        )}

        {resolvedStationTab === 'vehicles' && (
          <FleetPanel
            vehicles={vehicles}
            formatSeconds={formatSeconds}
            vehicleStatus={vehicleStatus}
            onAssignCrew={onAssignCrew}
            onReleaseCrew={onReleaseCrew}
            unitTypes={unitTypes}
          />
        )}

        {resolvedStationTab === 'staffing' && (
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

        {resolvedStationTab === 'extensions' && (
          <div className="department-module">
            <div style={{ display: 'grid', gap: '16px' }}>
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

            <div style={{ display: 'grid', gap: '16px' }}>
              <ModuleCard title="Facility Management">
                <div style={{ display: 'grid', gap: '8px' }}>
                  <button className="cmd-btn cmd-btn--ghost cmd-btn--small" onClick={handleGarageUpgrade}>
                    Expand Garage (${garageUpgradeCost})
                  </button>
                  <button className="cmd-btn cmd-btn--ghost cmd-btn--small" onClick={handleHQUpgrade}>
                    Upgrade Station HQ (${hqUpgradeCost})
                  </button>
                  <button
                    className="cmd-btn cmd-btn--urgent cmd-btn--small"
                    style={{ marginTop: '8px' }}
                    onClick={() => {
                      if (window.confirm(`Decommission ${station.name}?`)) onDeleteStation()
                    }}
                  >
                    Decommission Station
                  </button>
                </div>
              </ModuleCard>

              <ModuleCard title="Specialization Doctrine">
                {specializationDoctrineUnlocked ? (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <select
                      className="cmd-select"
                      value={station?.specialization || 'standard'}
                      onChange={(event) => onUpdateSpecialization?.(event.target.value)}
                    >
                      {(specializationOptions || []).map((item) => (
                        <option
                          key={item.id}
                          value={item.id}
                          disabled={!item.unlocked}
                        >
                          {item.unlocked ? item.label : `${item.label} (Locked)`}
                        </option>
                      ))}
                    </select>
                    <p className="muted" style={{ fontSize: '0.66rem', margin: 0 }}>
                      {activeSpecialization?.description || 'Balanced station operations profile.'}
                    </p>
                  </div>
                ) : (
                  <p className="muted">
                    Unlock specialization doctrine through progression milestones.
                  </p>
                )}
              </ModuleCard>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StationPanel
