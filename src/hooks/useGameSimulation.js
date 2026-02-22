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
} from '../game/constants'
import { applyUpkeepTick } from '../game/economy'
import { positionFromProgress } from '../game/routes'
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
  specialEventsRef,
  economyTimer,
  simSpeedRef,
  publicTrust,
  setVehicles,
  setIncidents,
  setStations,
  setPrisons,
  setSpecialEvents,
  setCases,
  setMoney,
  setScore,
  setPublicTrust,
  setTransactions,
  setResolvedCount,
  setDebriefs,
  setFollowUpPromptId,
  showMessage,
  getStationById,
  getStationResponseBonus,
  getBranchingFollowUp,
  buildIncidentRecord,
  takeCaseId,
  incidentNeedsDetention,
  getAvailablePrisonFacility,
  getAvailableJailStation,
  rewardMultiplierRef,
  missPenaltyMultiplierRef,
  telemetryEventRef,
}) => {
  useEffect(() => {
    let frameId = null
    let lastTime = 0
    let accumulator = 0
    const stepSeconds = 1 / 30

    const tick = (now) => {
      if (!lastTime) lastTime = now
      const delta = Math.min((now - lastTime) / 1000, 0.25)
      lastTime = now
      accumulator += delta

      if (accumulator >= stepSeconds) {
        const step = accumulator
        accumulator = 0
      let currentVehicles = vehiclesRef.current
      const currentIncidents = incidentsRef.current
      const incidentPatches = new Map()
      let nextVehicles = currentVehicles
      let moneyDelta = 0
      let scoreDelta = 0
      let trustDelta = 0
      const ledgerEntries = []
      const followUpIncidents = []
      const caseUpdates = []
      const stationUpdates = new Map()
      const prisonUpdates = new Map()
      const currentSpecials = specialEventsRef.current

      const scheduleTime = new Date()
      const stationDutyMap = new Map(
        stationsRef.current.map((station) => [station.id, isStationOnDuty(station, scheduleTime)])
      )
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

      stationsRef.current.forEach((station) => {
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
      nextVehicles = currentVehicles
      nextVehicles = currentVehicles

      const enrouteIncidentIds = new Set(
        currentVehicles
          .filter((vehicle) => vehicle.status === VEHICLE_STATUS.enroute && vehicle.assignedIncidentId)
          .map((vehicle) => vehicle.assignedIncidentId)
      )
      const routingIncidentIds = new Set(
        currentVehicles
          .filter((vehicle) => vehicle.status === VEHICLE_STATUS.routing && vehicle.assignedIncidentId)
          .map((vehicle) => vehicle.assignedIncidentId)
      )
      const onSceneIncidentIds = new Set(
        currentVehicles
          .filter((vehicle) => vehicle.status === VEHICLE_STATUS.on_scene && vehicle.assignedIncidentId)
          .map((vehicle) => vehicle.assignedIncidentId)
      )

      const upkeepResult = applyUpkeepTick({
        economyTimer: economyTimer.current,
        step,
        vehicles: currentVehicles,
        stations: stationsRef.current,
        now: Date.now(),
      })
      economyTimer.current = upkeepResult.economyTimer
      moneyDelta += upkeepResult.moneyDelta
      if (upkeepResult.ledgerEntries.length) {
        ledgerEntries.push(...upkeepResult.ledgerEntries)
      }

      if (currentVehicles.length) {
        nextVehicles = currentVehicles.map((vehicle) => {
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

            const trainingBonus = getStationById(vehicle.homeStationId)?.trainingBonus || 0
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
              const fatigueMultiplier = clamp(1 - (nextFatigue || 0) / 160, 0.6, 1)
              const responseBonus = getStationResponseBonus(vehicle.homeStationId)
              const travelSpeedKph = getTravelSpeedKph({
                vehicle,
                position: vehicle.position,
                routeData: vehicle.routeData,
                progressMeters: vehicle.progressMeters,
                responseBonus,
                fatigueMultiplier,
                emergency: vehicle.status === VEHICLE_STATUS.enroute,
                center: DEFAULT_CENTER,
              })
              const routeProgress = calculateRouteProgressUpdate({
                vehicle,
                step,
                travelSpeedKph,
                simSpeedMultiplier: simSpeedRef.current,
              })
              let updatedVehicle = {
                ...vehicle,
                progressMeters: routeProgress.nextProgress,
                position: routeProgress.nextPosition,
                etaSeconds: routeProgress.etaSeconds,
                currentSpeedKph: travelSpeedKph,
                progressRatio: routeProgress.progressRatio,
                fatigue: nextFatigue,
                shiftRemaining: nextShift,
              }

              if (routeProgress.reachedDestination) {
                if (vehicle.status === VEHICLE_STATUS.enroute) {
                  const arrivedAt = Date.now()
                  const incidentRecord = currentIncidents.find(
                    (item) => item.id === vehicle.assignedIncidentId
                  )
                  const onSceneArrival = createOnSceneArrivalPatch({
                    incidentRecord,
                    vehicleId: vehicle.id,
                    arrivedAt,
                    onSceneSeconds:
                      Number(incidentRecord?.onSceneDurationSeconds) || ON_SCENE_SECONDS,
                  })
                  updatedVehicle = {
                    ...updatedVehicle,
                    status: VEHICLE_STATUS.on_scene,
                    routeData: null,
                    progressMeters: 0,
                    etaSeconds: 0,
                    onSceneRemaining: ON_SCENE_SECONDS,
                    currentSpeedKph: 0,
                  }
                  incidentPatches.set(vehicle.assignedIncidentId, onSceneArrival.patch)
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
                    cooldownRemaining: COOLDOWN_SECONDS,
                    currentSpeedKph: 0,
                    returnDestinationType: null,
                    returnDestinationId: null,
                    returnIncidentType: null,
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
              const remaining = Math.max(0, (vehicle.onSceneRemaining || 0) - step)
              const updatedVehicle = {
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
                const incident = currentIncidents.find(
                  (item) => item.id === vehicle.assignedIncidentId
                )
                if (incident?.followUpPlan && !incident.followUpGenerated) {
                  if (!incident.awaitingFollowUp) {
                    incidentPatches.set(vehicle.assignedIncidentId, {
                      awaitingFollowUp: true,
                      onSceneRemaining: 0,
                    })
                    setFollowUpPromptId((prev) => prev || incident.id)
                  }
                  return {
                    ...updatedVehicle,
                    onSceneRemaining: 0,
                  }
                }
                const nowTs = Date.now()
                const priorityConfig = getPriorityConfig(incident?.priority || 2)
                const {
                  grade,
                  gradeConfig,
                  responseSeconds,
                  reward,
                  evidenceDelta,
                  nextCaseScore,
                } = calculateIncidentResolution({
                  incident,
                  publicTrust,
                  now: nowTs,
                  fallbackPriorityConfig: priorityConfig,
                  rewardMultiplier:
                    (rewardMultiplierRef?.current ?? 1) *
                    (Number(incident?.rewardMultiplier) || 1),
                })
                const caseId = incident?.caseId || takeCaseId()
                const caseNotes = [
                  ...(incident?.caseNotes || []),
                  {
                    time: new Date().toLocaleTimeString(),
                    note: getEvidenceNote(grade),
                    delta: evidenceDelta,
                  },
                ]
                caseUpdates.push({
                  caseId,
                  type: incident?.type || 'Case file',
                  priority: incident?.priority || 2,
                  evidenceScore: nextCaseScore,
                  notes: caseNotes,
                  updatedAt: nowTs,
                })
                moneyDelta += reward
                ledgerEntries.push({
                  id: `reward-${nowTs}`,
                  label: `${incident?.type || 'Call resolved'} (${grade})`,
                  amount: reward,
                  time: new Date().toLocaleTimeString(),
                })
                scoreDelta += Math.round(reward * gradeConfig.score)
                trustDelta += gradeConfig.trust
                setResolvedCount((prev) => prev + 1)
                setDebriefs((prev) => [
                  {
                    id: `${vehicle.assignedIncidentId}-${nowTs}`,
                    type: incident?.type || 'Call resolved',
                    priority: incident?.priority || 2,
                    grade,
                    reward,
                    responseSeconds,
                    trustDelta: gradeConfig.trust,
                    evidenceDelta,
                    caseId,
                    createdAt: nowTs,
                  },
                  ...prev,
                ].slice(0, 5))
                showMessage(
                  `${incident?.type || 'Call resolved'} - ${grade} (+$${reward})`
                )
                telemetryEventRef?.current?.({
                  type: 'resolved',
                  departmentId: incident?.requiredDepartment,
                  responseSeconds,
                  reward,
                })

                let resolvedFollowUp = null
                if (incident) {
                  const followUpPlan = getBranchingFollowUp(incident, grade, nextCaseScore)
                  if (followUpPlan) {
                    resolvedFollowUp = followUpPlan
                    followUpIncidents.push(
                      buildIncidentRecord({
                        ...followUpPlan,
                        position: incident.position,
                        address: incident.address,
                        caller: followUpPlan.caller || incident.caller,
                        stage: (incident.stage || 1) + 1,
                        stageTotal: Math.max(incident.stageTotal || 2, 2),
                        parentIncidentId: incident.id,
                        caseId,
                        caseScore: nextCaseScore,
                        caseNotes,
                      })
                    )
                  }
                }

                incidentPatches.set(vehicle.assignedIncidentId, {
                  status: INCIDENT_STATUS.resolved,
                  onSceneRemaining: 0,
                  resolvedAt: nowTs,
                  responseSeconds,
                  onSceneVehicleIds: [],
                  followUpGenerated: Boolean(resolvedFollowUp),
                  caseId,
                  caseScore: nextCaseScore,
                  caseNotes,
                })
                const needsDetention = incidentNeedsDetention(incident)
                let returnDestinationType = null
                let returnDestinationId = null
                if (needsDetention) {
                  const prisonStation = getAvailablePrisonFacility(vehicle.position)
                  if (prisonStation) {
                    returnDestinationType = 'prison'
                    returnDestinationId = prisonStation.id
                  } else {
                    const jailStation = getAvailableJailStation(vehicle.position)
                    if (jailStation) {
                      returnDestinationType = 'jail'
                      returnDestinationId = jailStation.id
                    }
                  }
                  if (!returnDestinationId) {
                    returnDestinationType = 'jail'
                    returnDestinationId = vehicle.homeStationId
                    showMessage('No jail space available. Transporting to home station.')
                  }
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
      }

      const now = Date.now()
      let nextSpecials = currentSpecials
      if (currentSpecials.length) {
        nextSpecials = currentSpecials
          .map((event) => {
            if (!event.routeData) return event
            const speedMps =
              (event.speedKph * simSpeedRef.current * 1000) / 3600
            const nextProgress = Math.min(
              event.progressMeters + speedMps * step,
              event.routeData.totalDistance
            )
            if (nextProgress >= event.routeData.totalDistance - 0.1) {
              return null
            }
            if (event.expiresAt && now > event.expiresAt) {
              return null
            }
            return {
              ...event,
              progressMeters: nextProgress,
              position: positionFromProgress(event.routeData, nextProgress),
            }
          })
          .filter(Boolean)
      }
      const nextIncidents = currentIncidents
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
          if (incident.status === INCIDENT_STATUS.open) {
            const priorityConfig = getPriorityConfig(incident.priority)
            const miss = calculateIncidentMissPenalty({
              incident,
              now,
              priorityConfig,
              missPenaltyMultiplier:
                (missPenaltyMultiplierRef?.current ?? 1) *
                (Number(incident?.missPenaltyMultiplier) || 1),
            })
            if (miss.didMiss) {
              moneyDelta += miss.moneyDelta
              if (miss.moneyDelta) {
                ledgerEntries.push({
                  id: `penalty-${Date.now()}`,
                  label: `${incident.type} missed`,
                  amount: miss.moneyDelta,
                  time: new Date().toLocaleTimeString(),
                })
              }
              scoreDelta += miss.scoreDelta
              trustDelta += miss.trustDelta
              telemetryEventRef?.current?.({
                type: 'missed',
                departmentId: incident.requiredDepartment,
              })
              if (incident.caseId) {
                const nextNotes = [
                  ...(incident.caseNotes || []),
                  {
                    time: new Date().toLocaleTimeString(),
                    note: 'Response window missed',
                    delta: -1,
                  },
                ]
                caseUpdates.push({
                  caseId: incident.caseId,
                  type: incident.type,
                  priority: incident.priority,
                  evidenceScore: miss.caseEvidenceScore,
                  notes: nextNotes,
                  updatedAt: Date.now(),
                })
              }
              return {
                ...incident,
                status: INCIDENT_STATUS.missed,
                timeRemaining: 0,
                resolvedAt: now,
              }
            }
            return {
              ...incident,
              timeRemaining: miss.remainingSeconds,
              assignedVehicleIds,
              onSceneVehicleIds,
              ...patch,
            }
          }
          if (incidentPatches.has(incident.id)) {
            return {
              ...incident,
              assignedVehicleIds,
              onSceneVehicleIds,
              ...patch,
            }
          }
          return incident
        })
      .filter(
        (incident) =>
          !(
            (incident.status === INCIDENT_STATUS.resolved ||
              incident.status === INCIDENT_STATUS.missed) &&
            incident.resolvedAt &&
            now - incident.resolvedAt > 5000
          )
      )

      const mergedIncidents = followUpIncidents.length
        ? [...followUpIncidents, ...nextIncidents]
        : nextIncidents
      setVehicles(nextVehicles)
      const currentIncidentIds = new Set(currentIncidents.map((incident) => incident.id))
      setIncidents((prev) => {
        const lateAdded = prev.filter((incident) => !currentIncidentIds.has(incident.id))
        if (!lateAdded.length) return mergedIncidents
        const mergedIds = new Set(mergedIncidents.map((incident) => incident.id))
        const appended = lateAdded.filter((incident) => !mergedIds.has(incident.id))
        if (!appended.length) return mergedIncidents
        return [...appended, ...mergedIncidents]
      })
      if (stationUpdates.size) {
        setStations((prev) =>
          prev.map((station) => {
            const update = stationUpdates.get(station.id)
            if (!update) return station
            const jailCapacity = station.jailCapacity || JAIL_START_CAPACITY
            const nextLog = update.logEntries?.length
              ? [...update.logEntries, ...(station.detentionLog || [])].slice(0, 50)
              : station.detentionLog || []
            return {
              ...station,
              jailCount: clamp(
                (station.jailCount || 0) + (update.jailDelta || 0),
                0,
                jailCapacity
              ),
              detentionLog: nextLog,
            }
          })
        )
      }
      if (prisonUpdates.size) {
        setPrisons((prev) =>
          prev.map((facility) => {
            const update = prisonUpdates.get(facility.id)
            if (!update) return facility
            const nextLog = update.logEntries?.length
              ? [...update.logEntries, ...(facility.detentionLog || [])].slice(0, 50)
              : facility.detentionLog || []
            return {
              ...facility,
              count: clamp(
                (facility.count || 0) + (update.countDelta || 0),
                0,
                facility.capacity || 0
              ),
              detentionLog: nextLog,
            }
          })
        )
      }
      if (nextSpecials !== currentSpecials) {
        setSpecialEvents(nextSpecials)
      }
      if (caseUpdates.length) {
        setCases((prev) => applyCaseUpdates(prev, caseUpdates))
      }
    if (moneyDelta) setMoney((prev) => Math.max(0, prev + moneyDelta))
    if (scoreDelta) setScore((prev) => Math.max(0, prev + scoreDelta))
    if (trustDelta)
      setPublicTrust((prev) => clamp(prev + trustDelta, 0, 100))
    if (ledgerEntries.length) {
      setTransactions((prev) => [...ledgerEntries, ...prev].slice(0, 100))
    }
      }

      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [])
}
/* eslint-enable react-hooks/exhaustive-deps */
