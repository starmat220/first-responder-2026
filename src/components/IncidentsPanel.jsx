import React from 'react'
import '../Theme.css'

const DEPARTMENT_META = {
  police: { label: 'Police', short: 'PD', color: 'var(--color-police)' },
  fire: { label: 'Fire', short: 'FD', color: 'var(--color-fire)' },
  ems: { label: 'EMS', short: 'EMS', color: 'var(--color-ems)' },
  tow: { label: 'Tow', short: 'TOW', color: 'var(--color-tow)' },
  public_works: { label: 'Public Works', short: 'PW', color: 'var(--color-public_works)' },
}

const PRIORITY_LABELS = {
  1: { label: 'P1 CRITICAL', color: 'var(--color-urgent)' },
  2: { label: 'P2 URGENT', color: 'var(--color-ems)' },
  3: { label: 'P3 ROUTINE', color: 'var(--color-public_works)' },
}

const getIncidentColor = (deptId) => DEPARTMENT_META[deptId]?.color || 'var(--color-police)'
const getDeptLabel = (deptId) => DEPARTMENT_META[deptId]?.label || 'Unknown'

const getTimerClass = (timeRemaining, responseTarget) => {
  if (!timeRemaining || !responseTarget) return ''
  const ratio = timeRemaining / responseTarget
  if (ratio < 0.2) return 'incident-card__timer--urgent'
  if (ratio < 0.45) return 'incident-card__timer--warning'
  return ''
}

