const DEPARTMENT_FILTERS = [
  { id: 'all', label: 'All Depts' },
  { id: 'police', label: 'Police' },
  { id: 'fire', label: 'Fire' },
  { id: 'ems', label: 'EMS' },
  { id: 'tow', label: 'Tow' },
]

const DEPARTMENT_META = {
  police: { label: 'Police', short: 'PD' },
  fire: { label: 'Fire', short: 'FD' },
  ems: { label: 'EMS', short: 'EMS' },
  tow: { label: 'Tow', short: 'TOW' },
}
const DEPARTMENT_TINT_RGB = {
  police: '96, 171, 255',
  fire: '255, 122, 101',
  ems: '255, 178, 84',
  tow: '255, 209, 125',
}

const getDepartmentId = (departmentId) => DEPARTMENT_META[departmentId] ? departmentId : 'police'
const getDepartmentLabel = (departmentId) =>
  DEPARTMENT_META[getDepartmentId(departmentId)]?.label || 'Police'
const getDepartmentShort = (departmentId) =>
  DEPARTMENT_META[getDepartmentId(departmentId)]?.short || 'PD'
const getIncidentDepartments = (incident) => {
  const departments = new Set([getDepartmentId(incident.requiredDepartment)])
  ;['requiredDepartments', 'coResponseDepartments', 'assistDepartments'].forEach((key) => {
    const list = incident?.[key]
    if (!Array.isArray(list)) return
    list.forEach((departmentId) => departments.add(getDepartmentId(departmentId)))
  })
  return Array.from(departments)
}
const buildIncidentTintStyle = (departmentIds) => {
  const ids = Array.isArray(departmentIds) && departmentIds.length
    ? departmentIds.map(getDepartmentId)
    : ['police']
  const stop = 100 / ids.length
  const tintStops = ids
    .map((id, index) => {
      const rgb = DEPARTMENT_TINT_RGB[id] || DEPARTMENT_TINT_RGB.police
      const start = Math.round(index * stop)
      const end = Math.round((index + 1) * stop)
      return `rgba(${rgb}, 0.12) ${start}%, rgba(${rgb}, 0.07) ${end}%`
    })
    .join(', ')
  const stripStops = ids
    .map((id, index) => {
      const rgb = DEPARTMENT_TINT_RGB[id] || DEPARTMENT_TINT_RGB.police
      const start = Math.round(index * stop)
      const end = Math.round((index + 1) * stop)
      return `rgba(${rgb}, 0.88) ${start}%, rgba(${rgb}, 0.88) ${end}%`
    })
    .join(', ')
  const leadRgb = DEPARTMENT_TINT_RGB[ids[0]] || DEPARTMENT_TINT_RGB.police
  return {
    '--incident-tint-bg': `linear-gradient(142deg, ${tintStops})`,
    '--incident-strip': `linear-gradient(180deg, ${stripStops})`,
    '--incident-border': `rgba(${leadRgb}, 0.34)`,
  }
}

