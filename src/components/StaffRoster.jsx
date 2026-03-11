import React from 'react'
import { SKILL_TYPES } from '../game/constants'
import '../Theme.css'

const SkillBar = ({ label, value, color }) => (
  <div style={{ display: 'grid', gap: '2px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem' }}>
      <span className="muted">{label.toUpperCase()}</span>
      <span>{value}/10</span>
    </div>
    <div className="xp-bar" style={{ height: '4px', background: 'rgba(255,255,255,0.05)' }}>
      <div
        className="xp-bar__fill"
        style={{ width: `${(value / 10) * 100}%`, background: color }}
      />
    </div>
  </div>
)

const StaffRoster = ({
  crewMembers = [],
  vehicles = [],
  onAssign,
  onUnassign,
  departmentId
}) => {
  const getDeptColor = () => {
    if (departmentId === 'police') return 'var(--color-police)'
    if (departmentId === 'fire') return 'var(--color-fire)'
    if (departmentId === 'ems') return 'var(--color-ems)'
    if (departmentId === 'public_works') return 'var(--color-public_works)'
    return 'var(--color-tow)'
  }

  const getAssignedCrewCount = (vehicle) =>
    Array.isArray(vehicle?.assignedCrewIds) ? vehicle.assignedCrewIds.length : 0

  return (
    <div className="list-container" style={{ padding: '8px' }}>
      {crewMembers.length === 0 && (
        <p className="muted" style={{ textAlign: 'center', padding: '40px' }}>
          NO PERSONNEL ON ROSTER. USE THE RECRUITMENT CENTER ABOVE TO ADD STAFF.
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
        {crewMembers.map(member => {
          const assignedVehicle = vehicles.find(v => v.id === member.assignedVehicleId)

          return (
            <div key={member.id} className="module-card" style={{ borderLeft: `3px solid ${member.assignedVehicleId ? getDeptColor() : 'rgba(255,255,255,0.1)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: 0, color: '#fff', fontSize: '0.9rem' }}>{member.name.toUpperCase()}</h4>
                  <p className="muted" style={{ fontSize: '0.65rem', margin: '2px 0' }}>
                    {assignedVehicle ? `ASSIGNED: ${assignedVehicle.name}` : 'UNASSIGNED'}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="status-badge" style={{ fontSize: '0.55rem' }}>LVL {member.level || 1}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '8px', margin: '12px 0' }}>
                <SkillBar label="Tactics" value={member.stats?.tactics || 0} color="var(--color-police)" />
                <SkillBar label="Medical" value={member.stats?.medical || 0} color="var(--color-ems)" />
                <SkillBar label="Response" value={member.stats?.driving || 0} color="var(--color-success)" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="muted" style={{ fontSize: '0.6rem' }}>FATIGUE</span>
                  <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${member.fatigue}%`, background: member.fatigue > 70 ? 'var(--color-urgent)' : 'var(--color-success)' }} />
                  </div>
                </div>

                {member.assignedVehicleId ? (
                  <button
                    className="cmd-btn cmd-btn--ghost cmd-btn--small"
                    onClick={() => onUnassign(member.assignedVehicleId, member.id)}
                  >
                    RELEASE
                  </button>
                ) : (
                  <select
                    className="cmd-select cmd-select--small"
                    style={{ width: '120px' }}
                    onChange={(e) => onAssign(Number(e.target.value), member.id)}
                    value=""
                  >
                    <option value="">ASSIGN TO...</option>
                    {vehicles
                      .filter((v) => getAssignedCrewCount(v) < (Number(v.crewRequired) || 0))
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({getAssignedCrewCount(v)}/{v.crewRequired})
                        </option>
                      ))
                    }
                  </select>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default StaffRoster
