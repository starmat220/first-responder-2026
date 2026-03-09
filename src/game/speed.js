import {
  CITY_CORE_RADIUS_KM,
  RURAL_RADIUS_KM,
  URBAN_RADIUS_KM,
  ZONE_SPEED_LIMITS_KPH,
} from './constants'
import { haversineMeters } from './geo'
import { getWeatherSpeedMultiplier } from './weather'

export const getZoneSpeedLimit = (position, center) => {
  if (!position || !center) return ZONE_SPEED_LIMITS_KPH.rural
  const distanceKm = haversineMeters(position, center) / 1000
  if (distanceKm <= CITY_CORE_RADIUS_KM) return ZONE_SPEED_LIMITS_KPH.city
  if (distanceKm <= URBAN_RADIUS_KM) return ZONE_SPEED_LIMITS_KPH.urban
  if (distanceKm <= RURAL_RADIUS_KM) return ZONE_SPEED_LIMITS_KPH.rural
  return ZONE_SPEED_LIMITS_KPH.highway
}

export const getTravelSpeedKph = ({
  vehicle,
  responseBonus,
  fatigueMultiplier,
  emergency,
  weather,
}) => {
  // Hard baseline speeds: 70 for emergencies, 50 for standard
  const baseline = emergency ? 70 : 50
  
  // Calculate unit factor relative to the standard patrol speed (50 km/h)
  // This allows faster units like Traffic (55 km/h) to scale the baseline up.
  const unitFactor = (vehicle.speedKph || 50) / 50
  
  let speed = baseline * unitFactor
  
  // Apply station response bonuses and fatigue penalties
  // responseBonus is usually 0.05 per level, fatigueMultiplier is now 0.85-1.0
  speed *= (1 + (responseBonus || 0))
  speed *= (fatigueMultiplier || 1)
  speed *= getWeatherSpeedMultiplier(weather, emergency)
  
  return Math.max(10, speed)
}
