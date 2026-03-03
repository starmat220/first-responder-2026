import { DEPARTMENTS } from './departments'

const LIVE_EVENT_CATALOG = [
  {
    id: 'concert-night',
    title: 'Concert Night Surge',
    summary: 'Downtown crowds increasing calls for service and medical standby.',
    minResolved: 10,
    durationMinutes: 8,
    departments: [DEPARTMENTS.police.id, DEPARTMENTS.ems.id],
    effects: {
      intervalMultiplier: 0.84,
      maxActiveBias: 1,
      rewardMultiplier: 1.06,
      responseTargetMultiplier: 0.96,
      chainChanceBonus: 0.08,
      mutualAidCostMultiplier: 0.94,
    },
  },
  {
    id: 'storm-front',
    title: 'Storm Front Warning',
    summary: 'Severe weather stress is increasing infrastructure and rescue demand.',
    minResolved: 14,
    durationMinutes: 9,
    departments: [DEPARTMENTS.fire.id, DEPARTMENTS.public_works.id, DEPARTMENTS.tow.id],
    weatherBias: ['rain', 'storm', 'snow', 'blizzard'],
    effects: {
      intervalMultiplier: 0.78,
      maxActiveBias: 2,
      rewardMultiplier: 1.08,
      responseTargetMultiplier: 0.94,
      chainChanceBonus: 0.1,
      mutualAidCostMultiplier: 0.9,
    },
  },
  {
    id: 'infrastructure-audit',
    title: 'Infrastructure Audit',
    summary: 'Public Works and tow clearance operations are under heightened scrutiny.',
    minResolved: 22,
    durationMinutes: 10,
    departments: [DEPARTMENTS.public_works.id, DEPARTMENTS.tow.id],
    effects: {
      intervalMultiplier: 0.9,
      maxActiveBias: 1,
      rewardMultiplier: 1.1,
      responseTargetMultiplier: 0.98,
      chainChanceBonus: 0.12,
      mutualAidCostMultiplier: 0.96,
    },
  },
  {
    id: 'heat-health-watch',
    title: 'Heat Health Watch',
    summary: 'EMS and fire are seeing increased demand due to heat conditions.',
    minResolved: 18,
    durationMinutes: 7,
    departments: [DEPARTMENTS.ems.id, DEPARTMENTS.fire.id],
    weatherBias: ['heatwave'],
    effects: {
      intervalMultiplier: 0.86,
      maxActiveBias: 1,
      rewardMultiplier: 1.07,
      responseTargetMultiplier: 0.95,
      chainChanceBonus: 0.09,
      mutualAidCostMultiplier: 0.92,
    },
  },
]

const DEFAULT_EVENT_EFFECTS = {
  intervalMultiplier: 1,
  maxActiveBias: 0,
  rewardMultiplier: 1,
  responseTargetMultiplier: 1,
  chainChanceBonus: 0,
  mutualAidCostMultiplier: 1,
}

const getEventWeight = ({ event, weather, departmentReputation }) => {
  const weatherCondition = weather?.condition
  const weatherWeight = event.weatherBias?.includes(weatherCondition) ? 1.6 : 1
  const departmentReputationAverage =
    Array.isArray(event.departments) && event.departments.length > 0
      ? event.departments.reduce((sum, departmentId) => {
        const rep = Number(departmentReputation?.[departmentId])
        return sum + (Number.isFinite(rep) ? rep : 50)
      }, 0) / event.departments.length
      : 50
  const reputationWeight = departmentReputationAverage < 45 ? 1.2 : 1
  return weatherWeight * reputationWeight
}

const pickWeightedEvent = ({ candidates, weather, departmentReputation }) => {
  if (!candidates.length) return null
  const weighted = candidates.map((event) => ({
    event,
    weight: getEventWeight({ event, weather, departmentReputation }),
  }))
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0)
  if (totalWeight <= 0) return weighted[0].event
  let roll = Math.random() * totalWeight
  for (const item of weighted) {
    roll -= item.weight
    if (roll <= 0) return item.event
  }
  return weighted[weighted.length - 1].event
}

export const getLiveEventEffects = (event) => ({
  ...DEFAULT_EVENT_EFFECTS,
  ...(event?.effects || {}),
})

export const normalizeLiveEvent = (event) => {
  if (!event || typeof event !== 'object') return null
  const startedAt = Number(event.startedAt)
  const endsAt = Number(event.endsAt)
  if (!Number.isFinite(startedAt) || !Number.isFinite(endsAt) || endsAt <= startedAt) return null
  return {
    id: event.id || `event-${startedAt}`,
    templateId: event.templateId || event.id,
    title: event.title || 'Regional Event',
    summary: event.summary || 'Operational conditions have shifted.',
    departments: Array.isArray(event.departments) ? event.departments : [],
    startedAt,
    endsAt,
    effects: getLiveEventEffects(event),
  }
}

export const maybeStartLiveEvent = ({
  activeEvent,
  resolvedCount,
  weather,
  departmentReputation,
  now = Date.now(),
}) => {
  const normalizedActive = normalizeLiveEvent(activeEvent)
  if (normalizedActive && normalizedActive.endsAt > now) {
    return normalizedActive
  }

  if ((Number(resolvedCount) || 0) < 10) return null

  const startChance = resolvedCount >= 35 ? 0.38 : resolvedCount >= 20 ? 0.3 : 0.22
  if (Math.random() > startChance) return null

  const eligible = LIVE_EVENT_CATALOG.filter(
    (event) => (Number(resolvedCount) || 0) >= (Number(event.minResolved) || 0)
  )
  const template = pickWeightedEvent({
    candidates: eligible,
    weather,
    departmentReputation,
  })
  if (!template) return null

  const durationMs = Math.max(2, Number(template.durationMinutes) || 6) * 60 * 1000

  return {
    id: `${template.id}-${now}`,
    templateId: template.id,
    title: template.title,
    summary: template.summary,
    departments: template.departments,
    startedAt: now,
    endsAt: now + durationMs,
    effects: getLiveEventEffects(template),
  }
}

export const getLiveEventRemainingLabel = (event, now = Date.now()) => {
  if (!event) return null
  const remainingMs = Math.max(0, Number(event.endsAt) - now)
  if (remainingMs <= 0) return 'ending'
  const remainingMin = Math.ceil(remainingMs / 60000)
  return `${remainingMin}m`
}

export const isLiveEventActive = (event, now = Date.now()) => {
  const normalized = normalizeLiveEvent(event)
  return Boolean(normalized && normalized.endsAt > now)
}
