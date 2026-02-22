import { clamp } from './utils'

export const TUNING_PRESETS = {
  relaxed: {
    label: 'Relaxed',
    intervalMultiplier: 1.2,
    maxActiveBias: -1,
    rewardMultiplier: 1.08,
    missPenaltyMultiplier: 0.85,
  },
  standard: {
    label: 'Standard',
    intervalMultiplier: 1,
    maxActiveBias: 0,
    rewardMultiplier: 1,
    missPenaltyMultiplier: 1,
  },
  intense: {
    label: 'Intense',
    intervalMultiplier: 0.82,
    maxActiveBias: 1,
    rewardMultiplier: 0.94,
    missPenaltyMultiplier: 1.15,
  },
}

export const DEFAULT_TUNING_PRESET_ID = 'standard'

export const getTuningPreset = (presetId = DEFAULT_TUNING_PRESET_ID) =>
  TUNING_PRESETS[presetId] || TUNING_PRESETS[DEFAULT_TUNING_PRESET_ID]

export const calculateSpawnIntervalMs = ({
  baseIntervalMs,
  publicTrust,
  intervalMultiplier = 1,
  activeUnits = 0,
  availableUnits = 0,
  totalUnits = 0,
}) => {
  const trustMultiplier = clamp(0.6 + (publicTrust / 100) * 0.8, 0.6, 1.4)
  const denominator = Math.max(1, availableUnits || Math.ceil(totalUnits * 0.35))
  const loadRatio = activeUnits / denominator
  const loadMultiplier = clamp(1 + loadRatio * 0.25, 0.85, 1.5)
  return Math.round(baseIntervalMs * trustMultiplier * intervalMultiplier * loadMultiplier)
}
