import { describe, expect, it } from 'vitest'
import { createTickSnapshot } from './snapshot'

describe('tick snapshot', () => {
  it('is deterministic for equivalent state', () => {
    const stateA = {
      simSpeed: 2,
      stations: [{ id: 2, department: 'fire' }, { id: 1, department: 'police' }],
      vehicles: [{ id: 9, status: 'available' }, { id: 3, status: 'enroute' }],
      incidents: [{ id: 7, status: 'open', priority: 2 }],
      prisons: [{ id: 1, count: 3, capacity: 20 }],
      goals: [{ id: 'goal-1', departmentId: 'police', progress: 2, target: 5 }],
    }
    const stateB = {
      ...stateA,
      stations: [...stateA.stations].reverse(),
      vehicles: [...stateA.vehicles].reverse(),
    }
    const a = createTickSnapshot(stateA)
    const b = createTickSnapshot(stateB)
    expect(a.digest).toBe(b.digest)
  })
})
