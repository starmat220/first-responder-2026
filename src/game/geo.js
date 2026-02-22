export const toRad = (value) => (value * Math.PI) / 180

export const haversineMeters = (start, end) => {
  const R = 6371000
  const dLat = toRad(end[0] - start[0])
  const dLng = toRad(end[1] - start[1])
  const lat1 = toRad(start[0])
  const lat2 = toRad(end[0])
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export const randomPointNear = (center, radiusKm) => {
  const radiusInMeters = radiusKm * 1000
  const distance = Math.random() * radiusInMeters
  const bearing = Math.random() * 2 * Math.PI
  const deltaLat = (distance * Math.cos(bearing)) / 111320
  const deltaLng = (distance * Math.sin(bearing)) / (111320 * Math.cos(toRad(center[0])))
  return [center[0] + deltaLat, center[1] + deltaLng]
}

export const getPolygonCenter = (points) => {
  if (!points?.length) return null
  const sum = points.reduce(
    (acc, point) => [acc[0] + point[0], acc[1] + point[1]],
    [0, 0]
  )
  return [sum[0] / points.length, sum[1] / points.length]
}

export const sanitizePosition = (value, fallback) => {
  if (!Array.isArray(value) || value.length !== 2) return fallback
  const [lat, lng] = value
  if (typeof lat !== 'number' || typeof lng !== 'number') return fallback
  return [lat, lng]
}
