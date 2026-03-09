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
  session = null,
  campaign = null,
  build = null,
  notes = '',
  severity = 'normal',
  category = 'bug',
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
    category,
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
    session: {
      startedAt: Number(session?.startedAt) || null,
      durationSeconds:
        Number(session?.startedAt) > 0
          ? Math.max(0, Math.round((now - Number(session.startedAt)) / 1000))
          : null,
      stats: {
        incidentsSpawned: Math.max(0, Number(session?.stats?.incidentsSpawned) || 0),
        incidentsResolved: Math.max(0, Number(session?.stats?.incidentsResolved) || 0),
        incidentsMissed: Math.max(0, Number(session?.stats?.incidentsMissed) || 0),
        totalDispatches: Math.max(0, Number(session?.stats?.totalDispatches) || 0),
        quickDispatches: Math.max(0, Number(session?.stats?.quickDispatches) || 0),
        manualDispatches: Math.max(0, Number(session?.stats?.manualDispatches) || 0),
        unitsDispatched: Math.max(0, Number(session?.stats?.unitsDispatched) || 0),
        followUpsAccepted: Math.max(0, Number(session?.stats?.followUpsAccepted) || 0),
        followUpsDeclined: Math.max(0, Number(session?.stats?.followUpsDeclined) || 0),
        feedbackCount: Math.max(0, Number(session?.stats?.feedbackCount) || 0),
        districtUnlocks: Math.max(0, Number(session?.stats?.districtUnlocks) || 0),
        emergencyStipends: Math.max(0, Number(session?.stats?.emergencyStipends) || 0),
      },
    },
    campaign: {
      district: campaign?.district || null,
      unlockedDistricts: Array.isArray(campaign?.unlockedDistricts)
        ? campaign.unlockedDistricts
        : [],
      nextDistrict: campaign?.nextDistrict || null,
      milestonesClaimed: Array.isArray(campaign?.milestonesClaimed)
        ? campaign.milestonesClaimed
        : [],
    },
    build: {
      appVersion: build?.appVersion || 'dev',
      saveSchemaVersion: Number(build?.saveSchemaVersion) || null,
    },
  }
}
