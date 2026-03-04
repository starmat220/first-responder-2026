import React from 'react'
import '../Theme.css'

const DEPARTMENT_META = {
  police: { label: 'Police', short: 'PD', color: 'var(--color-police)' },
  fire: { label: 'Fire', short: 'FD', color: 'var(--color-fire)' },
  ems: { label: 'EMS', short: 'EMS', color: 'var(--color-ems)' },
  tow: { label: 'Tow', short: 'TOW', color: 'var(--color-tow)' },
  public_works: { label: 'Public Works', short: 'PW', color: 'var(--color-public_works)' },
}

const getIncidentColor = (deptId) => DEPARTMENT_META[deptId]?.color || 'var(--color-police)'

const IncidentCard = ({
  incident,
  isCompact,
  selectedId,
  onSelect,
  onDispatch,
  eligibleIds = new Set(),
  vehicles = [],
  getReason,
  formatSeconds = (s) => s,
  onQuickDispatch,
  getIncidentEdgePercent,
}) => {
  if (!incident) return null
  const isOnScene = incident.status === 'on_scene'
  const isResponding = incident.status === 'responding'
  const isMajor = !!incident.isMajor
  const deptColor = getIncidentColor(incident.requiredDepartment)
  const activeColor = isOnScene ? 'var(--color-success)' : isMajor ? 'var(--color-urgent)' : deptColor
  const canDispatch = eligibleIds && eligibleIds.size > 0

  // Find the first assigned vehicle to track its journey
  const primaryVehicle = isResponding || isOnScene
    ? vehicles.find(v => incident.assignedVehicleIds?.includes(v.id))
    : null
  const edgePercent = primaryVehicle
    ? Math.max(0, Number(getIncidentEdgePercent?.(incident, primaryVehicle)) || 0)
    : 0

  const getSkillLabel = (deptId) => {
    if (deptId === 'police') return 'TACTICAL EDGE'
    if (deptId === 'fire') return 'SUPPRESSION'
    if (deptId === 'ems') return 'TRIAGE SPEED'
    if (deptId === 'public_works') return 'INFRA EXPEDITER'
    return 'RECOVERY TECH'
  }

  const timerLabel = incident.status === 'open'
    ? formatSeconds(incident.timeRemaining || 0)
    : incident.status === 'responding'
      ? `ETA ${formatSeconds(incident.etaSeconds || 0)}`
      : incident.status === 'on_scene'
        ? `SCENE ${formatSeconds(incident.onSceneRemaining || 0)}`
        : incident.status.toUpperCase()

  const progress = isOnScene
    ? ((incident.onSceneRemaining || 0) / (incident.onSceneDurationSeconds || 1))
    : isResponding && primaryVehicle
      ? (primaryVehicle.progressRatio || 0)
      : ((incident.timeRemaining || 0) / (incident.responseTargetSeconds || 1))

  return (
    <div
      className={`incident-card ${isCompact ? 'incident-card--compact' : ''} ${isResponding ? 'incident-card--responding' : ''} ${isMajor ? 'incident-card--major' : ''}`}
      style={{ borderLeftColor: activeColor }}
    >
      <div className="incident-card__header">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {isMajor && (
            <div className="status-badge status-badge--live" style={{ background: 'var(--color-urgent)', color: '#fff', fontSize: '0.55rem' }}>MAJOR EVENT</div>
          )}
          {incident.status === 'open' && !isCompact && !isMajor && (
            <div className="avatar avatar--officer" style={{ width: '32px', height: '32px' }}>
              <img src="/images/headshots/concerned_citizen.png" alt="Caller" />
            </div>
          )}
          <div className="incident-card__badges">
            <span className="status-badge" style={{ borderColor: activeColor, color: activeColor, marginRight: '4px' }}>
              P{incident.priority || '?'}
            </span>
            <span className="incident-card__type" style={{ color: isOnScene ? 'var(--color-success)' : isResponding ? 'var(--color-police)' : isMajor ? 'var(--color-urgent)' : '#fff' }}>
              {incident.type || 'Unknown Call'}
            </span>
          </div>
        </div>
        <div className="incident-card__timer" style={{ color: isOnScene ? 'var(--color-success)' : isResponding ? 'var(--color-police)' : 'var(--color-text-muted)' }}>
          {timerLabel}
        </div>
      </div>

      {!isCompact && (
        <div className="incident-card__body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p className="muted" style={{ marginBottom: '4px' }}>{incident.address || 'Location unknown'}</p>
            {isMajor ? (
              <span className="status-badge" style={{ fontSize: '0.5rem', borderColor: 'var(--color-urgent)', color: 'var(--color-urgent)' }}>
                MULTI-AGENCY RESPONSE
              </span>
            ) : (isResponding || isOnScene) && primaryVehicle && (
              <span
                className="status-badge"
                style={{ fontSize: '0.5rem', opacity: 0.8 }}
                title={`${getSkillLabel(
                  incident.requiredDepartment
                )} boosts reward and evidence results. Response grade is still based on arrival time.`}
              >
                {getSkillLabel(incident.requiredDepartment)}: {edgePercent}%
              </span>
            )}
          </div>
          <div className={`incident-bar ${isResponding ? 'incident-bar--journey' : ''}`}>
            {isResponding && (
              <div
                className="incident-unit-marker"
                style={{
                  left: `${progress * 100}%`,
                  '--unit-color': getIncidentColor(primaryVehicle?.department || 'police')
                }}
              >
                {primaryVehicle?.id}
              </div>
            )}
            <div
              className="incident-bar__fill"
              style={{
                width: `${Math.max(0, Math.min(100, progress * 100))}%`,
                background: isResponding ? 'rgba(255,255,255,0.1)' : activeColor,
                opacity: isResponding ? 0.5 : 1
              }}
            />
          </div>
        </div>
      )}

      {incident.status === 'open' && (
        <div className="incident-card__actions" style={{ marginTop: isCompact ? '0' : '8px' }}>
          <select
            className="cmd-select cmd-select--small"
            value={selectedId || ''}
            onChange={(e) => onSelect && onSelect(incident.id, e.target.value)}
            disabled={!canDispatch}
          >
            {canDispatch ? <option value="">Select Unit...</option> : <option value="">No Units Available</option>}
            {vehicles.map(v => {
              const reason = getReason ? getReason(v, incident) : ''
              return (
                <option key={v.id} value={v.id} disabled={!eligibleIds.has(v.id)}>
                  {v.name} {reason ? `(${reason})` : '(Ready)'}
                </option>
              )
            })}
          </select>
          <button
            className="cmd-btn cmd-btn--primary"
            onClick={() => onDispatch && onDispatch(incident.id, selectedId)}
            disabled={!selectedId}
          >
            DISPATCH
          </button>
          <button className="cmd-btn" onClick={() => onQuickDispatch && onQuickDispatch(incident.id)}>
            AUTO
          </button>
        </div>
      )}
    </div>
  )
}

