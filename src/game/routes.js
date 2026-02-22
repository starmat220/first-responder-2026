import { DEFAULT_SPEED_KPH } from './constants'
import { haversineMeters } from './geo'

export const buildFallbackRoute = (start, end) => {
  const points = 28
  const coords = []
  for (let i = 0; i <= points; i += 1) {
    const t = i / points
    coords.push([start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t])
  }
  return coords
}

export const buildRouteData = (coords, durationSeconds = null, segmentSpeedsMps = null) => {
  const segmentDistances = []
  let totalDistance = 0
  for (let i = 0; i < coords.length - 1; i += 1) {
    const distance = haversineMeters(coords[i], coords[i + 1])
    segmentDistances.push(distance)
    totalDistance += distance
  }
  const fallbackDuration = totalDistance / ((DEFAULT_SPEED_KPH * 1000) / 3600)
  const safeDuration =
    typeof durationSeconds === 'number' && Number.isFinite(durationSeconds) && durationSeconds > 0
      ? durationSeconds
      : fallbackDuration
  const averageSpeedMps = totalDistance / safeDuration
  const roadSpeedKph = Math.max(10, averageSpeedMps * 3.6)
  const resolvedSpeeds =
    Array.isArray(segmentSpeedsMps) && segmentSpeedsMps.length === segmentDistances.length
      ? segmentSpeedsMps
      : segmentDistances.map(() => Math.max(2, averageSpeedMps))
  const cumulativeDistances = []
  let cumulative = 0
  segmentDistances.forEach((distance) => {
    cumulative += distance
    cumulativeDistances.push(cumulative)
  })
  return {
    coords,
    segmentDistances,
    cumulativeDistances,
    totalDistance,
    durationSeconds: safeDuration,
    roadSpeedKph,
    segmentSpeedsMps: resolvedSpeeds,
  }
}

const fetchWithTimeout = async (url, timeoutMs) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

export const buildRoute = async (start, end) => {
  try {
    const response = await fetchWithTimeout(
      `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&annotations=speed`,
      6000
    )
    if (response.ok) {
      const data = await response.json()
      if (data.routes && data.routes.length) {
        const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
        const annotation = data.routes[0].legs?.[0]?.annotation
        const segmentSpeeds = annotation?.speed || null
        return buildRouteData(coords, data.routes[0].duration, segmentSpeeds)
      }
    }
  } catch (error) {
    console.warn('OSRM routing failed, falling back to direct path.', error)
  }
  return buildRouteData(buildFallbackRoute(start, end))
}

export const positionFromProgress = (routeData, progressMeters) => {
  const { coords, segmentDistances } = routeData
  if (!coords.length) return coords
  let remaining = progressMeters
  for (let i = 0; i < segmentDistances.length; i += 1) {
    const segment = segmentDistances[i]
    if (remaining <= segment) {
      const t = segment === 0 ? 0 : remaining / segment
      const [lat1, lng1] = coords[i]
      const [lat2, lng2] = coords[i + 1]
      return [lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t]
    }
    remaining -= segment
  }
  return coords[coords.length - 1]
}

export const getRouteSegmentIndex = (routeData, progressMeters) => {
  if (!routeData?.cumulativeDistances?.length) return 0
  for (let i = 0; i < routeData.cumulativeDistances.length; i += 1) {
    if (progressMeters <= routeData.cumulativeDistances[i]) return i
  }
  return Math.max(0, routeData.cumulativeDistances.length - 1)
}

export const getBaseSpeedKph = ({ routeData, progressMeters, position, getZoneSpeedLimit }) => {
  if (routeData?.segmentSpeedsMps?.length) {
    const index = getRouteSegmentIndex(routeData, progressMeters || 0)
    const speedMps = routeData.segmentSpeedsMps[index]
    if (speedMps) return speedMps * 3.6
  }
  return routeData?.roadSpeedKph || getZoneSpeedLimit(position)
}
