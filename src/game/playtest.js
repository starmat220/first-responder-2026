export const createPlaytestReport = ({
  saveSlot,
  playerName,
  playerCallsign,
  level,
  score,
  publicTrust,
  money,
  resolvedCount,
  weather,
  stations,
  vehicles,
  incidents,
  notes = '',
  severity = 'normal',
  now = Date.now(),
}) => {
  const openIncidents = (incidents || []).filter(
    (incident) => incident.status === 'open' || incident.status === 'responding' || incident.status === 'on_scene'
  )
  const vehicleStatusCounts = (vehicles || []).reduce((acc, vehicle) => {
    const status = vehicle.status || 'unknown'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  return {
    reportVersion: 1,
    createdAt: now,
    severity,
    notes: String(notes || '').trim(),
    environment: {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
    },
    player: {
      saveSlot: Number(saveSlot) || 1,
      name: playerName || 'Commander',
      callsign: playerCallsign || 'Command',
      level: Number(level) || 1,
      score: Number(score) || 0,
      trust: Number(publicTrust) || 0,
      funds: Number(money) || 0,
      resolvedCount: Number(resolvedCount) || 0,
    },
    world: {
      stationCount: Array.isArray(stations) ? stations.length : 0,
      vehicleCount: Array.isArray(vehicles) ? vehicles.length : 0,
      openIncidentCount: openIncidents.length,
      weather: weather || null,
      vehicleStatusCounts,
      openIncidents: openIncidents.slice(0, 10).map((incident) => ({
        id: incident.id,
        type: incident.type,
        priority: incident.priority,
        status: incident.status,
        requiredDepartment: incident.requiredDepartment || 'police',
        requiredUnitType: incident.requiredUnitType || null,
      })),
    },
  }
}
