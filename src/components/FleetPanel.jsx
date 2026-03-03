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
}) => (
  <div className="panel-content-only">
    <div className="list-container">
      {vehicles.length === 0 && <p className="muted" style={{ padding: '20px', textAlign: 'center' }}>No vehicles assigned to this station.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
        {vehicles.map((vehicle) => {
          const unitType = vehicle.unitType || 'patrol'
          const unitName = unitTypes?.[unitType]?.label || unitType
          const unitLabel = unitName.toUpperCase()
          const department = vehicle.department || 'police'
          const level = vehicle.level || 1
          const xp = vehicle.xp || 0
          const nextLevelXp = level * XP_PER_LEVEL
          const prevLevelXp = (level - 1) * XP_PER_LEVEL
          const progress = level >= UNIT_LEVEL_CAP 
            ? 1 
            : Math.max(0, Math.min(1, (xp - prevLevelXp) / (nextLevelXp - prevLevelXp)))

          return (
            <div key={vehicle.id} className="incident-card" style={{ borderLeftColor: `var(--color-${department})` }}>
              <div className="fleet-row" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span
                  className={`fleet-avatar fleet-avatar--${unitType} fleet-avatar--department-${department}`}
                  style={{ width: '40px', height: '40px', borderRadius: '8px', fontSize: '1.2rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {unitName.slice(0, 1).toUpperCase()}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p className="title" style={{ color: '#fff', fontSize: '0.9rem' }}>
                      {vehicle.name} 
                      <span className="unit-level" style={{ marginLeft: '8px' }}>LVL {level}</span>
                    </p>
                    <p className="muted" style={{ fontSize: '0.65rem' }}>{unitLabel}</p>
                  </div>
                  
                  <div className="xp-bar" style={{ margin: '6px 0' }}>
                    <div className="xp-bar__fill" style={{ width: `${progress * 100}%` }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <p className="muted" style={{ fontSize: '0.7rem' }}>
                      STATUS: <span style={{ color: '#fff' }}>
                        {vehicle.status === 'cooldown' ? 'REFITTING...' : vehicle.status.replaceAll('_', ' ').toUpperCase()}
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
              <div className="fleet-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
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

export default FleetPanel
