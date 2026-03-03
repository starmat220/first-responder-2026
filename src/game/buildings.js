import { STATION_TYPES } from './departments'

const BUILDING_TIER_OVERRIDES = {
  [STATION_TYPES.police_station.id]: { minLevel: 1, minResolved: 0 },
  [STATION_TYPES.police_station_small.id]: { minLevel: 1, minResolved: 0 },
  [STATION_TYPES.fire_station.id]: { minLevel: 2, minResolved: 8 },
  [STATION_TYPES.fire_station_small.id]: { minLevel: 2, minResolved: 8 },
  [STATION_TYPES.ems_station.id]: { minLevel: 3, minResolved: 16 },
  [STATION_TYPES.ems_station_small.id]: { minLevel: 3, minResolved: 16 },
  [STATION_TYPES.tow_yard.id]: { minLevel: 4, minResolved: 24 },
  [STATION_TYPES.pw_depot.id]: { minLevel: 5, minResolved: 40 },
  [STATION_TYPES.pw_outpost.id]: { minLevel: 5, minResolved: 40 },
  [STATION_TYPES.prison.id]: { minLevel: 4, minResolved: 18 },
  [STATION_TYPES.dispatch_center.id]: { minLevel: 6, minResolved: 30 },
  [STATION_TYPES.staging_area.id]: { minLevel: 5, minResolved: 20 },
  [STATION_TYPES.federal_police.id]: { minLevel: 7, minResolved: 55 },
  [STATION_TYPES.fire_marshal.id]: { minLevel: 6, minResolved: 45 },
}

const BUILDING_CATEGORY_DEFAULTS = {
  station: { minLevel: 1, minResolved: 0 },
  training: { minLevel: 3, minResolved: 10 },
  investigation: { minLevel: 5, minResolved: 35 },
  detention: { minLevel: 4, minResolved: 18 },
  aviation: { minLevel: 5, minResolved: 14 },
  water: { minLevel: 5, minResolved: 14 },
  hub: { minLevel: 6, minResolved: 30 },
  logistics: { minLevel: 6, minResolved: 30 },
  medical_hub: { minLevel: 6, minResolved: 30 },
  medical_outpost: { minLevel: 4, minResolved: 18 },
}

const DEFAULT_REQUIREMENT = { minLevel: 1, minResolved: 0 }

export const getBuildingTierRequirement = (building) => {
  if (!building?.id) return DEFAULT_REQUIREMENT
  if (BUILDING_TIER_OVERRIDES[building.id]) {
    return BUILDING_TIER_OVERRIDES[building.id]
  }
  return BUILDING_CATEGORY_DEFAULTS[building.category] || DEFAULT_REQUIREMENT
}

export const evaluateBuildingTierAccess = ({
  building,
  level = 1,
  resolvedCount = 0,
}) => {
  const requirement = getBuildingTierRequirement(building)
  const currentLevel = Math.max(1, Number(level) || 1)
  const currentResolved = Math.max(0, Number(resolvedCount) || 0)
  const levelOk = currentLevel >= requirement.minLevel
  const resolvedOk = currentResolved >= requirement.minResolved
  const unlocked = levelOk && resolvedOk
  if (unlocked) {
    return {
      unlocked: true,
      requirement,
      reason: '',
    }
  }
  return {
    unlocked: false,
    requirement,
    reason: `Requires Level ${requirement.minLevel} and ${requirement.minResolved} resolved calls.`,
  }
}
