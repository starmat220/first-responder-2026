import { useCallback, useEffect, useRef } from 'react'
import {
  getPriorityConfig,
  pickPriority
} from '../config/priority'
import {
  DEFAULT_DEPARTMENT_ID
} from '../game/departments'
import {
  calculateSpawnIntervalMs
} from '../game/tuning'
import {
  MAJOR_INCIDENT_CHANCE,
  MAJOR_INCIDENT_TYPES,
  STARTER_PHASE_RESOLVED_LIMIT,
  EARLY_PHASE_RESOLVED_LIMIT,
} from '../game/constants'
import {
  getWeatherIncidentPressure,
  getWeatherSpawnIntervalMultiplier,
} from '../game/weather'
import {
  getDistrictIdForPosition,
  getDistrictIncidentModifiers,
} from '../game/campaign'
import {
  resolveIncidentSpawnLocation,
} from '../game/spawnLocation'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

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

const FIRE_KEYWORDS = ['fire', 'smoke', 'arson', 'wildland', 'electrical', 'carbon monoxide', 'wharf', 'marina']
const EMS_KEYWORDS = [
  'injur',
  'overdose',
  'unresponsive',
  'mental health',
  'suicide',
  'welfare',
  'first aid',
  'heat',
  'hypothermia',
  'stroke',
  'cardiac',
  'breathing',
  'medical',
  'immersion',
  'shelter',
]
const TOW_KEYWORDS = [
  'breakdown',
  'ran out of gas',
  'keys locked',
  'road hazard',
  'repossession',
  'tow',
  'lockout',
  'battery',
  'stuck',
  'slide-off',
]
const PW_KEYWORDS = [
  'tree',
  'pothole',
  'sinkhole',
  'downed power lines',
  'flooded intersection',
  'snow removal',
  'debris on highway',
  'water main',
  'traffic signal',
  'sewer',
  'street sign',
  'dumping',
  'bridge',
  'graffiti',
  'dead animal',
  'streetlight',
  'flood',
  'ice',
  'drain',
  'culvert',
  'mudslide',
  'washout',
  'barricade',
  'salt',
  'sand',
  'surge',
  'coastal',
  'causeway',
  'breakwater',
  'dike',
  'brine',
]

const FALLBACK_INCIDENT_BY_DEPARTMENT = {
  police: 'Call for service',
  fire: 'Vehicle fire',
  ems: 'Unresponsive person',
  tow: 'Breakdown of vehicle',
  public_works: 'Infrastructure issue',
}

