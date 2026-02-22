import { PRIORITY_CONFIG } from '../src/config/priority.js'
import {
  DISPATCH_FUEL_COST,
  GRADE_MULTIPLIERS,
  GRADE_THRESHOLDS,
  INCIDENT_INTERVAL_MS,
  OVERTIME_UPKEEP_PER_MIN,
  PERSONNEL_UPKEEP_PER_MIN,
  STATION_COST,
  STATION_UPKEEP_PER_MIN,
  UNIT_TYPE_UPKEEP_PER_MIN,
  VEHICLE_COST,
} from '../src/game/constants.js'

const PRIORITY_SEQUENCE = [1, 2, 3, 2, 2, 1, 3, 2, 2, 3]

const PROFILES = [
  {
    id: 'new',
    units: 1,
    personnel: 2,
    serviceDurationSec: 140,
    responseByPriority: { 1: 120, 2: 170, 3: 220 },
  },
  {
    id: 'average',
    units: 2,
    personnel: 2,
    serviceDurationSec: 110,
    responseByPriority: { 1: 80, 2: 120, 3: 160 },
  },
  {
    id: 'optimized',
    units: 3,
    personnel: 3,
    serviceDurationSec: 90,
    responseByPriority: { 1: 60, 2: 90, 3: 120 },
  },
]

const DURATIONS_MIN = [20, 40, 60]

const getIncidentAt = (index) => PRIORITY_SEQUENCE[index % PRIORITY_SEQUENCE.length]
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const calculateIncidentResolution = ({ incident, publicTrust, now, priorityConfig }) => {
  const responseSeconds = Math.max(0, ((incident.arrivedAt || now) - incident.createdAt) / 1000)
  const ratio = incident.responseTargetSeconds ? responseSeconds / incident.responseTargetSeconds : 1
  let grade = 'poor'
  if (ratio <= GRADE_THRESHOLDS.excellent) grade = 'excellent'
  else if (ratio <= GRADE_THRESHOLDS.good) grade = 'good'
  else if (ratio <= GRADE_THRESHOLDS.late) grade = 'late'
  const gradeConfig = GRADE_MULTIPLIERS[grade]
  const performance = clamp(1.2 - ratio * 0.5, 0.4, 1.2)
  const trustMultiplier = clamp(0.85 + publicTrust / 200, 0.8, 1.35)
  const reward = Math.round(
    priorityConfig.reward * performance * gradeConfig.reward * trustMultiplier
  )
  return { grade, gradeConfig, reward }
}

const sumBusySeconds = (intervals, durationSec) => {
  const events = []
  intervals.forEach(([start, end]) => {
    if (end <= 0 || start >= durationSec) return
    events.push([Math.max(0, start), 1])
    events.push([Math.min(durationSec, end), -1])
  })
  events.sort((a, b) => a[0] - b[0] || b[1] - a[1])

  let active = 0
  let prev = 0
  let busy = 0
  for (let i = 0; i < events.length; i += 1) {
    const [time, delta] = events[i]
    if (time > prev && active > 0) busy += (time - prev) * active
    active += delta
    prev = time
  }
  return busy
}

const simulate = ({ profile, durationMin }) => {
  const durationSec = durationMin * 60
  const spawnIntervalSec = Math.floor(INCIDENT_INTERVAL_MS / 1000)
  const incidentCount = Math.floor(durationSec / spawnIntervalSec)

  let publicTrust = 60
  let money = 1500 - STATION_COST - profile.units * VEHICLE_COST
  let resolved = 0
  let missed = 0
  let rewardTotal = 0
  let penaltyTotal = 0
  let fuelTotal = 0

  const unitFreeAt = Array.from({ length: profile.units }, () => 0)
  const busyIntervals = []

  for (let i = 0; i < incidentCount; i += 1) {
    const priority = getIncidentAt(i)
    const createdAtSec = i * spawnIntervalSec
    const config = PRIORITY_CONFIG[priority]
    const requestedResponse = profile.responseByPriority[priority]

    let bestUnit = 0
    for (let u = 1; u < unitFreeAt.length; u += 1) {
      if (unitFreeAt[u] < unitFreeAt[bestUnit]) bestUnit = u
    }
    const waitSec = Math.max(0, unitFreeAt[bestUnit] - createdAtSec)
    const responseSec = waitSec + requestedResponse

    if (responseSec > config.responseTargetSeconds) {
      missed += 1
      money += config.missPenalty
      penaltyTotal += config.missPenalty
      publicTrust = Math.max(0, publicTrust + config.trustPenalty)
      continue
    }

    resolved += 1
    const arrivalAtMs = (createdAtSec + responseSec) * 1000
    const createdAtMs = createdAtSec * 1000
    const outcome = calculateIncidentResolution({
      incident: {
        createdAt: createdAtMs,
        arrivedAt: arrivalAtMs,
        responseTargetSeconds: config.responseTargetSeconds,
      },
      publicTrust,
      now: arrivalAtMs,
      priorityConfig: config,
    })

    money += outcome.reward
    money -= DISPATCH_FUEL_COST
    rewardTotal += outcome.reward
    fuelTotal += DISPATCH_FUEL_COST
    publicTrust = Math.max(0, Math.min(100, publicTrust + outcome.gradeConfig.trust))

    const startBusy = createdAtSec + waitSec
    const endBusy = startBusy + profile.serviceDurationSec
    busyIntervals.push([startBusy, endBusy])
    unitFreeAt[bestUnit] = endBusy
  }

  const baseUnitCostPerMin = profile.units * UNIT_TYPE_UPKEEP_PER_MIN.patrol
  const personnelPerMin = profile.personnel * PERSONNEL_UPKEEP_PER_MIN
  const stationPerMin = STATION_UPKEEP_PER_MIN
  const busyUnitSeconds = sumBusySeconds(busyIntervals, durationSec)
  const avgActiveUnits = busyUnitSeconds / durationSec
  const overtimePerMin = avgActiveUnits * OVERTIME_UPKEEP_PER_MIN
  const upkeepTotal =
    durationMin * (baseUnitCostPerMin + personnelPerMin + stationPerMin + overtimePerMin)
  money -= upkeepTotal

  return {
    profile: profile.id,
    durationMin,
    incidents: incidentCount,
    resolved,
    missed,
    missRate: incidentCount ? missed / incidentCount : 0,
    publicTrust: Math.round(publicTrust),
    cashEnd: Math.round(money),
    rewardTotal: Math.round(rewardTotal),
    penaltyTotal: Math.round(penaltyTotal),
    fuelTotal: Math.round(fuelTotal),
    upkeepTotal: Math.round(upkeepTotal),
  }
}

const runs = []
for (const profile of PROFILES) {
  for (const durationMin of DURATIONS_MIN) {
    runs.push(simulate({ profile, durationMin }))
  }
}

console.log('\nBalance simulation (synthetic profiles)\n')
for (const run of runs) {
  console.log(
    [
      `${run.profile.padEnd(9)} ${String(run.durationMin).padStart(2)}m`,
      `cash ${String(run.cashEnd).padStart(5)}`,
      `trust ${String(run.publicTrust).padStart(3)}`,
      `resolved ${String(run.resolved).padStart(3)}/${String(run.incidents).padEnd(3)}`,
      `miss ${(run.missRate * 100).toFixed(0).padStart(3)}%`,
      `rewards ${String(run.rewardTotal).padStart(5)}`,
      `penalties ${String(run.penaltyTotal).padStart(5)}`,
      `upkeep ${String(run.upkeepTotal).padStart(5)}`,
    ].join(' | ')
  )
}
console.log('')
