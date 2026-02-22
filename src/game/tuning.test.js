import { describe, expect, it } from 'vitest'
import {
  TUNING_PRESETS,
  calculateSpawnIntervalMs,
  getTuningPreset,
} from './tuning'

describe('tuning presets', () => {
  it('returns standard as fallback', () => {
    expect(getTuningPreset('unknown')).toEqual(TUNING_PRESETS.standard)
  })

  it('keeps expected pacing order across presets', () => {
    const context = {
      baseIntervalMs: 36000,
      publicTrust: 60,
      activeUnits: 3,
      availableUnits: 5,
      totalUnits: 10,
    }
    const relaxed = calculateSpawnIntervalMs({
      ...context,
      intervalMultiplier: TUNING_PRESETS.relaxed.intervalMultiplier,
    })
    const standard = calculateSpawnIntervalMs({
      ...context,
      intervalMultiplier: TUNING_PRESETS.standard.intervalMultiplier,
    })
    const intense = calculateSpawnIntervalMs({
      ...context,
      intervalMultiplier: TUNING_PRESETS.intense.intervalMultiplier,
    })
    expect(relaxed).toBeGreaterThan(standard)
    expect(standard).toBeGreaterThan(intense)
  })

  it('preserves economy intent ordering', () => {
    expect(TUNING_PRESETS.relaxed.rewardMultiplier).toBeGreaterThan(
      TUNING_PRESETS.standard.rewardMultiplier
    )
    expect(TUNING_PRESETS.standard.rewardMultiplier).toBeGreaterThan(
      TUNING_PRESETS.intense.rewardMultiplier
    )
    expect(TUNING_PRESETS.relaxed.missPenaltyMultiplier).toBeLessThan(
      TUNING_PRESETS.standard.missPenaltyMultiplier
    )
    expect(TUNING_PRESETS.standard.missPenaltyMultiplier).toBeLessThan(
      TUNING_PRESETS.intense.missPenaltyMultiplier
    )
  })
})
