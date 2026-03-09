import { DEPARTMENTS } from './departments'

const DEFAULT_EFFECTS = {
  responseTargetMultiplier: 1,
  rewardMultiplier: 1,
  missPenaltyMultiplier: 1,
  onSceneMultiplier: 1,
  dispatchScoreBonus: 0,
  chainChanceBonus: 0,
}

const makeSpec = (spec) => {
  const effects = {
    ...DEFAULT_EFFECTS,
    ...(spec.effects || {}),
  }
  return {
    minLevel: 1,
    minResolved: 0,
    ...spec,
    effects,
  }
}

const SHARED_STANDARD = makeSpec({
  id: 'standard',
  label: 'Standard Doctrine',
  description: 'Balanced response profile with no specialization bias.',
})

export const STATION_SPECIALIZATIONS = {
  [DEPARTMENTS.police.id]: [
    SHARED_STANDARD,
    makeSpec({
      id: 'patrol_grid',
      label: 'Patrol Grid',
      description: 'Faster response to traffic and patrol incidents.',
      minLevel: 2,
      minResolved: 8,
      effects: {
        responseTargetMultiplier: 0.95,
        dispatchScoreBonus: 0.8,
      },
    }),
    makeSpec({
      id: 'investigations',
      label: 'Investigations Desk',
      description: 'Better closure quality and stronger chain follow-through.',
      minLevel: 3,
      minResolved: 18,
      effects: {
        rewardMultiplier: 1.08,
        chainChanceBonus: 0.12,
      },
    }),
  ],
  [DEPARTMENTS.fire.id]: [
    SHARED_STANDARD,
    makeSpec({
      id: 'rapid_suppression',
      label: 'Rapid Suppression',
      description: 'Shorter on-scene suppression time for active fire calls.',
      minLevel: 2,
      minResolved: 10,
      effects: {
        onSceneMultiplier: 0.9,
        dispatchScoreBonus: 0.65,
      },
    }),
    makeSpec({
      id: 'hazmat_protocol',
      label: 'Hazmat Protocol',
      description: 'Safer containment with lower miss penalties.',
      minLevel: 4,
      minResolved: 22,
      effects: {
        missPenaltyMultiplier: 0.86,
        rewardMultiplier: 1.05,
      },
    }),
  ],
  [DEPARTMENTS.ems.id]: [
    SHARED_STANDARD,
    makeSpec({
      id: 'rapid_triage',
      label: 'Rapid Triage',
      description: 'Faster medical dispatch and improved outcome confidence.',
      minLevel: 3,
      minResolved: 16,
      effects: {
        responseTargetMultiplier: 0.94,
        rewardMultiplier: 1.06,
      },
    }),
    makeSpec({
      id: 'critical_care',
      label: 'Critical Care',
      description: 'Higher quality severe-call completion and better chain outcomes.',
      minLevel: 4,
      minResolved: 26,
      effects: {
        rewardMultiplier: 1.09,
        chainChanceBonus: 0.1,
      },
    }),
  ],
  [DEPARTMENTS.tow.id]: [
    SHARED_STANDARD,
    makeSpec({
      id: 'rapid_clearance',
      label: 'Rapid Clearance',
      description: 'Speeds up clearance and improves dispatch ranking on road calls.',
      minLevel: 4,
      minResolved: 24,
      effects: {
        onSceneMultiplier: 0.9,
        dispatchScoreBonus: 0.75,
      },
    }),
    makeSpec({
      id: 'heavy_recovery',
      label: 'Heavy Recovery',
      description: 'Stronger outcomes for complex recoveries.',
      minLevel: 5,
      minResolved: 34,
      effects: {
        rewardMultiplier: 1.08,
        missPenaltyMultiplier: 0.9,
      },
    }),
  ],
  [DEPARTMENTS.public_works.id]: [
    SHARED_STANDARD,
    makeSpec({
      id: 'storm_hardening',
      label: 'Storm Hardening',
      description: 'Reduces weather-related misses and improves follow-up generation.',
      minLevel: 5,
      minResolved: 40,
      effects: {
        missPenaltyMultiplier: 0.88,
        chainChanceBonus: 0.08,
      },
    }),
    makeSpec({
      id: 'infrastructure_ops',
      label: 'Infrastructure Ops',
      description: 'Higher reward on long infrastructure mitigation chains.',
      minLevel: 6,
      minResolved: 55,
      effects: {
        rewardMultiplier: 1.1,
      },
    }),
  ],
}

export const getDepartmentSpecializationOptions = (departmentId) =>
  STATION_SPECIALIZATIONS[departmentId] || [SHARED_STANDARD]

export const getStationSpecializationDefinition = (departmentId, specializationId) => {
  const options = getDepartmentSpecializationOptions(departmentId)
  return (
    options.find((item) => item.id === specializationId) ||
    options.find((item) => item.id === SHARED_STANDARD.id) ||
    SHARED_STANDARD
  )
}