const getSkillLabel = (deptId) => {
  if (deptId === 'police') return 'TACTICAL EDGE'
  if (deptId === 'fire') return 'SUPPRESSION'
  if (deptId === 'ems') return 'TRIAGE SPEED'
  if (deptId === 'public_works') return 'INFRA'
  return 'RECOVERY'
}

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
  const priority = incident.priority || 2
  const prioMeta = PRIORITY_LABELS[priority] || PRIORITY_LABELS[2]

  const primaryVehicle = (isResponding || isOnScene)
    ? vehicles.find(v => incident.assignedVehicleIds?.includes(v.id))
    : null
  const edgePercent = primaryVehicle
    ? Math.max(0, Number(getIncidentEdgePercent?.(incident, primaryVehicle)) || 0)
    : 0

  const timerLabel = incident.status === 'open'
    ? formatSeconds(incident.timeRemaining || 0)
    : incident.status === 'responding'
      ? `ETA ${formatSeconds(incident.etaSeconds || 0)}`
      : incident.status === 'on_scene'
        ? `ON SCENE ${formatSeconds(incident.onSceneRemaining || 0)}`
        : incident.status.toUpperCase()

  const timerColorClass = incident.status === 'open'
    ? getTimerClass(incident.timeRemaining, incident.responseTargetSeconds)
    : ''

  const progress = isOnScene
    ? ((incident.onSceneRemaining || 0) / (incident.onSceneDurationSeconds || 1))
    : isResponding && primaryVehicle
      ? (primaryVehicle.progressRatio || 0)
      : ((incident.timeRemaining || 0) / (incident.responseTargetSeconds || 1))

  const unitAssignedCount = incident.assignedVehicleIds?.length || 0
  const unitRequired = incident.requiredUnits || 1
  const needsMore = isOnScene && unitAssignedCount < unitRequired

  return (
    <div
      className={[
        'incident-card',
        isCompact ? 'incident-card--compact' : '',
        isResponding ? 'incident-card--responding' : '',
        isMajor ? 'incident-card--major' : '',
      ].filter(Boolean).join(' ')}
      style={{ borderLeftColor: activeColor }}
    >
      {/* Header row */}
      <div className="incident-card__header">
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', minWidth: 0 }}>
          {isMajor && (
            <div className="status-badge status-badge--live" style={{ background: 'var(--color-urgent)', color: '#fff', fontSize: '0.5rem' }}>
              MAJOR
            </div>
          )}
          {incident.status === 'open' && !isCompact && !isMajor && (
            <div className="avatar avatar--officer" style={{ width: '28px', height: '28px', flexShrink: 0 }}>
              <img src="/images/headshots/concerned_citizen.png" alt="Caller" />
            </div>
          )}
          <div className="incident-card__badges" style={{ minWidth: 0 }}>
            <span
              className="status-badge"
              style={{ borderColor: prioMeta.color, color: prioMeta.color, marginRight: '5px' }}
              title={`Priority ${priority} — ${priority === 1 ? 'Life threatening, respond immediately' : priority === 2 ? 'Urgent situation' : 'Routine — lower penalty for late response'}`}
            >
              {prioMeta.label}
            </span>
            <span
              className="incident-card__type"
              style={{ color: isOnScene ? 'var(--color-success)' : isResponding ? 'var(--color-police)' : isMajor ? 'var(--color-urgent)' : '#fff' }}
            >
              {incident.type || 'Unknown Call'}
            </span>
          </div>
        </div>
        <div
          className={`incident-card__timer ${timerColorClass}`}
          style={{ color: isOnScene ? 'var(--color-success)' : isResponding ? 'var(--color-police)' : undefined, flexShrink: 0, fontWeight: timerColorClass ? 700 : 400 }}
          title={
            incident.status === 'open'
              ? `${formatSeconds(incident.timeRemaining || 0)} until the response window closes`
              : incident.status === 'responding'
                ? `ETA — unit arriving in ${formatSeconds(incident.etaSeconds || 0)}`
                : 'Unit is on scene'
          }
        >
          {timerLabel}
        </div>
      </div>

      {/* Body (full view only) */}
      {!isCompact && (
        <div className="incident-card__body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
            <div>
              <p className="muted" style={{ marginBottom: '2px' }}>
                {incident.address || 'Location on map'}
              </p>
              <p className="muted" style={{ fontSize: '0.6rem', color: deptColor, opacity: 0.8 }}>
                {getDeptLabel(incident.requiredDepartment)} · {unitRequired} unit{unitRequired !== 1 ? 's' : ''} required
              </p>
            </div>
            {isMajor && (
              <span className="status-badge" style={{ fontSize: '0.48rem', borderColor: 'var(--color-urgent)', color: 'var(--color-urgent)' }}>
                MULTI-AGENCY
              </span>
            )}
            {(isResponding || isOnScene) && primaryVehicle && !isMajor && (
              <span className="status-badge" style={{ fontSize: '0.48rem', opacity: 0.75 }}>
                {getSkillLabel(incident.requiredDepartment)}: {edgePercent}%
              </span>
            )}
          </div>

          {/* Progress / journey bar */}
          <div className={`incident-bar ${isResponding ? 'incident-bar--journey' : ''}`}>
            {isResponding && (
              <div
                className="incident-unit-marker"
                style={{
                  left: `${progress * 100}%`,
                  '--unit-color': getIncidentColor(primaryVehicle?.department || 'police'),
                }}
              >
                {primaryVehicle?.id}
              </div>
            )}
            <div
              className="incident-bar__fill"
              style={{
                width: `${Math.max(0, Math.min(100, progress * 100))}%`,
                background: isResponding ? 'rgba(255,255,255,0.12)' : activeColor,
                opacity: isResponding ? 0.6 : 1,
              }}
            />
          </div>

          {/* Multi-unit status */}
          {needsMore && (
            <p style={{ margin: '4px 0 0', fontSize: '0.6rem', color: 'var(--color-ems)' }}>
              ⚠ {unitRequired - unitAssignedCount} more unit{unitRequired - unitAssignedCount !== 1 ? 's' : ''} needed on scene
            </p>
          )}
        </div>
      )}

      {/* Dispatch controls */}
      {incident.status === 'open' && (
        <div className="incident-card__actions" style={{ marginTop: isCompact ? 0 : '8px', gap: '6px' }}>
          <select
            className="cmd-select cmd-select--small"
            value={selectedId || ''}
            onChange={(e) => onSelect && onSelect(incident.id, e.target.value)}
            disabled={!canDispatch}
            title={canDispatch ? 'Select which unit to dispatch manually' : 'No available units for this incident type'}
          >
            {canDispatch
              ? <option value="">Manual: Choose unit…</option>
              : <option value="">No units available</option>
            }
            {vehicles.map(v => {
              const reason = getReason ? getReason(v, incident) : ''
              const isEligible = eligibleIds.has(v.id)
              return (
                <option key={v.id} value={v.id} disabled={!isEligible}>
                  {v.name}{isEligible ? ' ✓' : reason ? ` (${reason})` : ''}
                </option>
              )
            })}
          </select>
          <button
            className="cmd-btn cmd-btn--primary"
            onClick={() => onDispatch && onDispatch(incident.id, selectedId)}
            disabled={!selectedId}
            title={selectedId ? 'Dispatch selected unit' : 'Choose a unit first'}
          >
            SEND
          </button>
          <button
            className="dispatch-btn"
            onClick={() => onQuickDispatch && onQuickDispatch(incident.id)}
            disabled={!canDispatch}
            title="Quick Dispatch — automatically sends the best available unit"
          >
            ⚡ QUICK
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
  hasStations,
  hasVehicles,
}) => {
  const openCount = incidents.filter((i) => i.status === 'open').length
  const respondingCount = incidents.filter((i) => i.status === 'responding').length
  const onSceneCount = incidents.filter((i) => i.status === 'on_scene').length
  const activeCount = openCount + respondingCount + onSceneCount

  return (
    <div className="panel-content-only menu-shell">
      <div className="menu-shell__header">
        <div>
          <p className="menu-shell__title">Dispatch Queue</p>
          <p className="menu-shell__hint">
            {activeCount === 0
              ? 'All clear — no active incidents right now.'
              : `${openCount} awaiting dispatch · ${respondingCount} en route · ${onSceneCount} on scene`
            }
          </p>
        </div>
        <div className="menu-shell__metrics">
          {openCount > 0 && (
            <span
              className="menu-stat-badge"
              style={{ borderColor: 'rgba(239,68,68,0.4)', color: 'var(--color-urgent)', background: 'rgba(239,68,68,0.08)' }}
            >
              {openCount} need dispatch
            </span>
          )}
          {activeCount > 0 && openCount === 0 && (
            <span className="menu-stat-badge">{activeCount} active</span>
          )}
        </div>
      </div>

      {/* View toggle */}
      <div style={{ padding: '6px 10px', display: 'flex', gap: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          className={`cmd-btn cmd-btn--small ${!filters.isCompact ? 'cmd-btn--primary' : ''}`}
          onClick={() => setFilters((p) => ({ ...p, isCompact: false }))}
          title="Show full incident details"
        >
          Full
        </button>
        <button
          className={`cmd-btn cmd-btn--small ${filters.isCompact ? 'cmd-btn--primary' : ''}`}
          onClick={() => setFilters((p) => ({ ...p, isCompact: true }))}
          title="Compact list — more incidents visible at once"
        >
          Compact
        </button>
        <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.3)', fontSize: '0.58rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: 'var(--color-urgent)' }}>■</span> P1 &nbsp;
          <span style={{ color: 'var(--color-ems)' }}>■</span> P2 &nbsp;
          <span style={{ color: 'var(--color-public_works)' }}>■</span> P3
        </span>
      </div>

      <div className="list-container menu-shell__body">
        {incidents.length === 0 ? (
          <div className="empty-state">
            {!hasStations ? (
              <>
                <div className="empty-state__icon">🏛️</div>
                <p className="empty-state__title">No Station Placed</p>
                <p className="empty-state__body">Place your HQ on the map first. Incidents will begin appearing once you have a station active.</p>
              </>
            ) : !hasVehicles ? (
              <>
                <div className="empty-state__icon">🚔</div>
                <p className="empty-state__title">No Units Deployed</p>
                <p className="empty-state__body">Open your station and purchase at least one patrol unit. Incidents spawn once dispatch is ready.</p>
              </>
            ) : (
              <>
                <div className="empty-state__icon">✅</div>
                <p className="empty-state__title">All Clear</p>
                <p className="empty-state__body">No incidents at the moment. Keep an eye here — calls come in automatically.</p>
              </>
            )}
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}

export default IncidentsPanel
