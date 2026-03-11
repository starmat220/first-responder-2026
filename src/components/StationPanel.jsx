import React from 'react'
import FleetPanel from './FleetPanel'
import StaffRoster from './StaffRoster'
import { PROGRESSION_MILESTONES } from '../game/constants'
import { DEPARTMENTS } from '../game/departments'
import '../Theme.css'

const TAB_META = {
  overview: {
    label: 'Overview',
    hint: 'Readiness, bottlenecks, and operating posture at a glance.',
  },
  vehicles: {
    label: 'Fleet',
    hint: 'Buy vehicles, expand fleet capacity, and manage unit readiness.',
  },
  staffing: {
    label: 'Personnel',
    hint: 'Hire staff, assign crews, and control shift coverage.',
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
  tutorialStep,
}) => {
  const departmentId = station?.department || DEPARTMENTS.police.id
  const isPolice = departmentId === DEPARTMENTS.police.id
  const isFire = departmentId === DEPARTMENTS.fire.id
  const isEms = departmentId === DEPARTMENTS.ems.id
  const isTow = departmentId === DEPARTMENTS.tow.id
  const isCoastal = departmentId === DEPARTMENTS.coastal.id
  const isLogistics = departmentId === DEPARTMENTS.logistics.id

  const glyphText = isPolice
    ? 'P'
    : isFire
      ? 'F'
      : isEms
        ? 'E'
        : isTow
          ? 'T'
          : isCoastal
            ? 'CR'
            : isLogistics
              ? 'LOG'
              : 'PW'

  const activeVehicles = vehicles.filter(v => v.status === vehicleStatus.enroute || v.status === vehicleStatus.on_scene).length
  const availableCount = vehicles.filter(v => v.status === vehicleStatus.available).length

  const DEPT_RGB = {
    police: '96, 171, 255',
    fire: '255, 122, 101',
    ems: '255, 178, 84',
    tow: '255, 209, 125',
    coastal: '77, 213, 255',
    logistics: '157, 215, 255',
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
  const patientCount = station?.patientCount || 0
  const patientCapacity = station?.patientCapacity || 0
  const impoundCount = station?.impoundCount || 0
  const impoundCapacity = station?.impoundCapacity || 0
  const detentionLoad = isPolice
    ? detentionCount / Math.max(1, detentionCapacity || 1)
    : 0
  const patientLoad = isEms
    ? patientCount / Math.max(1, patientCapacity || 1)
    : 0
  const impoundLoad = isTow
    ? impoundCount / Math.max(1, impoundCapacity || 1)
    : 0
  const unitLoad = vehicles.length > 0 ? activeVehicles / vehicles.length : 0
  const personnelLoad = personnelCapacity > 0 ? personnelAssigned / personnelCapacity : 0
  const crewShortfallCount = vehicles.filter(v => v.crewAssigned < v.crewRequired).length
  const riskSignals = []
  if (incidentPressure >= 3) riskSignals.push(`High local call pressure (${incidentPressure})`)
  if (unitLoad > 0.7) riskSignals.push('Most units are committed')
  if (freePersonnelSlots === 0) riskSignals.push('Personnel at capacity')
  if (isPolice && detentionLoad >= 0.85) riskSignals.push('Detention nearing capacity')
  if (isEms && patientLoad >= 0.85) riskSignals.push('Treatment capacity nearing saturation')
  if (isTow && impoundLoad >= 0.85) riskSignals.push('Impound capacity nearing saturation')
  const riskLevel = riskSignals.length >= 3 ? 'High' : riskSignals.length > 0 ? 'Elevated' : 'Stable'
  const riskTone =
    riskLevel === 'High'
      ? { borderColor: 'rgba(239, 68, 68, 0.45)', color: '#ffb4b4' }
      : riskLevel === 'Elevated'
        ? { borderColor: 'rgba(245, 158, 11, 0.45)', color: '#ffd58f' }
        : { borderColor: 'rgba(16, 185, 129, 0.35)', color: '#a8f0cf' }
  const shiftPresetLabel =
    station?.shiftPreset === 'day'
      ? 'Day Shift 08:00-20:00'
      : station?.shiftPreset === 'night'
        ? 'Night Shift 20:00-08:00'
        : '24/7 Full Coverage'
  const primaryRoleLabel = isPolice
    ? 'Patrol coverage and custody flow management.'
    : isFire
      ? 'Suppression readiness and rapid apparatus deployment.'
      : isEms
        ? 'Patient stabilization and transport continuity.'
        : isTow
          ? 'Clearance flow and roadway recovery throughput.'
          : isCoastal
            ? 'Waterfront rescue coverage and marine response readiness.'
            : isLogistics
              ? 'Regional coordination, staging, and support continuity.'
              : 'Infrastructure continuity and utility response readiness.'
  const nextMoveLabel = vehicles.length === 0
    ? 'Open Fleet and purchase the first unit.'
    : crewShortfallCount > 0
      ? 'Open Personnel to fill roster gaps, then assign crews in Fleet.'
      : incidentPressure >= 3
        ? 'Sector pressure is climbing. Expansion or reserve coverage should be next.'
        : 'Station is balanced. Monitor demand and expand only when pressure increases.'
  const specialCapacityCard = isPolice
    ? {
      title: 'Detention',
      value: `${detentionCount}/${detentionCapacity || 0}`,
      detail: 'holding cells occupied',
      alert: detentionLoad >= 0.85,
    }
    : isEms
      ? {
        title: 'Treatment',
        value: `${patientCount}/${patientCapacity || 0}`,
        detail: 'patients in care',
        alert: patientLoad >= 0.85,
      }
      : isTow
        ? {
          title: 'Impound',
          value: `${impoundCount}/${impoundCapacity || 0}`,
          detail: 'recovered vehicles stored',
          alert: impoundLoad >= 0.85,
        }
        : {
          title: 'Coverage',
          value: `${station?.operationRadiusKm || 0}km`,
          detail: 'operational reach',
          alert: false,
        }
  const activeSpecialization = (specializationOptions || []).find(
    (item) => item.id === (station?.specialization || 'standard')
  )
  const HIDE_LEGACY_OVERVIEW_PROCUREMENT = true
  const guideFleet = tutorialStep === 'buy_vehicle'
  const guidePersonnel = tutorialStep === 'buy_vehicle' && vehicles.length > 0 && crewShortfallCount > 0
  const commandDirective = vehicles.length === 0
    ? {
      eyebrow: 'Next Step',
      title: 'No units staged',
      detail: 'Open Fleet and purchase the first unit to put this station into service.',
      accent: 'var(--color-success)',
    }
    : crewShortfallCount > 0
      ? {
        eyebrow: 'Staffing Gap',
        title: `${crewShortfallCount} unit${crewShortfallCount !== 1 ? 's' : ''} need crew`,
        detail: 'Hire in Personnel, then return to Fleet to assign crews and clear the gap.',
        accent: 'var(--color-ems)',
      }
      : null

  return (
    <div
      className={`panel-content-only station-panel-content menu-shell station-panel--${departmentId}`}
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
            className={`menu-tab ${resolvedStationTab === tabId ? 'menu-tab--active' : ''} ${guideFleet && tabId === 'vehicles' ? 'menu-tab--guided' : ''} ${guidePersonnel && tabId === 'staffing' ? 'menu-tab--guided' : ''}`}
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
          <div style={{ display: 'grid', gap: '16px' }}>
            {/* Beginner callout: shown when station has no vehicles yet */}
            {tutorialStep === '__legacy_banner_disabled__' && vehicles.length === 0 && (
              <div className="beginner-banner" style={{ marginBottom: '12px' }}>
                <div className="beginner-banner__icon">🚔</div>
                <div className="beginner-banner__body">
                  <p><strong>Your station has no units yet.</strong> Open the <em>Fleet</em> tab to buy your first unit and start responding to incidents.</p>
                  <p style={{ marginTop: '4px', color: 'var(--color-police)', fontWeight: 700, fontSize: '0.68rem' }}>
                    NEXT STEP: Fleet → Buy a unit
                  </p>
                </div>
              </div>
            )}
            {tutorialStep === '__legacy_banner_disabled__' && vehicles.length > 0 && crewShortfallCount > 0 && (
              <div className="beginner-banner" style={{ marginBottom: '12px', borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
                <div className="beginner-banner__icon">👮</div>
                <div className="beginner-banner__body">
                  <p><strong>{crewShortfallCount} unit{crewShortfallCount !== 1 ? 's' : ''} need crew.</strong> Go to the <em>Personnel</em> tab to hire staff, then <em>Fleet</em> to assign crew to units.</p>
                </div>
              </div>
            )}
            <div className="station-overview-layout">
              <ModuleCard
                title="Status Board"
                action={(
                  <span className="station-pill" style={riskTone}>
                    {riskLevel}
                  </span>
                )}
              >
                {commandDirective && (
                  <div
                    className="station-directive"
                    style={{ '--directive-accent': commandDirective.accent }}
                  >
                    <div className="station-directive__copy">
                      <span className="station-directive__eyebrow">{commandDirective.eyebrow}</span>
                      <strong className="station-directive__title">{commandDirective.title}</strong>
                      <p className="station-directive__detail">{commandDirective.detail}</p>
                    </div>
                  </div>
                )}
                <div className="station-overview-strip">
                  <div className="station-overview-metric">
                    <span className="station-overview-metric__label">Ready</span>
                    <strong className="station-overview-metric__value">{availableCount}/{vehicles.length}</strong>
                    <span className="muted">{activeVehicles} committed</span>
                  </div>
                  <div className="station-overview-metric">
                    <span className="station-overview-metric__label">Sector</span>
                    <strong className="station-overview-metric__value">{incidentPressure}</strong>
                    <span className="muted">active calls nearby</span>
                  </div>
                  <div className="station-overview-metric">
                    <span className="station-overview-metric__label">Staffing</span>
                    <strong className="station-overview-metric__value">{Math.round(personnelLoad * 100)}%</strong>
                    <span className="muted">{freePersonnelSlots} slots open</span>
                  </div>
                </div>
                <div className="station-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                  <div className="station-tile">
                    <p className="station-tile__title">Primary Role</p>
                    <p className="muted">{primaryRoleLabel}</p>
                  </div>
                  <div className="station-tile">
                    <p className="station-tile__title">Recommended Next Move</p>
                    <p className="muted">{nextMoveLabel}</p>
                  </div>
                </div>
              </ModuleCard>

              {!HIDE_LEGACY_OVERVIEW_PROCUREMENT && (
              <ModuleCard
                title="Procurement"
                action={
                  <div style={{ display: 'flex', align: 'center', gap: '6px' }}>
                    <span className="muted">{freeFleetSlots} garage slot{freeFleetSlots !== 1 ? 's' : ''} free</span>
                    {vehicles.length === 0 && (
                      <span className="status-badge" style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)', fontSize: '0.48rem' }}>
                        START HERE
                      </span>
                    )}
                  </div>
                }
              >
                {freeFleetSlots <= 0 && (
                  <p className="muted" style={{ marginBottom: '8px', color: 'var(--color-ems)' }}>
                    ⚠ Garage is full — expand garage first to purchase more units.
                  </p>
                )}
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
                            : `Purchase ${unit.label} — needs 1 crew member to dispatch`
                        }
                      >
                        <span className="procurement-btn__label">{unit.label}</span>
                        <span className="procurement-btn__cost">${unitTypes[unit.id]?.cost ?? unit.cost}</span>
                        {vehicles.length === 0 && <span style={{ fontSize: '0.5rem', color: 'var(--color-success)', display: 'block', marginTop: '2px' }}>← Buy this first</span>}
                      </button>
                    ))
                  ) : (
                    <p className="muted">No additional unit types are available yet. Resolve more calls to unlock.</p>
                  )}
                </div>
              </ModuleCard>
              )}
            </div>

            <div className="department-module">
              <ModuleCard title="Capacity Watch">
                <div className="station-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                  <div className="station-tile">
                    <p className="station-tile__title">Fleet</p>
                    <p className="muted">{vehicles.length}/{fleetCapacity} deployed capacity</p>
                  </div>
                  <div className="station-tile">
                    <p className="station-tile__title">Personnel</p>
                    <p className="muted">{personnelAssigned}/{personnelCapacity} rostered</p>
                  </div>
                  <div className={`station-tile ${specialCapacityCard.alert ? 'station-tile--alert' : ''}`}>
                    <p className="station-tile__title">{specialCapacityCard.title}</p>
                    <p className="muted">{specialCapacityCard.value} {specialCapacityCard.detail}</p>
                  </div>
                  <div className="station-tile">
                    <p className="station-tile__title">Reach</p>
                    <p className="muted">{station?.operationRadiusKm || 0}km service radius</p>
                  </div>
                </div>
              </ModuleCard>
              <ModuleCard title="Operating Posture">
                <div className="station-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', marginBottom: '8px' }}>
                  <div className="station-tile">
                    <p className="station-tile__title">Doctrine</p>
                    <p className="muted">{activeSpecialization?.label || 'Standard Operations'}</p>
                  </div>
                  <div className="station-tile">
                    <p className="station-tile__title">Shift Coverage</p>
                    <p className="muted">{shiftPresetLabel}</p>
                  </div>
                  <div className="station-tile">
                    <p className="station-tile__title">Minimum Duty</p>
                    <p className="muted">{station?.minOnDutyDay ?? 1} day / {station?.minOnDutyNight ?? 1} night</p>
                  </div>
                  <div className="station-tile">
                    <p className="station-tile__title">Crew Gaps</p>
                    <p className="muted">{crewShortfallCount} unit{crewShortfallCount !== 1 ? 's' : ''} awaiting crew</p>
                  </div>
                </div>
                <div className="station-list station-list--compact">
                  {riskSignals.length > 0 ? (
                    riskSignals.map((signal) => (
                      <div key={signal} className="station-list__row">
                        <span>{signal}</span>
                        <span className="muted">Attention</span>
                      </div>
                    ))
                  ) : (
                    <div className="station-list__row">
                      <span>No immediate bottlenecks detected</span>
                      <span className="muted">Stable</span>
                    </div>
                  )}
                </div>
              </ModuleCard>
            </div>
          </div>
        )}

        {resolvedStationTab === 'vehicles' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            <ModuleCard
              title="Procurement"
              action={(
                <div style={{ display: 'flex', align: 'center', gap: '6px' }}>
                  <span className="muted">{freeFleetSlots} garage slot{freeFleetSlots !== 1 ? 's' : ''} free</span>
                  {vehicles.length === 0 && (
                    <span className="status-badge" style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)', fontSize: '0.48rem' }}>
                      START HERE
                    </span>
                  )}
                </div>
              )}
            >
              {freeFleetSlots <= 0 && (
                <p className="muted" style={{ marginBottom: '8px', color: 'var(--color-ems)' }}>
                  Garage is full. Expand garage first to purchase more units.
                </p>
              )}
              <div className="procurement-row">
                {(availableUnits || []).length > 0 ? (
                  availableUnits.map((unit) => (
                    <button
                      key={unit.id}
                      className={`procurement-btn ${guideFleet && vehicles.length === 0 ? 'procurement-btn--guided' : ''}`}
                      onClick={() => handleBuyVehicle(unit.id)}
                      disabled={freeFleetSlots <= 0}
                      title={
                        freeFleetSlots <= 0
                          ? 'No garage slots available. Expand garage first.'
                          : `Purchase ${unit.label} - needs 1 crew member to dispatch`
                      }
                    >
                      <span className="procurement-btn__label">{unit.label}</span>
                      <span className="procurement-btn__cost">${unitTypes[unit.id]?.cost ?? unit.cost}</span>
                      {vehicles.length === 0 && (
                        <span style={{ fontSize: '0.5rem', color: 'var(--color-success)', display: 'block', marginTop: '2px' }}>
                          Buy this first
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <p className="muted">No additional unit types are available yet. Resolve more calls to unlock.</p>
                )}
              </div>
            </ModuleCard>

            <ModuleCard title="Fleet Management">
              <div style={{ display: 'grid', gap: '8px' }}>
                <button className="cmd-btn cmd-btn--ghost cmd-btn--small" onClick={handleGarageUpgrade}>
                  Expand Garage (${garageUpgradeCost})
                </button>
              </div>
            </ModuleCard>

            <FleetPanel
              vehicles={vehicles}
              formatSeconds={formatSeconds}
              vehicleStatus={vehicleStatus}
              onAssignCrew={onAssignCrew}
              onReleaseCrew={onReleaseCrew}
              unitTypes={unitTypes}
            />
          </div>
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
                  <button className="cmd-btn cmd-btn--ghost cmd-btn--small" onClick={handleHQUpgrade}>
                    Upgrade Station HQ (${hqUpgradeCost})
                  </button>
                  {isPolice && (
                    <button
                      className="cmd-btn cmd-btn--ghost cmd-btn--small"
                      onClick={onTransferDetention}
                      disabled={detentionCount <= 0}
                      title={
                        detentionCount <= 0
                          ? 'No detainees waiting transfer'
                          : 'Transfer detainees to prison facility'
                      }
                    >
                      Transfer Intake
                    </button>
                  )}
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
