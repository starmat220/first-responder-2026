import { useEffect } from 'react'
import { getPriorityConfig } from '../config/priority'
import { applyCaseUpdates } from '../game/cases'
import {
  COOLDOWN_SECONDS,
  DEFAULT_CENTER,
  INCIDENT_STATUS,
  JAIL_START_CAPACITY,
  ON_SCENE_SECONDS,
  SHIFT_SECONDS,
  VEHICLE_STATUS,
  ESCALATION_CHANCE_PER_TICK,
  XP_PER_LEVEL,
  UNIT_LEVEL_CAP,
  RADIO_CODES,
  SKILL_TYPES,
  HOSPITAL_POS,
  IMPOUND_POS,
  CHAINED_EVENTS,
} from '../game/constants'
import { applyUpkeepTick } from '../game/economy'
import { buildFallbackRoute, buildRouteData, positionFromProgress } from '../game/routes'
import {
  calculateRouteProgressUpdate,
  createOnSceneArrivalPatch,
  calculateIncidentMissPenalty,
  calculateIncidentResolution,
  calculateVehicleFatigueAndShift,
  advanceVehicleNonTravelState,
  getIncidentCoverageFallback,
  getEvidenceNote,
  transitionVehicleForClosedIncident,
} from '../game/simulation'
import { getTravelSpeedKph } from '../game/speed'
import { getStationMinOnDuty, isStationOnDuty } from '../game/staffing'
import { clamp } from '../game/utils'

