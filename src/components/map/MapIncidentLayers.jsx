import { CircleMarker, Marker, Polyline, Popup } from 'react-leaflet'

const DEPT_RING_COLOR = {
  police: 'rgb(96, 171, 255)',
  fire: 'rgb(255, 122, 101)',
  ems: 'rgb(255, 178, 84)',
  tow: 'rgb(255, 209, 125)',
}

const getPriorityOpacityFactor = (priority) => {
  if (priority === 1) return 1
  if (priority === 2) return 0.95
  return 0.9
}

export const IncidentHalos = ({
  incidents,
  incidentStatus,
  getIncidentPriorityVisual,
  getDepartmentId,
}) => (
  <>
    {incidents.map((incident) => {
      const { dimFactor } = getIncidentPriorityVisual(incident, 0.25)
      const departmentId = getDepartmentId(incident.requiredDepartment)
      const priorityFactor = getPriorityOpacityFactor(incident.priority)
      const isOnScene = incident.status === incidentStatus.on_scene
      return (
        <CircleMarker
          key={`halo-${incident.id}`}
          center={incident.position}
          radius={30}
          pathOptions={{
            className: 'incident-halo',
            color: DEPT_RING_COLOR[departmentId] || DEPT_RING_COLOR.police,
            weight: 10,
            opacity: (isOnScene ? 0.62 : 0.5) * priorityFactor * dimFactor,
            fillOpacity: 0,
          }}
        />
      )
    })}
  </>
)

export const IncidentRings = ({
  incidents,
  incidentStatus,
  getIncidentPriorityVisual,
  getIncidentRingMetrics,
  getDepartmentId,
}) => (
  <>
    {incidents.map((incident) => {
      const { dimFactor } = getIncidentPriorityVisual(incident, 0.25)
      const { ringRadius, ringCircumference, arcLength, dashOffset } =
        getIncidentRingMetrics(incident)
      return (
        <CircleMarker
          key={`ring-outline-${incident.id}`}
          center={incident.position}
          radius={ringRadius}
          pathOptions={{
            className: 'incident-ring-outline',
            color: 'rgba(6, 10, 16, 0.96)',
            weight: 10,
            opacity: 0.72 * dimFactor,
            dashArray: `${arcLength} ${ringCircumference}`,
            dashOffset,
          }}
        />
      )
    })}
    {incidents.map((incident) => {
      const { dimFactor } = getIncidentPriorityVisual(incident, 0.25)
      const departmentId = getDepartmentId(incident.requiredDepartment)
      const priorityFactor = getPriorityOpacityFactor(incident.priority)
      const { ringRadius, ringCircumference, arcLength, dashOffset } =
        getIncidentRingMetrics(incident)
      return (
        <CircleMarker
          key={`ring-${incident.id}`}
          center={incident.position}
          radius={ringRadius}
          pathOptions={{
            className: 'incident-ring',
            color: DEPT_RING_COLOR[departmentId] || DEPT_RING_COLOR.police,
            weight: 6,
            opacity:
              (incident.status === incidentStatus.on_scene ? 1 : 0.94) *
              priorityFactor *
              dimFactor,
            dashArray: `${arcLength} ${ringCircumference}`,
            dashOffset,
          }}
        />
      )
    })}
  </>
)

