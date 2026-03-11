const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const addressCache = new Map()

const fetchWithTimeout = async (url, timeoutMs, fetchImpl = fetch) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetchImpl(url, { signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

export const buildAddress = (address) => {
  if (!address) return null
  const road = address.road || address.pedestrian || address.footway || address.cycleway
  const house = address.house_number
  const locality =
    address.city || address.town || address.village || address.hamlet || address.suburb
  const parts = []
  if (road) parts.push(house ? `${house} ${road}` : road)
  if (locality) parts.push(locality)
  return parts.length ? parts.join(', ') : null
}

export const reverseGeocode = async (
  position,
  {
    fetchImpl = fetch,
    timeoutMs = 1200,
  } = {}
) => {
  const key = `${position[0].toFixed(4)},${position[1].toFixed(4)}`
  if (addressCache.has(key)) return addressCache.get(key)
  try {
    const response = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${position[0]}&lon=${position[1]}&zoom=18&addressdetails=1`,
      timeoutMs,
      fetchImpl
    )
    if (!response.ok) {
      addressCache.set(key, null)
      return null
    }
    const data = await response.json()
    const displayName = (data.display_name || '').toLowerCase()
    const isIsland = displayName.includes(' island')
    const isWater = data.category === 'natural' && data.type === 'water'

    if (isIsland || isWater) {
      const invalidResult = { invalid: true }
      addressCache.set(key, invalidResult)
      return invalidResult
    }

    const formatted = buildAddress(data.address)
    const result = { address: formatted, data }
    addressCache.set(key, result)
    return result
  } catch {
    addressCache.set(key, null)
    return null
  }
}

export const fetchNearestRoad = async (
  position,
  {
    fetchImpl = fetch,
    timeoutMs = 1200,
  } = {}
) => {
  try {
    const response = await fetchWithTimeout(
      `https://router.project-osrm.org/nearest/v1/driving/${position[1]},${position[0]}?number=1`,
      timeoutMs,
      fetchImpl
    )
    if (!response.ok) return null
    const data = await response.json()
    if (!data.waypoints || !data.waypoints.length) return null
    const point = data.waypoints[0]
    if (!point.location) return null
    return {
      position: [point.location[1], point.location[0]],
      name: point.name || 'Local Road',
      distance: point.distance || 0,
    }
  } catch {
    return null
  }
}

export const resolveIncidentSpawnLocation = async ({
  anchor,
  radiusKm,
  randomPointNear,
  areaLabel = 'Oromocto',
  attempts = 8,
  roadSnapDistanceMeters = 60,
  fetchImpl = fetch,
}) => {
  if (!Array.isArray(anchor) || anchor.length !== 2 || typeof randomPointNear !== 'function') {
    return null
  }

  let fallbackCandidate = null
  let fallbackRoadName = 'Local Road'

  for (let attempt = 0; attempt < Math.max(1, attempts); attempt += 1) {
    const candidate = randomPointNear(anchor, clamp(Number(radiusKm) || 0, 0.05, 100))
    if (Array.isArray(candidate) && candidate.length === 2) {
      fallbackCandidate = candidate
    }

    const snapped = await fetchNearestRoad(candidate, { fetchImpl })
    if (!snapped || snapped.distance >= roadSnapDistanceMeters) {
      if (fallbackCandidate && attempt >= 1) {
        return {
          position: fallbackCandidate,
          roadName: fallbackRoadName,
          address: `${fallbackRoadName}, ${areaLabel}`,
          usedFallback: true,
        }
      }
      continue
    }

    fallbackCandidate = snapped.position
    fallbackRoadName = snapped.name || fallbackRoadName

    const geoResult = await reverseGeocode(snapped.position, { fetchImpl })
    if (geoResult?.invalid) continue

    if (geoResult?.address) {
      return {
        position: snapped.position,
        roadName: snapped.name || 'Local Road',
        address: geoResult.address,
        usedFallback: false,
      }
    }

    return {
      position: snapped.position,
      roadName: snapped.name || 'Local Road',
      address: `${snapped.name || 'Local Road'}, ${areaLabel}`,
      usedFallback: true,
    }
  }

  if (!fallbackCandidate) return null

  return {
    position: fallbackCandidate,
    roadName: fallbackRoadName,
    address: `${fallbackRoadName}, ${areaLabel}`,
    usedFallback: true,
  }
}
