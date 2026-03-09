import { describe, expect, it } from 'vitest'
import { STATION_TYPES } from './departments'
import { evaluateBuildingTierAccess } from './buildings'

describe('building tier access', () => {
  it('unlocks core police station at level 1', () => {
    const access = evaluateBuildingTierAccess({
      building: { id: STATION_TYPES.police_station.id, category: 'station' },
      level: 1,
      resolvedCount: 0,
    })
    expect(access.unlocked).toBe(true)
  })

  it('locks elite police station below required level and progress', () => {
    const access = evaluateBuildingTierAccess({
      building: { id: STATION_TYPES.federal_police.id, category: 'station' },
      level: 4,
      resolvedCount: 18,
    })
    expect(access.unlocked).toBe(false)
    expect(access.reason).toContain('Requires Level')
  })

  it('uses category defaults for training buildings', () => {
    const access = evaluateBuildingTierAccess({
      building: { id: 'custom_training_facility', category: 'training' },
      level: 3,
      resolvedCount: 11,
    })
    expect(access.unlocked).toBe(true)
  })
})