const WEATHER_INCIDENTS = {
  rain: [
    { type: 'Hydroplaning collision', department: 'police', priority: 2 },
    { type: 'Flooded intersection', department: 'public_works', priority: 2 },
    { type: 'Road hazard after heavy rain', department: 'tow', priority: 2 },
    { type: 'Storm Drain Overflow Response', department: 'public_works', priority: 2 },
    { type: 'Vehicle Fire (Highway Shoulder)', department: 'fire', priority: 2 },
    { type: 'Motor Vehicle Crash (Injuries)', department: 'ems', priority: 2 },
    { type: 'Harbor Pump Station Overflow', department: 'public_works', priority: 2 },
    { type: 'Ferry Queue Breakdown Assist', department: 'tow', priority: 2 },
  ],
  storm: [
    { type: 'Downed power lines', department: 'public_works', priority: 1 },
    { type: 'Multi-vehicle collision', department: 'police', priority: 1 },
    { type: 'Weather exposure injury', department: 'ems', priority: 2 },
    { type: 'Power Line Down / Arcing', department: 'fire', priority: 1 },
    { type: 'Windstorm Debris Clearance', department: 'public_works', priority: 2 },
    { type: 'Flood-Stalled Vehicle Recovery', department: 'tow', priority: 2 },
    { type: 'Storm Surge Barrier Deployment', department: 'public_works', priority: 1 },
    { type: 'Storm Surge Water Rescue', department: 'fire', priority: 1 },
    { type: 'Post-Storm Curfew Enforcement', department: 'police', priority: 2 },
    { type: 'Storm Shelter Medical Assist', department: 'ems', priority: 2 },
  ],
  snow: [
    { type: 'Vehicle extraction (ditch/snow)', department: 'tow', priority: 2 },
    { type: 'Snow route obstruction', department: 'public_works', priority: 2 },
    { type: 'Cold exposure call', department: 'ems', priority: 2 },
    { type: 'Black Ice Treatment (Bridge Deck)', department: 'public_works', priority: 2 },
    { type: 'Icy Road Slide-Off Recovery', department: 'tow', priority: 2 },
    { type: 'Hypothermia / Cold Exposure', department: 'ems', priority: 2 },
    { type: 'Causeway Snow Drift Clearance', department: 'public_works', priority: 2 },
    { type: 'Bridge Icing Traffic Control', department: 'police', priority: 2 },
  ],
  blizzard: [
    { type: 'Whiteout crash response', department: 'police', priority: 1 },
    { type: 'Critical snow removal', department: 'public_works', priority: 1 },
    { type: 'Hypothermia emergency', department: 'ems', priority: 1 },
    { type: 'Snow Drift Road Reopen', department: 'public_works', priority: 1 },
    { type: 'Winch-Out (Embankment)', department: 'tow', priority: 1 },
    { type: 'Reckless Driver (Weather Related)', department: 'police', priority: 1 },
    { type: 'Snowbank Entrapment Recovery', department: 'tow', priority: 1 },
    { type: 'Flash Freeze Brine Deployment', department: 'public_works', priority: 1 },
    { type: 'Nor\'easter Evacuation Assist', department: 'police', priority: 1 },
  ],
  heatwave: [
    { type: 'Heat exhaustion', department: 'ems', priority: 2 },
    { type: 'Brush fire from heat', department: 'fire', priority: 1 },
    { type: 'Roadway buckling hazard', department: 'public_works', priority: 2 },
    { type: 'Heat Buckled Asphalt Repair', department: 'public_works', priority: 2 },
    { type: 'Heat Exhaustion / Dehydration', department: 'ems', priority: 2 },
    { type: 'Wildland Fire (Wind Driven)', department: 'fire', priority: 1 },
  ],
  fog: [
    { type: 'Low-visibility collision', department: 'police', priority: 2 },
    { type: 'Chain-reaction crash risk', department: 'tow', priority: 2 },
    { type: 'Medical transport delayed', department: 'ems', priority: 2 },
    { type: 'Accident Scene Secondary Tow', department: 'tow', priority: 2 },
    { type: 'Burglary Alarm Verification', department: 'police', priority: 3 },
    { type: 'Difficulty Breathing (Asthma/COPD)', department: 'ems', priority: 2 },
    { type: 'Causeway Closure Enforcement', department: 'police', priority: 2 },
    { type: 'Coastal Route Closure Tow Support', department: 'tow', priority: 2 },
  ],
}

const HOT_ONLY_KEYWORDS = [
  'heat exhaustion',
  'heatstroke',
  'heat buckled',
  'dehydration',
  'brush fire from heat',
]

const HEAT_DAYTIME_KEYWORDS = [
  'heat exhaustion',
  'heatstroke',
  'dehydration',
]

const COLD_ONLY_KEYWORDS = [
  'hypothermia',
  'cold exposure',
  'snow',
  'blizzard',
  'black ice',
  'ice storm',
  'flash freeze',
  'frozen',
  'nor\'easter',
]

const FREEZE_WINDOW_KEYWORDS = [
  'black ice',
  'flash freeze',
]

const FOG_ONLY_KEYWORDS = [
  'low-visibility',
  'visibility',
  'fog',
]

const WET_WEATHER_KEYWORDS = [
  'hydroplaning',
  'flood',
  'storm surge',
  'windstorm',
  'downed power',
  'washout',
  'overtopping',
  'overflow',
  'rain',
  'storm',
]

const STORM_ONLY_KEYWORDS = [
  'windstorm',
  'storm surge',
  'power line down',
  'arcing',
  'nor\'easter',
]

const includesAnyKeyword = (text, keywords) =>
  keywords.some((keyword) => text.includes(keyword))

