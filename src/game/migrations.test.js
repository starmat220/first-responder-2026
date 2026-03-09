import { describe, expect, it } from 'vitest'
import { migrateSaveData } from './migrations'

describe('save migrations', () => {
  it('upgrades v1 save payload to latest schema with required defaults', () => {
    const migrated = migrateSaveData({
      schemaVersion: 1,
      money: 800,
      stations: [{ id: 1, name: 'Legacy', position: [45.84, -66.47] }],
    })

    expect(migrated.schemaVersion).toBeGreaterThanOrEqual(4)
    expect(migrated.stations[0].specialization).toBe('standard')
    expect(migrated.uiState).toBeTruthy()
    expect(migrated.uiState.accessibilityState).toEqual({
      highContrastMode: false,
      reducedMotionMode: false,
      largeTextMode: false,
      colorAssistMode: false,
    })
    expect(migrated.departmentReputation).toBeTruthy()
    expect(migrated.progressionHooksUnlocked).toBeTruthy()
    expect(migrated.mutualAidState).toBeTruthy()
    expect(migrated.campaignState).toBeTruthy()
    expect(Array.isArray(migrated.campaignState.unlockedDistrictIds)).toBe(true)
    expect(migrated.economyReliefState.grantsToday).toBe(0)
    expect(typeof migrated.economyReliefState.dayKey).toBe('string')
    expect(migrated.economyReliefState.dayKey.length).toBeGreaterThan(0)
  })

  it('normalizes partial v4 payload without dropping existing fields', () => {
    const migrated = migrateSaveData({
      schemaVersion: 4,
      money: 2100,
      uiState: {
        accessibilityState: { highContrastMode: true },
      },
      mutualAidState: {
        usesToday: 2,
      },
    })

    expect(migrated.schemaVersion).toBe(4)
    expect(migrated.money).toBe(2100)
    expect(migrated.uiState.accessibilityState.highContrastMode).toBe(true)
    expect(migrated.uiState.accessibilityState.reducedMotionMode).toBe(false)
    expect(migrated.mutualAidState.usesToday).toBe(2)
    expect(migrated.mutualAidState.cooldownUntil).toBe(0)
    expect(migrated.campaignState).toBeTruthy()
    expect(Array.isArray(migrated.campaignState.unlockedDistrictIds)).toBe(true)
    expect(migrated.economyReliefState.grantsToday).toBe(0)
    expect(typeof migrated.economyReliefState.dayKey).toBe('string')
    expect(migrated.economyReliefState.dayKey.length).toBeGreaterThan(0)
  })

  it('normalizes malformed economy relief values', () => {
    const migrated = migrateSaveData({
      schemaVersion: 4,
      missionDayKey: '2026-03-03',
      economyReliefState: {
        grantsToday: -4,
      },
    })

    expect(migrated.economyReliefState).toEqual({
      dayKey: '2026-03-03',
      grantsToday: 0,
    })
  })
})
