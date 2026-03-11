import React from 'react'
import { XP_PER_LEVEL, UNIT_LEVEL_CAP } from '../game/constants'
import '../Theme.css'

const FleetPanel = ({
  vehicles,
  formatSeconds,
  vehicleStatus,
  onAssignCrew,
  onReleaseCrew,
  unitTypes,
}) => {
  const readyUnits = vehicles.filter((vehicle) => vehicle.status === vehicleStatus.available).length
  const activeUnits = vehicles.filter(
    (vehicle) =>
      vehicle.status === vehicleStatus.enroute || vehicle.status === vehicleStatus.on_scene
  ).length

  return (
    <div className="panel-content-only menu-shell">
      <div className="menu-shell__header">
        <div>
          <p className="menu-shell__title">Fleet Console</p>
          <p className="menu-shell__hint">Monitor readiness, assign crews, and track unit progress.</p>
        </div>
        <div className="menu-shell__metrics">
          <span className="menu-stat-badge">{readyUnits} ready</span>
          <span className="menu-stat-badge">{activeUnits} active</span>
        </div>
      </div>

      <div className="list-container menu-shell__body">
        {vehicles.length === 0 && (
          <p className="menu-empty">No units assigned to this station yet.</p>
        )}
        <div className="menu-card-list">
          {vehicles.map((vehicle) => {
            const unitType = vehicle.unitType || 'patrol'
            const unitName = unitTypes?.[unitType]?.label || unitType
            const unitLabel = unitName.toUpperCase()
            const department = vehicle.department || 'police'
            const level = vehicle.level || 1
            const xp = vehicle.xp || 0
            const nextLevelXp = level * XP_PER_LEVEL
            const prevLevelXp = (level - 1) * XP_PER_LEVEL
            const progress =
              level >= UNIT_LEVEL_CAP
                ? 1
                : Math.max(0, Math.min(1, (xp - prevLevelXp) / (nextLevelXp - prevLevelXp)))

            return (
              <div
                key={vehicle.id}
                className={`incident-card incident-card--dept-${department}`}
                style={{
                  borderLeftColor: `var(--color-${department})`,
                  '--incident-accent-rgb':
                    department === 'fire'
                      ? '255, 122, 101'
                      : department === 'ems'
                        ? '255, 214, 74'
                        : department === 'tow'
                          ? '230, 184, 91'
                          : department === 'public_works'
                            ? '160, 174, 192'
                            : '96, 171, 255',
                }}
              >
                <div className="fleet-row" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span
                    className={`fleet-avatar fleet-avatar--${unitType} fleet-avatar--department-${department}`}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      fontSize: '1.2rem',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    {unitName.slice(0, 1).toUpperCase()}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p className="title" style={{ color: '#fff', fontSize: '0.9rem' }}>
                        {vehicle.name}
                        <span className="unit-level">LVL {level}</span>
                      </p>
                      <p className="muted" style={{ fontSize: '0.65rem' }}>{unitLabel}</p>
                    </div>

                    <div className="xp-bar" style={{ margin: '6px 0' }}>
                      <div className="xp-bar__fill" style={{ width: `${progress * 100}%` }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <p className="muted" style={{ fontSize: '0.7rem' }}>
                        STATUS:{' '}
                        <span style={{ color: '#fff' }}>
                          {vehicle.status === 'cooldown'
                            ? 'REFITTING...'
                            : vehicle.status.replaceAll('_', ' ').toUpperCase()}
                        </span>
                      </p>
                      <p className="muted" style={{ fontSize: '0.7rem', textAlign: 'right' }}>
                        CREW: <span style={{ color: '#fff' }}>{vehicle.crewAssigned || 0}/{vehicle.crewRequired || 0}</span>
                      </p>
                    </div>

                    <p className="muted" style={{ fontSize: '0.65rem', marginTop: '4px' }}>
                      {vehicle.status === vehicleStatus.enroute && `ETA: ${formatSeconds(vehicle.etaSeconds)}`}
                      {vehicle.status === vehicleStatus.on_scene && `ON SCENE: ${formatSeconds(vehicle.onSceneRemaining)}`}
                      {vehicle.status === vehicleStatus.returning && `RETURNING: ${formatSeconds(vehicle.etaSeconds)}`}
                      {vehicle.status === vehicleStatus.cooldown && `READY IN: ${formatSeconds(vehicle.cooldownRemaining)}`}
                    </p>
                  </div>
                </div>
                <div
                  className="fleet-actions"
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  {onAssignCrew && onReleaseCrew && (
                    <>
                      {vehicle.crewAssigned >= (vehicle.crewRequired || 0) ? (
                        <button
                          className="cmd-btn cmd-btn--ghost cmd-btn--small"
                          onClick={() => onReleaseCrew(vehicle.id)}
                        >
                          RELEASE CREW
                        </button>
                      ) : (
                        <button
                          className="cmd-btn cmd-btn--primary cmd-btn--small"
                          onClick={() => onAssignCrew(vehicle.id)}
                        >
                          ASSIGN CREW
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default FleetPanel
