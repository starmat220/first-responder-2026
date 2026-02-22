import { useCallback, useEffect, useRef } from 'react'
import { getPriorityConfig, pickPriority } from '../config/priority'
import { DEFAULT_DEPARTMENT_ID } from '../game/departments'
import { calculateSpawnIntervalMs } from '../game/tuning'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const addressCache = new Map()

const CALLERS = [
  'Alex Morgan',
  'Jordan Lee',
  'Casey Rivera',
  'Taylor Brooks',
  'Jamie Patel',
  'Morgan Reyes',
  'Riley Chen',
  'Sam Carter',
]

const TRAFFIC_KEYWORDS = [
  'traffic',
  'vehicle',
  'crash',
  'accident',
  'road',
  'dui',
  'checkpoint',
  'parking',
  'pursuit',
]

const SUPERVISOR_KEYWORDS = [
  'active shooter',
  'hostage',
  'homicide',
  'riot',
  'officer down',
  'shots fired',
  'stabbing',
  'shooting',
]

const MULTI_UNIT_KEYWORDS = [
  'armed',
  'robbery',
  'home invasion',
  'domestic violence',
  'kidnapping',
  'warrant',
  'riot',
  'active shooter',
  'officer down',
  'standoff',
]

const PRIORITY_FORCE_P1 = [
  'homicide',
  'murder',
  'active shooter',
  'shots fired',
  'shooting',
  'stabbing',
  'hostage',
  'kidnapping',
  'officer down',
  'fatal',
  'drive by shooting',
  'structure fire',
  'industrial fire',
  'wildland fire',
  'hazmat',
]

const PRIORITY_FORCE_P3 = [
  'lost property',
  'found property',
  'noise complaint',
  'illegal parking',
  'graffiti',
  'stray animal',
  'animal complaint',
  'community assistance',
  'loitering',
  'alarm',
]

const FIRE_KEYWORDS = ['fire', 'smoke', 'arson']
const EMS_KEYWORDS = [
  'injur',
  'overdose',
  'unresponsive',
  'mental health',
  'suicide',
  'welfare',
  'first aid',
]
const TOW_KEYWORDS = [
  'breakdown',
  'ran out of gas',
  'keys locked',
  'road hazard',
  'vehicle lost its load',
  'repossession',
]

const FALLBACK_INCIDENT_BY_DEPARTMENT = {
  police: 'Call for service',
  fire: 'Vehicle fire',
  ems: 'Unresponsive person',
  tow: 'Breakdown of vehicle',
}

const getStagePlan = (type, priority) => {
  if (!type) return null
  const lower = type.toLowerCase()
  const stageKeywords = [
    'burglary',
    'robbery',
    'homicide',
    'assault',
    'domestic',
    'shooting',
    'stabbing',
    'kidnapping',
    'armed',
  ]
  if (!stageKeywords.some((keyword) => lower.includes(keyword))) return null
  const followUpPriority = clamp((priority || 2) + 1, 1, 3)
  return {
    stageLabel: 'Response',
    followUp: {
      type: `Investigation: ${type}`,
      priority: followUpPriority,
      requiredUnits: 1,
      requiredUnitType: null,
      stageLabel: 'Investigation',
    },
  }
}