const IncidentsPanel = ({
  incidents,
  getSelectedId,
  setDispatchSelection,
  dispatchVehicle,
  vehicles,
  formatSeconds,
  getPriorityConfig,
  getEligibleVehicleIds,
  getRequiredUnits,
  canDispatchIncident,
  filters,
  activeDepartmentId,
  setFilters,
  incidentTypeOptions,
  departmentCounts,
  onSceneSeconds,
  getVehicleIneligibilityReason,
  getIncidentRequirementLines,
  onQuickDispatch,
  formatVehicleUnitLabel,
  focusMode,
  focusDepartmentId,
  dispatchRecommendations,
  onDispatchRecommendation,
  onDispatchAllRecommendations,
}) => (
  <div className="panel incidents-panel">
    <div className="panel__header">
      <div>
        <p className="eyebrow">Incidents</p>
        <p className="muted">Filter active calls</p>
      </div>
      <div className="filter-row">
        <button
          className={`filter-pill ${Object.values(filters.priority).every(Boolean) ? 'filter-pill--active' : ''}`}
          onClick={() =>
            setFilters((prev) => ({
              ...prev,
              priority: { 1: true, 2: true, 3: true },
            }))
          }
        >
          All
        </button>
        {[1, 2, 3].map((priority) => (
          <button
            key={priority}
            className={`filter-pill filter-pill--p${priority} ${
              filters.priority[priority] ? 'filter-pill--active' : ''
            }`}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                priority: {
                  ...prev.priority,
                  [priority]: !prev.priority[priority],
                },
              }))
            }
          >
            P{priority}
          </button>
        ))}
        {DEPARTMENT_FILTERS.map((department) => (
          <button
            key={department.id}
            className={`filter-pill ${filters.department === department.id ? 'filter-pill--active' : ''}`}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                department: department.id,
              }))
            }
          >
            {department.label}
            {department.id !== 'all' ? ` (${departmentCounts?.[department.id] || 0})` : ''}
          </button>
        ))}
        <button
          className={`filter-pill ${filters.onlyActiveDepartment ? 'filter-pill--active' : ''}`}
          onClick={() =>
            setFilters((prev) => ({
              ...prev,
              onlyActiveDepartment: !prev.onlyActiveDepartment,
            }))
          }
        >
          {filters.onlyActiveDepartment
            ? `Active Dept: ${getDepartmentLabel(activeDepartmentId || 'police')}`
            : 'Active Dept'}
        </button>
        <select
          className="filter-select"
          value={filters.type}
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              type: event.target.value,
            }))
          }
        >
          {incidentTypeOptions.map((type) => (
            <option key={type} value={type}>
              {type === 'all' ? 'All types' : type}
            </option>
          ))}
        </select>
      </div>
    </div>
    <div className="priority-guide priority-guide--inline">
      <span className="priority-guide__title">Priority</span>
      {[1, 2, 3].map((priority) => {
        const config = getPriorityConfig(priority)
        return (
          <span key={`guide-${priority}`} className={`priority-guide__pill priority-guide__pill--p${priority}`}>
            {config.label} · {formatSeconds(config.responseTargetSeconds)}
          </span>
        )
      })}
    </div>
    {dispatchRecommendations?.length > 0 && (
      <div className="dispatch-queue">
        <div className="dispatch-queue__header">
          <p className="station-card__title">Recommended Dispatch Queue</p>
          <button className="btn btn--ghost btn--small" onClick={onDispatchAllRecommendations}>
            Dispatch Queue
          </button>
        </div>
        {dispatchRecommendations.slice(0, 5).map((item) => (
          <div key={`dispatch-rec-${item.incidentId}`} className="dispatch-queue__row">
            <div>
              <p className="title">
                <span className={`priority-tag priority-tag--${item.priority}`}>
                  {getPriorityConfig(item.priority).label}
                </span>{' '}
                {item.incidentType}
              </p>
              <p className="muted">
                {getDepartmentShort(item.departmentId)} · {item.vehicleName}
                {item.vehicleType ? ` (${item.vehicleType})` : ''}
              </p>
            </div>
            <button
              className="btn btn--small"
              onClick={() => onDispatchRecommendation(item.incidentId, item.vehicleId)}
            >
              Dispatch
            </button>
          </div>
        ))}
      </div>
    )}
    <div className="list">
      {incidents.length === 0 && <p className="muted">No incidents match filters.</p>}
      {incidents.map((incident) => {
        const departmentId = getDepartmentId(incident.requiredDepartment)
        const incidentDepartments = getIncidentDepartments(incident)
        const selectedId = getSelectedId(incident)
        const eligibleIds = getEligibleVehicleIds(incident)
        const canDispatch = canDispatchIncident(incident)
        const requirementLines = canDispatch ? getIncidentRequirementLines(incident) : []
        const assignedCount = incident.assignedVehicleIds?.length || 0
        const requiredCount = getRequiredUnits(incident)
        const needsMoreUnits = assignedCount > 0 && assignedCount < requiredCount
        const quickDispatchLabel = needsMoreUnits ? 'Add Unit' : 'Quick Dispatch'
        const useAutoDispatch = eligibleIds.size <= 1
        const priorityActive = filters.priority[incident.priority]
        const focusActive = focusMode && !!focusDepartmentId
        const focusMatch = !focusActive || departmentId === focusDepartmentId
        const progressBase =
          incident.status === 'on_scene'
            ? incident.onSceneRemaining || 0
            : incident.timeRemaining || 0
        const progressTotal =
          incident.status === 'on_scene' ? onSceneSeconds : incident.responseTargetSeconds
        const progressRatio =
          progressTotal > 0 ? Math.max(0, Math.min(1, progressBase / progressTotal)) : 0
        const departmentLine =
          incidentDepartments.length > 1
            ? incidentDepartments.map((id) => getDepartmentLabel(id)).join(' + ')
            : getDepartmentLabel(departmentId)
        return (
          <div
            key={incident.id}
            className={`list-item list-item--stack incident-item incident-item--${departmentId} ${
              priorityActive ? '' : 'list-item--dim'
            } ${focusMatch ? '' : 'list-item--focus-dim'} ${
              incidentDepartments.length > 1 ? 'incident-item--mixed' : ''
            }`}
            style={buildIncidentTintStyle(incidentDepartments)}
          >
            <div>
              <p className="title">
                <span className={`priority-tag priority-tag--${incident.priority}`}>
                  {getPriorityConfig(incident.priority).label}
                </span>
                {incidentDepartments.map((department) => (
                  <span key={`${incident.id}-${department}`} className={`incident-dept-chip incident-dept-chip--${department}`}>
                    {getDepartmentShort(department)}
                  </span>
                ))}{' '}
                {incident.type}
              </p>
              <p className="muted">
                {incident.status.replaceAll('_', ' ')}
                {incident.status === 'open' &&
                  ` - Dispatch in ${formatSeconds(incident.timeRemaining || 0)}`}
                {incident.status === 'responding' &&
                  ` - ETA ${formatSeconds(incident.etaSeconds)}`}
                {incident.status === 'on_scene' &&
                  ` - On scene ${formatSeconds(incident.onSceneRemaining)}`}
                {incident.status === 'resolved' && ' - Resolved'}
                {incident.status === 'missed' && ' - Missed'}
              </p>
              <p className="muted">
                {incidentDepartments.length > 1 ? 'Departments' : 'Department'}: {departmentLine}
              </p>
              {incidentDepartments.includes(activeDepartmentId || 'police') && (
                <p className="muted">Ownership: Active station department</p>
              )}
              <p className="muted">
                Units {(incident.assignedVehicleIds?.length || 0)}/{getRequiredUnits(incident)}
                {incident.requiredUnitType
                  ? ` - ${incident.requiredUnitType.toUpperCase()}`
                  : ''}
              </p>
              {incident.stageLabel && (
                <p className="muted">Stage: {incident.stageLabel}</p>
              )}
              {incident.caseId && (
                <p className="muted">
                  Case #{incident.caseId} · Evidence {incident.caseScore ?? 0}
                </p>
              )}
            </div>
            <div className="incident-bar">
              <span
                className={`incident-bar__fill incident-bar__fill--p${incident.priority} ${
                  incident.status === 'on_scene' ? 'incident-bar__fill--scene' : ''
                }`}
                style={{ width: `${Math.round(progressRatio * 100)}%` }}
              />
            </div>
            {requirementLines.length > 0 && (
              <div className="incident-requirements">
                {requirementLines.map((line) => (
                  <span key={line} className="incident-requirements__item">
                    {line}
                  </span>
                ))}
              </div>
            )}
            {canDispatch && (
              <div className="list-controls">
                {useAutoDispatch ? (
                  <button
                    className="btn btn--small"
                    onClick={() => onQuickDispatch(incident.id)}
                    disabled={eligibleIds.size === 0}
                  >
                    Dispatch Best Unit
                  </button>
                ) : (
                  <>
                    <button
                      className="btn btn--ghost btn--small"
                      onClick={() => onQuickDispatch(incident.id)}
                      disabled={eligibleIds.size === 0}
                    >
                      {quickDispatchLabel}
                    </button>
                    <select
                      value={selectedId}
                      onChange={(event) =>
                        setDispatchSelection((prev) => ({
                          ...prev,
                          [incident.id]: Number(event.target.value),
                        }))
                      }
                      disabled={!vehicles.length}
                    >
                      {!vehicles.length && <option value="">No units</option>}
                      {vehicles.map((vehicle) => {
                        const reason = getVehicleIneligibilityReason(vehicle, incident)
                        return (
                        <option
                          key={vehicle.id}
                          value={vehicle.id}
                          disabled={!eligibleIds.has(vehicle.id)}
                        >
                          {vehicle.name} {formatVehicleUnitLabel ? formatVehicleUnitLabel(vehicle) : vehicle.unitType}
                          {reason ? ` (${reason})` : ''}
                        </option>
                      )})}
                    </select>
                    <button
                      className="btn btn--small"
                      onClick={() =>
                        dispatchVehicle(
                          incident.id,
                          selectedId === '' ? undefined : Number(selectedId)
                        )
                      }
                      disabled={!eligibleIds.has(Number(selectedId))}
                    >
                      Dispatch
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  </div>
)

export default IncidentsPanel
