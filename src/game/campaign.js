import { DEFAULT_CENTER } from './constants'
import { haversineMeters } from './geo'

export const CAMPAIGN_DISTRICTS = [
  {
    id: 'downtown_core',
    label: 'Downtown Core',
    shortLabel: 'Core',
    description: 'Dense mixed-use blocks with frequent medical and police demand.',
    unlock: { minResolved: 0, minLevel: 1, minTrust: 0 },
  },
  {
    id: 'riverside',
    label: 'Riverside',
    shortLabel: 'River',
    description: 'Bridge traffic and flood-prone approaches near the river corridor.',
    unlock: { minResolved: 10, minLevel: 2, minTrust: 0 },
  },
  {
    id: 'industrial_yard',
    label: 'Industrial Yard',
    shortLabel: 'Industrial',
    description: 'Warehouses, heavy traffic, and elevated fire/tow complexity.',
    unlock: { minResolved: 20, minLevel: 3, minTrust: 0 },
  },
  {
    id: 'north_hills',
    label: 'North Hills',
    shortLabel: 'Hills',
    description: 'Long approach routes and weather-sensitive roads.',
    unlock: { minResolved: 32, minLevel: 4, minTrust: 0 },
  },
  {
    id: 'coastal_belt',
    label: 'Coastal Belt',
    shortLabel: 'Coastal',
    description: 'Storm surge and marine access operations.',
    unlock: { minResolved: 44, minLevel: 5, minTrust: 45 },
  },
  {
    id: 'rural_county',
    label: 'Rural County',
    shortLabel: 'Rural',
    description: 'Sparse coverage with long response distances.',
    unlock: { minResolved: 56, minLevel: 6, minTrust: 52 },
  },
]

export const CAMPAIGN_MILESTONES = [
  {
    id: 'milestone-regional-brief',
    title: 'Regional Briefing Cleared',
    description: 'Stabilize core operations and unlock cross-district dispatch.',
    unlock: { minResolved: 12, minLevel: 2, minTrust: 40 },
    reward: 600,
    trustBonus: 1,
  },
  {
    id: 'milestone-joint-taskforce',
    title: 'Joint Taskforce Charter',
    description: 'Coordinate police/fire/ems/tow at higher call volume.',
    unlock: { minResolved: 30, minLevel: 4, minTrust: 45 },
    reward: 1200,
    trustBonus: 2,
  },
  {
    id: 'milestone-regional-command',
    title: 'Regional Command Authority',
    description: 'Authorizes full-county ops and advanced district contracts.',
    unlock: { minResolved: 58, minLevel: 7, minTrust: 55 },
    reward: 1800,
    trustBonus: 3,
  },
]

const defaultUnlockedDistricts = [CAMPAIGN_DISTRICTS[0].id]

export const createInitialCampaignState = () => ({
  unlockedDistrictIds: [...defaultUnlockedDistricts],
  activeDistrictId: CAMPAIGN_DISTRICTS[0].id,
  claimedMilestoneIds: [],
})

const hasMetUnlock = (unlock, { resolvedCount, level, publicTrust }) =>
  resolvedCount >= (unlock?.minResolved || 0) &&
  level >= (unlock?.minLevel || 1) &&
  publicTrust >= (unlock?.minTrust || 0)

export const normalizeCampaignState = (input) => {
  const state = input && typeof input === 'object' ? input : {}
  const unlockedDistrictIds = Array.isArray(state.unlockedDistrictIds)
    ? state.unlockedDistrictIds.filter((id) =>
        CAMPAIGN_DISTRICTS.some((district) => district.id === id)
      )
    : []
  const safeUnlocked = unlockedDistrictIds.length
    ? Array.from(new Set([...defaultUnlockedDistricts, ...unlockedDistrictIds]))
    : [...defaultUnlockedDistricts]
  const activeDistrictId =
    typeof state.activeDistrictId === 'string' &&
    safeUnlocked.includes(state.activeDistrictId)
      ? state.activeDistrictId
      : safeUnlocked[0]
  const claimedMilestoneIds = Array.isArray(state.claimedMilestoneIds)
    ? state.claimedMilestoneIds.filter((id) =>
        CAMPAIGN_MILESTONES.some((milestone) => milestone.id === id)
      )
    : []
  return {
    unlockedDistrictIds: safeUnlocked,
    activeDistrictId,
    claimedMilestoneIds: Array.from(new Set(claimedMilestoneIds)),
  }
}