const getWeatherLocalHour = (weather) => {
  const timestamp = Number(weather?.updatedAt) || Date.now()
  const timezone = typeof weather?.timezone === 'string' ? weather.timezone : null
  if (timezone) {
    try {
      const hourLabel = new Intl.DateTimeFormat('en-CA', {
        hour: '2-digit',
        hourCycle: 'h23',
        timeZone: timezone,
      }).format(new Date(timestamp))
      const parsed = Number(hourLabel)
      if (Number.isFinite(parsed)) return parsed
    } catch {
      // Fallback to local runtime clock below.
    }
  }
  return new Date(timestamp).getHours()
}

export const isIncidentTypeWeatherCompatible = (type, weather) => {
  if (!weather?.condition) return true
  const normalized = String(type || '').toLowerCase()
  const condition = weather.condition
  const temperatureC = Number.isFinite(Number(weather.temperatureC))
    ? Number(weather.temperatureC)
    : 20
  const hasIntensityReading = Number.isFinite(Number(weather.intensity))
  const intensity = hasIntensityReading ? Number(weather.intensity) : 0
  const hasPrecipitationReading = Number.isFinite(Number(weather.precipitationMm))
  const precipitationMm = hasPrecipitationReading ? Number(weather.precipitationMm) : 0
  const windSpeedKph = Number.isFinite(Number(weather.windSpeedKph))
    ? Number(weather.windSpeedKph)
    : 0
  const localHour = getWeatherLocalHour(weather)

  const hotProfile = condition === 'heatwave' || temperatureC >= 30
  const coldProfile =
    condition === 'snow' || condition === 'blizzard' || temperatureC <= 3
  const wetProfile = ['rain', 'storm', 'snow', 'blizzard'].includes(condition) || intensity >= 0.55
  const hasLiquidMetrics = hasIntensityReading || hasPrecipitationReading
  const liquidStormProfile =
    (condition === 'rain' || condition === 'storm') &&
    (
      !hasLiquidMetrics ||
      condition === 'storm' ||
      intensity >= 0.45 ||
      precipitationMm >= 0.3
    )
  const stormProfile = condition === 'storm' || windSpeedKph >= 62
  const fogProfile = condition === 'fog'
  const freezeWindowProfile = localHour <= 9 || localHour >= 18
  const hotDaytimeProfile = localHour >= 9 && localHour <= 20

  if (includesAnyKeyword(normalized, HOT_ONLY_KEYWORDS) && !hotProfile) return false
  if (includesAnyKeyword(normalized, COLD_ONLY_KEYWORDS) && !coldProfile) return false
  if (includesAnyKeyword(normalized, FOG_ONLY_KEYWORDS) && !fogProfile) return false
  if (includesAnyKeyword(normalized, WET_WEATHER_KEYWORDS) && !liquidStormProfile) return false
  if (includesAnyKeyword(normalized, STORM_ONLY_KEYWORDS) && !stormProfile) return false
  if (includesAnyKeyword(normalized, HEAT_DAYTIME_KEYWORDS) && !hotDaytimeProfile) return false
  if (includesAnyKeyword(normalized, FREEZE_WINDOW_KEYWORDS) && !(coldProfile && freezeWindowProfile)) {
    return false
  }

  // Allow generic rain/snow disruption calls when weather is broadly active.
  if (
    normalized.includes('weather') &&
    (normalized.includes('related') || normalized.includes('exposure')) &&
    !wetProfile
  ) {
    return false
  }

  return true
}

const COASTAL_INCIDENT_HINTS = [
  'coastal',
  'harbor',
  'wharf',
  'ferry',
  'causeway',
  'surge',
  'breakwater',
  'dike',
  'sea ',
  'marina',
  'lighthouse',
  'dock',
  'port ',
]

const isCoastalScenario = (type) => {
  const lower = String(type || '').toLowerCase()
  return COASTAL_INCIDENT_HINTS.some((hint) => lower.includes(hint))
}

