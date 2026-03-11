import React from 'react'
import '../Theme.css'

const DEPARTMENT_META = {
  police: { label: 'Police', short: 'PD', color: 'var(--color-police)', rgb: '96, 171, 255' },
  fire: { label: 'Fire', short: 'FD', color: 'var(--color-fire)', rgb: '255, 122, 101' },
  ems: { label: 'EMS', short: 'EMS', color: 'var(--color-ems)', rgb: '255, 214, 74' },
  tow: { label: 'Tow', short: 'TOW', color: 'var(--color-tow)', rgb: '230, 184, 91' },
  public_works: { label: 'Public Works', short: 'PW', color: 'var(--color-public_works)', rgb: '160, 174, 192' },
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
  tutorialStep,
}) => {
  if (!incident) return null
  const isOnScene = incident.status === 'on_scene'
  const isResponding = incident.status === 'responding'
  const isMajor = !!incident.isMajor
  const deptMeta = DEPARTMENT_META[incident.requiredDepartment] || DEPARTMENT_META.police
  const deptColor = deptMeta.color
  const progressColor = incident.status === 'open' ? 'var(--color-success)' : deptColor
  const activeColor = incident.status === 'open'
    ? 'var(--color-success)'
    : isMajor
      ? 'var(--color-urgent)'
      : deptColor
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
  const unitOnSceneCount = incident.onSceneVehicleIds?.length || 0
  const unitRequired = incident.requiredUnits || 1
  const canDispatchMore =
    (incident.status === 'open' || incident.status === 'responding') &&
    unitAssignedCount < unitRequired
  const needsMore = (isResponding || isOnScene) && unitOnSceneCount < unitRequired
  const flowRgb = incident.status === 'open' ? '46, 200, 183' : deptMeta.rgb

  return (
    <div
      className={[
        'incident-card',
        `incident-card--dept-${incident.requiredDepartment || 'police'}`,
        isCompact ? 'incident-card--compact' : '',
        isResponding ? 'incident-card--responding' : '',
        isMajor ? 'incident-card--major' : '',
      ].filter(Boolean).join(' ')}
      style={{
        borderLeftColor: activeColor,
        '--incident-accent-rgb': deptMeta.rgb,
      }}
    >
      {/* Header row */}
      <div className="incident-card__header">
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', minWidth: 0 }}>
          {isMajor && (
            <div className="status-badge status-badge--live" style={{ background: 'var(--color-urgent)', color: '#fff', fontSize: '0.5rem' }}>
              MAJOR
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
              style={{ color: incident.status === 'open' ? '#fff' : deptColor }}
            >
              {incident.type || 'Unknown Call'}
            </span>
          </div>
        </div>
        <div
          className={`incident-card__timer ${timerColorClass}`}
          style={{
            color: incident.status === 'open' ? undefined : deptColor,
            flexShrink: 0,
            fontWeight: timerColorClass ? 700 : 400,
          }}
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
          <div className="incident-card__meta-row">
            <div className="incident-card__meta-copy">
              <p className="muted" style={{ marginBottom: '2px' }}>
                {incident.address || 'Location on map'}
              </p>
              <p className="muted" style={{ fontSize: '0.6rem', color: deptColor, opacity: 0.8 }}>
                {getDeptLabel(incident.requiredDepartment)} · {unitRequired} unit{unitRequired !== 1 ? 's' : ''} required
              </p>
            </div>
            <div className="incident-card__meta-side">
              {(isResponding || isOnScene) && primaryVehicle && !isMajor && (
                <span className="status-badge" style={{ fontSize: '0.48rem', opacity: 0.75 }}>
                  {getSkillLabel(incident.requiredDepartment)}: {edgePercent}%
                </span>
              )}
              {isMajor && (
                <span className="status-badge" style={{ fontSize: '0.48rem', borderColor: 'var(--color-urgent)', color: 'var(--color-urgent)' }}>
                  MULTI-AGENCY
                </span>
              )}
              {isResponding && primaryVehicle && (
                <span className="incident-card__state-note" style={{ color: deptColor }}>
                  {unitOnSceneCount > 0
                    ? `${unitOnSceneCount}/${unitRequired} on scene · staging remaining units`
                    : `Unit ${primaryVehicle.id} advancing`}
                </span>
              )}
              {isOnScene && (
                <span
                  className="incident-card__state-note incident-card__state-note--scene"
                  style={{ color: deptColor }}
                >
                  Teams working scene
                </span>
              )}
            </div>
          </div>

          <div className={`incident-bar ${isResponding ? 'incident-bar--journey' : ''} ${isOnScene ? 'incident-bar--scene' : ''}`}>
            {(isResponding || isOnScene) && (
              <div
                className={`incident-bar__flow ${isResponding ? 'incident-bar__flow--responding' : ''} ${isOnScene ? 'incident-bar__flow--scene' : ''}`}
                style={{ '--flow-rgb': flowRgb }}
              />
            )}
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
                background: isResponding || isOnScene
                  ? `linear-gradient(90deg, rgba(${deptMeta.rgb}, 0.14), rgba(${deptMeta.rgb}, 0.28))`
                  : progressColor,
                opacity: isResponding || isOnScene ? 0.9 : 1,
              }}
            />
          </div>

          {needsMore && (
            <p style={{ margin: '4px 0 0', fontSize: '0.6rem', color: 'var(--color-ems)' }}>
              Warning: {unitRequired - unitOnSceneCount} more unit{unitRequired - unitOnSceneCount !== 1 ? 's' : ''} needed on scene
            </p>
          )}
        </div>
      )}

      {/* Dispatch controls */}
      {canDispatchMore && (
        <div className="incident-card__actions" style={{ marginTop: isCompact ? 0 : '8px', gap: '6px' }}>
          <select
            className="cmd-select cmd-select--small"
            value={selectedId || ''}
            onChange={(e) => onSelect && onSelect(incident.id, e.target.value)}
            disabled={!canDispatch}
            title={canDispatch ? 'Select the next unit to dispatch manually' : 'No available units for this incident type'}
          >
            {canDispatch
              ? <option value="">Manual: Choose next unit...</option>
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
            className={`dispatch-btn ${tutorialStep === 'first_dispatch' ? 'dispatch-btn--guided' : ''}`}
            onClick={() => onQuickDispatch && onQuickDispatch(incident.id)}
            disabled={!canDispatch}
            title="Quick Dispatch - automatically sends the best available next unit"
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
  tutorialStep,
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
      <div className="incident-panel__toolbar">
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
        <div className="incident-panel__legend">
          <span style={{ color: 'var(--color-urgent)' }}>■ P1</span>
          <span style={{ color: 'var(--color-ems)' }}>■ P2</span>
          <span style={{ color: 'var(--color-public_works)' }}>■ P3</span>
        </div>
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
                tutorialStep={tutorialStep}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default IncidentsPanel