export const evaluateCampaignProgress = ({
  resolvedCount = 0,
  level = 1,
  publicTrust = 60,
  campaignState = createInitialCampaignState(),
}) => {
  const normalized = normalizeCampaignState(campaignState)
  const context = {
    resolvedCount: Math.max(0, Number(resolvedCount) || 0),
    level: Math.max(1, Number(level) || 1),
    publicTrust: Math.max(0, Number(publicTrust) || 0),
  }

  const unlockedDistrictIds = CAMPAIGN_DISTRICTS.filter((district) =>
    hasMetUnlock(district.unlock, context)
  ).map((district) => district.id)

  const safeUnlocked = Array.from(
    new Set([...defaultUnlockedDistricts, ...normalized.unlockedDistrictIds, ...unlockedDistrictIds])
  )

  const newlyUnlockedDistrictIds = safeUnlocked.filter(
    (id) => !normalized.unlockedDistrictIds.includes(id)
  )

  const nextDistrict =
    CAMPAIGN_DISTRICTS.find((district) => !safeUnlocked.includes(district.id)) || null

  const milestoneStatuses = CAMPAIGN_MILESTONES.map((milestone) => {
    const unlocked = hasMetUnlock(milestone.unlock, context)
    const claimed = normalized.claimedMilestoneIds.includes(milestone.id)
    return {
      ...milestone,
      unlocked,
      claimed,
      availableToClaim: unlocked && !claimed,
    }
  })

  const availableMilestones = milestoneStatuses.filter((item) => item.availableToClaim)

  return {
    unlockedDistrictIds: safeUnlocked,
    newlyUnlockedDistrictIds,
    activeDistrictId: safeUnlocked.includes(normalized.activeDistrictId)
      ? normalized.activeDistrictId
      : safeUnlocked[0],
    nextDistrict,
    milestones: milestoneStatuses,
    availableMilestones,
  }
}

const getDistrictByBearing = (distanceKm, bearingDeg) => {
  // Rings from city center; sectors inside each ring.
  if (distanceKm <= 2.2) return 'downtown_core'
  if (distanceKm <= 4.8) {
    if (bearingDeg >= 35 && bearingDeg < 125) return 'north_hills'
    if (bearingDeg >= 125 && bearingDeg < 210) return 'riverside'
    if (bearingDeg >= 210 && bearingDeg < 305) return 'industrial_yard'
    return 'downtown_core'
  }
  if (distanceKm <= 7.2) {
    if (bearingDeg >= 110 && bearingDeg < 235) return 'coastal_belt'
    return 'rural_county'
  }
  return 'rural_county'
}

export const getDistrictIdForPosition = (
  position,
  {
    center = DEFAULT_CENTER,
    unlockedDistrictIds = defaultUnlockedDistricts,
  } = {}
) => {
  if (!Array.isArray(position) || position.length !== 2) {
    return unlockedDistrictIds[0] || defaultUnlockedDistricts[0]
  }
  const lat = Number(position[0]) || center[0]
  const lng = Number(position[1]) || center[1]
  const distanceKm = haversineMeters([lat, lng], center) / 1000
  const dy = lat - center[0]
  const dx = lng - center[1]
  const rawBearing = (Math.atan2(dy, dx) * 180) / Math.PI
  const bearingDeg = (rawBearing + 360) % 360
  const districtId = getDistrictByBearing(distanceKm, bearingDeg)
  if (unlockedDistrictIds.includes(districtId)) return districtId
  if (unlockedDistrictIds.includes('downtown_core')) return 'downtown_core'
  return unlockedDistrictIds[0] || defaultUnlockedDistricts[0]
}

export const getDistrictById = (districtId) =>
  CAMPAIGN_DISTRICTS.find((district) => district.id === districtId) || CAMPAIGN_DISTRICTS[0]

export const getDistrictIncidentModifiers = ({ districtId, weatherCondition }) => {
  const weather = String(weatherCondition || '')
  const byDistrict = {
    downtown_core: {
      rewardMultiplier: 1,
      responseTargetMultiplier: 0.96,
      departmentWeight: { police: 1.1, ems: 1.08, fire: 1, tow: 0.95, public_works: 0.92 },
    },
    riverside: {
      rewardMultiplier: 1.06,
      responseTargetMultiplier: weather === 'rain' || weather === 'storm' ? 1.1 : 1.03,
      departmentWeight: { police: 1.02, ems: 1, fire: 1, tow: 1.06, public_works: 1.12 },
    },
    industrial_yard: {
      rewardMultiplier: 1.1,
      responseTargetMultiplier: 1.08,
      departmentWeight: { police: 0.96, ems: 1, fire: 1.16, tow: 1.12, public_works: 1.08 },
    },
    north_hills: {
      rewardMultiplier: 1.07,
      responseTargetMultiplier: 1.14,
      departmentWeight: { police: 1, ems: 1.08, fire: 1.04, tow: 1.05, public_works: 1.02 },
    },
    coastal_belt: {
      rewardMultiplier: 1.12,
      responseTargetMultiplier:
        weather === 'storm' || weather === 'blizzard' || weather === 'rain' ? 1.2 : 1.08,
      departmentWeight: { police: 1, ems: 1.04, fire: 1.1, tow: 1.06, public_works: 1.18 },
    },
    rural_county: {
      rewardMultiplier: 1.15,
      responseTargetMultiplier: 1.22,
      departmentWeight: { police: 1.02, ems: 1.08, fire: 1.04, tow: 1.08, public_works: 1.04 },
    },
  }
  return byDistrict[districtId] || byDistrict.downtown_core
}
