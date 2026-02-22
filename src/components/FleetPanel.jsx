const FleetPanel = ({
  vehicles,
  formatSeconds,
  vehicleStatus,
  onAssignCrew,
  onReleaseCrew,
  unitTypes,
}) => (
  <div className="panel">
    <div className="list">
      {vehicles.length === 0 && <p className="muted">No vehicles yet.</p>}
      {vehicles.map((vehicle) => {
        const unitType = vehicle.unitType || 'patrol'
        const unitName = unitTypes?.[unitType]?.label || unitType
        const unitLabel = unitName.toUpperCase()
        const department = vehicle.department || 'police'
        return (
          <div key={vehicle.id} className="list-item">
            <div className="fleet-row">
              <span
                className={`fleet-avatar fleet-avatar--${unitType} fleet-avatar--department-${department}`}
              >
                {unitName.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <p className="title">{vehicle.name}</p>
                <p className="muted">{unitLabel}</p>
                <p className="muted">
                  {vehicle.status.replaceAll('_', ' ')}
                  {vehicle.status === vehicleStatus.enroute &&
                    ` - ETA ${formatSeconds(vehicle.etaSeconds)}`}
                  {vehicle.status === vehicleStatus.on_scene &&
                    ` - On scene ${formatSeconds(vehicle.onSceneRemaining)}`}
                  {vehicle.status === vehicleStatus.returning &&
                    ` - Returning ${formatSeconds(vehicle.etaSeconds)}`}
                  {vehicle.status === vehicleStatus.cooldown &&
                    ` - Cooldown ${formatSeconds(vehicle.cooldownRemaining)}`}
                </p>
                <p className="muted">
                  Fatigue {Math.round(vehicle.fatigue || 0)}% · Shift{' '}
                  {formatSeconds(vehicle.shiftRemaining || 0)}
                </p>
                <p className="muted">
                  Speed{' '}
                  {vehicle.currentSpeedKph
                    ? `${Math.round(vehicle.currentSpeedKph)} km/h`
                    : 'idle'}
                </p>
                <p className="muted">
                  Crew {vehicle.crewAssigned || 0}/{vehicle.crewRequired || 0}
                </p>
              </div>
            </div>
            <div className="fleet-actions">
              <span className={`pill pill--${vehicle.status}`}>
                {vehicle.status.replaceAll('_', ' ')}
              </span>
              {onAssignCrew && onReleaseCrew && (
                <div className="fleet-actions__buttons">
                  {vehicle.crewAssigned >= (vehicle.crewRequired || 0) ? (
                    <button
                      className="btn btn--ghost btn--small"
                      onClick={() => onReleaseCrew(vehicle.id)}
                    >
                      Release
                    </button>
                  ) : (
                    <button
                      className="btn btn--small"
                      onClick={() => onAssignCrew(vehicle.id)}
                    >
                      Assign
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  </div>
)

export default FleetPanel
