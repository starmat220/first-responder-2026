import { describe, expect, it } from 'vitest'
import { applyUpkeepTick } from './economy'
import { VEHICLE_STATUS } from './constants'

describe('economy upkeep tick', () => {
  it('does not charge before upkeep interval', () => {
    const result = applyUpkeepTick({
      economyTimer: 0,
      step: 10,
      vehicles: [],
      stations: [],
      now: 0,
    })

    expect(result.economyTimer).toBe(10)
    expect(result.moneyDelta).toBe(0)
    expect(result.ledgerEntries).toHaveLength(0)
  })

  it('charges unit, personnel, station, and overtime upkeep when interval passes', () => {
    const result = applyUpkeepTick({
      economyTimer: 59,
      step: 2,
      vehicles: [
        { unitType: 'patrol', status: VEHICLE_STATUS.enroute },
        { unitType: 'traffic', status: VEHICLE_STATUS.on_scene },
        { unitType: 'supervisor', status: VEHICLE_STATUS.available },
      ],
      stations: [
        { personnelAssigned: 2 },
        { personnelAssigned: 1 },
      ],
      now: 0,
    })

    expect(result.economyTimer).toBe(1)
    expect(result.moneyDelta).toBe(-56)
    expect(result.ledgerEntries.length).toBeGreaterThanOrEqual(4)

    const labels = result.ledgerEntries.map((entry) => entry.label)
    expect(labels.some((label) => label.includes('Personnel salaries'))).toBe(true)
    expect(labels.some((label) => label.includes('Station upkeep'))).toBe(true)
    expect(labels.some((label) => label.includes('Overtime'))).toBe(true)
  })

  it('handles multiple upkeep cycles in one tick', () => {
    const result = applyUpkeepTick({
      economyTimer: 0,
      step: 130,
      vehicles: [{ unitType: 'patrol', status: VEHICLE_STATUS.available }],
      stations: [{ personnelAssigned: 0 }],
      now: 0,
    })

    expect(result.economyTimer).toBe(10)
    expect(result.moneyDelta).toBe(-28)
  })
})