/* eslint-disable react-hooks/exhaustive-deps */
export const useGameSimulation = ({
  vehiclesRef,
  incidentsRef,
  stationsRef,
  prisonsRef,
  specialEventsRef,
  economyTimer,
  simSpeedRef,
  publicTrust,
  setVehicles,
  setIncidents,
  setStations,
  setPrisons,
  setSpecialEvents,
  setMoney,
  setScore,
  setPublicTrust,
  setTransactions,
  setResolvedCount,
  setDebriefs,
  setCases,
  setTotalMoneyEarned,
  setFollowUpPromptId,
  showMessage,
  getBranchingFollowUp,
  buildIncidentRecord,
  takeCaseId,
  incidentNeedsDetention,
  rewardMultiplierRef,
  telemetryEventRef,
  addRadioLogRef,
  getDepartmentShortLabelRef,
  weather,
  unlockedTech = [],
}) => {
  const STUCK_ROUTE_REBUILD_MS = 4000
  const STUCK_PROGRESS_EPSILON_METERS = 0.5

  const shouldPreserveExternalVehicleStatus = (latestStatus, simStatus) => {
    if (latestStatus === simStatus) return false

    // Only preserve known "newer external" handoffs over a stale simulation snapshot.
    // Do not preserve broadly, or we can block real simulation transitions
    // like enroute -> on_scene or returning -> cooldown.
    if (
      latestStatus === VEHICLE_STATUS.routing &&
      [
        VEHICLE_STATUS.available,
        VEHICLE_STATUS.cooldown,
        VEHICLE_STATUS.off_shift,
      ].includes(simStatus)
    ) {
      return true
    }

    if (
      latestStatus === VEHICLE_STATUS.enroute &&
      [VEHICLE_STATUS.available, VEHICLE_STATUS.routing].includes(simStatus)
    ) {
      return true
    }

    if (
      latestStatus === VEHICLE_STATUS.returning &&
      simStatus === VEHICLE_STATUS.awaiting_return_route
    ) {
      return true
    }

    return false
  }

  const getCrewSkillValue = (member, skillKey) =>
    Number(member?.skills?.[skillKey] ?? member?.stats?.[skillKey] ?? 1)

  const getCrewTraitBonus = (member, requiredDepartment, incidentType = '') => {
    const trait = String(member?.trait || '').toLowerCase()
    const lowerType = String(incidentType || '').toLowerCase()
    if (!trait) return 0
    if (trait === 'veteran') return 0.08
    if (trait === 'steady_hands') return 0.05
    if (trait === 'resilient' && (member?.stress || 0) >= 40) return 0.06
    if (trait === 'investigator' && requiredDepartment === 'police') return 0.07
    if (trait === 'triage_specialist' && requiredDepartment === 'ems') return 0.1
    if (trait === 'fireproof' && requiredDepartment === 'fire') return 0.1
    if (trait === 'precision_driver' && lowerType.includes('traffic')) return 0.08
    if (trait === 'logistics_mind' && requiredDepartment === 'tow') return 0.07
    return 0.03
  }

  useEffect(() => {
    let frameId = null
    let lastTime = 0
    let accumulator = 0
    const stepSeconds = 1 / 30

    const tick = (nowTs) => {
      if (!lastTime) lastTime = nowTs
      const delta = Math.min((nowTs - lastTime) / 1000, 0.25)
      lastTime = nowTs
      
      accumulator += delta * (simSpeedRef.current || 1)

      // Take a fresh snapshot of all shared state at the START of the frame
      let currentVehicles = [...vehiclesRef.current]
      let currentIncidents = [...incidentsRef.current]
      let currentStations = [...stationsRef.current]
      let currentPrisons = [...prisonsRef.current]
      let currentSpecials = [...specialEventsRef.current]
      
      let moneyDeltaTotal = 0
      let moneyEarnedTotal = 0
      let scoreDeltaTotal = 0
      let trustDeltaTotal = 0
      const allLedgerEntries = []
      const allFollowUpIncidents = []
      const allCaseUpdates = []
      let resolvedCountDelta = 0
      const newDebriefs = []

      let processedSteps = 0
      const maxStepsPerFrame = 30 // Higher cap for high speed testing

      while (accumulator >= stepSeconds && processedSteps < maxStepsPerFrame) {
        const step = stepSeconds
        accumulator -= stepSeconds
        processedSteps++
        
        const incidentPatches = new Map()
        let moneyDeltaStep = 0
        let scoreDeltaStep = 0
        let trustDeltaStep = 0
        const stationUpdates = new Map()
        const prisonUpdates = new Map()

        const scheduleTime = new Date()
        const stationDutyMap = new Map(
          currentStations.map((station) => [station.id, isStationOnDuty(station, scheduleTime)])
        )
        
        // 1. Shift logic
        currentVehicles = currentVehicles.map((vehicle) => {
          const onDuty = stationDutyMap.get(vehicle.homeStationId)
          if (
            onDuty === false &&
            (vehicle.status === VEHICLE_STATUS.available ||
              vehicle.status === VEHICLE_STATUS.cooldown)
          ) {
            return {
              ...vehicle,
              status: VEHICLE_STATUS.off_shift,
              routeData: null,
              progressMeters: 0,
              etaSeconds: 0,
              targetPosition: null,
              progressRatio: 0,
              routingStartedAt: null,
              parked: true,
              currentSpeedKph: 0,
              shiftRemaining: SHIFT_SECONDS,
            }
          }
          return vehicle
        })

        // 2. Minimum staffing
        currentStations.forEach((station) => {
          if (!isStationOnDuty(station, scheduleTime)) return
          const minOnDuty = getStationMinOnDuty(station, scheduleTime)
          if (minOnDuty <= 0) return
          const stationVehicles = currentVehicles.filter(
            (vehicle) => vehicle.homeStationId === station.id
          )
          const onDutyCount = stationVehicles.filter(
            (vehicle) => vehicle.status === VEHICLE_STATUS.available
          ).length
          const needed = Math.max(0, minOnDuty - onDutyCount)
          if (needed <= 0) return
          let remaining = needed
          currentVehicles = currentVehicles.map((vehicle) => {
            if (remaining <= 0) return vehicle
            if (vehicle.homeStationId !== station.id) return vehicle
            if (vehicle.status !== VEHICLE_STATUS.off_shift) return vehicle
            remaining -= 1
            return {
              ...vehicle,
              status: VEHICLE_STATUS.available,
              parked: true,
              shiftRemaining: SHIFT_SECONDS,
            }
          })
        })

        const enrouteIncidentIds = new Set(
          currentVehicles
            .filter((v) => v.status === VEHICLE_STATUS.enroute && v.assignedIncidentId)
            .map((v) => v.assignedIncidentId)
        )
        const routingIncidentIds = new Set(
          currentVehicles
            .filter((v) => v.status === VEHICLE_STATUS.routing && v.assignedIncidentId)
            .map((v) => v.assignedIncidentId)
        )
        const onSceneIncidentIds = new Set(
          currentVehicles
            .filter((v) => v.status === VEHICLE_STATUS.on_scene && v.assignedIncidentId)
            .map((v) => v.assignedIncidentId)
        )

        // 3. Upkeep
        const upkeepResult = applyUpkeepTick({
          economyTimer: economyTimer.current,
          step,
          vehicles: currentVehicles,
          stations: currentStations,
          now: Date.now(),
        })
        economyTimer.current = upkeepResult.economyTimer
        moneyDeltaStep += upkeepResult.moneyDelta
        if (upkeepResult.ledgerEntries.length) {
          allLedgerEntries.push(...upkeepResult.ledgerEntries)
        }

        // 4. Vehicle & Resolution Logic
        currentVehicles = currentVehicles.map((vehicle) => {
            const incident =
              vehicle.assignedIncidentId != null
                ? currentIncidents.find((item) => item.id === vehicle.assignedIncidentId)
                : null
            
            const closedIncidentTransition = transitionVehicleForClosedIncident({
              vehicle,
              incident,
            })
            if (closedIncidentTransition) {
              return closedIncidentTransition
            }

            const stationForVehicle = currentStations.find(s => s.id === vehicle.homeStationId)
            const trainingBonus = stationForVehicle?.trainingBonus || 0
            const { nextFatigue, nextShift } = calculateVehicleFatigueAndShift({
              vehicle,
              step,
              trainingBonus,
            })

            const nonTravel = advanceVehicleNonTravelState({
              vehicle,
              nextFatigue,
              nextShift,
              step,
              now: Date.now(),
            })
            if (nonTravel.handled) {
              return nonTravel.vehicle
            }
            
            if (
              vehicle.status === VEHICLE_STATUS.enroute ||
              vehicle.status === VEHICLE_STATUS.returning
            ) {
              if (!vehicle.routeData) return vehicle
              const fatigueMultiplier = clamp(1 - (nextFatigue || 0) / 500, 0.85, 1)
              const responseBonus = stationForVehicle?.responseBonus || 0
              let travelSpeedKph = getTravelSpeedKph({
                vehicle,
                position: vehicle.position,
                routeData: vehicle.routeData,
                progressMeters: vehicle.progressMeters,
                responseBonus,
                fatigueMultiplier,
                emergency: vehicle.status === VEHICLE_STATUS.enroute,
                center: DEFAULT_CENTER,
                weather,
              })
              
              if (vehicle.status === VEHICLE_STATUS.enroute && unlockedTech.includes('hi_vis_sirens')) {
                travelSpeedKph *= 1.1
              }

              const routeProgress = calculateRouteProgressUpdate({
                vehicle,
                step,
                travelSpeedKph,
                simSpeedMultiplier: 1, 
              })
              const nowMs = Date.now()
              const currentProgressMeters = Number.isFinite(vehicle.progressMeters)
                ? vehicle.progressMeters
                : 0
              const progressedMeters = routeProgress.nextProgress - currentProgressMeters
              const hasProgressed = progressedMeters > STUCK_PROGRESS_EPSILON_METERS
              let watchdogStalledAt = hasProgressed
                ? null
                : Number.isFinite(vehicle.watchdogStalledAt)
                  ? vehicle.watchdogStalledAt
                  : nowMs
              let watchdogLastProgressMeters = routeProgress.nextProgress
              let watchdogRerouteUsed = !!vehicle.watchdogRerouteUsed
              let updatedVehicle = {
                ...vehicle,
                progressMeters: routeProgress.nextProgress,
                position: routeProgress.nextPosition,
                etaSeconds: routeProgress.etaSeconds,
                currentSpeedKph: travelSpeedKph,
                progressRatio: routeProgress.progressRatio,
                fatigue: nextFatigue,
                shiftRemaining: nextShift,
                watchdogLastProgressMeters,
                watchdogStalledAt,
                watchdogRerouteUsed,
              }

              if (
                !routeProgress.reachedDestination &&
                !hasProgressed &&
                !watchdogRerouteUsed &&
                watchdogStalledAt &&
                nowMs - watchdogStalledAt >= STUCK_ROUTE_REBUILD_MS
              ) {
                const destination =
                  vehicle.targetPosition ||
                  vehicle.routeData?.coords?.[vehicle.routeData.coords.length - 1] ||
                  null
                if (destination && vehicle.position) {
                  const rebuiltRoute = buildRouteData(
                    buildFallbackRoute(vehicle.position, destination)
                  )
                  const rebuiltProgress = calculateRouteProgressUpdate({
                    vehicle: {
                      ...vehicle,
                      routeData: rebuiltRoute,
                      progressMeters: 0,
                    },
                    step,
                    travelSpeedKph,
                    simSpeedMultiplier: 1,
                  })
                  watchdogRerouteUsed = true
                  watchdogStalledAt = nowMs
                  watchdogLastProgressMeters = rebuiltProgress.nextProgress
                  updatedVehicle = {
                    ...updatedVehicle,
                    routeData: rebuiltRoute,
                    progressMeters: rebuiltProgress.nextProgress,
                    position: rebuiltProgress.nextPosition,
                    etaSeconds: rebuiltProgress.etaSeconds,
                    progressRatio: rebuiltProgress.progressRatio,
                    watchdogLastProgressMeters,
                    watchdogStalledAt,
                    watchdogRerouteUsed,
                  }
                }
              }

                if (routeProgress.reachedDestination) {
                  if (vehicle.status === VEHICLE_STATUS.enroute) {
                    const arrivedAt = Date.now()
                    const incidentId = vehicle.assignedIncidentId
                    const incidentRecordBase = currentIncidents.find((item) => item.id === incidentId)
                    const existingIncidentPatch = incidentPatches.get(incidentId) || {}
                    const incidentRecord = incidentRecordBase
                      ? {
                          ...incidentRecordBase,
                          ...existingIncidentPatch,
                          assignedVehicleIds: Array.isArray(existingIncidentPatch.assignedVehicleIds)
                            ? existingIncidentPatch.assignedVehicleIds
                            : incidentRecordBase.assignedVehicleIds,
                          onSceneVehicleIds: Array.isArray(existingIncidentPatch.onSceneVehicleIds)
                            ? existingIncidentPatch.onSceneVehicleIds
                            : incidentRecordBase.onSceneVehicleIds,
                        }
                      : incidentRecordBase
                    const onSceneArrival = createOnSceneArrivalPatch({
                      incidentRecord,
                      vehicleId: vehicle.id,
                      arrivedAt,
                      onSceneSeconds:
                      Number(incidentRecord?.onSceneDurationSeconds) || ON_SCENE_SECONDS,
                    vehicles: currentVehicles,
                  })
                    updatedVehicle = {
                      ...updatedVehicle,
                      status: VEHICLE_STATUS.on_scene,
                      routeData: null,
                    progressMeters: 0,
                    etaSeconds: 0,
                      onSceneRemaining: ON_SCENE_SECONDS,
                      currentSpeedKph: 0,
                      watchdogLastProgressMeters: 0,
                      watchdogStalledAt: null,
                      watchdogRerouteUsed: false,
                    }
                    incidentPatches.set(incidentId, {
                      ...existingIncidentPatch,
                      ...onSceneArrival.patch,
                    })
                  const arrivalMsgs = [
                    `Unit ${vehicle.name} 10-23 On Scene at ${incidentRecord?.address}`,
                    `Unit ${vehicle.name} is 10-23. Arrived at the location.`,
                    `10-23 for Unit ${vehicle.name}. Scene established.`,
                  ]
                  addRadioLogRef.current?.(
                    arrivalMsgs[Math.floor(Math.random() * arrivalMsgs.length)],
                    'info',
                    getDepartmentShortLabelRef.current ? getDepartmentShortLabelRef.current(vehicle.department) : 'PD',
                    RADIO_CODES.arrived,
                    vehicle.id
                  )
                } else if (vehicle.status === VEHICLE_STATUS.returning) {
                  if (vehicle.returnDestinationType && vehicle.returnDestinationId) {
                    if (vehicle.returnDestinationType === 'prison') {
                      const existing = prisonUpdates.get(vehicle.returnDestinationId) || {
                        countDelta: 0,
                        logEntries: [],
                      }
                      existing.countDelta += 1
                      existing.logEntries.push({
                        id: `detention-${vehicle.id}-${Date.now()}`,
                        type: vehicle.returnIncidentType || 'Detention intake',
                        destination: 'prison',
                        time: new Date().toLocaleTimeString(),
                      })
                      prisonUpdates.set(vehicle.returnDestinationId, existing)
                    } else {
                      const existing = stationUpdates.get(vehicle.returnDestinationId) || {
                        jailDelta: 0,
                        logEntries: [],
                      }
                      existing.jailDelta += 1
                      existing.logEntries.push({
                        id: `detention-${vehicle.id}-${Date.now()}`,
                        type: vehicle.returnIncidentType || 'Detention intake',
                        destination: 'cells',
                        time: new Date().toLocaleTimeString(),
                      })
                      stationUpdates.set(vehicle.returnDestinationId, existing)
                    }
                  }
                  updatedVehicle = {
                    ...updatedVehicle,
                    status: VEHICLE_STATUS.cooldown,
                    routeData: null,
                    progressMeters: 0,
                    etaSeconds: 0,
                    assignedIncidentId: null,
                    targetPosition: null,
                    progressRatio: 0,
                    routingStartedAt: null,
                    parked: true,
                    cooldownRemaining: unlockedTech.includes('rapid_response') ? Math.round(COOLDOWN_SECONDS * 0.7) : COOLDOWN_SECONDS,
                    currentSpeedKph: 0,
                    returnDestinationType: null,
                    returnDestinationId: null,
                    returnIncidentType: null,
                    watchdogLastProgressMeters: 0,
                    watchdogStalledAt: null,
                    watchdogRerouteUsed: false,
                  }
                }
              } else if (vehicle.status === VEHICLE_STATUS.enroute) {
                const existingPatch = incidentPatches.get(vehicle.assignedIncidentId) || {}
                const bestEta =
                  existingPatch.etaSeconds == null
                    ? routeProgress.etaSeconds
                    : Math.min(existingPatch.etaSeconds, routeProgress.etaSeconds)
                incidentPatches.set(vehicle.assignedIncidentId, {
                  ...existingPatch,
                  etaSeconds: bestEta,
                })
              }

              return updatedVehicle
            }

            if (vehicle.status === VEHICLE_STATUS.on_scene) {
              if (!incident || incident.status !== INCIDENT_STATUS.on_scene) {
                return {
                  ...vehicle,
                  fatigue: nextFatigue,
                  shiftRemaining: nextShift,
                  currentSpeedKph: 0,
                }
              }
              if (incident.awaitingFollowUp) {
                return {
                  ...vehicle,
                  fatigue: nextFatigue,
                  shiftRemaining: nextShift,
                  currentSpeedKph: 0,
                  onSceneRemaining: 0,
                }
              }

              // Calculate Resolution Multiplier (Speed of work)
              let resolutionMultiplier = 1.0
              
              // 1. Crew Skill Impact
              const crewMembers = stationForVehicle?.crewMembers?.filter(m => vehicle.assignedCrewIds?.includes(m.id)) || []
              let relevantSkillKey = 'tactics'
              if (incident.requiredDepartment === 'fire') relevantSkillKey = 'suppression'
              if (incident.requiredDepartment === 'ems') relevantSkillKey = 'medical'
              if (incident.requiredDepartment === 'tow') relevantSkillKey = 'recovery'

              if (crewMembers.length > 0) {
                const avgSkill =
                  crewMembers.reduce(
                    (sum, member) => sum + getCrewSkillValue(member, relevantSkillKey),
                    0
                  ) / crewMembers.length
                const avgTraitBonus =
                  crewMembers.reduce(
                    (sum, member) =>
                      sum +
                      getCrewTraitBonus(
                        member,
                        incident?.requiredDepartment,
                        incident?.type
                      ),
                    0
                  ) / crewMembers.length
                // Scale 1-10 skill from 0.6x (slow grind) up to 1.5x (max)
                resolutionMultiplier *= (0.5 + (avgSkill * 0.1))
                resolutionMultiplier *= 1 + avgTraitBonus
              }

              // 2. Specialized Unit Bonuses
              if (vehicle.unitType === 'k9') {
                const searchKeywords = ['search', 'missing', 'stolen', 'fleeing', 'tracking', 'burglary']
                if (searchKeywords.some(kw => incident.type.toLowerCase().includes(kw))) {
                  resolutionMultiplier *= 2.5 // K-9 is a huge help for searches
                }
              }

              const progressStep = step * resolutionMultiplier
              const remaining = Math.max(0, (vehicle.onSceneRemaining || 0) - progressStep)
              
              let updatedVehicle = {
                ...vehicle,
                onSceneRemaining: remaining,
                currentSpeedKph: 0,
                fatigue: nextFatigue,
                shiftRemaining: nextShift,
              }
              incidentPatches.set(vehicle.assignedIncidentId, {
                onSceneRemaining: remaining,
              })

              if (remaining <= 0.01) {
                const nowRes = Date.now()
                const priorityConfig = getPriorityConfig(incident?.priority || 2)
                const crewMembers = stationForVehicle?.crewMembers?.filter(m => vehicle.assignedCrewIds?.includes(m.id)) || []
                
                let relevantSkill = SKILL_TYPES.tactics
                if (incident?.requiredDepartment === 'fire') relevantSkill = SKILL_TYPES.suppression
                if (incident?.requiredDepartment === 'ems') relevantSkill = SKILL_TYPES.medical
                if (incident?.requiredDepartment === 'tow') relevantSkill = SKILL_TYPES.recovery
                
                const avgSkill = crewMembers.length 
                  ? crewMembers.reduce(
                    (sum, member) => sum + getCrewSkillValue(member, relevantSkill),
                    0
                  ) / crewMembers.length
                  : 0
                
                const crewSkillBonus = (avgSkill / 10) * 0.15

                const {
                  grade,
                  gradeConfig,
                  responseSeconds,
                  reward,
                  evidenceDelta,
                  nextCaseScore,
                                      xpGain,
                                    } = calculateIncidentResolution({
                                      incident: { ...incident, crewSkillBonus },
                                      publicTrust,
                                      now: nowRes,
                                      fallbackPriorityConfig: priorityConfig,
                                      rewardMultiplier:
                                        (rewardMultiplierRef?.current ?? 1) *
                                        (Number(incident?.rewardMultiplier) || 1),
                                      unlockedTech,
                                    })                
                const currentXp = vehicle.xp || 0
                const currentLevel = vehicle.level || 1
                let nextXp = currentXp + xpGain
                let nextLevel = currentLevel
                if (nextXp >= nextLevel * XP_PER_LEVEL && nextLevel < UNIT_LEVEL_CAP) {
                  nextLevel += 1
                  showMessage(`${vehicle.name} promoted to Level ${nextLevel}!`)
                }
                updatedVehicle = { ...updatedVehicle, xp: nextXp, level: nextLevel }

                const assignedCrewIds = Array.isArray(vehicle.assignedCrewIds)
                  ? vehicle.assignedCrewIds
                  : []
                if (assignedCrewIds.length > 0 && stationForVehicle) {
                  const baseCrewXp = Math.max(
                    25,
                    Math.round(xpGain / Math.max(1, assignedCrewIds.length))
                  )
                  const gradeXpBonus =
                    grade === 'excellent' ? 20 : grade === 'good' ? 10 : grade === 'late' ? 0 : -8
                  const stressDelta =
                    grade === 'poor' ? 10 : grade === 'late' ? 5 : grade === 'good' ? -2 : -4
                  const promotedCrew = []

                  currentStations = currentStations.map((station) => {
                    if (station.id !== stationForVehicle.id) return station
                    const nextCrewMembers = (station.crewMembers || []).map((member) => {
                      if (!assignedCrewIds.includes(member.id)) return member

                      const memberSkills = {
                        driving: getCrewSkillValue(member, 'driving'),
                        tactics: getCrewSkillValue(member, SKILL_TYPES.tactics),
                        suppression: getCrewSkillValue(member, SKILL_TYPES.suppression),
                        medical: getCrewSkillValue(member, SKILL_TYPES.medical),
                        recovery: getCrewSkillValue(member, SKILL_TYPES.recovery),
                      }
                      const currentMemberLevel = Math.max(1, Number(member.level) || 1)
                      const currentMemberXp = Math.max(0, Number(member.xp) || 0)
                      const nextMemberXp = currentMemberXp + baseCrewXp + gradeXpBonus

                      let nextMemberLevel = currentMemberLevel
                      let gainedLevels = 0
                      let nextThreshold = nextMemberLevel * 140
                      while (nextMemberLevel < 12 && nextMemberXp >= nextThreshold) {
                        nextMemberLevel += 1
                        gainedLevels += 1
                        nextThreshold = nextMemberLevel * 140
                      }

                      if (gainedLevels > 0) {
                        const skillKey =
                          relevantSkill === SKILL_TYPES.tactics
                            ? 'tactics'
                            : relevantSkill === SKILL_TYPES.suppression
                              ? 'suppression'
                              : relevantSkill === SKILL_TYPES.medical
                                ? 'medical'
                                : 'recovery'
                        memberSkills[skillKey] = clamp(memberSkills[skillKey] + gainedLevels, 1, 10)
                        memberSkills.driving = clamp(
                          memberSkills.driving + Math.max(1, gainedLevels - 1),
                          1,
                          10
                        )
                        promotedCrew.push(member.name)
                      }

                      const nextCertifications = Array.from(
                        new Set([
                          ...(Array.isArray(member.certifications) ? member.certifications : []),
                          ...(nextMemberLevel >= 3 ? [`${relevantSkill}_cert`] : []),
                          ...(nextMemberLevel >= 6 ? ['advanced_response'] : []),
                        ])
                      )

                      return {
                        ...member,
                        level: nextMemberLevel,
                        xp: nextMemberXp,
                        skills: memberSkills,
                        stats: memberSkills,
                        role:
                          nextMemberLevel >= 8
                            ? 'Specialist'
                            : nextMemberLevel >= 5
                              ? 'Senior'
                              : nextMemberLevel >= 3
                                ? 'Responder'
                                : 'Probationary',
                        stress: clamp((Number(member.stress) || 0) + stressDelta, 0, 100),
                        fatigue: clamp((Number(member.fatigue) || 0) + 3, 0, 100),
                        certifications: nextCertifications,
                      }
                    })
                    return {
                      ...station,
                      crewMembers: nextCrewMembers,
                    }
                  })

                  if (promotedCrew.length > 0) {
                    showMessage(`Crew promoted: ${promotedCrew.slice(0, 2).join(', ')}`)
                  }
                }

                const clearMsgs = [
                  `Code 4: ${incident?.type} resolved.`,
                  `${incident?.type} is Code 4. Sector is clear.`,
                  `Unit ${vehicle.name} has cleared ${incident?.type}. 10-4.`,
                ]
                addRadioLogRef.current?.(
                  clearMsgs[Math.floor(Math.random() * clearMsgs.length)],
                  'success',
                  getDepartmentShortLabelRef.current ? getDepartmentShortLabelRef.current(vehicle.department) : 'PD',
                  RADIO_CODES.clear,
                  vehicle.id
                )

                const caseId = incident?.caseId || takeCaseId()
                const caseNotes = [
                  ...(incident?.caseNotes || []),
                  {
                    time: new Date().toLocaleTimeString(),
                    note: getEvidenceNote(grade),
                    delta: evidenceDelta,
                  },
                ]
                allCaseUpdates.push({
                  caseId,
                  type: incident?.type || 'Case file',
                  priority: incident?.priority || 2,
                  evidenceScore: nextCaseScore,
                  notes: caseNotes,
                  updatedAt: nowRes,
                })
                
                moneyDeltaStep += reward
                moneyEarnedTotal += reward
                allLedgerEntries.push({
                  id: `reward-${nowRes}`,
                  label: `${incident?.type || 'Call resolved'} (${grade})`,
                  amount: reward,
                  time: new Date().toLocaleTimeString(),
                })
                scoreDeltaStep += Math.round(reward * gradeConfig.score)
                trustDeltaStep += gradeConfig.trust
                resolvedCountDelta += 1
                newDebriefs.push({
                  id: `${vehicle.assignedIncidentId}-${nowRes}`,
                  type: incident?.type || 'Call resolved',
                  priority: incident?.priority || 2,
                  grade,
                  reward,
                  responseSeconds,
                  trustDelta: gradeConfig.trust,
                  evidenceDelta,
                  caseId,
                  createdAt: nowRes,
                })
                showMessage(
                  `${incident?.type || 'Call resolved'} - ${grade} (+$${reward})`
                )
                telemetryEventRef?.current?.({
                  type: 'resolved',
                  departmentId: incident?.requiredDepartment,
                  responseSeconds,
                  responseTargetSeconds: incident?.responseTargetSeconds,
                  reward,
                  grade,
                  stage: incident?.stage || 1,
                })

                let resolvedFollowUp = null
                if (incident) {
                  const followUpPlan = getBranchingFollowUp(incident, grade, nextCaseScore)
                  if (followUpPlan) {
                    resolvedFollowUp = followUpPlan
                  }

                  // Process CHAINED_EVENTS (Consecutive related calls)
                  const chainPool = CHAINED_EVENTS[incident.type] || []
                  chainPool.forEach(chain => {
                    if (Math.random() < chain.chance) {
                      allFollowUpIncidents.push(
                        buildIncidentRecord({
                          type: chain.type,
                          position: incident.position,
                          address: incident.address,
                          caller: 'Field Report',
                          requiredDepartment: chain.department || incident.requiredDepartment,
                          requiredUnitType: chain.needsK9 ? 'k9' : null,
                          priority: 2,
                          parentIncidentId: incident.id,
                          caseId, // Link to same investigation
                        })
                      )
                    }
                  })
                }

                if (resolvedFollowUp) {
                  incidentPatches.set(vehicle.assignedIncidentId, {
                    status: INCIDENT_STATUS.on_scene,
                    onSceneRemaining: 0,
                    awaitingFollowUp: true,
                    followUpGenerated: false,
                    followUpPlan: resolvedFollowUp,
                    caseId,
                    caseScore: nextCaseScore,
                    caseNotes,
                    responseSeconds,
                  })
                  setFollowUpPromptId?.((prev) => prev ?? vehicle.assignedIncidentId)

                  return {
                    ...updatedVehicle,
                    status: VEHICLE_STATUS.on_scene,
                    onSceneRemaining: 0,
                    currentSpeedKph: 0,
                  }
                }

                incidentPatches.set(vehicle.assignedIncidentId, {
                  status: INCIDENT_STATUS.resolved,
                  onSceneRemaining: 0,
                  resolvedAt: nowRes,
                  responseSeconds,
                  onSceneVehicleIds: [],
                  followUpGenerated: Boolean(resolvedFollowUp),
                  caseId,
                  caseScore: nextCaseScore,
                  caseNotes,
                })
                
                const needsDetention = incidentNeedsDetention(incident)
                const dept = incident?.requiredDepartment
                let returnDestinationType = null
                let returnDestinationId = null

                if (dept === 'ems') {
                  returnDestinationType = 'hospital'
                  addRadioLogRef.current?.(`Unit ${vehicle.name} 10-17 Transporting to Regional Hospital.`, 'info', 'EMS', '10-17', vehicle.id)
                } else if (dept === 'tow') {
                  returnDestinationType = 'impound'
                  addRadioLogRef.current?.(`Unit ${vehicle.name} 10-19 Towing to Regional Impound.`, 'info', 'TOW', '10-19', vehicle.id)
                } else if (needsDetention || dept === 'police') {
                  returnDestinationType = 'station'
                  returnDestinationId = vehicle.homeStationId
                  addRadioLogRef.current?.(`Unit ${vehicle.name} 10-15 Suspect in custody, moving to Station for processing.`, 'info', 'PD', '10-15', vehicle.id)
                }

                return {
                  ...updatedVehicle,
                  status: VEHICLE_STATUS.awaiting_return_route,
                  assignedIncidentId: null,
                  onSceneRemaining: 0,
                  targetPosition: null, 
                  progressRatio: 0,
                  routingStartedAt: null,
                  parked: false,
                  cooldownRemaining: 0,
                  currentSpeedKph: 0,
                  returnDestinationType,
                  returnDestinationId,
                  returnIncidentType: incident?.type || null,
                }
              }
              return updatedVehicle
            }

            return {
              ...vehicle,
              fatigue: nextFatigue,
              shiftRemaining: nextShift,
              currentSpeedKph: 0,
            }
          })

        // 5. Specials
        const nowL = Date.now()
        currentSpecials = currentSpecials
          .map((event) => {
            if (!event.routeData) return event
            const speedMps = (event.speedKph * 1000) / 3600
            const nextProgress = Math.min(
              event.progressMeters + speedMps * step,
              event.routeData.totalDistance
            )
            if (nextProgress >= event.routeData.totalDistance - 0.1) {
              return null
            }
            if (event.expiresAt && nowL > event.expiresAt) {
              return null
            }
            return {
              ...event,
              progressMeters: nextProgress,
              position: positionFromProgress(event.routeData, nextProgress),
            }
          })
          .filter(Boolean)

        // 6. Incidents
        currentIncidents = currentIncidents
          .map((incident) => {
            const patch = incidentPatches.get(incident.id) || {}
            const assignedVehicleIds = Array.isArray(patch.assignedVehicleIds)
              ? patch.assignedVehicleIds
              : Array.isArray(incident.assignedVehicleIds)
              ? incident.assignedVehicleIds
              : []
            const onSceneVehicleIds = Array.isArray(patch.onSceneVehicleIds)
              ? patch.onSceneVehicleIds
              : Array.isArray(incident.onSceneVehicleIds)
              ? incident.onSceneVehicleIds
              : []
            
            const coverageFallback = getIncidentCoverageFallback({
              incident,
              enrouteIncidentIds,
              routingIncidentIds,
              onSceneIncidentIds,
              onSceneSeconds: ON_SCENE_SECONDS,
            })
            if (coverageFallback) return coverageFallback

            if (incident.status === INCIDENT_STATUS.open || incident.status === INCIDENT_STATUS.responding) {
              const priorityConfig = getPriorityConfig(incident.priority)
              
              if (
                incident.status === INCIDENT_STATUS.open &&
                incident.priority > 1 &&
                incident.timeRemaining < incident.responseTargetSeconds * 0.25 &&
                Math.random() < ESCALATION_CHANCE_PER_TICK
              ) {
                const nextPriority = incident.priority - 1
                addRadioLogRef.current?.(
                  `${incident.type} escalating${incident.address ? ` at ${incident.address}` : ''}.`,
                  'escalation',
                  'ALARM',
                  RADIO_CODES.panic,
                  null,
                  {
                    incidentId: incident.id,
                    incidentAddress: incident.address || null,
                  }
                )
                return {
                  ...incident,
                  priority: nextPriority,
                  timeRemaining: getPriorityConfig(nextPriority).responseTargetSeconds,
                  responseTargetSeconds: getPriorityConfig(nextPriority).responseTargetSeconds,
                  missPenaltyMultiplier: (incident.missPenaltyMultiplier || 1) * 1.5,
                }
              }

              const miss = calculateIncidentMissPenalty({
                incident,
                now: nowL,
                priorityConfig,
                missPenaltyMultiplier:
                  (rewardMultiplierRef?.current ?? 1) *
                  (Number(incident?.missPenaltyMultiplier) || 1),
              })
              
              const nextTimeRemaining = Math.max(0, (incident.timeRemaining || 0) - step)

              if (miss.didMiss && incident.status === INCIDENT_STATUS.open) {
                moneyDeltaStep += miss.moneyDelta
                if (miss.moneyDelta) {
                  allLedgerEntries.push({
                    id: `penalty-${Date.now()}`,
                    label: `${incident.type} missed`,
                    amount: miss.moneyDelta,
                    time: new Date().toLocaleTimeString(),
                  })
                }
                scoreDeltaStep += miss.scoreDelta
                trustDeltaStep += miss.trustDelta
                telemetryEventRef?.current?.({
                  type: 'missed',
                  departmentId: incident.requiredDepartment,
                })
                return {
                  ...incident,
                  status: INCIDENT_STATUS.missed,
                  timeRemaining: 0,
                  resolvedAt: nowL,
                }
              }

              return {
                ...incident,
                ...patch,
                assignedVehicleIds,
                onSceneVehicleIds,
                timeRemaining: nextTimeRemaining,
              }
            }
            return {
              ...incident,
              ...patch,
              assignedVehicleIds,
              onSceneVehicleIds,
            }
          })
          .concat(allFollowUpIncidents)
          .filter((item) => {
            if (item.status === INCIDENT_STATUS.resolved || item.status === INCIDENT_STATUS.missed) {
              return nowL - (item.resolvedAt || item.missedAt || nowL) < 1500
            }
            return true
          })

        // 7. Intermediate Commit
        if (stationUpdates.size) {
          currentStations = currentStations.map((station) => {
            const update = stationUpdates.get(station.id)
            if (!update) return station
            return {
              ...station,
              jailCount: Math.min(
                station.jailCapacity || JAIL_START_CAPACITY,
                (station.jailCount || 0) + update.jailDelta
              ),
              detentionLog: [...(station.detentionLog || []), ...update.logEntries].slice(0, 50),
            }
          })
        }
        
        if (prisonUpdates.size) {
          currentPrisons = currentPrisons.map((prison) => {
            const update = prisonUpdates.get(prison.id)
            if (!update) return prison
            return {
              ...prison,
              count: Math.min(prison.capacity || 0, (prison.count || 0) + update.countDelta),
              detentionLog: [...(prison.detentionLog || []), ...update.logEntries].slice(0, 50),
            }
          })
        }

        moneyDeltaTotal += moneyDeltaStep
        scoreDeltaTotal += scoreDeltaStep
        trustDeltaTotal += trustDeltaStep
      } // end while

      // 8. Final Commit
      if (processedSteps > 0) {
        // MERGE LOGIC: Combine simulation updates with any status changes that happened in DispatchSystem
        setVehicles(() => {
          const freshFromRef = vehiclesRef.current
          return freshFromRef.map(latestV => {
            const simV = currentVehicles.find(sv => sv.id === latestV.id)
            if (!simV) return latestV
            
            // If the vehicle's status was changed EXTERNALLY (e.g. to 'enroute' or 'routing'), 
            // preserve that status and the associated new data (routeData, etc.)
            if (shouldPreserveExternalVehicleStatus(latestV.status, simV.status)) {
              return {
                ...latestV,
                fatigue: simV.fatigue,
                shiftRemaining: simV.shiftRemaining
              }
            }
            return simV
          })
        })

        setIncidents(currentIncidents)
        setStations(currentStations)
        setPrisons(currentPrisons)
        setSpecialEvents(currentSpecials)
        
        // Update refs immediately so the next frame or dispatch call sees them
        // Note: For vehiclesRef, we manually apply the merge logic here too
        vehiclesRef.current = vehiclesRef.current.map(latestV => {
          const simV = currentVehicles.find(sv => sv.id === latestV.id)
          if (!simV) return latestV
          if (shouldPreserveExternalVehicleStatus(latestV.status, simV.status)) {
            return { ...latestV, fatigue: simV.fatigue, shiftRemaining: simV.shiftRemaining }
          }
          return simV
        })
        
        incidentsRef.current = currentIncidents
        stationsRef.current = currentStations
        prisonsRef.current = currentPrisons
        specialEventsRef.current = currentSpecials

        if (moneyDeltaTotal !== 0) setMoney((prev) => Math.max(0, prev + moneyDeltaTotal))
        if (moneyEarnedTotal > 0) {
          setTotalMoneyEarned((prev) => prev + moneyEarnedTotal)
        }
        if (scoreDeltaTotal !== 0) setScore((prev) => prev + scoreDeltaTotal)
        if (trustDeltaTotal !== 0) setPublicTrust((prev) => clamp(prev + trustDeltaTotal, 0, 100))
        if (allLedgerEntries.length) setTransactions((prev) => [...allLedgerEntries, ...prev].slice(0, 100))
        if (resolvedCountDelta > 0) setResolvedCount((prev) => prev + resolvedCountDelta)
        if (newDebriefs.length > 0) setDebriefs((prev) => [...newDebriefs, ...prev].slice(0, 5))
        if (allCaseUpdates.length > 0) setCases((prev) => applyCaseUpdates(prev, allCaseUpdates))
      }

      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [])
}
/* eslint-enable react-hooks/exhaustive-deps */
