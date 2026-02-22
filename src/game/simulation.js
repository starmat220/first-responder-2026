import {
  FATIGUE_INCREASE_PER_SEC,
  FATIGUE_RECOVER_PER_SEC,
  GRADE_MULTIPLIERS,
  GRADE_THRESHOLDS,
  INCIDENT_STATUS,
  SHIFT_RECOVER_PER_SEC,
  SHIFT_RETURN_THRESHOLD,
  SHIFT_SECONDS,
  VEHICLE_STATUS,
} from './constants'
import { positionFromProgress } from './routes'
import { clamp } from './utils'

export const calculateIncidentResolution = ({
  incident,
  publicTrust,
  now,
  fallbackPriorityConfig,
  rewardMultiplier = 1,
}) => {
  const priorityConfig = fallbackPriorityConfig
  const responseSeconds = incident
    ? Math.max(0, ((incident.arrivedAt || now) - incident.createdAt) / 1000)
    : 0
  const ratio = incident?.responseTargetSeconds
    ? responseSeconds / incident.responseTargetSeconds
    : 1

  let grade = 'poor'
  if (ratio <= GRADE_THRESHOLDS.excellent) grade = 'excellent'
  else if (ratio <= GRADE_THRESHOLDS.good) grade = 'good'
  else if (ratio <= GRADE_THRESHOLDS.late) grade = 'late'

  const gradeConfig = GRADE_MULTIPLIERS[grade]
  const performance = clamp(1.2 - ratio * 0.5, 0.4, 1.2)
  const trustMultiplier = clamp(0.85 + publicTrust / 200, 0.8, 1.35)
  const reward = Math.round(
    priorityConfig.reward * performance * gradeConfig.reward * trustMultiplier * rewardMultiplier
  )

  const existingCaseScore = Number(incident?.caseScore) || 0
  const evidenceGain = Math.max(
    1,
    Math.round((priorityConfig.reward / 40) * gradeConfig.reward * performance)
  )
  const evidencePenalty = grade === 'poor' ? Math.round(priorityConfig.reward / 120) : 0
  const evidenceDelta = Math.max(0, evidenceGain - evidencePenalty)
  const nextCaseScore = clamp(existingCaseScore + evidenceDelta, 0, 999)

  return {
    grade,
    gradeConfig,
    responseSeconds,
    reward,
    evidenceDelta,
    nextCaseScore,
  }
}

export const getEvidenceNote = (grade) => {
  if (grade === 'poor') return 'Evidence compromised'
  if (grade === 'late') return 'Evidence delayed'
  return 'Evidence secured'
}

export const calculateIncidentMissPenalty = ({
  incident,
  now,
  priorityConfig,
  missPenaltyMultiplier = 1,
}) => {
  const remainingSeconds = Math.max(
    0,
    (incident.createdAt + incident.responseTargetSeconds * 1000 - now) / 1000
  )
  const didMiss = remainingSeconds <= 0
  const caseEvidenceScore = Math.max(0, (incident.caseScore || 0) - 1)
  const scaledPenalty = Math.round(priorityConfig.missPenalty * missPenaltyMultiplier)
  const scoreDelta = Math.round(scaledPenalty * 0.5)
  const trustDelta = Math.round(priorityConfig.trustPenalty * missPenaltyMultiplier)

  return {
    didMiss,
    remainingSeconds,
    moneyDelta: scaledPenalty,
    scoreDelta,
    trustDelta,
    caseEvidenceScore,
  }
}

