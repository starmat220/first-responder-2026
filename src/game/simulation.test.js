import { describe, expect, it } from 'vitest'
import { INCIDENT_STATUS, SHIFT_SECONDS, VEHICLE_STATUS } from './constants'
import {
  advanceVehicleNonTravelState,
  calculateIncidentMissPenalty,
  calculateIncidentResolution,
  calculateRouteProgressUpdate,
  calculateVehicleFatigueAndShift,
  createOnSceneArrivalPatch,
  getEvidenceNote,
  getIncidentCoverageFallback,
  transitionVehicleForClosedIncident,
} from './simulation'

describe('simulation helpers', () => {
  it('calculates incident resolution score and grade', () => {
    const result = calculateIncidentResolution({
      incident: {
        createdAt: 0,
        arrivedAt: 60_000,
        responseTargetSeconds: 120,
        caseScore: 5,
      },
      publicTrust: 60,
      now: 60_000,
      fallbackPriorityConfig: { reward: 200 },
    })

    expect(result.grade).toBe('excellent')
    expect(result.responseSeconds).toBe(60)
    expect(result.reward).toBeGreaterThan(0)
    expect(result.nextCaseScore).toBeGreaterThanOrEqual(5)
  })

  it('maps evidence note by grade', () => {
    expect(getEvidenceNote('poor')).toBe('Evidence compromised')
    expect(getEvidenceNote('late')).toBe('Evidence delayed')
    expect(getEvidenceNote('excellent')).toBe('Evidence secured')
  })

  it('calculates miss penalty and remaining time', () => {
    const hit = calculateIncidentMissPenalty({
      incident: {
        createdAt: 0,
        responseTargetSeconds: 30,
        caseScore: 3,
      },
      now: 40_000,
      priorityConfig: { missPenalty: -50, trustPenalty: -2 },
    })
    expect(hit.didMiss).toBe(true)
    expect(hit.moneyDelta).toBe(-50)
    expect(hit.scoreDelta).toBe(-25)
    expect(hit.caseEvidenceScore).toBe(2)

    const notMissed = calculateIncidentMissPenalty({
      incident: {
        createdAt: 0,
        responseTargetSeconds: 30,
        caseScore: 3,
      },
      now: 10_000,
      priorityConfig: { missPenalty: -50, trustPenalty: -2 },
    })
    expect(notMissed.didMiss).toBe(false)
    expect(notMissed.remainingSeconds).toBe(20)
  })

  it('advances fatigue and shift for active/recovering states', () => {
    const active = calculateVehicleFatigueAndShift({
      vehicle: { status: VEHICLE_STATUS.enroute, fatigue: 10, shiftRemaining: 100 },
      step: 5,
      trainingBonus: 0,
    })
    expect(active.nextFatigue).toBeGreaterThan(10)
    expect(active.nextShift).toBeLessThan(100)

    const recovering = calculateVehicleFatigueAndShift({
      vehicle: { status: VEHICLE_STATUS.available, fatigue: 10, shiftRemaining: 100 },
      step: 5,
      trainingBonus: 0,
    })
    expect(recovering.nextFatigue).toBeLessThan(10)
    expect(recovering.nextShift).toBeGreaterThan(100)
  })

  it('transitions closed-incident vehicles to awaiting return route', () => {
    const next = transitionVehicleForClosedIncident({
      vehicle: {
        status: VEHICLE_STATUS.on_scene,
        assignedIncidentId: 1,
      },
      incident: { status: INCIDENT_STATUS.resolved },
    })
    expect(next.status).toBe(VEHICLE_STATUS.awaiting_return_route)
    expect(next.assignedIncidentId).toBeNull()
  })

  it('handles non-travel lifecycle transitions', () => {
    const routing = advanceVehicleNonTravelState({
      vehicle: {
        status: VEHICLE_STATUS.routing,
        routingStartedAt: 1,
      },
      nextFatigue: 20,
      nextShift: 300,
      step: 1,
      now: 15_000,
    })
    expect(routing.handled).toBe(true)
    expect(routing.vehicle.status).toBe(VEHICLE_STATUS.available)

    const cooldown = advanceVehicleNonTravelState({
      vehicle: {
        status: VEHICLE_STATUS.cooldown,
        cooldownRemaining: 0.005,
      },
      nextFatigue: 20,
      nextShift: 300,
      step: 1,
      now: 0,
    })
    expect(cooldown.vehicle.status).toBe(VEHICLE_STATUS.available)

    const available = advanceVehicleNonTravelState({
      vehicle: {
        status: VEHICLE_STATUS.available,
      },
      nextFatigue: 20,
      nextShift: 0,
      step: 1,
      now: 0,
    })
    expect(available.vehicle.status).toBe(VEHICLE_STATUS.off_shift)
  })

  it('computes route progress and arrival status', () => {
    const route = calculateRouteProgressUpdate({
      vehicle: {
        progressMeters: 0,
        routeData: {
          totalDistance: 100,
          coords: [
            [45.0, -66.0],
            [45.001, -66.001],
          ],
          segmentDistances: [100],
        },
      },
      step: 10,
      travelSpeedKph: 36,
      simSpeedMultiplier: 1,
    })

    expect(route.nextProgress).toBe(100)
    expect(route.reachedDestination).toBe(true)
    expect(route.etaSeconds).toBe(0)
  })

  it('builds on-scene arrival incident patch', () => {
    const arrival = createOnSceneArrivalPatch({
      incidentRecord: {
        requiredUnits: 2,
        onSceneVehicleIds: [1],
        onSceneRemaining: 20,
      },
      vehicleId: 2,
      arrivedAt: 123,
      onSceneSeconds: 25,
    })
    expect(arrival.patch.status).toBe(INCIDENT_STATUS.on_scene)
    expect(arrival.patch.onSceneVehicleIds).toEqual([1, 2])
  })

  it('returns incident coverage fallback when incident has no active units', () => {
    const fallback = getIncidentCoverageFallback({
      incident: {
        id: 1,
        status: INCIDENT_STATUS.responding,
      },
      enrouteIncidentIds: new Set(),
      onSceneIncidentIds: new Set(),
      onSceneSeconds: 25,
    })
    expect(fallback.status).toBe(INCIDENT_STATUS.open)
    expect(fallback.assignedVehicleIds).toEqual([])
  })
})
