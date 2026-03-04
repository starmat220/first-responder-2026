import { clamp } from './utils'

const getTotalResolved = (telemetryStats) =>
  Object.values(telemetryStats || {}).reduce(
    (sum, item) => sum + (Number(item?.resolved) || 0),
    0
  )

const getTotalMissed = (telemetryStats) =>
  Object.values(telemetryStats || {}).reduce(
    (sum, item) => sum + (Number(item?.missed) || 0),
    0
  )

export const getBalanceProfile = ({
  resolvedCount = 0,
  money = 0,
  publicTrust = 60,
  telemetryStats = {},
}) => {
  const totalResolved = getTotalResolved(telemetryStats)
  const totalMissed = getTotalMissed(telemetryStats)
  const denominator = Math.max(1, totalResolved + totalMissed)
  const missRate = totalMissed / denominator
  const trustPressure = clamp((60 - Number(publicTrust || 0)) / 60, -0.5, 0.6)

  const earlyBoost = resolvedCount < 8 ? 0.1 : resolvedCount < 20 ? 0.05 : 0
  const economyPressure = money < 600 ? 0.12 : money < 1200 ? 0.06 : 0
  const missPressure = clamp((missRate - 0.22) * 0.45, -0.08, 0.22)

  const rewardMultiplier = clamp(1 + earlyBoost + economyPressure - missPressure * 0.35, 0.9, 1.28)
  const missPenaltyMultiplier = clamp(1 - earlyBoost * 0.55 - economyPressure * 0.7 + missPressure, 0.58, 1.16)
  const spawnIntervalMultiplier = clamp(
    1 + (resolvedCount < 10 ? 0.15 : 0) + trustPressure * 0.08 + missPressure * 0.12,
    0.8,
    1.25
  )
  const maxActiveBias =
    resolvedCount < 8
      ? -1
      : resolvedCount < 20
        ? 0
        : missRate < 0.15 && publicTrust > 72
          ? 1
          : 0

  const trustGainMultiplier = clamp(1 + earlyBoost * 0.4 + economyPressure * 0.25, 1, 1.2)
  const trustLossMultiplier = clamp(1 - earlyBoost * 0.35 - economyPressure * 0.2, 0.75, 1)
  const mutualAidCostMultiplier = clamp(
    1 - earlyBoost * 0.45 - economyPressure * 0.25 + missPressure * 0.35,
    0.74,
    1.22
  )

  const label =
    resolvedCount < 8
      ? 'Onboarding Stabilizer'
      : missRate > 0.3
        ? 'Recovery Guardrail'
        : publicTrust > 75 && missRate < 0.16
          ? 'Escalated Challenge'
          : 'Balanced Standard'

  return {
    label,
    missRate,
    rewardMultiplier,
    missPenaltyMultiplier,
    spawnIntervalMultiplier,
    maxActiveBias,
    trustGainMultiplier,
    trustLossMultiplier,
    mutualAidCostMultiplier,
  }
}
