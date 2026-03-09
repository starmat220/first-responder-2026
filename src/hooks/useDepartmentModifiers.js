import { useMemo } from 'react'
import { DEPARTMENTS, DEFAULT_DEPARTMENT_ID } from '../game/departments'
import { PROGRESSION_MILESTONES, VEHICLE_STATUS } from '../game/constants'
import { clamp } from '../game/utils'

export const useDepartmentModifiers = ({ telemetryStats, vehicles }) => {
  return useMemo(() => {
    const modifiers = {
      [DEPARTMENTS.police.id]: {
        responseTargetMultiplier: 1,
        rewardMultiplier: 1,
        missPenaltyMultiplier: 1,
        onSceneMultiplier: 1,
      },
      [DEPARTMENTS.fire.id]: {
        responseTargetMultiplier: 1,
        rewardMultiplier: 1,
        missPenaltyMultiplier: 1,
        onSceneMultiplier: 1,
      },
      [DEPARTMENTS.ems.id]: {
        responseTargetMultiplier: 1,
        rewardMultiplier: 1,
        missPenaltyMultiplier: 1,
        onSceneMultiplier: 1,
      },
      [DEPARTMENTS.tow.id]: {
        responseTargetMultiplier: 1,
        rewardMultiplier: 1,
        missPenaltyMultiplier: 1,
        onSceneMultiplier: 1,
      },
    }

    const progression = {
      fireRescueUnlocked:
        (telemetryStats.fire?.resolved || 0) >= PROGRESSION_MILESTONES.fireRescueUnlockedAt,
      emsAdvancedCareUnlocked:
        (telemetryStats.ems?.resolved || 0) >= PROGRESSION_MILESTONES.emsAdvancedCareUnlockedAt,
      towHeavyRecoveryUnlocked:
        (telemetryStats.tow?.resolved || 0) >= PROGRESSION_MILESTONES.towHeavyRecoveryUnlockedAt,
    }

    const fireMissRate =
      (telemetryStats.fire?.resolved || 0) + (telemetryStats.fire?.missed || 0) > 0
        ? (telemetryStats.fire?.missed || 0) /
          ((telemetryStats.fire?.resolved || 0) + (telemetryStats.fire?.missed || 0))
        : 0
    if (progression.fireRescueUnlocked) {
      modifiers.fire.responseTargetMultiplier = clamp(1.03 + fireMissRate * 0.12, 1.03, 1.18)
      modifiers.fire.missPenaltyMultiplier = clamp(0.94 - fireMissRate * 0.18, 0.72, 0.94)
      modifiers.fire.rewardMultiplier = 1.04
    }
    const emsAvgResponse =
      (telemetryStats.ems?.responseSamples || 0) > 0
        ? (telemetryStats.ems?.responseTotal || 0) / (telemetryStats.ems?.responseSamples || 1)
        : 0
    if (progression.emsAdvancedCareUnlocked) {
      modifiers.ems.responseTargetMultiplier = emsAvgResponse > 180 ? 1.12 : 1.06
      modifiers.ems.onSceneMultiplier = 0.84
      modifiers.ems.rewardMultiplier = 1.05
    }
    const towUnits = vehicles.filter(
      (vehicle) => (vehicle.department || DEFAULT_DEPARTMENT_ID) === DEPARTMENTS.tow.id
    )
    const towActive = towUnits.filter(
      (vehicle) =>
        vehicle.status === VEHICLE_STATUS.enroute || vehicle.status === VEHICLE_STATUS.on_scene
    ).length
    const towUtilization = towUnits.length > 0 ? towActive / towUnits.length : 0
    if (progression.towHeavyRecoveryUnlocked) {
      modifiers.tow.onSceneMultiplier = clamp(0.9 - towUtilization * 0.2, 0.74, 0.9)
      modifiers.tow.responseTargetMultiplier = 1.05
      modifiers.tow.missPenaltyMultiplier = 0.9
    }
    return modifiers
  }, [telemetryStats, vehicles])
}