const getCoastalBandScore = (position) => {
  if (!Array.isArray(position) || position.length !== 2) return 0.35
  const lat = Number(position[0]) || 0
  const lng = Number(position[1]) || 0

  // Latitude-likelihood + longitude "banding" to mimic coastal corridors.
  const latitudeFactor = clamp(1 - Math.abs(Math.abs(lat) - 45) / 24, 0, 1)
  const longitudeBand = (Math.sin((lng + 180) * 0.2) + 1) / 2
  const mixedBand = (Math.sin((lat + 90) * 0.37 + (lng + 180) * 0.23) + 1) / 2
  const score = latitudeFactor * (0.45 + longitudeBand * 0.35 + mixedBand * 0.2)
  return clamp(score, 0, 1)
}

const pickWeightedScenario = (entries, getWeight, rng = Math.random) => {
  if (!Array.isArray(entries) || entries.length === 0) return null
  const weighted = entries.map((entry) => ({
    entry,
    weight: Math.max(0.001, Number(getWeight(entry)) || 0.001),
  }))
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0)
  if (totalWeight <= 0.001) {
    return weighted[Math.floor(rng() * weighted.length)].entry
  }
  let roll = rng() * totalWeight
  for (let i = 0; i < weighted.length; i += 1) {
    roll -= weighted[i].weight
    if (roll <= 0) return weighted[i].entry
  }
  return weighted[weighted.length - 1].entry
}

const pickWeightedDepartment = (
  departments,
  departmentWeights = {},
  rng = Math.random
) => {
  if (!Array.isArray(departments) || departments.length === 0) {
    return DEFAULT_DEPARTMENT_ID
  }
  const weighted = departments.map((departmentId) => ({
    departmentId,
    weight: Math.max(0.05, Number(departmentWeights?.[departmentId]) || 1),
  }))
  const total = weighted.reduce((sum, item) => sum + item.weight, 0)
  if (total <= 0) {
    return departments[Math.floor(rng() * departments.length)] || DEFAULT_DEPARTMENT_ID
  }
  let roll = rng() * total
  for (let i = 0; i < weighted.length; i += 1) {
    roll -= weighted[i].weight
    if (roll <= 0) return weighted[i].departmentId
  }
  return weighted[weighted.length - 1].departmentId
}

const getScenarioCoastalWeight = (type, coastalBandScore) => {
  const coastal = isCoastalScenario(type)
  if (coastal) {
    // Inland -> downweight coastal-specific calls, coastal -> strong boost.
    return clamp(0.25 + coastalBandScore * 2.1, 0.2, 2.6)
  }
  // Inland incidents stay possible everywhere.
  return clamp(1.15 - coastalBandScore * 0.35, 0.75, 1.25)
}