export const evaluateSpecializationUnlock = (definition, { level = 1, resolvedCount = 0 }) => {
  const minLevel = Math.max(1, Number(definition?.minLevel) || 1)
  const minResolved = Math.max(0, Number(definition?.minResolved) || 0)
  const unlocked = (Number(level) || 1) >= minLevel && (Number(resolvedCount) || 0) >= minResolved
  return {
    unlocked,
    reason: unlocked ? '' : `Requires Level ${minLevel} and ${minResolved} resolved calls.`,
  }
}

export const getDepartmentSpecializationMenu = ({
  departmentId,
  level = 1,
  resolvedCount = 0,
}) =>
  getDepartmentSpecializationOptions(departmentId).map((definition) => {
    const access = evaluateSpecializationUnlock(definition, { level, resolvedCount })
    return {
      ...definition,
      unlocked: access.unlocked,
      lockedReason: access.reason,
    }
  })

const mergeEffects = (left, right) => ({
  responseTargetMultiplier: (left.responseTargetMultiplier || 1) * (right.responseTargetMultiplier || 1),
  rewardMultiplier: (left.rewardMultiplier || 1) * (right.rewardMultiplier || 1),
  missPenaltyMultiplier: (left.missPenaltyMultiplier || 1) * (right.missPenaltyMultiplier || 1),
  onSceneMultiplier: (left.onSceneMultiplier || 1) * (right.onSceneMultiplier || 1),
  dispatchScoreBonus: (left.dispatchScoreBonus || 0) + (right.dispatchScoreBonus || 0),
  chainChanceBonus: (left.chainChanceBonus || 0) + (right.chainChanceBonus || 0),
})

export const getDepartmentSpecializationModifiers = ({
  stations,
  level = 1,
  resolvedCount = 0,
}) => {
  const baseline = {}
  Object.values(DEPARTMENTS).forEach((department) => {
    baseline[department.id] = {
      ...DEFAULT_EFFECTS,
      activeSpecializationId: SHARED_STANDARD.id,
      activeSpecializationLabel: SHARED_STANDARD.label,
    }
  })

  const safeStations = Array.isArray(stations) ? stations : []

  Object.keys(baseline).forEach((departmentId) => {
    const candidates = safeStations
      .filter((station) => (station.department || DEPARTMENTS.police.id) === departmentId)
      .sort((a, b) => (Number(b.level) || 1) - (Number(a.level) || 1))

    if (candidates.length === 0) return

    const commandStation = candidates[0]
    const chosen = getStationSpecializationDefinition(
      departmentId,
      commandStation.specialization || SHARED_STANDARD.id
    )
    const access = evaluateSpecializationUnlock(chosen, { level, resolvedCount })
    const active = access.unlocked
      ? chosen
      : getStationSpecializationDefinition(departmentId, SHARED_STANDARD.id)

    baseline[departmentId] = {
      ...mergeEffects(DEFAULT_EFFECTS, active.effects),
      activeSpecializationId: active.id,
      activeSpecializationLabel: active.label,
    }
  })

  return baseline
}

export const getStationSpecializationDispatchBonus = ({
  station,
  incident,
  level = 1,
  resolvedCount = 0,
}) => {
  if (!station || !incident) return 0
  const definition = getStationSpecializationDefinition(
    station.department,
    station.specialization || SHARED_STANDARD.id
  )
  const access = evaluateSpecializationUnlock(definition, { level, resolvedCount })
  if (!access.unlocked) return 0

  const type = String(incident.type || '').toLowerCase()
  const department = station.department || DEPARTMENTS.police.id
  const departmentMatches = (incident.requiredDepartment || DEPARTMENTS.police.id) === department
  let relevance = 0.35

  if (definition.id === 'patrol_grid' && /(traffic|collision|vehicle|patrol|pursuit)/.test(type)) {
    relevance = 1
  } else if (definition.id === 'investigations' && /(burglary|robbery|search|investigation|assault)/.test(type)) {
    relevance = 1
  } else if (definition.id === 'rapid_suppression' && /(fire|smoke|explosion|hazmat)/.test(type)) {
    relevance = 1
  } else if (definition.id === 'hazmat_protocol' && /(hazmat|chemical|gas leak|arcing)/.test(type)) {
    relevance = 1
  } else if (definition.id === 'rapid_triage' && /(medical|injury|unresponsive|overdose|trauma)/.test(type)) {
    relevance = 1
  } else if (definition.id === 'critical_care' && /(cardiac|stroke|critical|mass casualty)/.test(type)) {
    relevance = 1
  } else if (definition.id === 'rapid_clearance' && /(tow|breakdown|road|traffic|hazard|collision)/.test(type)) {
    relevance = 1
  } else if (definition.id === 'heavy_recovery' && /(heavy|recovery|stalled|extraction|winch)/.test(type)) {
    relevance = 1
  } else if (definition.id === 'storm_hardening' && /(storm|flood|snow|ice|wind|drain)/.test(type)) {
    relevance = 1
  } else if (definition.id === 'infrastructure_ops' && /(infrastructure|bridge|grid|signal|water main|roadway)/.test(type)) {
    relevance = 1
  }

  if (!departmentMatches) relevance *= 0.4

  return (definition.effects.dispatchScoreBonus || 0) * relevance
}