const inferDepartmentForType = (type) => {
  const normalized = String(type || '').toLowerCase()
  if (FIRE_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'fire'
  if (EMS_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'ems'
  if (TOW_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'tow'
  return DEFAULT_DEPARTMENT_ID
}

const pickIncidentType = (
  incidentTypes,
  departmentId = DEFAULT_DEPARTMENT_ID,
  incidentCatalogByDepartment = null
) => {
  const poolByDepartment = incidentCatalogByDepartment?.[departmentId]
  if (Array.isArray(poolByDepartment) && poolByDepartment.length > 0) {
    return poolByDepartment[Math.floor(Math.random() * poolByDepartment.length)]
  }
  const matchingTypes = incidentTypes.filter(
    (type) => inferDepartmentForType(type) === departmentId
  )
  const list = matchingTypes.length
    ? matchingTypes
    : incidentTypes.length
    ? incidentTypes
    : [FALLBACK_INCIDENT_BY_DEPARTMENT[departmentId] || 'Call for service']
  return list[Math.floor(Math.random() * list.length)]
}

const pickPriorityForType = (type, fallbackPriority) => {
  const normalized = type.toLowerCase()
  const matches = (list) => list.some((keyword) => normalized.includes(keyword))
  if (matches(PRIORITY_FORCE_P1)) return 1
  if (matches(PRIORITY_FORCE_P3)) return 3
  return fallbackPriority
}

const getIncidentRequirements = (type, departmentId = DEFAULT_DEPARTMENT_ID) => {
  const lower = type.toLowerCase()
  if (departmentId === 'fire') {
    const majorFire =
      lower.includes('structure') ||
      lower.includes('industrial') ||
      lower.includes('wildland') ||
      lower.includes('hazmat')
    return { requiredUnits: majorFire ? 2 : 1, requiredUnitType: 'engine' }
  }
  if (departmentId === 'ems') {
    return { requiredUnits: 1, requiredUnitType: 'ambulance' }
  }
  if (departmentId === 'tow') {
    return { requiredUnits: 1, requiredUnitType: 'tow_truck' }
  }
  const requiresTraffic = TRAFFIC_KEYWORDS.some((keyword) => lower.includes(keyword))
  const requiresSupervisor = SUPERVISOR_KEYWORDS.some((keyword) => lower.includes(keyword))
  const needsExtraUnits = MULTI_UNIT_KEYWORDS.some((keyword) => lower.includes(keyword))
  return {
    requiredUnits: needsExtraUnits ? 2 : 1,
    requiredUnitType: requiresSupervisor ? 'supervisor' : requiresTraffic ? 'traffic' : null,
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

const buildAddress = (address) => {
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

const reverseGeocode = async (position) => {
  const key = `${position[0].toFixed(4)},${position[1].toFixed(4)}`
  if (addressCache.has(key)) return addressCache.get(key)
  try {
    const response = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${position[0]}&lon=${position[1]}&zoom=18&addressdetails=1`,
      5000
    )
    if (!response.ok) {
      addressCache.set(key, null)
      return null
    }
    const data = await response.json()
    const formatted = buildAddress(data.address)
    addressCache.set(key, formatted)
    return formatted
  } catch {
    addressCache.set(key, null)
    return null
  }
}

const fetchNearestRoad = async (position) => {
  const response = await fetch(
    `https://router.project-osrm.org/nearest/v1/driving/${position[1]},${position[0]}?number=1`
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
}

export const useIncidentSpawner = ({
  stations,
  vehicles,
  center,
  stationRadiusKm,
  publicTrust,
  incidents,
  setIncidents,
  setNextIncidentId,
  baseIntervalMs,
  incidentStatus,
  incidentTypes,
  incidentCatalogByDepartment,
  incidentRadiusKm,
  onSceneSeconds,
  randomPointNear,
  spawnUnlocks,
  intervalMultiplier = 1,
  maxActiveBias = 0,
  departmentIncidentModifiers = null,
}) => {
  const seededRef = useRef(false)
  const incidentsRef = useRef(incidents)
  const stationsRef = useRef(stations)
  const vehiclesRef = useRef(vehicles)

  useEffect(() => {
    incidentsRef.current = incidents
  }, [incidents])

  useEffect(() => {
    stationsRef.current = stations
  }, [stations])

  useEffect(() => {
    vehiclesRef.current = vehicles
  }, [vehicles])
  const createIncident = useCallback(async () => {
    let incidentId = null
    setNextIncidentId((prev) => {
      incidentId = prev
      return prev + 1
    })
    const stationList = stationsRef.current || []
    const hasStations = stationList.length > 0
    const chosenStation = hasStations
      ? stationList[Math.floor(Math.random() * stationList.length)]
      : null
    const requiredDepartment =
      chosenStation?.department || inferDepartmentForType(chosenStation?.stationType) || DEFAULT_DEPARTMENT_ID
    const anchor = chosenStation
      ? chosenStation.position
      : Array.isArray(center) && center.length === 2
      ? center
      : [0, 0]
    const radiusKm = hasStations
      ? chosenStation?.operationRadiusKm || stationRadiusKm || incidentRadiusKm
      : incidentRadiusKm
    let position = randomPointNear(anchor, radiusKm)
    let roadName = 'Local Road'
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const snapped = await fetchNearestRoad(position)
        if (snapped && snapped.distance < 120) {
          position = snapped.position
          roadName = snapped.name
          break
        }
      } catch {
        // Ignore routing errors and keep a local fallback position.
      }
      position = randomPointNear(anchor, radiusKm)
    }
    const realAddress = await reverseGeocode(position)
    const type = pickIncidentType(
      incidentTypes,
      requiredDepartment,
      incidentCatalogByDepartment
    )
    const basePriority = pickPriority(new Date(), publicTrust)
    const priority = pickPriorityForType(type, basePriority)
    const priorityConfig = getPriorityConfig(priority)
    const stagePlan = getStagePlan(type, priority)
    const requirements = getIncidentRequirements(type, requiredDepartment)
    const departmentMods =
      departmentIncidentModifiers?.[requiredDepartment] ||
      departmentIncidentModifiers?.[DEFAULT_DEPARTMENT_ID] ||
      null
    const responseTargetSeconds = Math.max(
      45,
      Math.round(
        priorityConfig.responseTargetSeconds * (departmentMods?.responseTargetMultiplier || 1)
      )
    )
    const onSceneDurationSeconds = Math.max(
      12,
      Math.round(onSceneSeconds * (departmentMods?.onSceneMultiplier || 1))
    )
    const canRequireSupervisor = !!spawnUnlocks?.supervisor
    const canRequireTraffic = !!spawnUnlocks?.traffic
    const allowMultiUnit = !!spawnUnlocks?.allowMultiUnit
    if (requirements.requiredUnitType === 'supervisor' && !canRequireSupervisor) {
      requirements.requiredUnitType = null
    }
    if (requirements.requiredUnitType === 'traffic' && !canRequireTraffic) {
      requirements.requiredUnitType = null
    }
    if (!allowMultiUnit) {
      requirements.requiredUnits = 1
    }
    const newIncident = {
      id: incidentId ?? Date.now(),
      type,
      position,
      address: realAddress || `${roadName}, Oromocto`,
      caller: CALLERS[Math.floor(Math.random() * CALLERS.length)],
      status: incidentStatus.open,
      createdAt: Date.now(),
      assignedVehicleId: null,
      assignedVehicleIds: [],
      onSceneVehicleIds: [],
      etaSeconds: 0,
      onSceneRemaining: onSceneDurationSeconds,
      priority,
      requiredUnits: requirements.requiredUnits,
      requiredUnitType: requirements.requiredUnitType,
      requiredDepartment,
      responseTargetSeconds,
      rewardMultiplier: departmentMods?.rewardMultiplier || 1,
      missPenaltyMultiplier: departmentMods?.missPenaltyMultiplier || 1,
      onSceneDurationSeconds,
      dispatchedAt: null,
      arrivedAt: null,
      responseSeconds: null,
      timeRemaining: responseTargetSeconds,
      stage: stagePlan ? 1 : 1,
      stageLabel: stagePlan?.stageLabel || null,
      stageTotal: stagePlan ? 2 : 1,
      followUpPlan: stagePlan?.followUp || null,
      followUpGenerated: false,
      parentIncidentId: null,
    }
    setIncidents((prev) => {
      const next = [newIncident, ...prev]
      incidentsRef.current = next
      return next
    })
  }, [
    incidentRadiusKm,
    incidentStatus.open,
    incidentTypes,
    onSceneSeconds,
    publicTrust,
    randomPointNear,
    setIncidents,
    setNextIncidentId,
    spawnUnlocks,
    incidentCatalogByDepartment,
    departmentIncidentModifiers,
    center,
    stationRadiusKm,
  ])

  useEffect(() => {
    if (!stationsRef.current || stationsRef.current.length === 0) return
    let timeoutId
    let cancelled = false
    const scheduleNext = () => {
      if (cancelled) return
      const unitPool = vehiclesRef.current || []
      const activeUnits = unitPool.filter(
        (vehicle) =>
          vehicle.status === 'enroute' ||
          vehicle.status === 'on_scene' ||
          vehicle.status === 'returning'
      ).length
      const availableUnits = unitPool.filter((vehicle) => vehicle.status === 'available').length
      const intervalMs = calculateSpawnIntervalMs({
        baseIntervalMs,
        publicTrust,
        intervalMultiplier,
        activeUnits,
        availableUnits,
        totalUnits: unitPool.length,
      })
      timeoutId = setTimeout(tick, intervalMs)
    }
    const tick = () => {
      if (cancelled) return
      const activeCount = incidentsRef.current.filter(
        (item) =>
          item.status === incidentStatus.open ||
          item.status === incidentStatus.responding ||
          item.status === incidentStatus.on_scene
      ).length

      const baseCap = 3
      const trustBonus = publicTrust >= 70 ? 1 : publicTrust <= 30 ? -1 : 0
      const maxActive = clamp(baseCap + trustBonus + maxActiveBias, 2, 10)

      if (activeCount < maxActive) {
        createIncident()
      }
      scheduleNext()
    }

    scheduleNext()
    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [
    baseIntervalMs,
    createIncident,
    incidentStatus.on_scene,
    incidentStatus.open,
    incidentStatus.responding,
    publicTrust,
    stations,
    intervalMultiplier,
    maxActiveBias,
  ])

  useEffect(() => {
    if (!stationsRef.current || stationsRef.current.length === 0) {
      seededRef.current = false
      return
    }
    if (seededRef.current) return
    seededRef.current = true
    const timeout = setTimeout(() => {
      if (!incidents.length) {
        createIncident()
      }
    }, 1500)
    return () => clearTimeout(timeout)
  }, [stations, incidents.length, createIncident])

  const spawnIncident = useCallback(() => {
    createIncident()
  }, [createIncident])

  return { spawnIncident }
}