const pickWeatherIncident = (
  weather,
  unlockedDepartments,
  anchorPosition,
  rng = Math.random
) => {
  if (!weather?.condition) return null
  const options = WEATHER_INCIDENTS[weather.condition]
  if (!Array.isArray(options) || options.length === 0) return null
  const pressure = getWeatherIncidentPressure(weather)
  const triggerChance = clamp(0.08 + pressure * 0.72, 0, 0.68)
  if (rng() > triggerChance) return null
  const eligible = options.filter((item) => unlockedDepartments.includes(item.department))
  if (!eligible.length) return null
  const coastalBandScore = getCoastalBandScore(anchorPosition)
  return pickWeightedScenario(
    eligible,
    (item) => getScenarioCoastalWeight(item.type, coastalBandScore),
    rng
  )
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
  if (PW_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'public_works'
  if (TOW_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'tow'
  return DEFAULT_DEPARTMENT_ID
}

const pickIncidentType = (
  incidentTypes,
  departmentId = DEFAULT_DEPARTMENT_ID,
  incidentCatalogByDepartment = null,
  anchorPosition = null,
  weather = null,
  resolvedCount = 0,
  stationsCount = 1
) => {
  const poolByDepartment = incidentCatalogByDepartment?.[departmentId]
  const coastalBandScore = getCoastalBandScore(anchorPosition)
  
  let baseList = []
  if (Array.isArray(poolByDepartment) && poolByDepartment.length > 0) {
    baseList = poolByDepartment
  } else {
    const matchingTypes = incidentTypes.filter(
      (type) => inferDepartmentForType(type) === departmentId
    )
    baseList = matchingTypes.length
      ? matchingTypes
      : incidentTypes.length
        ? incidentTypes
        : [FALLBACK_INCIDENT_BY_DEPARTMENT[departmentId] || 'Call for service']
  }

  let weatherCompatible = baseList.filter((type) =>
    isIncidentTypeWeatherCompatible(type, weather)
  )

  if (departmentId === 'police') {
    if (resolvedCount < 5) {
      const STARTER_POLICE_INCIDENTS = [
        'Noise complaint',
        'Suspicious person',
        'Illegal parking',
        'Vandalism',
        'Lost child',
        'Graffiti complaint',
        'Welfare check',
        'Caller hangup',
        'Loitering',
        'Animal complaint'
      ]
      const filtered = weatherCompatible.filter(t => STARTER_POLICE_INCIDENTS.includes(t))
      if (filtered.length > 0) weatherCompatible = filtered
      else weatherCompatible = [...STARTER_POLICE_INCIDENTS]
    } else if (resolvedCount < 15 || stationsCount < 2) {
      const hardKeywords = ['shooter', 'homicide', 'kidnapping', 'hostage', 'bomb', 'riot', 'mass', 'fatal', 'pursuit', 'armed', 'arson', 'robbery']
      const filtered = weatherCompatible.filter(t => !hardKeywords.some(k => t.toLowerCase().includes(k)))
      if (filtered.length > 0) weatherCompatible = filtered
    }
  }

  const pool = weatherCompatible.length
    ? weatherCompatible
    : [FALLBACK_INCIDENT_BY_DEPARTMENT[departmentId] || 'Call for service']

  return pickWeightedScenario(
    pool,
    (type) => getScenarioCoastalWeight(type, coastalBandScore)
  )
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
  if (departmentId === 'public_works') {
    const needsHeavy = lower.includes('tree') || lower.includes('sinkhole') || lower.includes('bridge') || lower.includes('main') || lower.includes('snow')
    return { requiredUnits: 1, requiredUnitType: needsHeavy ? 'heavy_machinery' : 'utility_truck' }
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

export const useIncidentSpawner = ({
  stations,
  vehicles,
  resolvedCount = 0,
  weather = null,
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
  campaignDistrictIds = null,
  onIncidentSpawned = null,
  addRadioLogRef = null,
  liveEvent = null,
}) => {
  const seededRef = useRef(false)
  const incidentsRef = useRef(incidents)
  const stationsRef = useRef(stations)
  const vehiclesRef = useRef(vehicles)
  const weatherRef = useRef(weather)
  const liveEventRef = useRef(liveEvent)

  useEffect(() => {
    incidentsRef.current = incidents
  }, [incidents])

  useEffect(() => {
    stationsRef.current = stations
  }, [stations])

  useEffect(() => {
    vehiclesRef.current = vehicles
  }, [vehicles])
  useEffect(() => {
    weatherRef.current = weather
  }, [weather])
  useEffect(() => {
    liveEventRef.current = liveEvent
  }, [liveEvent])
  const createIncident = useCallback(async () => {
    const stationList = stationsRef.current || []
    const firstStationAnchor =
      stationList[0]?.position ||
      (Array.isArray(center) && center.length === 2 ? center : [0, 0])
    const inStarterPhase = resolvedCount < STARTER_PHASE_RESOLVED_LIMIT
    const inEarlyPhase = resolvedCount < EARLY_PHASE_RESOLVED_LIMIT
    const unlockedDistrictIds = Array.isArray(campaignDistrictIds) && campaignDistrictIds.length
      ? campaignDistrictIds
      : ['downtown_core']
    const districtAnchorId = getDistrictIdForPosition(firstStationAnchor, {
      center,
      unlockedDistrictIds,
    })
    const districtAnchorModifiers = getDistrictIncidentModifiers({
      districtId: districtAnchorId,
      weatherCondition: weatherRef.current?.condition,
    })

    // Progressive Department Logic
    const builtDepts = new Set(stationList.map(s => s.department || DEFAULT_DEPARTMENT_ID))
    const unlockedDepts = [DEFAULT_DEPARTMENT_ID]
    if (spawnUnlocks?.fire) unlockedDepts.push('fire')
    if (spawnUnlocks?.ems) unlockedDepts.push('ems')
    if (spawnUnlocks?.tow) unlockedDepts.push('tow')
    if (spawnUnlocks?.public_works) unlockedDepts.push('public_works')

    // Determine which department to spawn for
    let requiredDepartment = DEFAULT_DEPARTMENT_ID
    if (!inStarterPhase) {
      const INTRO_CHANCE = 0.1 // 10% chance to spawn an intro incident for an unlocked dept with no station
      const introChance = resolvedCount < EARLY_PHASE_RESOLVED_LIMIT ? 0.06 : INTRO_CHANCE
      const introCandidates = unlockedDepts.filter(d => !builtDepts.has(d))
      if (introCandidates.length > 0 && Math.random() < introChance) {
        requiredDepartment = pickWeightedDepartment(
          introCandidates,
          districtAnchorModifiers.departmentWeight
        )
      } else if (builtDepts.size > 0) {
        // Otherwise, spawn for a built department (Full Throttle)
        const builtDeptsList = Array.from(builtDepts)
        requiredDepartment = pickWeightedDepartment(
          builtDeptsList,
          districtAnchorModifiers.departmentWeight
        )
      }
    }
    const weatherScenario = inStarterPhase
      ? null
      : pickWeatherIncident(
        weatherRef.current,
        unlockedDepts,
        firstStationAnchor
      )
    if (weatherScenario?.department) {
      requiredDepartment = weatherScenario.department
    }
    const activeLiveEvent = liveEventRef.current
    const liveEventDepartments = Array.isArray(activeLiveEvent?.departments)
      ? activeLiveEvent.departments
      : []
    if (liveEventDepartments.length > 0 && Math.random() < 0.42) {
      requiredDepartment =
        liveEventDepartments[Math.floor(Math.random() * liveEventDepartments.length)] ||
        requiredDepartment
    }

        const eligibleStations = stationList.filter(s => (s.department || DEFAULT_DEPARTMENT_ID) === requiredDepartment)
    const chosenStationForAnchor = eligibleStations.length > 0 
      ? eligibleStations[Math.floor(Math.random() * eligibleStations.length)] 
      : stationList[0] || null
    const anchor = chosenStationForAnchor
      ? chosenStationForAnchor.position
      : Array.isArray(center) && center.length === 2
        ? center
        : [0, 0]
    const radiusKm = chosenStationForAnchor?.operationRadiusKm || stationRadiusKm || incidentRadiusKm
    const eligibleStationsCount = eligibleStations.length

    const spawnLocation = await resolveIncidentSpawnLocation({
      anchor,
      radiusKm,
      randomPointNear,
      attempts: 8,
      areaLabel: 'Oromocto',
    })

    if (!spawnLocation) {
      return false
    }
    const { position, address: finalAddress } = spawnLocation
    const incidentDistrictId = getDistrictIdForPosition(position, {
      center,
      unlockedDistrictIds,
    })
    const districtIncidentModifiers = getDistrictIncidentModifiers({
      districtId: incidentDistrictId,
      weatherCondition: weatherRef.current?.condition,
    })

    const weatherPressure = getWeatherIncidentPressure(weatherRef.current)
    const isMajor =
      !inEarlyPhase &&
      !weatherScenario &&
      Math.random() < MAJOR_INCIDENT_CHANCE * (1 + weatherPressure * 0.35)
        let type = pickIncidentType(
      incidentTypes,
      requiredDepartment,
      incidentCatalogByDepartment,
      anchor,
      weatherRef.current,
      resolvedCount,
      eligibleStationsCount
    )
    let priority = 2
    let rewardMultiplier = 1
    let reqUnits = 1
    let reqDept = requiredDepartment
    let coResponseDepts = []

    if (weatherScenario) {
      type = weatherScenario.type
      priority = clamp(weatherScenario.priority || 2, 1, 3)
      rewardMultiplier = 1 + weatherPressure * 0.45
      reqDept = weatherScenario.department || requiredDepartment
    } else if (isMajor) {
      const keys = Object.keys(MAJOR_INCIDENT_TYPES).filter(k => {
        const config = MAJOR_INCIDENT_TYPES[k]
        // Only allow major incidents if the primary department is unlocked
        return unlockedDepts.includes(config.requiredDepartments[0])
      })
      if (keys.length > 0) {
        type = keys[Math.floor(Math.random() * keys.length)]
        const config = MAJOR_INCIDENT_TYPES[type]
        priority = config.priority
        rewardMultiplier = config.rewardScale
        reqUnits = config.requiredUnits
        reqDept = config.requiredDepartments[0]
        coResponseDepts = config.requiredDepartments.slice(1).filter(d => unlockedDepts.includes(d))
      } else {
        // Fallback to normal incident if no major types are valid for current unlocks
        const basePriority = pickPriority(new Date(), publicTrust)
        priority = pickPriorityForType(type, basePriority)
      }
    } else {
      const basePriority = pickPriority(new Date(), publicTrust)
      priority = pickPriorityForType(type, basePriority)
    }
    if (resolvedCount < 2) {
      priority = 3
    } else if (inStarterPhase) {
      priority = Math.max(2, priority)
    }

    const incidentAddress = finalAddress || 'Local Road, Oromocto'
    const normalizedType = String(type || '').trim().toLowerCase()
    const normalizedAddress = String(incidentAddress || '').trim().toLowerCase()
    const activeStatuses = [
      incidentStatus.open,
      incidentStatus.responding,
      incidentStatus.on_scene,
    ]
    const hasDuplicateActiveIncident = (incidentsRef.current || []).some((item) => {
      if (!item || !activeStatuses.includes(item.status)) return false
      const itemType = String(item.type || '').trim().toLowerCase()
      const itemAddress = String(item.address || '').trim().toLowerCase()
      return (
        itemType === normalizedType &&
        itemAddress === normalizedAddress &&
        (item.requiredDepartment || DEFAULT_DEPARTMENT_ID) === reqDept
      )
    })
    if (hasDuplicateActiveIncident) {
      return false
    }

    let incidentId
    setNextIncidentId((prev) => {
      incidentId = prev
      return prev + 1
    })

    // Log new incident to radio and play alert sound
    import('../game/audio').then(m => m.audio.playAlert(priority))

    addRadioLogRef?.current?.(
      isMajor ? `ALERT: MAJOR MULTI-AGENCY EVENT: ${type} at ${incidentAddress}.` : `All Units: 10-31 ${type} reported at ${incidentAddress}.`,
      isMajor ? 'escalation' : 'default',
      'DISPATCH',
      isMajor ? '10-33' : '10-31'
    )

    const priorityConfig = getPriorityConfig(priority)
    const stagePlan = getStagePlan(type, priority)
    const requirements = isMajor
      ? { requiredUnits: reqUnits, requiredUnitType: null }
      : getIncidentRequirements(type, reqDept)

    const departmentMods =
      departmentIncidentModifiers?.[reqDept] ||
      departmentIncidentModifiers?.[DEFAULT_DEPARTMENT_ID] ||
      null
    const liveEventEffects = activeLiveEvent?.effects || null
    const liveEventIsFocused = liveEventDepartments.includes(reqDept)
    const eventResponseMultiplier = Number(liveEventEffects?.responseTargetMultiplier)
    const safeEventResponseMultiplier = Number.isFinite(eventResponseMultiplier)
      ? liveEventIsFocused
        ? eventResponseMultiplier
        : 1 + (eventResponseMultiplier - 1) * 0.35
      : 1
    const eventRewardMultiplier = Number.isFinite(Number(liveEventEffects?.rewardMultiplier))
      ? liveEventIsFocused
        ? Number(liveEventEffects.rewardMultiplier)
        : 1 + (Number(liveEventEffects.rewardMultiplier) - 1) * 0.35
      : 1

    const responseTargetSeconds = Math.max(
      45,
      Math.round(
        priorityConfig.responseTargetSeconds *
        (districtIncidentModifiers.responseTargetMultiplier || 1) *
        (departmentMods?.responseTargetMultiplier || 1) *
        safeEventResponseMultiplier *
        (1 + weatherPressure * 0.18)
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
    if (!allowMultiUnit && !isMajor) {
      requirements.requiredUnits = 1
    }
    const newIncident = {
      id: incidentId ?? Date.now(),
      type,
      position,
      address: incidentAddress,
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
      requiredDepartment: reqDept,
      coResponseDepartments: coResponseDepts, // New field for multi-agency
      isMajor,
      districtId: incidentDistrictId,
      rewardMultiplier:
        (districtIncidentModifiers.rewardMultiplier || 1) *
        (departmentMods?.rewardMultiplier || 1) *
        rewardMultiplier *
        eventRewardMultiplier,
      missPenaltyMultiplier: (departmentMods?.missPenaltyMultiplier || 1) * (isMajor ? 2 : 1),
      onSceneDurationSeconds,
      dispatchedAt: null,
      arrivedAt: null,
      responseSeconds: null,
      responseTargetSeconds,
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
    onIncidentSpawned?.(newIncident)
    return true
  }, [
    incidentRadiusKm,
    incidentStatus.open,
    incidentStatus.responding,
    incidentStatus.on_scene,
    incidentTypes,
    onSceneSeconds,
    publicTrust,
    randomPointNear,
    setIncidents,
    setNextIncidentId,
    spawnUnlocks,
    incidentCatalogByDepartment,
    departmentIncidentModifiers,
    campaignDistrictIds,
    onIncidentSpawned,
    addRadioLogRef,
    center,
    stationRadiusKm,
    resolvedCount,
  ])

  useEffect(() => {
    if (!stationsRef.current || stationsRef.current.length === 0) return
    let timeoutId
    let cancelled = false
    const scheduleNext = (lastSpawnSucceeded = true) => {
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
      const weatherIntervalMultiplier = getWeatherSpawnIntervalMultiplier(weatherRef.current)
      const progressionIntervalMultiplier =
        resolvedCount < STARTER_PHASE_RESOLVED_LIMIT
          ? 1.7
          : resolvedCount < EARLY_PHASE_RESOLVED_LIMIT
            ? 1.3
            : 1
      const failureRetryMs = 4500
      timeoutId = setTimeout(
        tick,
        lastSpawnSucceeded
          ? Math.max(
            8000,
            Math.round(intervalMs * weatherIntervalMultiplier * progressionIntervalMultiplier)
          )
          : failureRetryMs
      )
    }
    const tick = async () => {
      if (cancelled) return
      const activeCount = incidentsRef.current.filter(
        (item) =>
          item.status === incidentStatus.open ||
          item.status === incidentStatus.responding ||
          item.status === incidentStatus.on_scene
      ).length

      const baseCap = 3
      const trustBonus = publicTrust >= 70 ? 1 : publicTrust <= 30 ? -1 : 0
      const progressionCap =
        resolvedCount < STARTER_PHASE_RESOLVED_LIMIT
          ? 1
          : resolvedCount < EARLY_PHASE_RESOLVED_LIMIT
            ? 2
            : 10
      const dynamicCap = clamp(baseCap + trustBonus + maxActiveBias, 1, 10)
      const maxActive = Math.min(dynamicCap, progressionCap)

      let spawnSucceeded = true
      if (activeCount < maxActive) {
        try {
          spawnSucceeded = await createIncident()
        } catch (error) {
          console.warn('Scheduled incident spawn failed.', error)
          spawnSucceeded = false
        }
      }
      scheduleNext(spawnSucceeded)
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
    resolvedCount,
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
        createIncident().catch((error) => {
          console.warn('Initial incident seed failed.', error)
        })
      }
    }, 1500)
    return () => clearTimeout(timeout)
  }, [stations, incidents.length, createIncident])

  const spawnIncident = useCallback(async () => {
    try {
      return await createIncident()
    } catch (error) {
      console.warn('Manual incident spawn failed.', error)
      return false
    }
  }, [createIncident])

  return { spawnIncident }
}