export const calculateVehicleFatigueAndShift = ({
  vehicle,
  step,
  trainingBonus = 0,
}) => {
  const isActive = [
    VEHICLE_STATUS.enroute,
    VEHICLE_STATUS.on_scene,
    VEHICLE_STATUS.returning,
  ].includes(vehicle.status)
  const isRecovering = [
    VEHICLE_STATUS.available,
    VEHICLE_STATUS.cooldown,
    VEHICLE_STATUS.off_shift,
  ].includes(vehicle.status)

  const fatigueBase = Number(vehicle.fatigue) || 0
  const shiftBase = Number.isFinite(vehicle.shiftRemaining)
    ? Number(vehicle.shiftRemaining)
    : SHIFT_SECONDS
  let nextFatigue = fatigueBase
  let nextShift = shiftBase

  if (isActive) {
    const fatigueRate = FATIGUE_INCREASE_PER_SEC * (1 - trainingBonus)
    nextFatigue = clamp(fatigueBase + fatigueRate * step, 0, 100)
    nextShift = Math.max(0, shiftBase - step)
  } else if (isRecovering) {
    nextFatigue = clamp(fatigueBase - FATIGUE_RECOVER_PER_SEC * step, 0, 100)
    nextShift = Math.min(SHIFT_SECONDS, shiftBase + SHIFT_RECOVER_PER_SEC * step)
  }

  return {
    nextFatigue,
    nextShift,
  }
}

export const transitionVehicleForClosedIncident = ({ vehicle, incident }) => {
  if (!incident) return null
  if (
    incident.status !== INCIDENT_STATUS.resolved &&
    incident.status !== INCIDENT_STATUS.missed
  ) {
    return null
  }
  if (vehicle.status === VEHICLE_STATUS.returning) return null
  return {
    ...vehicle,
    status: VEHICLE_STATUS.awaiting_return_route,
    assignedIncidentId: null,
    onSceneRemaining: 0,
    targetPosition: null,
    progressRatio: 0,
    routingStartedAt: null,
    parked: false,
    cooldownRemaining: 0,
  }
}

export const advanceVehicleNonTravelState = ({
  vehicle,
  nextFatigue,
  nextShift,
  step,
  now,
}) => {
  if (vehicle.status === VEHICLE_STATUS.routing) {
    const startedAt = vehicle.routingStartedAt || 0
    if (startedAt && now - startedAt > 10000) {
      return {
        handled: true,
        vehicle: {
          ...vehicle,
          status: VEHICLE_STATUS.available,
          routingStartedAt: null,
          parked: false,
          fatigue: nextFatigue,
          shiftRemaining: nextShift,
          currentSpeedKph: 0,
        },
      }
    }
    return {
      handled: true,
      vehicle: {
        ...vehicle,
        fatigue: nextFatigue,
        shiftRemaining: nextShift,
        currentSpeedKph: 0,
      },
    }
  }

  if (vehicle.status === VEHICLE_STATUS.cooldown) {
    const remaining = Math.max(0, (vehicle.cooldownRemaining || 0) - step)
    if (remaining <= 0.01) {
      const nextStatus = nextShift <= 0 ? VEHICLE_STATUS.off_shift : VEHICLE_STATUS.available
      return {
        handled: true,
        vehicle: {
          ...vehicle,
          status: nextStatus,
          cooldownRemaining: 0,
          parked: true,
          fatigue: nextFatigue,
          shiftRemaining: nextShift,
          currentSpeedKph: 0,
        },
      }
    }
    return {
      handled: true,
      vehicle: {
        ...vehicle,
        cooldownRemaining: remaining,
        parked: true,
        fatigue: nextFatigue,
        shiftRemaining: nextShift,
        currentSpeedKph: 0,
      },
    }
  }

  if (vehicle.status === VEHICLE_STATUS.off_shift) {
    if (nextShift >= SHIFT_SECONDS * SHIFT_RETURN_THRESHOLD) {
      return {
        handled: true,
        vehicle: {
          ...vehicle,
          status: VEHICLE_STATUS.available,
          parked: true,
          fatigue: nextFatigue,
          shiftRemaining: nextShift,
          currentSpeedKph: 0,
        },
      }
    }
    return {
      handled: true,
      vehicle: {
        ...vehicle,
        fatigue: nextFatigue,
        shiftRemaining: nextShift,
        parked: true,
        currentSpeedKph: 0,
      },
    }
  }

  if (vehicle.status === VEHICLE_STATUS.available) {
    if (nextShift <= 0) {
      return {
        handled: true,
        vehicle: {
          ...vehicle,
          status: VEHICLE_STATUS.off_shift,
          parked: true,
          fatigue: nextFatigue,
          shiftRemaining: nextShift,
          currentSpeedKph: 0,
        },
      }
    }
    return {
      handled: true,
      vehicle: {
        ...vehicle,
        fatigue: nextFatigue,
        shiftRemaining: nextShift,
        parked: true,
        currentSpeedKph: 0,
      },
    }
  }

  return {
    handled: false,
    vehicle,
  }
}

