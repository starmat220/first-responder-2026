import {
  CITY_CORE_RADIUS_KM,
  DEFAULT_SPEED_KPH,
  EMERGENCY_SPEED_BONUS,
  RURAL_RADIUS_KM,
  URBAN_RADIUS_KM,
  ZONE_SPEED_LIMITS_KPH,
} from './constants'
import { haversineMeters } from './geo'
import { getBaseSpeedKph } from './routes'

const normalizeSpeedBand = (speedKph, fallbackLimit) => {
  if (!Number.isFinite(speedKph)) return fallbackLimit
  if (speedKph >= 95) return ZONE_SPEED_LIMITS_KPH.highway
  if (speedKph >= 65) return ZONE_SPEED_LIMITS_KPH.rural
  return ZONE_SPEED_LIMITS_KPH.city
}

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
  position,
  routeData,
  progressMeters,
  responseBonus,
  fatigueMultiplier,
  emergency,
  center,
}) => {
  const unitFactor = (vehicle.speedKph || DEFAULT_SPEED_KPH) / DEFAULT_SPEED_KPH
  const zoneLimit = getZoneSpeedLimit(position, center)
  const baseSpeed = getBaseSpeedKph({
    routeData,
    progressMeters,
    position,
    getZoneSpeedLimit: (pos) => getZoneSpeedLimit(pos, center),
  })
  const normalizedBase = normalizeSpeedBand(baseSpeed, zoneLimit)
  let speed = normalizedBase * unitFactor
  if (emergency) speed *= EMERGENCY_SPEED_BONUS
  speed *= (1 + (responseBonus || 0)) * (fatigueMultiplier || 1)
  return Math.max(5, speed)
}
