import { describe, expect, it } from 'vitest'
import { rankDispatchCandidates } from './useDispatchSystem'
import { VEHICLE_STATUS } from '../game/constants'

const baseIncident = {
  id: 1,
  type: 'Priority call',
  position: [45.85, -66.47],
  priority: 1,
  requiredUnitType: null,
}

describe('dispatch candidate ranking', () => {
  it('prefers available unit with better ETA and lower fatigue', () => {
    const ranked = rankDispatchCandidates({
      incident: baseIncident,
      vehicles: [
        {
          id: 1,
          unitType: 'patrol',
          status: VEHICLE_STATUS.returning,
          position: [45.8505, -66.4706],
          speedKph: 50,
          crewAssigned: 2,
          fatigue: 40,
        },
        {
          id: 2,
          unitType: 'patrol',
          status: VEHICLE_STATUS.available,
          position: [45.8501, -66.4702],
          speedKph: 52,
          crewAssigned: 3,
          fatigue: 8,
        },
      ],
      weather: { condition: 'clear', intensity: 0.2 },
    })
    expect(ranked[0].id).toBe(2)
  })

  it('preserves supervisor capacity on low-priority calls', () => {
    const ranked = rankDispatchCandidates({
      incident: {
        ...baseIncident,
        priority: 3,
      },
      vehicles: [
        {
          id: 1,
          unitType: 'supervisor',
          status: VEHICLE_STATUS.available,
          position: [45.85005, -66.4701],
          speedKph: 55,
          crewAssigned: 1,
          fatigue: 5,
        },
        {
          id: 2,
          unitType: 'patrol',
          status: VEHICLE_STATUS.available,
          position: [45.8503, -66.4704],
          speedKph: 50,
          crewAssigned: 2,
          fatigue: 8,
        },
      ],
      weather: { condition: 'clear', intensity: 0.2 },
    })
    expect(ranked[0].id).toBe(2)
  })

  it('favors traffic/supervisor units in severe weather', () => {
    const ranked = rankDispatchCandidates({
      incident: {
        ...baseIncident,
        priority: 2,
      },
      vehicles: [
        {
          id: 1,
          unitType: 'patrol',
          status: VEHICLE_STATUS.available,
          position: [45.85006, -66.4701],
          speedKph: 50,
          crewAssigned: 2,
          fatigue: 4,
        },
        {
          id: 2,
          unitType: 'traffic',
          status: VEHICLE_STATUS.available,
          position: [45.85008, -66.4702],
          speedKph: 56,
          crewAssigned: 2,
          fatigue: 4,
        },
      ],
      weather: { condition: 'storm', intensity: 0.9 },
    })
    expect(ranked[0].id).toBe(2)
  })
})