export const calculateRouteProgressUpdate = ({
  vehicle,
  step,
  travelSpeedKph,
  simSpeedMultiplier,
}) => {
  const speedMps = (travelSpeedKph * simSpeedMultiplier * 1000) / 3600
  const nextProgress = Math.min(
    vehicle.progressMeters + speedMps * step,
    vehicle.routeData.totalDistance
  )
  const nextPosition = positionFromProgress(vehicle.routeData, nextProgress)
  const remainingDistance = Math.max(0, vehicle.routeData.totalDistance - nextProgress)
  const etaSeconds = speedMps > 0 ? Math.ceil(remainingDistance / speedMps) : 0

  return {
    speedMps,
    nextProgress,
    nextPosition,
    etaSeconds,
    progressRatio:
      vehicle.routeData && vehicle.routeData.totalDistance > 0
        ? nextProgress / vehicle.routeData.totalDistance
        : 0,
    reachedDestination: nextProgress >= vehicle.routeData.totalDistance - 0.1,
  }
}

export const createOnSceneArrivalPatch = ({
  incidentRecord,
  vehicleId,
  arrivedAt,
  onSceneSeconds,
}) => {
  const requiredUnits = Math.max(1, Number(incidentRecord?.requiredUnits) || 1)
  const currentAssigned = Array.isArray(incidentRecord?.assignedVehicleIds)
    ? incidentRecord.assignedVehicleIds
    : []
  const currentOnScene = Array.isArray(incidentRecord?.onSceneVehicleIds)
    ? incidentRecord.onSceneVehicleIds
    : []
  const nextAssigned = currentAssigned.includes(vehicleId)
    ? currentAssigned
    : [...currentAssigned, vehicleId]
  const nextOnScene = currentOnScene.includes(vehicleId)
    ? currentOnScene
    : [...currentOnScene, vehicleId]
  const onSceneReady = nextOnScene.length >= requiredUnits

  return {
    patch: {
      status: onSceneReady ? INCIDENT_STATUS.on_scene : INCIDENT_STATUS.responding,
      assignedVehicleId: nextAssigned[0] || incidentRecord?.assignedVehicleId || null,
      assignedVehicleIds: nextAssigned,
      etaSeconds: 0,
      onSceneRemaining: incidentRecord?.onSceneRemaining || onSceneSeconds,
      arrivedAt,
      onSceneVehicleIds: nextOnScene,
    },
    onSceneReady,
  }
}

export const getIncidentCoverageFallback = ({
  incident,
  enrouteIncidentIds = new Set(),
  routingIncidentIds = new Set(),
  onSceneIncidentIds = new Set(),
  onSceneSeconds,
}) => {
  if (incident.status === INCIDENT_STATUS.responding) {
    if (
      !enrouteIncidentIds.has(incident.id) &&
      !routingIncidentIds.has(incident.id) &&
      !onSceneIncidentIds.has(incident.id)
    ) {
      return {
        ...incident,
        status: INCIDENT_STATUS.open,
        assignedVehicleId: null,
        assignedVehicleIds: [],
        onSceneVehicleIds: [],
        etaSeconds: 0,
        dispatchedAt: null,
      }
    }
  }

  if (incident.status === INCIDENT_STATUS.on_scene) {
    if (!onSceneIncidentIds.has(incident.id)) {
      return {
        ...incident,
        status: INCIDENT_STATUS.open,
        assignedVehicleId: null,
        assignedVehicleIds: [],
        onSceneVehicleIds: [],
        etaSeconds: 0,
        onSceneRemaining: onSceneSeconds,
        dispatchedAt: null,
        arrivedAt: null,
        responseSeconds: null,
      }
    }
  }

  return null
}