const IncidentsPanel = ({
  incidents,
  getSelectedId,
  setDispatchSelection,
  dispatchVehicle,
  vehicles,
  formatSeconds,
  getEligibleVehicleIds,
  filters,
  setFilters,
  getVehicleIneligibilityReason,
  onQuickDispatch,
  getIncidentEdgePercent,
}) => {
  const openCount = incidents.filter((incident) => incident.status === 'open').length
  const activeCount = incidents.filter(
    (incident) => incident.status === 'open' || incident.status === 'responding' || incident.status === 'on_scene'
  ).length

  return (
    <div className="panel-content-only menu-shell">
      <div className="menu-shell__header">
        <div>
          <p className="menu-shell__title">Dispatch Queue</p>
          <p className="menu-shell__hint">Select units, dispatch fast, and monitor response timing.</p>
        </div>
        <div className="menu-shell__metrics">
          <span className="menu-stat-badge">{activeCount} active</span>
          <span className="menu-stat-badge">{openCount} open</span>
        </div>
      </div>
      <div className="menu-shell__toolbar">
        <button
          className={`cmd-btn cmd-btn--small ${filters.isCompact ? 'cmd-btn--primary' : ''}`}
          onClick={() => setFilters((p) => ({ ...p, isCompact: !p.isCompact }))}
        >
          {filters.isCompact ? 'Expanded View' : 'Compact View'}
        </button>
      </div>
      <div className="list-container menu-shell__body">
        {incidents.length === 0 && <p className="menu-empty">No active incidents.</p>}
        <div className="menu-card-list">
          {incidents.map((inc) => (
            <IncidentCard
              key={inc.id}
              incident={inc}
              isCompact={filters.isCompact}
              selectedId={getSelectedId(inc)}
              onSelect={(incId, val) => setDispatchSelection((p) => ({ ...p, [incId]: Number(val) }))}
              onDispatch={dispatchVehicle}
              eligibleIds={getEligibleVehicleIds(inc)}
              vehicles={vehicles}
              getReason={getVehicleIneligibilityReason}
              formatSeconds={formatSeconds}
              onQuickDispatch={onQuickDispatch}
              getIncidentEdgePercent={getIncidentEdgePercent}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default IncidentsPanel