export const IncidentMarkers = ({
  incidents,
  vehicles,
  getIncidentPriorityVisual,
  getIncidentIcon,
  getDepartmentId,
  getPriorityConfig,
  getEligibleVehicleIds,
  canDispatchIncident,
  getIncidentRequirementLines,
  getRequiredUnits,
  handleQuickDispatch,
  getSelectedId,
  setDispatchSelection,
  getVehicleIneligibilityReason,
  getUnitDisplayLabel,
  dispatchVehicle,
}) => (
  <>
    {incidents.map((incident) => {
      const { dimFactor } = getIncidentPriorityVisual(incident, 0.35)
      const eligibleIds = getEligibleVehicleIds(incident)
      const canDispatch = canDispatchIncident(incident)
      const requirementLines = canDispatch ? getIncidentRequirementLines(incident) : []
      const badgeVehicleId =
        incident.onSceneVehicleIds?.[0] ||
        incident.assignedVehicleIds?.[0] ||
        incident.assignedVehicleId ||
        null
      const badgeVehicle =
        badgeVehicleId != null
          ? vehicles.find((vehicle) => vehicle.id === badgeVehicleId) || null
          : null
      return (
        <Marker
          key={incident.id}
          position={incident.position}
          icon={getIncidentIcon(
            incident.status,
            incident.priority,
            incident.requiredDepartment,
            (incident.onSceneVehicleIds?.length || 0) > 0 ||
              (incident.assignedVehicleIds?.length || 0) > 0,
            badgeVehicle?.unitType || null,
            badgeVehicle?.department || incident.requiredDepartment
          )}
          opacity={dimFactor}
        >
          <Popup>
            <div
              className={`incident-popup incident-popup--dept-${getDepartmentId(
                incident.requiredDepartment
              )}`}
            >
              <strong>{incident.type}</strong>
              <div className="incident-popup__meta">
                <span>{getPriorityConfig(incident.priority).label}</span>
                <span>{incident.status.replaceAll('_', ' ')}</span>
              </div>
              {incident.stageLabel && (
                <div className="incident-popup__detail">
                  <span>Stage</span>
                  <span>{incident.stageLabel}</span>
                </div>
              )}
              {incident.caseId && (
                <div className="incident-popup__detail">
                  <span>Case</span>
                  <span>#{incident.caseId}</span>
                </div>
              )}
              {incident.caseScore != null && (
                <div className="incident-popup__detail">
                  <span>Evidence</span>
                  <span>{incident.caseScore}</span>
                </div>
              )}
              {incident.caseNotes?.length > 0 && (
                <div className="incident-popup__detail">
                  <span>Note</span>
                  <span>{incident.caseNotes[incident.caseNotes.length - 1]?.note}</span>
                </div>
              )}
              <div className="incident-popup__detail">
                <span>Address</span>
                <span>{incident.address}</span>
              </div>
              <div className="incident-popup__detail">
                <span>Caller</span>
                <span>{incident.caller}</span>
              </div>
              <div className="incident-popup__detail">
                <span>Units</span>
                <span>
                  {(incident.assignedVehicleIds?.length || 0)}/{getRequiredUnits(incident)}
                </span>
              </div>
              {incident.requiredUnitType && (
                <div className="incident-popup__detail">
                  <span>Type</span>
                  <span>{incident.requiredUnitType.toUpperCase()}</span>
                </div>
              )}
              {incident.requiresDetention && (
                <div className="incident-popup__detail">
                  <span>Detention</span>
                  <span>Required</span>
                </div>
              )}
              {requirementLines.length > 0 && (
                <div className="incident-popup__requirements">
                  {requirementLines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </div>
              )}
            </div>
            {canDispatch && (
              <div
                className={`popup-controls popup-controls--${getDepartmentId(
                  incident.requiredDepartment
                )}`}
              >
                <button
                  className="btn btn--ghost btn--small"
                  onClick={() => handleQuickDispatch(incident.id)}
                  disabled={eligibleIds.size === 0}
                >
                  {(incident.assignedVehicleIds?.length || 0) > 0 ? 'Add Unit' : 'Quick Dispatch'}
                </button>
                <select
                  value={getSelectedId(incident)}
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
                        {vehicle.name} {getUnitDisplayLabel(vehicle)}
                        {reason ? ` (${reason})` : ''}
                      </option>
                    )
                  })}
                </select>
                <button
                  className="btn btn--small"
                  onClick={() =>
                    dispatchVehicle(
                      incident.id,
                      getSelectedId(incident) === '' ? undefined : Number(getSelectedId(incident))
                    )
                  }
                  disabled={!eligibleIds.has(Number(getSelectedId(incident)))}
                >
                  Dispatch
                </button>
              </div>
            )}
          </Popup>
        </Marker>
      )
    })}
  </>
)

export const VehicleRoutes = ({ vehicles, vehicleStatus, getRouteClass }) => (
  <>
    {vehicles
      .filter((vehicle) => vehicle.routeData && vehicle.status !== vehicleStatus.routing)
      .map((vehicle) => (
        <Polyline
          key={`route-${vehicle.id}`}
          positions={vehicle.routeData.coords}
          className={getRouteClass(vehicle)}
        />
      ))}
  </>
)
