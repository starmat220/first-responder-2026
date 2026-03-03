import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMapEvents,
} from 'react-leaflet'
import { PRIORITY_CONFIG, getPriorityConfig } from './config/priority'
import { INCIDENT_DETENTION_OVERRIDES } from './config/incidents'
import { INCIDENT_TYPES, INCIDENT_TYPES_BY_DEPARTMENT } from './config/incidentCatalog'
import { useIncidentSpawner } from './hooks/useIncidentSpawner'
import { useDispatchSystem } from './hooks/useDispatchSystem'
import RadioFeed from './components/RadioFeed'
import {
  COOLDOWN_SECONDS,
  DEFAULT_CENTER,
  DEFAULT_SPEED_KPH,
  DISPATCHABLE_STATUSES,
  ETA_LABEL_LIMIT,
  FATIGUE_INCREASE_PER_SEC,
  FATIGUE_RECOVER_PER_SEC,
  GARAGE_START_CAPACITY,
  GARAGE_UPGRADE_BONUS,
  GARAGE_UPGRADE_COST,
  JAIL_START_CAPACITY,
  PRISON_BUILD_COST,
  PRISON_CAPACITY_UPGRADE_BONUS,
  PRISON_CAPACITY_UPGRADE_COST,
  PRISON_STAFF_CAPACITY_START,
  PRISON_STAFF_HIRE_COUNT,
  PRISON_STAFF_HIRE_COST,
  PRISON_STAFF_UPGRADE_COST,
  PRISON_START_CAPACITY,
  GRADE_MULTIPLIERS,
  GRADE_THRESHOLDS,
  HQ_RESPONSE_BONUS,
  HQ_UPGRADE_COST,
  INCIDENT_INTERVAL_MS,
  INCIDENT_RADIUS_KM,
  INCIDENT_STATUS,
  LEVEL_SCORE_STEP,
  MULTI_UNIT_UNLOCKED_AT,
  STARTER_PHASE_RESOLVED_LIMIT,
  EARLY_PHASE_RESOLVED_LIMIT,
  PROGRESSION_MILESTONES,
  OVERTIME_UPKEEP_PER_MIN,
  ON_SCENE_SECONDS,
  PERSONNEL_CAPACITY_START,
  PERSONNEL_HIRE_COUNT,
  PERSONNEL_HIRE_COST,
  PERSONNEL_UPGRADE_BONUS,
  PERSONNEL_UPGRADE_COST,
  PERSONNEL_UPKEEP_PER_MIN,
  SAVE_SLOT_COUNT,
  SAVE_SCHEMA_VERSION,
  SHIFT_RECOVER_PER_SEC,
  SHIFT_RETURN_THRESHOLD,
  SHIFT_SECONDS,
  SIM_SPEED_OPTIONS,
  SPECIAL_EVENT_RADIUS_KM,
  SPECIAL_EVENT_SPEED_KPH,
  SPECIAL_EVENT_TTL_SECONDS,
  STATION_COST,
  STATION_COST_SMALL,
  STATION_COST_SPECIALIZED,
  STATION_COST_HUB,
  STATION_MIN_DISTANCE_KM,
  STATION_OPERATION_RADIUS_BONUS_KM,
  STATION_OPERATION_RADIUS_KM,
  STATION_UPKEEP_PER_MIN,
  STORAGE_KEY,
  TRAINING_FATIGUE_REDUCTION,
  TRAINING_UPGRADE_COST,
  KENNEL_COST,
  UNIT_TYPE_UPKEEP_PER_MIN,
  UPKEEP_PER_VEHICLE,
  VEHICLE_COST,
  VEHICLE_STATUS,
  VALID_INCIDENT_STATUSES,
  VALID_VEHICLE_STATUSES,
  MUTUAL_AID_COST,
  MUTUAL_AID_DURATION,
  TITLES,
  AVATAR_OPTIONS,
  MAJOR_INCIDENT_CHANCE,
  MAJOR_INCIDENT_TYPES,
  RESEARCH_CATALOG,
  HOSPITAL_POS,
  PRECINCT_POS,
  IMPOUND_POS,
} from './game/constants'
import { clamp, formatSeconds } from './game/utils'
import { haversineMeters, randomPointNear, sanitizePosition } from './game/geo'
import { buildRoute, positionFromProgress } from './game/routes'
import { getTravelSpeedKph } from './game/speed'
import {
  createInitialWeather,
  maybeAdvanceWeather,
  describeWeather,
  fetchLiveWeatherForPosition,
} from './game/weather'
import { autoAssignCrewForStations, getCrewRequirement } from './game/crew'
import { ensureCaseEntry } from './game/cases'
import { DEFAULT_DEPARTMENT_ID, DEPARTMENTS, STATION_TYPES } from './game/departments'
import {
  getUnitById,
  getUnitsByDepartment,
  isUnitUnlocked,
  toUnitTypeMap,
} from './game/catalog'
import { normalizeRequirementSet } from './game/requirements'
import {
  createDailyGoals,
  getMissionDayKey,
  applyGoalProgress,
  normalizeDailyGoals,
} from './game/missions'
import { createTickSnapshot } from './game/snapshot'
import {
  DEFAULT_TUNING_PRESET_ID,
  TUNING_PRESETS,
  getTuningPreset,
} from './game/tuning'
import {
  ICONS,
  makeMarkerIcon,
  pickCustomIconUrl,
} from './game/icons'
import { useLatestRef } from './hooks/useLatestRef'
import { useBuildingPlacement } from './hooks/useBuildingPlacement'
import { useCommandHints } from './hooks/useCommandHints'
import { useDashboardMetrics } from './hooks/useDashboardMetrics'
import { useFocusMode } from './hooks/useFocusMode'
import { useIncidentViewModel } from './hooks/useIncidentViewModel'
import { useMapPresentation } from './hooks/useMapPresentation'
import { useGameSimulation } from './hooks/useGameSimulation'
import { useRadioSystem } from './hooks/useRadioSystem'
import { useVehicleReturnLogic } from './hooks/useVehicleReturnLogic'
import { usePersistence } from './hooks/usePersistence'
import { useDepartmentModifiers } from './hooks/useDepartmentModifiers'
import { GENERAL_CHATTER, DEPT_CHATTER } from './game/radioChatter'
import { normalizeStation, normalizeVehicle, normalizeIncident, normalizeWeather } from './game/persistence'
import { generateCrewMember } from './game/crewMember'
import WelcomeMessage from './components/WelcomeMessage'
import Window from './components/Window'
import Topbar from './components/Topbar'
import IncidentsPanel from './components/IncidentsPanel'
import FleetPanel from './components/FleetPanel'
import StationPanel from './components/StationPanel'
import CashLedger from './components/CashLedger'
import CasesPanel from './components/CasesPanel'
import PrisonPanel from './components/PrisonPanel'
import {
  IncidentHalos,
  IncidentMarkers,
  IncidentRings,
  VehicleRoutes,
} from './components/map/MapIncidentLayers'
import RegionalTicker from './components/RegionalTicker'
import { audio } from './game/audio'
import './App.css'
import './Theme.css'


const getIncidentStagePlan = (
  type,
  priority,
  requiredDepartment = DEFAULT_DEPARTMENT_ID,
  requiredUnits = 1
) => {
  if (!type) return null
  const lower = type.toLowerCase()
  if (
    lower.startsWith('investigation:') ||
    lower.startsWith('complaint review:') ||
    lower.startsWith('search continuation:') ||
    lower.startsWith('case closure:') ||
    lower.startsWith('after action:')
  ) {
    return null
  }

  const followUpPriority = clamp((priority || 2) + 1, 1, 3)
  const stageBlueprints = []

  const crimeKeywords = [
    'burglary',
    'robbery',
    'homicide',
    'assault',
    'domestic',
    'shooting',
    'stabbing',
    'kidnapping',
    'armed',
    'hostage',
  ]
  const fireKeywords = ['fire', 'hazmat', 'smoke', 'explosion', 'chemical', 'gas leak']
  const trafficKeywords = ['traffic', 'pursuit', 'collision', 'accident', 'vehicle']
  const medicalKeywords = ['cardiac', 'overdose', 'trauma', 'stroke', 'unconscious', 'medical']

  if (crimeKeywords.some((keyword) => lower.includes(keyword))) {
    stageBlueprints.push({
      type: `Investigation: ${type}`,
      priority: followUpPriority,
      requiredUnits: 1,
      requiredUnitType: null,
      requiredDepartment: DEPARTMENTS.police.id,
      stageLabel: 'Investigation',
      responseTargetMultiplier: 1.1,
      onSceneDurationMultiplier: 0.9,
    })
    stageBlueprints.push({
      type: `Case closure: ${type}`,
      priority: 3,
      requiredUnits: 1,
      requiredUnitType: null,
      requiredDepartment: DEPARTMENTS.police.id,
      stageLabel: 'Case closure',
      responseTargetMultiplier: 1.2,
      onSceneDurationMultiplier: 0.7,
    })
  } else if (fireKeywords.some((keyword) => lower.includes(keyword))) {
    stageBlueprints.push({
      type: `Overhaul: ${type}`,
      priority: followUpPriority,
      requiredUnits: Math.max(1, requiredUnits - 1),
      requiredUnitType: null,
      requiredDepartment: DEPARTMENTS.fire.id,
      stageLabel: 'Overhaul',
      responseTargetMultiplier: 1.05,
      onSceneDurationMultiplier: 0.95,
    })
    stageBlueprints.push({
      type: `After action: ${type}`,
      priority: 3,
      requiredUnits: 1,
      requiredUnitType: null,
      requiredDepartment: DEPARTMENTS.public_works.id,
      stageLabel: 'After action',
      responseTargetMultiplier: 1.25,
      onSceneDurationMultiplier: 0.75,
    })
  } else if (trafficKeywords.some((keyword) => lower.includes(keyword))) {
    stageBlueprints.push({
      type: `Scene processing: ${type}`,
      priority: followUpPriority,
      requiredUnits: 1,
      requiredUnitType: null,
      requiredDepartment: DEPARTMENTS.police.id,
      stageLabel: 'Scene processing',
      responseTargetMultiplier: 1.08,
      onSceneDurationMultiplier: 0.9,
    })
    stageBlueprints.push({
      type: `Recovery sweep: ${type}`,
      priority: 3,
      requiredUnits: 1,
      requiredUnitType: null,
      requiredDepartment: DEPARTMENTS.tow.id,
      stageLabel: 'Recovery',
      responseTargetMultiplier: 1.2,
      onSceneDurationMultiplier: 0.8,
    })
  } else if (medicalKeywords.some((keyword) => lower.includes(keyword))) {
    stageBlueprints.push({
      type: `Patient transfer: ${type}`,
      priority: followUpPriority,
      requiredUnits: 1,
      requiredUnitType: 'ambulance',
      requiredDepartment: DEPARTMENTS.ems.id,
      stageLabel: 'Transport',
      responseTargetMultiplier: 1.1,
      onSceneDurationMultiplier: 0.8,
    })
  } else if (requiredDepartment && requiredDepartment !== DEFAULT_DEPARTMENT_ID) {
    stageBlueprints.push({
      type: `After action: ${type}`,
      priority: followUpPriority,
      requiredUnits: 1,
      requiredUnitType: null,
      requiredDepartment,
      stageLabel: 'After action',
      responseTargetMultiplier: 1.15,
      onSceneDurationMultiplier: 0.85,
    })
  }

  if (stageBlueprints.length === 0) return null
  const stageTotal = stageBlueprints.length + 1
  const [firstStage, ...queuedStages] = stageBlueprints
  return {
    stageLabel: 'Response',
    stageTotal,
    followUp: {
      ...firstStage,
      stageTotal,
      nextStages: queuedStages,
    },
  }
}

const DEPARTMENT_COVERAGE_STYLE = {
  police: {
    color: 'rgba(96, 171, 255, 0.58)',
    fillColor: 'rgba(96, 171, 255, 0.2)',
  },
  fire: {
    color: 'rgba(221, 113, 98, 0.58)',
    fillColor: 'rgba(221, 113, 98, 0.2)',
  },
  ems: {
    color: 'rgba(225, 167, 92, 0.58)',
    fillColor: 'rgba(225, 167, 92, 0.2)',
  },
  tow: {
    color: 'rgba(201, 171, 108, 0.58)',
    fillColor: 'rgba(201, 171, 108, 0.2)',
  },
  public_works: {
    color: 'rgba(235, 185, 55, 0.58)',
    fillColor: 'rgba(235, 185, 55, 0.2)',
  },
}

const TELEMETRY_DEPARTMENT_IDS = [
  DEPARTMENTS.police.id,
  DEPARTMENTS.fire.id,
  DEPARTMENTS.ems.id,
  DEPARTMENTS.tow.id,
  DEPARTMENTS.public_works.id,
]

const createDepartmentTelemetry = () =>
  TELEMETRY_DEPARTMENT_IDS.reduce((acc, departmentId) => {
    acc[departmentId] = {
      resolved: 0,
      missed: 0,
      rewardTotal: 0,
      responseTotal: 0,
      responseSamples: 0,
    }
    return acc
  }, {})

const DEFAULT_OPERATIONS_STREAK = {
  successfulDays: 0,
  bestStreak: 0,
  lastEvaluatedDay: null,
}

const getNow = () => Date.now()
const randomFloat = () => Math.random()
const randomIndex = (length) => Math.floor(randomFloat() * length)
const randomChance = (threshold) => randomFloat() < threshold
const pickRandomItem = (list, fallback = null) => {
  if (!Array.isArray(list) || list.length === 0) return fallback
  return list[randomIndex(list.length)] ?? fallback
}

const MapClickHandler = ({ active, onMapClick }) => {
  useMapEvents({
    click: (event) => {
      if (active) onMapClick(event.latlng)
    },
  })
  return null
}

const MapZoomTracker = ({ onZoomChange }) => {
  useMapEvents({
    zoomend: (event) => {
      onZoomChange(event.target.getZoom())
    },
  })
  return null
}

function App() {
  const [playerName, setPlayerName] = useState('Commander')
  const [playerCallsign, setPlayerCallsign] = useState('Command')
  const [playerTitle, setPlayerTitle] = useState('COMMANDER')
  const [playerAvatar, setPlayerAvatar] = useState('/images/headshots/dispatch.png')
  const [totalMoneyEarned, setTotalMoneyEarned] = useState(0)
  const [money, setMoney] = useState(1500)
  const [score, setScore] = useState(0)
  const [publicTrust, setPublicTrust] = useState(60)
  const [resolvedCount, setResolvedCount] = useState(0)
  const [debriefs, setDebriefs] = useState([])
  const [stations, setStations] = useState([])
  const [activeStationId, setActiveStationId] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [incidents, setIncidents] = useState([])
  const [specialEvents, setSpecialEvents] = useState([])
  const [prisons, setPrisons] = useState([])
  const [activePrisonId, setActivePrisonId] = useState(null)
  const [showPrison, setShowPrison] = useState(false)
  const [nextSpecialId, setNextSpecialId] = useState(1)
  const [nextVehicleId, setNextVehicleId] = useState(1)
  const [nextStationId, setNextStationId] = useState(1)
  const [nextPrisonId, setNextPrisonId] = useState(1)
  const [nextIncidentId, setNextIncidentId] = useState(1)
  const [nextCaseId, setNextCaseId] = useState(1)
  const [saveSlot, setSaveSlot] = useState(1)
  const [statusMessage, setStatusMessage] = useState('')
  const [dispatchSelection, setDispatchSelection] = useState({})
  const [hasLoadedSave, setHasLoadedSave] = useState(false)
  const [showIncidents, setShowIncidents] = useState(true)
  const [showStation, setShowStation] = useState(false)
  const [stationPanelTab, setStationPanelTab] = useState('overview')
  const [showWelcome, setShowWelcome] = useState(true)
  const [showLedger, setShowLedger] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [stationNameDraft, setStationNameDraft] = useState('')
  const [prisonNameDraft, setPrisonNameDraft] = useState('')
  const [simSpeedIndex, setSimSpeedIndex] = useState(0)
  const [dismissedActionId, setDismissedActionId] = useState(null)
  const [uiResetKey, setUiResetKey] = useState(0)
  const [showProfile, setShowProfile] = useState(false)
  const [showLayers, setShowLayers] = useState(false)
  const [showCases, setShowCases] = useState(false)
  const [showTelemetry, setShowTelemetry] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showNextSteps, setShowNextSteps] = useState(true)
  const [rememberWindowPositions, setRememberWindowPositions] = useState(false)
  const [showTestPanel, setShowTestPanel] = useState(true)
  const [showRadio, setShowRadio] = useState(true)
  const [showAlerts, setShowAlerts] = useState(true)
  const [showResearch, setShowResearch] = useState(false)
  const [unlockedTech, setUnlockedTech] = useState([])
  const [tuningPresetId, setTuningPresetId] = useState(DEFAULT_TUNING_PRESET_ID)
  const [mapZoom, setMapZoom] = useState(13)
  const [mapLayers, setMapLayers] = useState({
    coverage: true,
  })
  const [cases, setCases] = useState([])
  const [weather, setWeather] = useState(() => createInitialWeather(DEFAULT_CENTER))

  const getDepartmentId = useCallback(
    (departmentId) => departmentId || DEFAULT_DEPARTMENT_ID,
    []
  )
  const getDepartmentShortLabel = useCallback(
    (departmentId) =>
      DEPARTMENTS[getDepartmentId(departmentId)]?.shortLabel || DEPARTMENTS.police.shortLabel,
    [getDepartmentId]
  )
  const getDepartmentShortLabelRef = useLatestRef(getDepartmentShortLabel)

  const getDepartmentBadgeMarkup = useCallback((departmentId) => {
    const dept = getDepartmentId(departmentId)
    return `<span class="marker__dept marker__dept--${dept}">${getDepartmentShortLabel(dept)}</span>`
  }, [getDepartmentId, getDepartmentShortLabel])

  const [selectedCaseId, setSelectedCaseId] = useState(null)
  const [followUpPromptId, setFollowUpPromptId] = useState(null)
  const [telemetryStats, setTelemetryStats] = useState(createDepartmentTelemetry)

  const progression = useMemo(
    () => ({
      resolvedCount,
      trafficUnitUnlocked: resolvedCount >= PROGRESSION_MILESTONES.trafficUnitUnlockedAt,
      supervisorUnlocked: resolvedCount >= PROGRESSION_MILESTONES.supervisorUnlockedAt,
      precinctUpgradeUnlocked: resolvedCount >= PROGRESSION_MILESTONES.precinctUpgradeUnlockedAt,
      fireRescueUnlocked:
        (telemetryStats.fire?.resolved || 0) >= PROGRESSION_MILESTONES.fireRescueUnlockedAt,
      emsAdvancedCareUnlocked:
        (telemetryStats.ems?.resolved || 0) >= PROGRESSION_MILESTONES.emsAdvancedCareUnlockedAt,
      towHeavyRecoveryUnlocked:
        (telemetryStats.tow?.resolved || 0) >= PROGRESSION_MILESTONES.towHeavyRecoveryUnlockedAt,
      // Department Station Unlocks
      fireStationUnlocked: resolvedCount >= PROGRESSION_MILESTONES.fireStationUnlockedAt,
      emsStationUnlocked: resolvedCount >= PROGRESSION_MILESTONES.emsStationUnlockedAt,
      towYardUnlocked: resolvedCount >= PROGRESSION_MILESTONES.towYardUnlockedAt,
      publicWorksUnlocked: resolvedCount >= PROGRESSION_MILESTONES.publicWorksUnlockedAt,
    }),
    [resolvedCount, telemetryStats]
  )

  const [radioLogs, setRadioLogs] = useState([])
  const [missionDayKey, setMissionDayKey] = useState(getMissionDayKey())
  const [dailyGoals, setDailyGoals] = useState(() => createDailyGoals(getMissionDayKey()))
  const [operationsStreak, setOperationsStreak] = useState(DEFAULT_OPERATIONS_STREAK)
  const [goalHighlightIds, setGoalHighlightIds] = useState([])
  const [goalDismissingIds, setGoalDismissingIds] = useState([])
  const followUpPromptTimer = useRef(null)
  const [incidentFilters, setIncidentFilters] = useState({
    type: 'all',
    department: 'all',
    onlyActiveDepartment: false,
    priority: { 1: true, 2: true, 3: true },
    sort: 'priority',
    isCompact: false,
  })
  const storageKey = `${STORAGE_KEY}.slot${saveSlot}`
  const simSpeedMultiplier = SIM_SPEED_OPTIONS[simSpeedIndex] || 1
  const tuningPreset = getTuningPreset(tuningPresetId)
  const currentWeatherSummary = useMemo(() => describeWeather(weather), [weather])
  const weatherNextUpdateLabel = useMemo(() => {
    const nextUpdate = Number(weather?.nextUpdateAt)
    if (!Number.isFinite(nextUpdate)) return '--:--'
    return new Date(nextUpdate).toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [weather?.nextUpdateAt])
  const operationsPhase = useMemo(() => {
    if (resolvedCount < STARTER_PHASE_RESOLVED_LIMIT) return 'BASIC OPS'
    if (resolvedCount < EARLY_PHASE_RESOLVED_LIMIT) return 'EXPANDED OPS'
    return 'REGIONAL OPS'
  }, [resolvedCount])

  const vehiclesRef = useLatestRef(vehicles)
  const incidentsRef = useLatestRef(incidents)
  const stationsRef = useRef(stations)
  const specialEventsRef = useLatestRef(specialEvents)
  const prisonsRef = useLatestRef(prisons)
  const nextIncidentIdRef = useLatestRef(nextIncidentId)
  const nextCaseIdRef = useLatestRef(nextCaseId)
  const rewardMultiplierRef = useLatestRef(tuningPreset.rewardMultiplier)
  const missPenaltyMultiplierRef = useLatestRef(tuningPreset.missPenaltyMultiplier)
  const pendingRebuildRoutes = useRef(new Set())
  const economyTimer = useRef(0)
  const simSpeedRef = useRef(simSpeedMultiplier)

  useEffect(() => {
    stationsRef.current = stations
  }, [stations])

  const addRadioLog = (
    message,
    type = 'default',
    channel = 'DISPATCH',
    code = '',
    unitId = null,
    context = null
  ) => {
    let avatar = null
    if (channel === 'SYSTEM') {
      avatar = '/images/headshots/dispatch.png'
    } else if (channel === 'PD' && unitId) {
      avatar = unitId % 2 === 0
        ? '/images/headshots/police_officer_02.png'
        : '/images/headshots/police_officer_01.png'
    }

    setRadioLogs((prev) => [
      ...prev.slice(-19),
      {
        id: getNow() + randomFloat(),
        time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }),
        message,
        type,
        channel,
        code,
        avatar,
        incidentId: context?.incidentId ?? null,
        incidentAddress: context?.incidentAddress ?? null,
      },
    ])
  }
  const addRadioLogRef = useLatestRef(addRadioLog)
  const weatherConditionRef = useRef(weather?.condition || null)
  const primaryStation = stations[0] || null
  const primaryStationAnchorId = primaryStation?.id || null
  const primaryStationAnchorLat = primaryStation?.position?.[0] || null
  const primaryStationAnchorLng = primaryStation?.position?.[1] || null

  useEffect(() => {
    const anchor = stationsRef.current[0]?.position || DEFAULT_CENTER
    let cancelled = false
    const syncWeatherFromAnchor = async () => {
      const liveWeather = await fetchLiveWeatherForPosition(anchor)
      if (cancelled) return
      if (liveWeather) {
        setWeather(liveWeather)
        return
      }
      setWeather((prev) => maybeAdvanceWeather(prev, anchor))
    }
    syncWeatherFromAnchor()
    return () => {
      cancelled = true
    }
  }, [primaryStationAnchorId, primaryStationAnchorLat, primaryStationAnchorLng])

  useEffect(() => {
    let cancelled = false
    const syncWeather = async () => {
      const anchor = stationsRef.current[0]?.position || DEFAULT_CENTER
      const liveWeather = await fetchLiveWeatherForPosition(anchor)
      if (cancelled) return
      if (liveWeather) {
        setWeather(liveWeather)
        return
      }
      setWeather((prev) => maybeAdvanceWeather(prev, anchor))
    }
    const intervalId = setInterval(syncWeather, 10 * 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (!hasLoadedSave || !weather) return
    if (!weatherConditionRef.current) {
      weatherConditionRef.current = weather.condition
      return
    }
    if (weatherConditionRef.current === weather.condition) return
    weatherConditionRef.current = weather.condition
    const weatherSummary = describeWeather(weather)
    addRadioLogRef.current?.(
      `Weather advisory: ${weatherSummary}. Road conditions adjusted.`,
      'default',
      'DISPATCH',
      'WX-1'
    )
  }, [weather, hasLoadedSave, addRadioLogRef])

  const handleMutualAid = () => {
    if (money < MUTUAL_AID_COST) {
      showMessage('Not enough funds for Mutual Aid.')
      return
    }
    setMoney((prev) => prev - MUTUAL_AID_COST)

    // Spawn a temporary elite unit at a random map edge
    const edge = randomChance(0.5) ? 0 : 1
    const startPos = edge ? [45.88, -66.4] : [45.82, -66.5] // Rough edge coords
    const newId = nextVehicleId
    setNextVehicleId(prev => prev + 1)

    const aidUnit = {
      id: newId,
      name: `Mutual Aid ${newId}`,
      unitType: 'supervisor', // High capability
      department: primaryDepartmentId,
      status: VEHICLE_STATUS.available,
      position: startPos,
      speedKph: 80, // Very fast
      crewAssigned: 2,
      crewRequired: 2,
      homeStationId: activeStationId, // Temporarily attach to active
      shiftRemaining: MUTUAL_AID_DURATION, // Short duration
      isMutualAid: true,
      xp: 2000, // Experienced
      level: 5,
    }

    setVehicles(prev => [...prev, aidUnit])
    addRadioLog('Mutual Aid unit 10-8 and responding from out of town.', 'info', 'SYSTEM')
    showMessage('Mutual Aid requested.')
  }

  const activeStation =
    stations.find((item) => item.id === activeStationId) || stations[0] || null
  const primaryDepartmentId = activeStation?.department || DEFAULT_DEPARTMENT_ID
  const {
    focusMode,
    setFocusMode,
    focusDepartmentId,
    isFocusEnabled,
    getFocusFactor,
    resetFocusMode,
  } = useFocusMode({
    incidentFilters,
    primaryDepartmentId,
    defaultDepartmentId: DEFAULT_DEPARTMENT_ID,
    shortcutKey: 'f',
  })
  const departmentUnitCatalog = getUnitsByDepartment(primaryDepartmentId)
  const unitTypeMap = toUnitTypeMap(primaryDepartmentId)
  const activePrison =
    prisons.find((item) => item.id === activePrisonId) || prisons[0] || null

  useEffect(() => {
    if (activeStation?.name) {
      const frame = requestAnimationFrame(() => {
        setStationNameDraft(activeStation.name)
      })
      return () => cancelAnimationFrame(frame)
    }
    return undefined
  }, [activeStation?.name])
  useEffect(() => {
    if (activePrison?.name) {
      const frame = requestAnimationFrame(() => {
        setPrisonNameDraft(activePrison.name)
      })
      return () => cancelAnimationFrame(frame)
    }
    return undefined
  }, [activePrison?.name])
  useEffect(() => {
    if (
      stationPanelTab === 'detention' &&
      activeStation &&
      activeStation.department !== DEFAULT_DEPARTMENT_ID
    ) {
      const frame = requestAnimationFrame(() => {
        setStationPanelTab('overview')
      })
      return () => cancelAnimationFrame(frame)
    }
    return undefined
  }, [activeStation, stationPanelTab])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      switch (e.key) {
        case '1':
          setShowAlerts((prev) => !prev)
          break
        case '2':
          setShowRadio((prev) => !prev)
          break
        case '3':
          setShowIncidents((prev) => !prev)
          break
        case '4':
          setShowCases((prev) => !prev)
          break
        case '5':
          setShowLayers((prev) => !prev)
          break
        case '6':
          setShowTelemetry((prev) => !prev)
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const applyDefaultState = ({ showWelcome: nextShowWelcome = true } = {}) => {
    const nextMissionDayKey = getMissionDayKey()
    setMoney(1500)
    setScore(0)
    setPublicTrust(60)
    setResolvedCount(0)
    setDebriefs([])
    setStations([])
    setActiveStationId(null)
    setVehicles([])
    setIncidents([])
    setSpecialEvents([])
    setPrisons([])
    setActivePrisonId(null)
    setShowPrison(false)
    setCases([])
    setNextSpecialId(1)
    setNextVehicleId(1)
    setNextStationId(1)
    setNextPrisonId(1)
    setNextIncidentId(1)
    setNextCaseId(1)
    setDispatchSelection({})
    resetBuildingPlacement()
    setShowWelcome(nextShowWelcome)
    setShowStation(false)
    setStationPanelTab('overview')
    setShowIncidents(true)
    setShowLedger(false)
    setShowLayers(false)
    setShowCases(false)
    setShowTelemetry(false)
    setShowSettings(false)
    setShowNextSteps(true)
    setRememberWindowPositions(false)
    setShowTestPanel(true)
    resetFocusMode()
    setIncidentFilters({
      type: 'all',
      department: 'all',
      onlyActiveDepartment: false,
      priority: { 1: true, 2: true, 3: true },
    })
    setFollowUpPromptId(null)
    setSelectedCaseId(null)
    setStationNameDraft('')
    setTelemetryStats(createDepartmentTelemetry())
    setTransactions([])
    setSimSpeedIndex(0)
    setTuningPresetId(DEFAULT_TUNING_PRESET_ID)
    setMissionDayKey(nextMissionDayKey)
    setDailyGoals(createDailyGoals(nextMissionDayKey, 0))
    setOperationsStreak(DEFAULT_OPERATIONS_STREAK)
    setWeather(createInitialWeather(DEFAULT_CENTER))
    economyTimer.current = 0
  }

  const gameState = useMemo(() => ({
    money, playerName, playerCallsign, playerTitle, playerAvatar, totalMoneyEarned, score, publicTrust, resolvedCount, debriefs, transactions,
    stations, activeStationId, prisons, cases, vehicles, incidents,
    nextVehicleId, nextStationId, nextPrisonId, nextIncidentId, nextCaseId, nextSpecialId,
    missionDayKey, dailyGoals, telemetryStats, unlockedTech, operationsStreak, weather,
    uiState: {
      stationPanelTab,
      showLayers,
      showCases,
      showTelemetry,
      tuningPresetId,
      incidentFilters,
      showNextSteps,
      rememberWindowPositions,
      showResearch,
    }
  }), [
    money, playerName, playerCallsign, playerTitle, playerAvatar, totalMoneyEarned, score, publicTrust, resolvedCount, debriefs, transactions,
    stations, activeStationId, prisons, cases, vehicles, incidents,
    nextVehicleId, nextStationId, nextPrisonId, nextIncidentId, nextCaseId, nextSpecialId,
    missionDayKey, dailyGoals, telemetryStats, unlockedTech, operationsStreak, weather,
    stationPanelTab, showLayers, showCases, showTelemetry, tuningPresetId, incidentFilters, showNextSteps, rememberWindowPositions, showResearch
  ])

  const loadState = useCallback((data) => {
    const safeStations = (Array.isArray(data.stations) ? data.stations : [])
      .map((s, i) => normalizeStation(s, i))
      .filter(Boolean);
    const primaryStationPos = safeStations[0]?.position || DEFAULT_CENTER;

    const safeVehicles = (Array.isArray(data.vehicles) ? data.vehicles : [])
      .map(v => normalizeVehicle(v, primaryStationPos))
      .filter(Boolean);

    const safeIncidents = (Array.isArray(data.incidents) ? data.incidents : [])
      .filter(inc => inc.status !== INCIDENT_STATUS.resolved)
      .map(inc => normalizeIncident(inc, primaryStationPos))
      .filter(Boolean);

    const staffedVehicles = autoAssignCrewForStations(safeVehicles, safeStations);

    setMoney(Number(data.money) || 1500);
    setPlayerName(data.playerName || 'Commander');
    setPlayerCallsign(data.playerCallsign || 'Command');
    setPlayerTitle(data.playerTitle || 'COMMANDER');
    setPlayerAvatar(data.playerAvatar || '/images/headshots/dispatch.png');
    setTotalMoneyEarned(data.totalMoneyEarned || 0);
    setScore(Number(data.score) || 0);
    setPublicTrust(Number(data.publicTrust) || 60);
    setResolvedCount(Number(data.resolvedCount) || 0);
    setDebriefs(Array.isArray(data.debriefs) ? data.debriefs : []);
    setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
    setStations(safeStations);
    setPrisons(Array.isArray(data.prisons) ? data.prisons : []);
    setVehicles(staffedVehicles);
    setIncidents(safeIncidents);
    setCases(Array.isArray(data.cases) ? data.cases : []);
    setWeather(
      normalizeWeather(data.weather, primaryStationPos) ||
      createInitialWeather(primaryStationPos)
    );
    setNextVehicleId(Number(data.nextVehicleId) || 1);
    setNextStationId(Number(data.nextStationId) || 1);
    setNextPrisonId(Number(data.nextPrisonId) || 1);
    setNextIncidentId(Number(data.nextIncidentId) || 1);
    setNextCaseId(Number(data.nextCaseId) || 1);
    setNextSpecialId(Number(data.nextSpecialId) || 1);

    const ui = data.uiState || {};
    setStationPanelTab(ui.stationPanelTab || 'overview');
    setShowLayers(Boolean(ui.showLayers));
    setShowCases(Boolean(ui.showCases));
    setShowTelemetry(Boolean(ui.showTelemetry));
    setShowResearch(Boolean(ui.showResearch));
    setShowNextSteps(ui.showNextSteps !== false);
    setRememberWindowPositions(Boolean(ui.rememberWindowPositions));
    if (ui.incidentFilters) setIncidentFilters(ui.incidentFilters);
    setTuningPresetId(ui.tuningPresetId || DEFAULT_TUNING_PRESET_ID);

    const loadedStreak = {
      successfulDays: Math.max(0, Number(data.operationsStreak?.successfulDays) || 0),
      bestStreak: Math.max(0, Number(data.operationsStreak?.bestStreak) || 0),
      lastEvaluatedDay: data.operationsStreak?.lastEvaluatedDay || null,
    }
    const loadedDayKey = data.missionDayKey || getMissionDayKey()
    setOperationsStreak(loadedStreak)
    setMissionDayKey(loadedDayKey)
    setDailyGoals(
      normalizeDailyGoals(data.dailyGoals, loadedDayKey, loadedStreak.successfulDays)
    )
    setTelemetryStats(data.telemetryStats || createDepartmentTelemetry());
    setUnlockedTech(Array.isArray(data.unlockedTech) ? data.unlockedTech : []);
    setShowWelcome(!safeStations.length);
  }, []);

  usePersistence({
    storageKey,
    hasLoadedSave,
    setHasLoadedSave,
    applyDefaultState,
    gameState,
    loadState
  })

  useEffect(() => {
    if (!followUpPromptId) {
      if (followUpPromptTimer.current) {
        clearTimeout(followUpPromptTimer.current)
        followUpPromptTimer.current = null
      }
      return
    }
    return undefined
  }, [followUpPromptId])
  const getCustomMarkerMarkup = useCallback((candidates, fallbackMarkup, departmentId = null, isStation = false) => {
    const custom = pickCustomIconUrl(candidates)
    const badgeMarkup = (departmentId && !isStation) ? getDepartmentBadgeMarkup(departmentId) : ''
    if (custom) return `<img class="marker__img marker__img--custom" src="${custom}" alt="" />`
    return `${fallbackMarkup}${badgeMarkup}`
  }, [getDepartmentBadgeMarkup])
  const getMarkerSize = useCallback((baseSize) => {
    const zoomFactor = Math.pow(1.15, mapZoom - 13)
    const sizeValue = Math.round(baseSize * zoomFactor)
    return [sizeValue, sizeValue]
  }, [mapZoom])

  const stationIcon = useMemo(
    () =>
      makeMarkerIcon(
        'marker--station',
        ICONS.station,
        getMarkerSize(30)
      ),
    [getMarkerSize]
  )
  const fireStationIcon = useMemo(
    () =>
      makeMarkerIcon(
        'marker--station marker--station-fire',
        ICONS.fire_station,
        getMarkerSize(24)
      ),
    [getMarkerSize]
  )
  const emsStationIcon = useMemo(
    () =>
      makeMarkerIcon(
        'marker--station marker--station-ems',
        ICONS.ems_station,
        getMarkerSize(24)
      ),
    [getMarkerSize]
  )
  const towYardIcon = useMemo(
    () =>
      makeMarkerIcon(
        'marker--station marker--station-tow',
        ICONS.tow_yard,
        getMarkerSize(24)
      ),
    [getMarkerSize]
  )
  const pwDepotIcon = useMemo(
    () =>
      makeMarkerIcon(
        'marker--station marker--station-pw',
        ICONS.logistics || ICONS.tow_yard,
        getMarkerSize(24)
      ),
    [getMarkerSize]
  )
  const prisonIcon = useMemo(
    () =>
      makeMarkerIcon(
        'marker--prison',
        getCustomMarkerMarkup(['station-prison.png'], ICONS.prison),
        getMarkerSize(24)
      ),
    [getCustomMarkerMarkup, getMarkerSize]
  )
  const placementIcon = useMemo(
    () => makeMarkerIcon('marker--placement', ICONS.placement, getMarkerSize(22)),
    [getMarkerSize]
  )
  const specialEventIcon = useMemo(
    () => makeMarkerIcon('marker--special', ICONS.incident, getMarkerSize(22)),
    [getMarkerSize]
  )
  const getIncidentUnitBadgeMarkup = (unitType, departmentId) => {
    if (!unitType) return ''
    const dept = getDepartmentId(departmentId)
    const allowCustomBadgeArt = dept === DEPARTMENTS.police.id
    const departmentIconBase =
      dept === DEPARTMENTS.fire.id
        ? ['unit-fire']
        : dept === DEPARTMENTS.ems.id
          ? ['unit-ems']
          : dept === DEPARTMENTS.tow.id
            ? ['unit-tow']
            : []
    const custom = pickCustomIconUrl([
      ...(allowCustomBadgeArt ? [`unit-${unitType}.png`] : []),
      ...(allowCustomBadgeArt ? departmentIconBase.map((name) => `${name}.png`) : []),
      ...(allowCustomBadgeArt ? ['unit-patrol.png'] : []),
    ])
    if (custom) {
      return `<img class="marker__unit-img marker__img--dept-${dept}" src="${custom}" alt="" />`
    }
    if (dept === DEPARTMENTS.fire.id) return ICONS.fire_vehicle
    if (dept === DEPARTMENTS.ems.id) return ICONS.ems_vehicle
    if (dept === DEPARTMENTS.tow.id) return ICONS.tow_vehicle
    if (dept === DEPARTMENTS.public_works.id) return ICONS.tow_vehicle
    return ICONS.vehicle
  }

  const getIncidentDepartmentBadgesMarkup = (departmentId, coResponseDepartments = []) => {
    const deptIds = Array.from(
      new Set([
        getDepartmentId(departmentId),
        ...(Array.isArray(coResponseDepartments) ? coResponseDepartments.map(getDepartmentId) : []),
      ])
    ).slice(0, 3)
    if (deptIds.length === 0) return ''
    if (deptIds.length === 1) {
      return `<span class="marker__dept marker__dept--${deptIds[0]}">${getDepartmentShortLabel(deptIds[0])}</span>`
    }
    return `<span class="marker__dept-stack" aria-hidden="true">${deptIds
      .map(
        (dept) =>
          `<span class="marker__dept marker__dept--${dept} marker__dept--compact">${getDepartmentShortLabel(
            dept
          )}</span>`
      )
      .join('')}</span>`
  }

  const getIncidentIconMarkup = (
    priority,
    departmentId,
    hasAssignedUnit = false,
    badgeUnitType = null,
    badgeUnitDepartment = null,
    coResponseDepartments = null
  ) => {
    const core = `<span class="marker__glyph marker__glyph--incident" aria-hidden="true">${ICONS.incident}</span>`
    const dept = getDepartmentId(departmentId)
    const unitBadge = hasAssignedUnit
      ? `<span class="marker__unit marker__unit--${getDepartmentId(
        badgeUnitDepartment || dept
      )}" aria-hidden="true">${getIncidentUnitBadgeMarkup(
        badgeUnitType || 'patrol',
        badgeUnitDepartment || dept
      )}</span>`
      : ''
    const badge = getIncidentDepartmentBadgesMarkup(dept, coResponseDepartments)
    return `${core}${unitBadge}${badge}`
  }

  const getIncidentIcon = (
    status,
    priority,
    departmentId,
    hasAssignedUnit = false,
    badgeUnitType = null,
    badgeUnitDepartment = null,
    coResponseDepartments = null
  ) => {
    const size = getMarkerSize(27)
    const className =
      status === INCIDENT_STATUS.open || status === INCIDENT_STATUS.responding
        ? 'marker--incident'
        : 'marker--incident-hot'
    return makeMarkerIcon(
      className,
      getIncidentIconMarkup(
        priority,
        departmentId,
        hasAssignedUnit,
        badgeUnitType,
        badgeUnitDepartment,
        coResponseDepartments
      ),
      size
    )
  }

  const getDepartmentColorClass = (departmentId) =>
    `department-color--${getDepartmentId(departmentId)}`

  const getUnitDisplayLabel = (vehicle) => {
    const unitType = vehicle?.unitType || 'patrol'
    const department = vehicle?.department || DEFAULT_DEPARTMENT_ID
    if (department === DEPARTMENTS.fire.id && unitType === 'engine') return 'Fire Engine'
    const unit = getUnitById(unitType)
    return unit?.label || unitType
  }

  const getUnitIconMarkup = (unitType, status, department) => {
    const dept = department || DEFAULT_DEPARTMENT_ID
    const allowCustomVehicleArt = dept === DEPARTMENTS.police.id
    const fallbackIcon =
      dept === DEPARTMENTS.fire.id
        ? ICONS.fire_vehicle
        : dept === DEPARTMENTS.ems.id
          ? ICONS.ems_vehicle
          : dept === DEPARTMENTS.tow.id
            ? ICONS.tow_vehicle
            : ICONS.vehicle
    const departmentIconBase =
      department === DEPARTMENTS.fire.id
        ? ['unit-fire']
        : department === DEPARTMENTS.ems.id
          ? ['unit-ems']
          : department === DEPARTMENTS.tow.id
            ? ['unit-tow']
            : []

    const unitIconBase = [`unit-${unitType}`, ...departmentIconBase, 'unit-patrol']
    const shouldUsePoliceSiren =
      allowCustomVehicleArt &&
      (status === VEHICLE_STATUS.enroute || status === VEHICLE_STATUS.routing)

    if (shouldUsePoliceSiren) {
      const red =
        pickCustomIconUrl(
          unitIconBase.flatMap((name) => [`${name}-red.png`])
        ) ||
        pickCustomIconUrl(['unit-patrol-red.png'])
      const blue =
        pickCustomIconUrl(
          unitIconBase.flatMap((name) => [`${name}-blue.png`])
        ) ||
        pickCustomIconUrl(['unit-patrol-blue.png'])
      if (red && blue) {
        return `<span class="marker__siren"><img class="marker__img marker__img--siren marker__img--siren-a marker__img--dept-${dept}" src="${red}" alt="" /><img class="marker__img marker__img--siren marker__img--siren-b marker__img--dept-${dept}" src="${blue}" alt="" /></span>`
      }
    }

    if (allowCustomVehicleArt && status === VEHICLE_STATUS.returning) {
      const returning =
        pickCustomIconUrl(
          unitIconBase.flatMap((name) => [`${name}-return.png`])
        ) ||
        pickCustomIconUrl(['unit-patrol-return.png'])
      if (returning) {
        return `<img class="marker__img marker__img--custom marker__img--dept-${dept}" src="${returning}" alt="" />`
      }
    }

    const custom = allowCustomVehicleArt
      ? (
        pickCustomIconUrl(unitIconBase.flatMap((name) => [`${name}.png`])) ||
        pickCustomIconUrl(['unit-patrol.png'])
      )
      : null
    if (custom) {
      return `<img class="marker__img marker__img--custom marker__img--dept-${dept}" src="${custom}" alt="" />`
    }
    return fallbackIcon
  }

  const getVehicleStateBadgesMarkup = (hasDetainee) => {
    const badges = []
    if (hasDetainee) {
      badges.push(
        `<span class="marker__state marker__state--detainee" aria-hidden="true" title="Transporting detainee">
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <path d="M8.3 11.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6zm7.4 6a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6z" fill="none" stroke="currentColor" stroke-width="1.9"/>
            <path d="M10.8 9.7l2.5 4.2m-1.4-1.1l-2.3 1.3m6.8-1.8l-2.4 1.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>`
      )
    }
    return badges.join('')
  }

  const getVehicleIcon = (status, unitType, department, hasDetainee) => {
    const size = getMarkerSize(unitType === 'patrol' ? 20 : 22)
    const isPoliceEmergencyRun =
      (department || DEFAULT_DEPARTMENT_ID) === DEPARTMENTS.police.id &&
      (status === VEHICLE_STATUS.enroute || status === VEHICLE_STATUS.routing)
    const className =
      status === VEHICLE_STATUS.enroute || isPoliceEmergencyRun
        ? 'marker--vehicle-active'
        : status === VEHICLE_STATUS.on_scene
          ? 'marker--vehicle-scene'
          : status === VEHICLE_STATUS.returning
            ? 'marker--vehicle-return'
            : status === VEHICLE_STATUS.routing || status === VEHICLE_STATUS.awaiting_return_route
              ? 'marker--vehicle-muted'
              : status === VEHICLE_STATUS.off_shift
                ? 'marker--vehicle-muted'
                : 'marker--vehicle'
    const departmentClass = `marker--department-${department || DEFAULT_DEPARTMENT_ID}`
    const combinedClass = `${className} ${departmentClass}`
    const iconMarkup = `${getUnitIconMarkup(unitType, status, department)}${getVehicleStateBadgesMarkup(hasDetainee)}`
    return makeMarkerIcon(combinedClass, iconMarkup, size)
  }

  const showMessage = (message) => {
    setStatusMessage(message)
    if (message) {
      setTimeout(() => setStatusMessage(''), 3000)
    }
  }

  const getStationById = (id) => stationsRef.current.find((item) => item.id === id) || null
  const getPrisonById = (id) => prisonsRef.current.find((item) => item.id === id) || null
  const getDefaultStationPosition = () =>
    activeStation?.position || stationsRef.current[0]?.position || DEFAULT_CENTER
  const getStationResponseBonus = (stationId) =>
    getStationById(stationId)?.responseBonus || 0
  const getStationJailCapacity = (stationId) =>
    getStationById(stationId)?.jailCapacity || JAIL_START_CAPACITY

  const getIncidentCrewEdgePercent = (incident, vehicle) => {
    if (!incident || !vehicle) return 0
    const station = getStationById(vehicle.homeStationId)
    const crewMembers = Array.isArray(station?.crewMembers)
      ? station.crewMembers.filter((member) => vehicle.assignedCrewIds?.includes(member.id))
      : []
    let skillKey = 'tactics'
    if (incident.requiredDepartment === 'fire') skillKey = 'suppression'
    if (incident.requiredDepartment === 'ems') skillKey = 'medical'
    if (incident.requiredDepartment === 'tow') skillKey = 'recovery'
    const avgSkill = crewMembers.length
      ? crewMembers.reduce(
        (sum, member) =>
          sum + Number(member.skills?.[skillKey] ?? member.stats?.[skillKey] ?? 0),
        0
      ) / crewMembers.length
      : 0
    return Math.round((avgSkill / 10) * 15)
  }

  const detentionKeywords = [
    'homicide',
    'murder',
    'kidnap',
    'robbery',
    'assault',
    'domestic',
    'violence',
    'sexual',
    'home invasion',
    'arson',
    'shooting',
    'shots fired',
    'stabbing',
    'weapon',
    'armed',
    'warrant',
    'burglary',
    'car jacking',
    'vehicle theft',
    'stolen vehicle',
    'drug',
    'narcotics',
    'dui',
    'impaired',
    'hit and run',
    'kidnapped',
    'hostage',
    'riot',
    'prisoner',
    'drug',
    'escape',
    'parole',
    'probation',
    'order violation',
  ]

  const incidentNeedsDetention = (incident) => {
    if (!incident) return false
    if (incident.requiresDetention != null) return Boolean(incident.requiresDetention)
    const rawType = String(incident.type || '')
    if (INCIDENT_DETENTION_OVERRIDES?.[rawType] != null) {
      return Boolean(INCIDENT_DETENTION_OVERRIDES[rawType])
    }
    const label = rawType.toLowerCase()
    return detentionKeywords.some((keyword) => label.includes(keyword))
  }

  const getClosestStationWithCapacity = (position, matcher) => {
    const candidates = stationsRef.current.filter((station) => matcher(station))
    if (!candidates.length) return null
    return candidates.reduce((closest, station) => {
      if (!closest) return station
      const current = haversineMeters(position, station.position)
      const best = haversineMeters(position, closest.position)
      return current < best ? station : closest
    }, null)
  }

  const getAvailablePrisonFacility = (position) => {
    const facilities = prisonsRef.current || []
    if (!facilities.length) return null
    return facilities
      .filter((facility) => (facility.count || 0) < (facility.capacity || 0))
      .reduce((closest, facility) => {
        if (!closest) return facility
        const current = haversineMeters(position, facility.position)
        const best = haversineMeters(position, closest.position)
        return current < best ? facility : closest
      }, null)
  }

  const getAvailableJailStation = (position) =>
    getClosestStationWithCapacity(position, (station) =>
      (station.jailCount || 0) < getStationJailCapacity(station.id)
    )


  const getUsedPersonnel = (list, stationId) =>
    (list || vehiclesRef.current)
      .filter((vehicle) => (stationId ? vehicle.homeStationId === stationId : true))
      .reduce(
        (sum, vehicle) => sum + (Number(vehicle.crewAssigned) || 0),
        0
      )

  const getPersonnelAvailable = (stationId) => {
    const station = stationId ? getStationById(stationId) : activeStation
    const assigned = station?.personnelAssigned || 0
    return Math.max(0, assigned - getUsedPersonnel(null, station?.id))
  }

  const getBuildingCost = (buildingType) => {
    const type = STATION_TYPES[buildingType]
    if (!type) return STATION_COST

    if (type.size === 'small') return STATION_COST_SMALL
    if (type.category === 'training' || type.category === 'medical_hub' || type.category === 'hub') return STATION_COST_HUB
    if (type.category === 'aviation' || type.category === 'water' || type.category === 'investigation') return STATION_COST_SPECIALIZED
    if (type.id === STATION_TYPES.prison.id) return PRISON_BUILD_COST

    return STATION_COST + stations.length * 250 // Escalating cost for main stations
  }

  const getDefaultStationName = (stationType, stationId) => {
    const label = STATION_TYPES[stationType]?.label || 'Station'
    return `${label} ${stationId}`
  }

  const {
    placingStation,
    setPlacingStation,
    placingStationPosition,
    setPlacingStationPosition,
    placingBuildingType,
    setPlacingBuildingType,
    showBuildMenu,
    setShowBuildMenu,
    buildOptions,
    selectedBuildOption,
    placingBuildingLabel,
    getBuildingDefinition,
    handleToggleBuildMenu,
    handleStartBuildingPlacement,
    handleMapClick,
    handleCancelPlacement,
    resetBuildingPlacement,
  } = useBuildingPlacement({
    getBuildingCost,
    progression,
    onStartPlacement: (selectedBuildingId) => {
      setShowWelcome(false)
      if (selectedBuildingId === STATION_TYPES.prison.id) {
        setPrisonNameDraft(`Prison ${nextPrisonId}`)
      } else {
        setStationNameDraft(getDefaultStationName(selectedBuildingId, nextStationId))
      }
    },
    onUnavailableBuilding: (buildingLabel) => {
      showMessage(`${buildingLabel} is coming soon.`)
    },
    onCancelPlacement: () => {
      showMessage('')
    },
  })

  const handlePlaceStation = (latlng, stationType = STATION_TYPES.police_station.id) => {
    const buildCost = getBuildingCost(stationType)
    const building = getBuildingDefinition(stationType)
    const buildingDepartment = building.department || DEFAULT_DEPARTMENT_ID
    if (money < buildCost) {
      showMessage(`Not enough funds to build ${building.label.toLowerCase()}.`)
      setPlacingStation(false)
      setPlacingStationPosition(null)
      return
    }
    const newPosition = [latlng.lat, latlng.lng]
    const tooClose = stations.some(
      (existing) =>
        (existing.department || DEFAULT_DEPARTMENT_ID) === buildingDepartment &&
        haversineMeters(existing.position, newPosition) < STATION_MIN_DISTANCE_KM * 1000
    )
    if (tooClose) {
      showMessage(
        `${DEPARTMENTS[buildingDepartment]?.label || 'Same-department'} stations must be ${STATION_MIN_DISTANCE_KM}km apart.`
      )
      setPlacingStation(false)
      setPlacingStationPosition(null)
      return
    }
    const newStationId = nextStationId
    const stationDef = STATION_TYPES[stationType]

    // Stats based on size/category
    const isSmall = stationDef.size === 'small'
    const isHub = stationDef.category === 'hub' || stationDef.category === 'medical_hub'
    const isAviation = stationDef.category === 'aviation'

    const newStation = {
      id: newStationId,
      name: stationNameDraft?.trim() || getDefaultStationName(stationType, newStationId),
      stationType,
      department: building.department || DEFAULT_DEPARTMENT_ID,
      position: newPosition,
      level: 1,
      garageCapacity: isHub ? 6 : isSmall ? 1 : isAviation ? 2 : GARAGE_START_CAPACITY,
      responseBonus: 0,
      trainingBonus: 0,
      operationRadiusKm: isHub ? 10 : isSmall ? 1 : isAviation ? 15 : STATION_OPERATION_RADIUS_KM,
      size: stationDef.size,
      category: stationDef.category,
      shiftPreset: '24_7',
      minOnDutyDay: 1,
      minOnDutyNight: 1,
      personnelAssigned: Math.min(PERSONNEL_HIRE_COUNT, PERSONNEL_CAPACITY_START),
      personnelCapacity: PERSONNEL_CAPACITY_START,
      jailCapacity: JAIL_START_CAPACITY,
      jailCount: 0,
      detentionLog: [],
    }
    setStations((prev) => [...prev, newStation])
    setActiveStationId(newStationId)
    setNextStationId((prev) => prev + 1)
    setShowWelcome(false)
    setMoney((prev) => prev - buildCost)
    setTransactions((prev) =>
      [
        {
          id: `station-${Date.now()}`,
          label: `${building.label} construction (${newStation.name})`,
          amount: -buildCost,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 100)
    )
    setPlacingStation(false)
    setPlacingStationPosition(null)
    setShowStation(true)
    showMessage(`${building.label} built.`)
  }

  const handlePlacePrison = (latlng) => {
    if (money < PRISON_BUILD_COST) {
      showMessage('Not enough funds to build a prison.')
      setPlacingStation(false)
      setPlacingStationPosition(null)
      return
    }
    const newPosition = [latlng.lat, latlng.lng]
    const tooClose = prisons.some(
      (existing) =>
        haversineMeters(existing.position, newPosition) < STATION_MIN_DISTANCE_KM * 1000
    )
    if (tooClose) {
      showMessage(`Prisons must be ${STATION_MIN_DISTANCE_KM}km apart.`)
      setPlacingStation(false)
      setPlacingStationPosition(null)
      return
    }
    const newPrisonId = nextPrisonId
    const newPrison = {
      id: newPrisonId,
      name: prisonNameDraft?.trim() || `Prison ${newPrisonId}`,
      position: newPosition,
      capacity: PRISON_START_CAPACITY,
      count: 0,
      staffCapacity: PRISON_STAFF_CAPACITY_START,
      staffAssigned: Math.min(PRISON_STAFF_HIRE_COUNT, PRISON_STAFF_CAPACITY_START),
      detentionLog: [],
    }
    setPrisons((prev) => [...prev, newPrison])
    setActivePrisonId(newPrisonId)
    setNextPrisonId((prev) => prev + 1)
    setShowWelcome(false)
    setMoney((prev) => prev - PRISON_BUILD_COST)
    setTransactions((prev) =>
      [
        {
          id: `prison-${Date.now()}`,
          label: `Prison construction (${newPrison.name})`,
          amount: -PRISON_BUILD_COST,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 100)
    )
    setPlacingStation(false)
    setPlacingStationPosition(null)
    setShowPrison(true)
    showMessage('Prison built.')
  }

  const handleConfirmPlacement = () => {
    if (!placingStationPosition) return
    if (placingBuildingType === STATION_TYPES.prison.id) {
      handlePlacePrison({ lat: placingStationPosition[0], lng: placingStationPosition[1] })
      return
    }
    const building = getBuildingDefinition(placingBuildingType)
    if (building?.category === 'station') {
      handlePlaceStation(
        { lat: placingStationPosition[0], lng: placingStationPosition[1] },
        placingBuildingType
      )
      return
    }
    showMessage(`${getBuildingDefinition(placingBuildingType)?.label || 'Building'} is coming soon.`)
    handleCancelPlacement()
  }

  const handleBuyVehicle = (unitType = 'patrol') => {
    if (!activeStation) {
      showMessage('Place a station first.')
      return
    }
    const config = unitTypeMap[unitType] || unitTypeMap.patrol
    const capacity = activeStation.garageCapacity || GARAGE_START_CAPACITY
    const stationVehicles = vehicles.filter(
      (vehicle) => vehicle.homeStationId === activeStation.id
    )
    if (stationVehicles.length >= capacity) {
      showMessage('Garage is full. Upgrade to add more bays.')
      return
    }
    if (money < config.cost) {
      showMessage('Not enough funds to purchase a vehicle.')
      return
    }
    const crewRequired = getCrewRequirement(unitType)
    const personnelAvailable = getPersonnelAvailable(activeStation.id)
    const crewAssigned = personnelAvailable >= crewRequired ? crewRequired : 0
    const newVehicle = {
      id: nextVehicleId,
      name: `Unit ${nextVehicleId}`,
      unitType,
      department: config.department || primaryDepartmentId,
      status: VEHICLE_STATUS.available,
      position: activeStation.position,
      speedKph: config.baseSpeed,
      routeData: null,
      progressMeters: 0,
      etaSeconds: 0,
      currentSpeedKph: 0,
      assignedIncidentId: null,
      onSceneRemaining: 0,
      targetPosition: null,
      progressRatio: 0,
      routingStartedAt: null,
      parked: true,
      cooldownRemaining: 0,
      fatigue: 0,
      shiftRemaining: SHIFT_SECONDS,
      crewRequired,
      crewAssigned,
      homeStationId: activeStation.id,
    }
    setVehicles((prev) => [...prev, newVehicle])
    setNextVehicleId((prev) => prev + 1)
    setMoney((prev) => prev - config.cost)
    setTransactions((prev) =>
      [
        {
          id: `purchase-${Date.now()}`,
          label: `${config.label} unit purchase`,
          amount: -config.cost,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 100)
    )
    if (crewAssigned === 0) {
      showMessage(`${config.label} unit purchased. Hire staff to crew it.`)
    } else {
      showMessage(`${config.label} unit purchased.`)
    }
  }

  const handleGarageUpgrade = () => {
    if (!activeStation) return
    if (money < GARAGE_UPGRADE_COST) {
      showMessage('Not enough funds for garage upgrade.')
      return
    }
    setStations((prev) =>
      prev.map((item) =>
        item.id === activeStation.id
          ? {
            ...item,
            garageCapacity: (item.garageCapacity || GARAGE_START_CAPACITY) + GARAGE_UPGRADE_BONUS,
          }
          : item
      )
    )
    setMoney((prev) => prev - GARAGE_UPGRADE_COST)
    setTransactions((prev) =>
      [
        {
          id: `garage-${Date.now()}`,
          label: 'Garage expansion',
          amount: -GARAGE_UPGRADE_COST,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 100)
    )
    showMessage('Garage expanded.')
  }

  const handleHQUpgrade = () => {
    if (!activeStation) return
    if (money < HQ_UPGRADE_COST) {
      showMessage('Not enough funds for HQ upgrade.')
      return
    }
    setStations((prev) =>
      prev.map((item) =>
        item.id === activeStation.id
          ? {
            ...item,
            level: (item.level || 1) + 1,
            responseBonus: (item.responseBonus || 0) + HQ_RESPONSE_BONUS,
            operationRadiusKm:
              (item.operationRadiusKm || STATION_OPERATION_RADIUS_KM) +
              STATION_OPERATION_RADIUS_BONUS_KM,
          }
          : item
      )
    )
    setMoney((prev) => prev - HQ_UPGRADE_COST)
    setTransactions((prev) =>
      [
        {
          id: `hq-${Date.now()}`,
          label: 'HQ upgrade',
          amount: -HQ_UPGRADE_COST,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 100)
    )
    showMessage('HQ upgraded. Response bonus increased.')
  }

  const handleTrainingUpgrade = () => {
    if (!activeStation) return
    if (money < TRAINING_UPGRADE_COST) {
      showMessage('Not enough funds for training program.')
      return
    }
    setStations((prev) =>
      prev.map((item) =>
        item.id === activeStation.id
          ? {
            ...item,
            trainingBonus: clamp(
              (item.trainingBonus || 0) + TRAINING_FATIGUE_REDUCTION,
              0,
              0.4
            ),
          }
          : item
      )
    )
    setMoney((prev) => prev - TRAINING_UPGRADE_COST)
    setTransactions((prev) =>
      [
        {
          id: `training-${Date.now()}`,
          label: 'Training program upgrade',
          amount: -TRAINING_UPGRADE_COST,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 100)
    )
    showMessage('Training program updated.')
  }

  const handleKennelUpgrade = () => {
    if (!activeStation) return
    if (money < KENNEL_COST) {
      showMessage('Not enough funds for K-9 Kennel.')
      return
    }
    setStations((prev) =>
      prev.map((item) =>
        item.id === activeStation.id
          ? { ...item, hasKennel: true }
          : item
      )
    )
    setMoney((prev) => prev - KENNEL_COST)
    setTransactions((prev) =>
      [
        {
          id: `kennel-${Date.now()}`,
          label: 'K-9 Kennel construction',
          amount: -KENNEL_COST,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 100)
    )
    showMessage('K-9 Kennel constructed. K-9 units now available.')
  }

  const handleResearchTech = (tech) => {
    if (unlockedTech.includes(tech.id)) return
    if (score < tech.cost) {
      showMessage(`Insufficient Score. Need ${tech.cost} XP.`)
      return
    }
    setScore((prev) => prev - tech.cost)
    setUnlockedTech((prev) => [...prev, tech.id])
    showMessage(`${tech.label} researched!`)
  }

  const handleTransferDetention = () => {
    if (!activeStation) return
    if ((activeStation.jailCount || 0) <= 0) {
      showMessage('No detainees to transfer.')
      return
    }
    const facility = getAvailablePrisonFacility(activeStation.position)
    if (!facility) {
      showMessage('No prison capacity available.')
      return
    }
    setStations((prev) =>
      prev.map((item) =>
        item.id === activeStation.id
          ? {
            ...item,
            jailCount: Math.max(0, (item.jailCount || 0) - 1),
            detentionLog: [
              {
                id: `transfer-${Date.now()}`,
                type: 'Transfer',
                destination: 'prison',
                time: new Date().toLocaleTimeString(),
              },
              ...(item.detentionLog || []),
            ].slice(0, 50),
          }
          : item
      )
    )
    setPrisons((prev) =>
      prev.map((item) =>
        item.id === facility.id
          ? {
            ...item,
            count: Math.min(item.capacity || 0, (item.count || 0) + 1),
            detentionLog: [
              {
                id: `transfer-${Date.now()}`,
                type: 'Transfer',
                destination: 'prison',
                time: new Date().toLocaleTimeString(),
              },
              ...(item.detentionLog || []),
            ].slice(0, 50),
          }
          : item
      )
    )
    showMessage('Detainee transferred to prison.')
  }

  const handleFollowUpDecision = (accepted) => {
    if (!followUpPromptId) return
    const incidentId = followUpPromptId
    setFollowUpPromptId(null)
    if (followUpPromptTimer.current) {
      clearTimeout(followUpPromptTimer.current)
      followUpPromptTimer.current = null
    }
    if (accepted) {
      const continueIncidentPatch = (list) =>
        list.map((item) =>
          item.id !== incidentId
            ? item
            : (() => {
              const nextStage = (item.stage || 1) + 1
              const followUp = item.followUpPlan || {}
              const nextOnSceneDuration = Math.max(
                12,
                Math.round(
                  (followUp.onSceneDurationSeconds || item.onSceneDurationSeconds || ON_SCENE_SECONDS) *
                  (followUp.onSceneDurationMultiplier || 1)
                )
              )
              const nextResponseTarget = Math.max(
                30,
                Math.round(
                  (followUp.responseTargetSeconds || item.responseTargetSeconds || ON_SCENE_SECONDS) *
                  (followUp.responseTargetMultiplier || 1)
                )
              )
              const queuedFollowUps = Array.isArray(followUp.nextStages)
                ? followUp.nextStages
                : item.queuedFollowUps || []
              const queuedStageTotal = followUp.stageTotal || item.stageTotal || nextStage

              return {
                ...item,
                type: followUp.type || item.type,
                priority: followUp.priority ?? item.priority,
                requiredUnits: followUp.requiredUnits ?? item.requiredUnits,
                requiredUnitType: followUp.requiredUnitType ?? item.requiredUnitType,
                requiredDepartment: followUp.requiredDepartment || item.requiredDepartment,
                status: INCIDENT_STATUS.on_scene,
                awaitingFollowUp: false,
                followUpGenerated: true,
                followUpPlan: null,
                queuedFollowUps,
                stage: nextStage,
                stageLabel: followUp.stageLabel || 'Follow-up',
                stageTotal: Math.max(queuedStageTotal, nextStage),
                onSceneDurationSeconds: nextOnSceneDuration,
                responseTargetSeconds: nextResponseTarget,
                onSceneRemaining: nextOnSceneDuration,
                timeRemaining: nextResponseTarget,
              }
            })()
        )
      setIncidents(continueIncidentPatch)
      incidentsRef.current = continueIncidentPatch(incidentsRef.current)
      const continueVehiclePatch = (list) =>
        list.map((vehicle) =>
          vehicle.assignedIncidentId === incidentId &&
            vehicle.status === VEHICLE_STATUS.on_scene
            ? {
              ...vehicle,
              onSceneRemaining: ON_SCENE_SECONDS,
            }
            : vehicle
        )
      setVehicles(continueVehiclePatch)
      vehiclesRef.current = continueVehiclePatch(vehiclesRef.current)
      showMessage('Follow-up action started.')
      return
    }
    const now = getNow()
    const declineIncidentPatch = (list) =>
      list.map((item) =>
        item.id === incidentId
          ? {
            ...item,
            status: INCIDENT_STATUS.resolved,
            awaitingFollowUp: false,
            followUpGenerated: true,
            followUpPlan: null,
            queuedFollowUps: [],
            onSceneRemaining: 0,
            onSceneVehicleIds: [],
            resolvedAt: item.resolvedAt || now,
          }
          : item
      )
    setIncidents(declineIncidentPatch)
    incidentsRef.current = declineIncidentPatch(incidentsRef.current)
    const declineVehiclePatch = (list) =>
      list.map((vehicle) =>
        vehicle.assignedIncidentId === incidentId && vehicle.status === VEHICLE_STATUS.on_scene
          ? {
            ...vehicle,
            status: VEHICLE_STATUS.awaiting_return_route,
            assignedIncidentId: null,
            onSceneRemaining: 0,
            targetPosition: null,
            progressRatio: 0,
            routingStartedAt: null,
            parked: false,
            cooldownRemaining: 0,
            currentSpeedKph: 0,
          }
          : vehicle
      )
    setVehicles(declineVehiclePatch)
    vehiclesRef.current = declineVehiclePatch(vehiclesRef.current)
    showMessage('Follow-up declined. Unit returning to station.')
  }

  const handleDeleteStation = () => {
    if (!activeStation) return
    if (stations.length <= 1) {
      showMessage('You need at least one station.')
      return
    }
    const stationVehicles = vehicles.filter(
      (vehicle) => vehicle.homeStationId === activeStation.id
    )
    if (stationVehicles.length) {
      showMessage('Reassign or sell station vehicles first.')
      return
    }
    setStations((prev) => prev.filter((item) => item.id !== activeStation.id))
    const remaining = stations.filter((item) => item.id !== activeStation.id)
    setActiveStationId(remaining[0]?.id || null)
    setTransactions((prev) =>
      [
        {
          id: `station-delete-${Date.now()}`,
          label: `Station decommissioned (${activeStation.name})`,
          amount: 0,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 100)
    )
    showMessage('Station decommissioned.')
  }

  const handleHirePersonnel = () => {
    if (!activeStation) return
    const capacity = activeStation.personnelCapacity || PERSONNEL_CAPACITY_START
    const assigned = activeStation.personnelAssigned || 0
    if (assigned >= capacity) {
      showMessage('Personnel capacity reached.')
      return
    }
    if (money < PERSONNEL_HIRE_COST) {
      showMessage('Not enough funds to hire staff.')
      return
    }
    const hireCount = Math.min(PERSONNEL_HIRE_COUNT, capacity - assigned)
    const nextAssigned = assigned + hireCount

    // Generate individual crew members
    const newMembers = []
    for (let i = 0; i < hireCount; i++) {
      newMembers.push(generateCrewMember(activeStation.department))
    }

    setStations((prev) =>
      prev.map((item) => {
        if (item.id !== activeStation.id) return item
        const updatedMembers = [...(item.crewMembers || []), ...newMembers]
        return {
          ...item,
          personnelAssigned: nextAssigned,
          crewMembers: updatedMembers
        }
      })
    )

    // Automatically fill empty vehicle seats with the new hires
    setVehicles(prev => {
      let memberIdx = 0
      return prev.map(v => {
        if (v.homeStationId !== activeStation.id || memberIdx >= newMembers.length) return v
        const needed = v.crewRequired - (v.assignedCrewIds?.length || 0)
        if (needed <= 0) return v

        const toAssign = newMembers.slice(memberIdx, memberIdx + needed).map(m => m.id)
        memberIdx += toAssign.length

        return {
          ...v,
          assignedCrewIds: [...(v.assignedCrewIds || []), ...toAssign],
          crewAssigned: (v.assignedCrewIds?.length || 0) + toAssign.length
        }
      })
    })

    setMoney((prev) => prev - PERSONNEL_HIRE_COST)
    setTransactions((prev) =>
      [
        {
          id: `hire-${Date.now()}`,
          label: `Personnel hiring (${activeStation.name})`,
          amount: -PERSONNEL_HIRE_COST,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 100)
    )
    showMessage(`Hired ${hireCount} new personnel for ${activeStation.name}.`)
  }

  const handlePersonnelUpgrade = () => {
    if (!activeStation) return
    if (money < PERSONNEL_UPGRADE_COST) {
      showMessage('Not enough funds for staffing upgrade.')
      return
    }
    setStations((prev) =>
      prev.map((item) =>
        item.id === activeStation.id
          ? {
            ...item,
            personnelCapacity:
              (item.personnelCapacity || PERSONNEL_CAPACITY_START) + PERSONNEL_UPGRADE_BONUS,
          }
          : item
      )
    )
    setMoney((prev) => prev - PERSONNEL_UPGRADE_COST)
    setTransactions((prev) =>
      [
        {
          id: `personnel-upgrade-${Date.now()}`,
          label: 'Staffing capacity upgrade',
          amount: -PERSONNEL_UPGRADE_COST,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 100)
    )
    showMessage('Staffing capacity increased.')
  }

  const handleRenameStation = () => {
    if (!activeStation) return
    const nextName = stationNameDraft.trim()
    if (!nextName) {
      showMessage('Enter a station name.')
      return
    }
    setStations((prev) =>
      prev.map((item) => (item.id === activeStation.id ? { ...item, name: nextName } : item))
    )
    showMessage('Station renamed.')
  }

  const handleRenamePrison = () => {
    if (!activePrison) return
    const nextName = prisonNameDraft.trim()
    if (!nextName) {
      showMessage('Enter a facility name.')
      return
    }
    setPrisons((prev) =>
      prev.map((item) => (item.id === activePrison.id ? { ...item, name: nextName } : item))
    )
    showMessage('Prison facility renamed.')
  }

  const handleHirePrisonStaff = () => {
    if (!activePrison) return
    const capacity = activePrison.staffCapacity || PRISON_STAFF_CAPACITY_START
    const assigned = activePrison.staffAssigned || 0
    if (assigned >= capacity) {
      showMessage('Prison staffing is at capacity.')
      return
    }
    if (money < PRISON_STAFF_HIRE_COST) {
      showMessage('Not enough funds to hire staff.')
      return
    }
    const hireCount = Math.min(PRISON_STAFF_HIRE_COUNT, capacity - assigned)
    setPrisons((prev) =>
      prev.map((item) =>
        item.id === activePrison.id
          ? {
            ...item,
            staffAssigned: assigned + hireCount,
            staffCapacity: capacity,
          }
          : item
      )
    )
    setMoney((prev) => prev - PRISON_STAFF_HIRE_COST)
    setTransactions((prev) =>
      [
        {
          id: `prison-hire-${Date.now()}`,
          label: `Prison staffing (${activePrison.name})`,
          amount: -PRISON_STAFF_HIRE_COST,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 100)
    )
    showMessage('Prison staff hired.')
  }

  const handleUpgradePrisonStaffCapacity = () => {
    if (!activePrison) return
    if (money < PRISON_STAFF_UPGRADE_COST) {
      showMessage('Not enough funds for staffing expansion.')
      return
    }
    setPrisons((prev) =>
      prev.map((item) =>
        item.id === activePrison.id
          ? {
            ...item,
            staffCapacity:
              (item.staffCapacity || PRISON_STAFF_CAPACITY_START) + PRISON_STAFF_HIRE_COUNT,
          }
          : item
      )
    )
    setMoney((prev) => prev - PRISON_STAFF_UPGRADE_COST)
    setTransactions((prev) =>
      [
        {
          id: `prison-staff-upgrade-${Date.now()}`,
          label: `Prison staffing expansion (${activePrison.name})`,
          amount: -PRISON_STAFF_UPGRADE_COST,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 100)
    )
    showMessage('Prison staffing capacity increased.')
  }

  const handleUpgradePrisonCapacity = () => {
    if (!activePrison) return
    if (money < PRISON_CAPACITY_UPGRADE_COST) {
      showMessage('Not enough funds for facility expansion.')
      return
    }
    setPrisons((prev) =>
      prev.map((item) =>
        item.id === activePrison.id
          ? {
            ...item,
            capacity:
              (item.capacity || PRISON_START_CAPACITY) + PRISON_CAPACITY_UPGRADE_BONUS,
          }
          : item
      )
    )
    setMoney((prev) => prev - PRISON_CAPACITY_UPGRADE_COST)
    setTransactions((prev) =>
      [
        {
          id: `prison-capacity-${Date.now()}`,
          label: `Prison expansion (${activePrison.name})`,
          amount: -PRISON_CAPACITY_UPGRADE_COST,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 100)
    )
    showMessage('Prison capacity increased.')
  }

  const handleAssignCrewMember = (vehicleId, crewMemberId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId)
    if (!vehicle) return
    if (vehicle.assignedCrewIds.length >= vehicle.crewRequired) {
      showMessage('Vehicle is at maximum crew capacity.')
      return
    }

    setVehicles(prev => prev.map(v =>
      v.id === vehicleId
        ? { ...v, assignedCrewIds: [...v.assignedCrewIds, crewMemberId], crewAssigned: v.assignedCrewIds.length + 1 }
        : v
    ))

    setStations(prev => prev.map(s =>
      s.id === vehicle.homeStationId
        ? {
          ...s,
          crewMembers: s.crewMembers.map(m =>
            m.id === crewMemberId ? { ...m, assignedVehicleId: vehicleId } : m
          )
        }
        : s
    ))
    showMessage('Crew member assigned to unit.')
  }

  const handleUnassignCrewMember = (vehicleId, crewMemberId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId)
    if (!vehicle) return

    setVehicles(prev => prev.map(v =>
      v.id === vehicleId
        ? { ...v, assignedCrewIds: v.assignedCrewIds.filter(id => id !== crewMemberId), crewAssigned: v.assignedCrewIds.length - 1 }
        : v
    ))

    setStations(prev => prev.map(s =>
      s.id === vehicle.homeStationId
        ? {
          ...s,
          crewMembers: s.crewMembers.map(m =>
            m.id === crewMemberId ? { ...m, assignedVehicleId: null } : m
          )
        }
        : s
    ))
    showMessage('Crew member unassigned.')
  }

  const handleAssignCrew = (vehicleId) => {
    const vehicle = vehiclesRef.current.find((item) => item.id === vehicleId)
    if (!vehicle) return
    const station = getStationById(vehicle.homeStationId)
    if (!station) return
    const available = getPersonnelAvailable(station.id)
    const crewRequired = getCrewRequirement(vehicle.unitType)
    if (available < crewRequired) {
      showMessage('Not enough personnel to crew this unit.')
      return
    }
    setVehicles((prev) =>
      prev.map((item) =>
        item.id === vehicleId ? { ...item, crewAssigned: crewRequired } : item
      )
    )
    showMessage(`${vehicle.name} is now staffed.`)
  }

  const handleReleaseCrew = (vehicleId) => {
    const vehicle = vehiclesRef.current.find((item) => item.id === vehicleId)
    if (!vehicle) return
    setVehicles((prev) =>
      prev.map((item) => (item.id === vehicleId ? { ...item, crewAssigned: 0 } : item))
    )
    showMessage(`${vehicle.name} crew released.`)
  }

  const departmentIncidentModifiers = useDepartmentModifiers({ telemetryStats, vehicles })

  const spawnUnlocks = {
    traffic: progression.trafficUnitUnlocked,
    supervisor: progression.supervisorUnlocked,
    allowMultiUnit: resolvedCount >= MULTI_UNIT_UNLOCKED_AT,
    fire: progression.fireStationUnlocked,
    ems: progression.emsStationUnlocked,
    tow: progression.towYardUnlocked,
    public_works: progression.publicWorksUnlocked,
  }

  const { spawnIncident } = useIncidentSpawner({
    stations,
    vehicles,
    resolvedCount,
    weather,
    center: DEFAULT_CENTER,
    publicTrust,
    incidents,
    setIncidents,
    nextIncidentId,
    setNextIncidentId,
    baseIntervalMs: INCIDENT_INTERVAL_MS,
    incidentStatus: INCIDENT_STATUS,
    incidentTypes: INCIDENT_TYPES,
    incidentCatalogByDepartment: INCIDENT_TYPES_BY_DEPARTMENT,
    incidentRadiusKm: INCIDENT_RADIUS_KM,
    stationRadiusKm: STATION_OPERATION_RADIUS_KM,
    onSceneSeconds: ON_SCENE_SECONDS,
    randomPointNear,
    spawnUnlocks,
    intervalMultiplier: tuningPreset.intervalMultiplier,
    maxActiveBias: tuningPreset.maxActiveBias,
    departmentIncidentModifiers,
  })

  const handleSpawnIncident = async () => {
    const spawned = await spawnIncident()
    if (!spawned) {
      showMessage('Spawn failed. Try again or move/zoom the map area.')
    }
  }

  const handleRadioIncidentSelect = (incidentId) => {
    if (incidentId == null) return
    const incident = incidentsRef.current.find((item) => item.id === incidentId)
    if (!incident) {
      showMessage(`Incident #${incidentId} is no longer active.`)
      return
    }
    setShowIncidents(true)
    showMessage(`Linked radio alert: #${incident.id} ${incident.type}`)
  }

  const handleAlertIncidentSelect = (incidentId) => {
    handleRadioIncidentSelect(incidentId)
    setShowIncidents(true)
  }

  const handleSpawnDepartmentIncident = async (departmentId) => {
    const stationList = stationsRef.current || []
    if (!stationList.length) {
      showMessage('Place a station first.')
      return
    }
    const departmentStations = stationList.filter(
      (station) => (station.department || DEFAULT_DEPARTMENT_ID) === departmentId
    )
    const eligibleStations = departmentStations.length
      ? departmentStations
      : [activeStation || stationList[0]].filter(Boolean)
    const preferredStation = pickRandomItem(eligibleStations, null)
    const anchor = preferredStation?.position || DEFAULT_CENTER
    const radiusKm = preferredStation?.operationRadiusKm || STATION_OPERATION_RADIUS_KM

    let position = null
    let foundValid = false
    let roadName = 'Local Road'

    for (let i = 0; i < 5; i++) {
      const candidate = randomPointNear(anchor, radiusKm)
      try {
        const resp = await fetch(`https://router.project-osrm.org/nearest/v1/driving/${candidate[1]},${candidate[0]}?number=1`)
        const data = await resp.json()
        if (data.waypoints?.[0]?.distance < 60) {
          const snapped = data.waypoints[0]
          // Additional check for islands/water could go here, but for dev tool 
          // a tight road snap is usually enough to avoid mid-river spawns.
          position = [snapped.location[1], snapped.location[0]]
          roadName = snapped.name || 'Local Road'
          foundValid = true
          break
        }
      } catch {
        // ignore
      }
    }

    if (!foundValid) {
      showMessage('Failed to find land for incident. Try again.')
      return
    }

    const pool = INCIDENT_TYPES_BY_DEPARTMENT[departmentId] || INCIDENT_TYPES
    const type = pickRandomItem(pool, 'Call for service')
    const lower = type.toLowerCase()

    let requiredUnits = 1
    let requiredUnitType = null
    if (departmentId === DEPARTMENTS.fire.id) {
      requiredUnitType = 'engine'
      const isMajorFire =
        lower.includes('structure') ||
        lower.includes('industrial') ||
        lower.includes('wildland') ||
        lower.includes('hazmat')
      requiredUnits = isMajorFire ? 2 : 1
    }

    spawnIncidentAt({
      type,
      position,
      address: `${roadName}, Oromocto`,
      caller: 'Testing panel',
      priority: departmentId === DEPARTMENTS.fire.id ? 1 : 2,
      requiredUnits,
      requiredUnitType,
      requiredDepartment: departmentId,
      requiresDetention: departmentId === DEPARTMENTS.police.id ? null : false,
    })
    showMessage(
      `${DEPARTMENTS[departmentId]?.label || 'Department'} incident spawned.`
    )
  }

  const handleSpawnPoliceIncident = () =>
    handleSpawnDepartmentIncident(DEPARTMENTS.police.id)

  const handleSpawnFireIncident = () =>
    handleSpawnDepartmentIncident(DEPARTMENTS.fire.id)

  const handleSpawnEmsIncident = () =>
    handleSpawnDepartmentIncident(DEPARTMENTS.ems.id)

  const handleSpawnTowIncident = () =>
    handleSpawnDepartmentIncident(DEPARTMENTS.tow.id)

  const handleSpawnPublicWorksIncident = () =>
    handleSpawnDepartmentIncident(DEPARTMENTS.public_works.id)

  const takeIncidentId = () => {
    const current = nextIncidentIdRef.current || 1
    nextIncidentIdRef.current = current + 1
    setNextIncidentId(nextIncidentIdRef.current)
    return current
  }

  const takeCaseId = () => {
    const current = nextCaseIdRef.current || 1
    nextCaseIdRef.current = current + 1
    setNextCaseId(nextCaseIdRef.current)
    return current
  }

  const normalizeIncidentRequirements = (
    requiredUnits,
    requiredUnitType,
    requiredDepartment = DEFAULT_DEPARTMENT_ID
  ) => {
    const normalized = normalizeRequirementSet({
      requiredUnits,
      requiredUnitType,
      requiredDepartment,
    })
    let normalizedUnits = normalized.requiredUnits
    let normalizedType = normalized.requiredUnitType
    if (normalizedType === 'supervisor' && !spawnUnlocks.supervisor) {
      normalizedType = null
    }
    if (normalizedType === 'traffic' && !spawnUnlocks.traffic) {
      normalizedType = null
    }
    if (!spawnUnlocks.allowMultiUnit) {
      normalizedUnits = 1
    }
    return {
      requiredUnits: normalizedUnits,
      requiredUnitType: normalizedType,
      requiredDepartment: normalized.requiredDepartment,
    }
  }

  const buildIncidentRecord = ({
    id,
    type,
    position,
    address,
    caller,
    priority,
    requiredUnits,
    requiredUnitType,
    requiredDepartment,
    stage,
    stageLabel,
    stageTotal,
    followUpPlan,
    queuedFollowUps,
    parentIncidentId,
    caseId,
    caseScore,
    caseNotes,
    requiresDetention,
    awaitingFollowUp,
  }) => {
    const priorityValue = Number(priority) || 2
    const priorityConfig = getPriorityConfig(priorityValue)
    const requirements = normalizeIncidentRequirements(
      requiredUnits,
      requiredUnitType,
      requiredDepartment
    )
    const isFollowUpStage =
      parentIncidentId != null || (Number(stage) || 0) > 1
    const stagePlan =
      followUpPlan ||
      (isFollowUpStage
        ? null
        : getIncidentStagePlan(
          type,
          priorityValue,
          requirements.requiredDepartment,
          requirements.requiredUnits
        ))
    const safePosition = sanitizePosition(
      position,
      getDefaultStationPosition()
    )
    const departmentId = requirements.requiredDepartment || DEFAULT_DEPARTMENT_ID
    const departmentMods =
      departmentIncidentModifiers[departmentId] || departmentIncidentModifiers[DEFAULT_DEPARTMENT_ID]
    const responseTargetSeconds = Math.max(
      45,
      Math.round(priorityConfig.responseTargetSeconds * (departmentMods?.responseTargetMultiplier || 1))
    )
    const onSceneDurationSeconds = Math.max(
      12,
      Math.round(ON_SCENE_SECONDS * (departmentMods?.onSceneMultiplier || 1))
    )
    return {
      id: id ?? takeIncidentId(),
      type: type || 'Call for service',
      position: safePosition,
      address: address || 'Local Road, Oromocto',
      caller: caller || 'Radio dispatch',
      status: INCIDENT_STATUS.open,
      createdAt: getNow(),
      assignedVehicleId: null,
      assignedVehicleIds: [],
      onSceneVehicleIds: [],
      etaSeconds: 0,
      onSceneRemaining: onSceneDurationSeconds,
      priority: priorityValue,
      requiredUnits: requirements.requiredUnits,
      requiredUnitType: requirements.requiredUnitType,
      requiredDepartment: departmentId,
      responseTargetSeconds,
      rewardMultiplier: departmentMods?.rewardMultiplier || 1,
      missPenaltyMultiplier: departmentMods?.missPenaltyMultiplier || 1,
      onSceneDurationSeconds,
      dispatchedAt: null,
      arrivedAt: null,
      responseSeconds: null,
      timeRemaining: responseTargetSeconds,
      stage: Number(stage) || (stagePlan ? 1 : 1),
      stageLabel: stageLabel || stagePlan?.stageLabel || null,
      stageTotal: Number(stageTotal) || Number(stagePlan?.stageTotal) || (stagePlan ? 2 : 1),
      followUpPlan: stagePlan?.followUp || null,
      queuedFollowUps: Array.isArray(queuedFollowUps) ? queuedFollowUps : [],
      followUpGenerated: false,
      awaitingFollowUp: Boolean(awaitingFollowUp),
      parentIncidentId: parentIncidentId || null,
      caseId: caseId ?? takeCaseId(),
      caseScore: Number(caseScore) || 0,
      caseNotes: Array.isArray(caseNotes) ? caseNotes : [],
      requiresDetention:
        requiresDetention != null
          ? Boolean(requiresDetention)
          : incidentNeedsDetention({ type }),
    }
  }


  const spawnIncidentAt = (options) => {
    const record = buildIncidentRecord(options)
    setIncidents((prev) => [record, ...prev])
    setCases((prev) => ensureCaseEntry(prev, record))
  }

  const getFollowUpIncident = (incident) => {
    if (!incident) return null
    const type = incident.type.toLowerCase()
    if ((type.includes('traffic stop') || type.includes('traffic')) && randomChance(0.35)) {
      return {
        type: 'Vehicle pursuit',
        priority: 1,
        requiredUnits: 2,
        requiredUnitType: 'traffic',
        caller: 'Officer request',
      }
    }
    if ((type.includes('burglary') || type.includes('breaking')) && randomChance(0.25)) {
      return {
        type: 'Suspicious person',
        priority: 2,
        requiredUnits: 1,
        caller: 'Neighbor report',
      }
    }
    if (type.includes('domestic') && randomChance(0.2)) {
      return {
        type: 'Restraining order violation',
        priority: 2,
        requiredUnits: 1,
        caller: 'Follow-up call',
      }
    }
    if ((type.includes('stolen') || type.includes('theft')) && randomChance(0.2)) {
      return {
        type: 'Found property',
        priority: 3,
        requiredUnits: 1,
        caller: 'Recovered item',
      }
    }
    return null
  }

  const getBranchingFollowUp = (incident, grade, caseScore) => {
    if (!incident) return null
    if (incident.followUpPlan && !incident.followUpGenerated) return incident.followUpPlan
    if (Array.isArray(incident.queuedFollowUps) && incident.queuedFollowUps.length > 0) {
      const [nextStage, ...remainingStages] = incident.queuedFollowUps
      return {
        ...nextStage,
        stageTotal:
          nextStage.stageTotal ||
          incident.stageTotal ||
          Math.max((incident.stage || 1) + 1, remainingStages.length + (incident.stage || 1) + 1),
        nextStages: remainingStages,
      }
    }

    const lowered = incident.type.toLowerCase()
    const currentStage = Number(incident.stage) || 1
    const expectedStageTotal = Math.max(Number(incident.stageTotal) || 1, currentStage)
    const nextStageTotal = Math.max(expectedStageTotal, currentStage + 1)

    if ((grade === 'poor' || grade === 'late') && randomChance(0.35)) {
      return {
        type: `Complaint review: ${incident.type}`,
        priority: Math.min(3, incident.priority + 1),
        requiredUnits: 1,
        caller: 'Internal affairs',
        stageLabel: 'Review',
        stageTotal: nextStageTotal,
      }
    }
    if (incident.priority === 1 && (grade === 'poor' || caseScore < 6) && randomChance(0.4)) {
      return {
        type: `Search continuation: ${incident.type}`,
        priority: 1,
        requiredUnits: Math.max(2, incident.requiredUnits || 1),
        caller: 'Command',
        stageLabel: 'Search',
        stageTotal: nextStageTotal,
      }
    }
    if (lowered.includes('burglary') && grade !== 'excellent' && randomChance(0.25)) {
      return {
        type: 'Neighborhood canvas',
        priority: 2,
        requiredUnits: 1,
        caller: 'Detective unit',
        stageLabel: 'Investigation',
        stageTotal: nextStageTotal,
      }
    }
    const fallbackFollowUp = getFollowUpIncident(incident)
    if (!fallbackFollowUp) return null
    return {
      ...fallbackFollowUp,
      stageTotal: nextStageTotal,
    }
  }

  const spawnSpecialEvent = async () => {
    if (!activeStation) {
      showMessage('Place a station first.')
      return
    }
    if (specialEventsRef.current.length >= 3) {
      showMessage('Too many special incidents active.')
      return
    }
    const anchor = activeStation.position
    const start = randomPointNear(anchor, SPECIAL_EVENT_RADIUS_KM)
    const end = randomPointNear(anchor, SPECIAL_EVENT_RADIUS_KM + 2)
    const routeData = await buildRoute(start, end)
    const eventId = nextSpecialId
    setNextSpecialId((prev) => prev + 1)
    const specialTypes = ['Stolen vehicle', 'Suspicious vehicle', 'Fleeing suspect']
    const type = pickRandomItem(specialTypes, 'Suspicious vehicle')
    const now = getNow()
    const newEvent = {
      id: eventId,
      type,
      position: routeData.coords[0] || start,
      routeData,
      progressMeters: 0,
      speedKph: SPECIAL_EVENT_SPEED_KPH,
      createdAt: now,
      expiresAt: now + SPECIAL_EVENT_TTL_SECONDS * 1000,
    }
    setSpecialEvents((prev) => [newEvent, ...prev])
    showMessage('Special incident spotted.')
  }

  const reportSpecialEvent = (eventId) => {
    const event = specialEventsRef.current.find((item) => item.id === eventId)
    if (!event) return
    spawnIncidentAt({
      type: event.type,
      position: event.position,
      address: 'Mobile report',
      caller: 'Field report',
      priority: event.type.toLowerCase().includes('fleeing') ? 1 : 2,
      requiredUnits: event.type.toLowerCase().includes('stolen') ? 2 : 1,
    })
    setSpecialEvents((prev) => prev.filter((item) => item.id !== eventId))
    showMessage('Special incident dispatched.')
  }

  const {
    getRequiredUnits,
    getRequiredUnitType,
    getRequiredDepartment,
    canDispatchIncident,
    getVehicleIneligibilityReason,
    getEligibleVehicleIds,
    getIncidentRequirementLines,
    dispatchVehicle,
    handleQuickDispatch,
  } = useDispatchSystem({
    incidentsRef,
    vehiclesRef,
    vehicles,
    setVehicles,
    setIncidents,
    setMoney,
    setTransactions,
    showMessage,
    getStationResponseBonus,
    simSpeedRef,
    addRadioLogRef,
    weather,
    unlockedTech,
  })

  const recordTelemetryEvent = (event) => {
    if (!event) return
    const departmentId = event.departmentId || DEFAULT_DEPARTMENT_ID
    if (!TELEMETRY_DEPARTMENT_IDS.includes(departmentId)) return
    setTelemetryStats((prev) => {
      const current = prev[departmentId] || {
        resolved: 0,
        missed: 0,
        rewardTotal: 0,
        responseTotal: 0,
        responseSamples: 0,
      }
      if (event.type === 'resolved') {
        return {
          ...prev,
          [departmentId]: {
            ...current,
            resolved: current.resolved + 1,
            rewardTotal: current.rewardTotal + Math.max(0, Number(event.reward) || 0),
            responseTotal: current.responseTotal + Math.max(0, Number(event.responseSeconds) || 0),
            responseSamples: current.responseSamples + 1,
          },
        }
      }
      if (event.type === 'missed') {
        return {
          ...prev,
          [departmentId]: {
            ...current,
            missed: current.missed + 1,
          },
        }
      }
      return prev
    })
    if (event.type === 'resolved') {
      let newlyCompletedGoalIds = []
      setDailyGoals((prev) => {
        const result = applyGoalProgress({
          goals: prev,
          departmentId,
          amount: 1,
          event,
        })
        newlyCompletedGoalIds = result.newlyCompletedGoalIds || []
        return result.goals
      })
      if (newlyCompletedGoalIds.length > 0) {
        setGoalHighlightIds((prev) =>
          Array.from(new Set([...prev, ...newlyCompletedGoalIds]))
        )
        setTimeout(() => {
          setGoalHighlightIds((prev) =>
            prev.filter((id) => !newlyCompletedGoalIds.includes(id))
          )
        }, 1800)
        showMessage('Operations objective complete. Claim reward in Intel panel.')
      }
    }
  }
  const telemetryEventRef = useLatestRef(recordTelemetryEvent)


  useGameSimulation({
    vehiclesRef,
    incidentsRef,
    stationsRef,
    prisonsRef,
    specialEventsRef,
    economyTimer,
    simSpeedRef,
    publicTrust,
    setVehicles,
    setIncidents,
    setStations,
    setPrisons,
    setSpecialEvents,
    setCases,
    setMoney,
    setTotalMoneyEarned,
    setScore,
    setPublicTrust,
    setTransactions,
    setResolvedCount,
    setDebriefs,
    setFollowUpPromptId,
    showMessage,
    getStationById,
    getStationResponseBonus,
    getBranchingFollowUp,
    buildIncidentRecord,
    takeCaseId,
    incidentNeedsDetention,
    getAvailablePrisonFacility,
    getAvailableJailStation,
    rewardMultiplierRef,
    missPenaltyMultiplierRef,
    telemetryEventRef,
    addRadioLogRef,
    getDepartmentShortLabelRef,
    weather,
    unlockedTech,
  })


  useVehicleReturnLogic({
    vehicles,
    vehiclesRef,
    activeStation,
    getPrisonById,
    getStationById,
    getStationResponseBonus,
    simSpeedRef,
    setVehicles,
    addRadioLogRef,
    getDepartmentShortLabel,
    progression,
    weather,
  })

  useEffect(() => {
    const availableIdsByIncident = new Map()
    const frame = requestAnimationFrame(() => {
      setDispatchSelection((prev) => {
        let changed = false
        const next = { ...prev }
        incidents.forEach((incident) => {
          const canAssignMore =
            (incident.status === INCIDENT_STATUS.open ||
              incident.status === INCIDENT_STATUS.responding) &&
            (incident.assignedVehicleIds?.length || 0) < getRequiredUnits(incident)
          if (canAssignMore) {
            const requiredType = getRequiredUnitType(incident)
            const requiredDepartment = getRequiredDepartment(incident)
            const poolKey = `${requiredDepartment || 'police'}:${requiredType || 'any'}`
            let availableIds = availableIdsByIncident.get(poolKey)
            if (!availableIds) {
              availableIds = vehicles
                .filter(
                  (vehicle) =>
                    DISPATCHABLE_STATUSES.has(vehicle.status) &&
                    vehicle.status !== VEHICLE_STATUS.cooldown &&
                    vehicle.status !== VEHICLE_STATUS.off_shift &&
                    (vehicle.department || DEFAULT_DEPARTMENT_ID) ===
                    (requiredDepartment || DEFAULT_DEPARTMENT_ID) &&
                    (Number(vehicle.crewAssigned) || 0) >= getCrewRequirement(vehicle.unitType) &&
                    (!requiredType || vehicle.unitType === requiredType)
                )
                .map((vehicle) => vehicle.id)
              availableIdsByIncident.set(poolKey, availableIds)
            }
            if (!availableIds.length) {
              if (next[incident.id]) {
                delete next[incident.id]
                changed = true
              }
              return
            }
            if (!next[incident.id] || !availableIds.includes(next[incident.id])) {
              next[incident.id] = availableIds[0]
              changed = true
            }
          } else if (next[incident.id]) {
            delete next[incident.id]
            changed = true
          }
        })
        return changed ? next : prev
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [vehicles, incidents, getRequiredDepartment, getRequiredUnitType, getRequiredUnits])

  const handleResetLayout = () => {
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith('fr2026.windowLayout.'))
        .forEach((key) => localStorage.removeItem(key))
    } catch {
      // ignore storage issues
    }
    setUiResetKey(prev => prev + 1)
    showMessage('Tactical layout reset to default.')
  }

  useEffect(() => {
    try {
      localStorage.setItem(
        'fr2026.windowLayout.enabled',
        rememberWindowPositions ? '1' : '0'
      )
    } catch {
      // ignore storage issues
    }
  }, [rememberWindowPositions])

  const handleReset = () => {
    if (!window.confirm('You sure?')) return
    if (!window.confirm('This will permanently reset your save. Press OK again to continue.')) {
      return
    }
    localStorage.removeItem(storageKey)
    applyDefaultState({ showWelcome: true })
    showMessage('Save reset.')
  }

  useEffect(() => {
    if (!hasLoadedSave) return
    const rebuildRoute = async (vehicle, status) => {
      if (!vehicle.targetPosition) return
      pendingRebuildRoutes.current.add(vehicle.id)
      const routeData = await buildRoute(vehicle.position, vehicle.targetPosition)
      const progressRatio = Math.max(0, Math.min(1, vehicle.progressRatio || 0))
      const progressMeters = routeData.totalDistance * progressRatio
      const position = positionFromProgress(routeData, progressMeters)
      const fatigueMultiplier = clamp(1 - (vehicle.fatigue || 0) / 160, 0.6, 1)
      const responseBonus =
        stationsRef.current.find((station) => station.id === vehicle.homeStationId)
          ?.responseBonus || 0
      const travelSpeedKph = getTravelSpeedKph({
        vehicle,
        position,
        routeData,
        progressMeters,
        responseBonus,
        fatigueMultiplier,
        emergency: status === VEHICLE_STATUS.enroute,
        center: DEFAULT_CENTER,
        weather,
      })
      const speedMps = (travelSpeedKph * simSpeedRef.current * 1000) / 3600
      const remainingDistance = Math.max(0, routeData.totalDistance - progressMeters)
      const etaSeconds = speedMps > 0 ? Math.ceil(remainingDistance / speedMps) : 0

      setVehicles((prev) =>
        prev.map((item) =>
          item.id === vehicle.id
            ? {
              ...item,
              status,
              routeData,
              progressMeters,
              position,
              etaSeconds,
              currentSpeedKph: travelSpeedKph,
            }
            : item
        )
      )
      pendingRebuildRoutes.current.delete(vehicle.id)
    }

    vehicles.forEach((vehicle) => {
      if (
        (vehicle.status === VEHICLE_STATUS.enroute || vehicle.status === VEHICLE_STATUS.returning) &&
        vehicle.targetPosition &&
        !vehicle.routeData &&
        !pendingRebuildRoutes.current.has(vehicle.id)
      ) {
        rebuildRoute(vehicle, vehicle.status)
      }
    })
  }, [vehicles, hasLoadedSave, weather])

  const getSelectedId = useCallback(
    (incident) => {
      if (!incident) return ''
      const selected = dispatchSelection[incident.id]
      if (selected) return selected
      const eligible = Array.from(getEligibleVehicleIds(incident))[0]
      return eligible ?? ''
    },
    [dispatchSelection, getEligibleVehicleIds]
  )
  const {
    baseIncidents,
    mapIncidents,
    listIncidents,
  } = useIncidentViewModel({
    incidents,
    vehicles,
    incidentFilters,
    primaryDepartmentId,
    defaultDepartmentId: DEFAULT_DEPARTMENT_ID,
    incidentStatus: INCIDENT_STATUS,
  })
  const handleToggleSimSpeed = () => {
    const nextIndex = (simSpeedIndex + 1) % SIM_SPEED_OPTIONS.length
    const nextMultiplier = SIM_SPEED_OPTIONS[nextIndex]
    simSpeedRef.current = nextMultiplier
    setSimSpeedIndex(nextIndex)
  }
  const activeStationVehicles = activeStation
    ? vehicles.filter((vehicle) => vehicle.homeStationId === activeStation.id)
    : vehicles
  const parkedCount = activeStationVehicles.filter((vehicle) => vehicle.parked).length
  const stationSummary = (() => {
    if (!activeStation) return null
    const stationVehicles = vehicles.filter(
      (vehicle) => vehicle.homeStationId === activeStation.id
    )
    const statusCounts = stationVehicles.reduce((acc, vehicle) => {
      const status = vehicle.status || VEHICLE_STATUS.available
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})
    const departmentId = activeStation.department || DEFAULT_DEPARTMENT_ID
    const departmentCoverageStations = stations.filter(
      (station) => (station.department || DEFAULT_DEPARTMENT_ID) === departmentId
    )
    const nearbyIncidents = baseIncidents.filter((incident) => {
      return departmentCoverageStations.some((station) => {
        const radiusKm = station.operationRadiusKm || STATION_OPERATION_RADIUS_KM
        const distanceKm = haversineMeters(incident.position, station.position) / 1000
        return distanceKm <= radiusKm
      })
    })
    return {
      statusCounts,
      nearbyIncidents: nearbyIncidents.length,
    }
  })()
  const departmentCoverageOverlays = useMemo(() => {
    const groups = stations.reduce((acc, station) => {
      const departmentId = station.department || DEFAULT_DEPARTMENT_ID
      if (!acc[departmentId]) acc[departmentId] = []
      acc[departmentId].push(station)
      return acc
    }, {})
    return Object.entries(groups)
      .map(([departmentId, departmentStations]) => {
        if (!departmentStations.length) return null
        const center = [
          departmentStations.reduce((sum, station) => sum + station.position[0], 0) /
          departmentStations.length,
          departmentStations.reduce((sum, station) => sum + station.position[1], 0) /
          departmentStations.length,
        ]
        const radiusMeters = Math.max(
          ...departmentStations.map((station) => {
            const stationRadiusMeters =
              (station.operationRadiusKm || STATION_OPERATION_RADIUS_KM) * 1000
            return haversineMeters(center, station.position) + stationRadiusMeters
          })
        )
        return {
          departmentId,
          center,
          radiusMeters,
        }
      })
      .filter(Boolean)
  }, [stations])
  const { budgetSummary, prisonSummary, activeCase, level, activeIncidentCount } =
    useDashboardMetrics({
      vehicles,
      stations,
      prisons,
      cases,
      selectedCaseId,
      score,
      levelScoreStep: LEVEL_SCORE_STEP,
      incidents,
      incidentStatus: INCIDENT_STATUS,
      vehicleStatus: VEHICLE_STATUS,
      unitTypeUpkeepPerMin: UNIT_TYPE_UPKEEP_PER_MIN,
      personnelUpkeepPerMin: PERSONNEL_UPKEEP_PER_MIN,
      stationUpkeepPerMin: STATION_UPKEEP_PER_MIN,
      overtimeUpkeepPerMin: OVERTIME_UPKEEP_PER_MIN,
    })
  const telemetrySnapshot = useMemo(
    () =>
      TELEMETRY_DEPARTMENT_IDS.map((departmentId) => {
        const metrics = telemetryStats[departmentId] || {}
        const resolved = Number(metrics.resolved) || 0
        const missed = Number(metrics.missed) || 0
        const totalHandled = resolved + missed
        const avgResponse =
          (Number(metrics.responseSamples) || 0) > 0
            ? Math.round((Number(metrics.responseTotal) || 0) / Number(metrics.responseSamples))
            : 0
        const unitTotal = vehicles.filter(
          (vehicle) => (vehicle.department || DEFAULT_DEPARTMENT_ID) === departmentId
        ).length
        const unitActive = vehicles.filter(
          (vehicle) =>
            (vehicle.department || DEFAULT_DEPARTMENT_ID) === departmentId &&
            (vehicle.status === VEHICLE_STATUS.enroute || vehicle.status === VEHICLE_STATUS.on_scene)
        ).length
        const openIncidents = incidents.filter(
          (incident) =>
            (incident.requiredDepartment || DEFAULT_DEPARTMENT_ID) === departmentId &&
            (incident.status === INCIDENT_STATUS.open ||
              incident.status === INCIDENT_STATUS.responding ||
              incident.status === INCIDENT_STATUS.on_scene)
        ).length
        return {
          departmentId,
          label: DEPARTMENTS[departmentId]?.label || departmentId.toUpperCase(),
          avgResponse,
          missRate: totalHandled > 0 ? Math.round((missed / totalHandled) * 100) : 0,
          utilization: unitTotal > 0 ? Math.round((unitActive / unitTotal) * 100) : 0,
          resolved,
          openIncidents,
          rewardTotal: Number(metrics.rewardTotal) || 0,
        }
      }),
    [incidents, telemetryStats, vehicles]
  )
  const tickSnapshot = useMemo(
    () =>
      createTickSnapshot({
        simSpeed: simSpeedMultiplier,
        stations,
        vehicles,
        incidents,
        prisons,
        goals: dailyGoals,
      }),
    [dailyGoals, incidents, prisons, simSpeedMultiplier, stations, vehicles]
  )
  const handleStartPlaceStation = () => {
    setShowWelcome(false)
    setStationNameDraft(`Station ${nextStationId}`)
    setPlacingBuildingType(STATION_TYPES.police_station.id)
    setPlacingStation(true)
    setPlacingStationPosition(null)
    setShowBuildMenu(false)
  }
  const handleFocusMyDepartment = () =>
    setIncidentFilters((prev) => ({
      ...prev,
      department: primaryDepartmentId,
      onlyActiveDepartment: true,
      type: 'all',
    }))
  const { alertsQueue, nextAction } = useCommandHints({
    baseIncidents,
    listIncidents,
    vehicles,
    stations,
    activeStation,
    primaryDepartmentId,
    departments: DEPARTMENTS,
    defaultDepartmentId: DEFAULT_DEPARTMENT_ID,
    personnelCapacityStart: PERSONNEL_CAPACITY_START,
    incidentStatus: INCIDENT_STATUS,
    showIncidents,
    activeIncidentCount,
    getRequiredUnits,
    getEligibleVehicleIds,
    canDispatchIncident,
    getRequiredDepartment,
    getRequiredUnitType,
    handleQuickDispatch,
    onOpenStation: () => setShowStation(true),
    onShowIncidents: () => setShowIncidents(true),
    onFocusMyDepartment: handleFocusMyDepartment,
    onStartPlaceStation: handleStartPlaceStation,
    onToggleBuildMenu: handleToggleBuildMenu,
  })
  const { getIncidentPriorityVisual, getIncidentRingMetrics, getRouteClass } =
    useMapPresentation({
      priorityFilters: incidentFilters.priority,
      getFocusFactor,
      incidentStatus: INCIDENT_STATUS,
      onSceneSeconds: ON_SCENE_SECONDS,
      vehicleStatus: VEHICLE_STATUS,
      defaultDepartmentId: DEFAULT_DEPARTMENT_ID,
      isFocusEnabled,
      mapZoom,
    })
  useEffect(() => {
    if (!debriefs.length) return
    const interval = setInterval(() => {
      setDebriefs((prev) => prev.filter((item) => Date.now() - item.createdAt < 180000))
    }, 15000)
    return () => clearInterval(interval)
  }, [debriefs.length])

  useRadioSystem({
    stations,
    vehicles,
    addRadioLog,
    getDepartmentShortLabel,
    formatSeconds
  })

  useEffect(() => {
    const interval = setInterval(() => {
      const today = getMissionDayKey()
      if (today === missionDayKey) return
      const completedGoals = dailyGoals.filter((goal) => goal.completed || goal.claimed).length
      const allGoalsCompleted = dailyGoals.length > 0 && completedGoals === dailyGoals.length

      if (allGoalsCompleted) {
        const nextSuccessfulDays = (operationsStreak.successfulDays || 0) + 1
        const nextBestStreak = Math.max(operationsStreak.bestStreak || 0, nextSuccessfulDays)
        const streakBonus = 250 + nextSuccessfulDays * 100
        const streakTrust = Math.min(5, 1 + Math.floor(nextSuccessfulDays / 2))
        setMoney((prev) => prev + streakBonus)
        setTotalMoneyEarned((prev) => prev + streakBonus)
        setPublicTrust((prev) => clamp(prev + streakTrust, 0, 100))
        setTransactions((prev) =>
          [
            {
              id: `streak-bonus-${Date.now()}`,
              label: `Operations streak day ${nextSuccessfulDays}`,
              amount: streakBonus,
              time: new Date().toLocaleTimeString(),
            },
            ...prev,
          ].slice(0, 100)
        )
        setOperationsStreak({
          successfulDays: nextSuccessfulDays,
          bestStreak: nextBestStreak,
          lastEvaluatedDay: missionDayKey,
        })
        showMessage(`Contract streak day ${nextSuccessfulDays} (+$${streakBonus})`)
      } else {
        const missedGoals = dailyGoals.length - completedGoals
        const trustPenalty =
          operationsStreak.successfulDays > 0 ? Math.min(4, Math.ceil(missedGoals / 3)) : 0
        if (trustPenalty > 0) {
          setPublicTrust((prev) => clamp(prev - trustPenalty, 0, 100))
        }
        setOperationsStreak((prev) => ({
          successfulDays: 0,
          bestStreak: prev.bestStreak || 0,
          lastEvaluatedDay: missionDayKey,
        }))
        if (trustPenalty > 0) {
          showMessage(`Contract streak broken (-${trustPenalty} trust)`)
        } else {
          showMessage('New daily operations goals available.')
        }
      }

      setMissionDayKey(today)
      setDailyGoals(
        createDailyGoals(
          today,
          allGoalsCompleted ? (operationsStreak.successfulDays || 0) + 1 : 0
        )
      )
      setGoalHighlightIds([])
      setGoalDismissingIds([])
    }, 60000)
    return () => clearInterval(interval)
  }, [dailyGoals, missionDayKey, operationsStreak])

  const visibleDailyGoals = dailyGoals.filter((goal) => !goal.claimed)
  const handleClaimGoal = (goalId) => {
    const goal = dailyGoals.find((item) => item.id === goalId)
    if (!goal || !goal.completed || goal.claimed) return
    if (goalDismissingIds.includes(goalId)) return
    const streakMultiplier =
      goal.category === 'contract'
        ? 1 + Math.min(0.5, (operationsStreak.successfulDays || 0) * 0.05)
        : 1
    const rewardPayout = Math.round(goal.reward * streakMultiplier)
    const trustPayout =
      goal.category === 'contract' && (operationsStreak.successfulDays || 0) > 0
        ? goal.trustBonus + 1
        : goal.trustBonus
    setGoalDismissingIds((prev) => [...prev, goalId])
    setMoney((prev) => prev + rewardPayout)
    setTotalMoneyEarned((prev) => prev + rewardPayout)
    setPublicTrust((prev) => clamp(prev + trustPayout, 0, 100))
    setTransactions((prev) =>
      [
        {
          id: `goal-reward-${Date.now()}-${goalId}`,
          label: `Daily quota claimed: ${goal.title}`,
          amount: rewardPayout,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 100)
    )
    showMessage(`${goal.title} claimed (+$${rewardPayout}, +${trustPayout} trust)`)
    setTimeout(() => {
      setDailyGoals((prev) =>
        prev.map((item) =>
          item.id === goalId
            ? {
              ...item,
              claimed: true,
            }
            : item
        )
      )
      setGoalDismissingIds((prev) => prev.filter((id) => id !== goalId))
      setGoalHighlightIds((prev) => prev.filter((id) => id !== goalId))
    }, 380)
  }

  return (
    <div className="app">
      <Topbar
        money={money}
        activeIncidentCount={activeIncidentCount}
        publicTrust={publicTrust}
        score={score}
        level={level}
        parkedCount={parkedCount}
        totalVehicles={activeStation?.garageCapacity || activeStationVehicles.length}
        station={activeStation}
        hasStations={stations.length > 0}
        saveSlot={saveSlot}
        setSaveSlot={setSaveSlot}
        saveSlotCount={SAVE_SLOT_COUNT}
        onStartPlaceStation={handleStartPlaceStation}
        placingStation={placingStation}
        onCancelPlacement={handleCancelPlacement}
        onToggleCases={() => setShowCases((prev) => !prev)}
        showBuildMenu={showBuildMenu}
        onToggleBuildMenu={handleToggleBuildMenu}
        buildOptions={buildOptions}
        placingBuildingType={placingBuildingType}
        onChangeBuildingType={setPlacingBuildingType}
        onStartBuildingPlacement={handleStartBuildingPlacement}
        onCancelBuildMenu={() => setShowBuildMenu(false)}
        selectedBuildOption={selectedBuildOption}
        onMutualAid={handleMutualAid}
        onResetLayout={handleResetLayout}
        onOpenFunds={() => setShowLedger(true)}
        playerName={playerName}
        playerCallsign={playerCallsign}
        playerTitle={playerTitle}
        playerAvatar={playerAvatar}
        missionDayKey={missionDayKey}
        weatherSummary={currentWeatherSummary}
        weatherNextUpdateLabel={weatherNextUpdateLabel}
        operationsPhase={operationsPhase}
        onEditProfile={() => setShowProfile(true)}
      />

      <main className="map-shell">
        {showProfile && (
          <Window
            id="profile"
            title="OPERATOR PROFILE"
            initialPos={{ x: window.innerWidth / 2 - 200, y: 200 }}
            initialSize={{ width: 400, height: 450 }}
            onClose={() => setShowProfile(false)}
            resetKey={uiResetKey}
          >
            <div className="cmd-content">
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div className="avatar avatar--citizen" style={{ width: '80px', height: '80px' }}>
                    <img src={playerAvatar} alt="Profile" />
                  </div>
                  <div style={{ flex: 1, display: 'grid', gap: '8px' }}>
                    <label className="label" style={{ fontSize: '0.6rem' }}>BIOMETRIC UPLINK</label>
                    <select
                      className="cmd-select"
                      value={AVATAR_OPTIONS.find(a => a.path === playerAvatar)?.id || 'dispatch'}
                      onChange={(e) => setPlayerAvatar(AVATAR_OPTIONS.find(a => a.id === e.target.value).path)}
                    >
                      {AVATAR_OPTIONS.map(a => (
                        <option key={a.id} value={a.id}>{a.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'grid', gap: '4px' }}>
                    <label className="label" style={{ fontSize: '0.6rem' }}>RANK / TITLE</label>
                    <select
                      className="cmd-select"
                      value={playerTitle}
                      onChange={(e) => setPlayerTitle(e.target.value)}
                    >
                      {TITLES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gap: '4px' }}>
                    <label className="label" style={{ fontSize: '0.6rem' }}>OPERATOR NAME</label>
                    <input
                      className="cmd-select"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '4px' }}>
                  <label className="label" style={{ fontSize: '0.6rem' }}>TACTICAL CALLSIGN</label>
                  <input
                    className="cmd-select"
                    value={playerCallsign}
                    onChange={(e) => setPlayerCallsign(e.target.value)}
                  />
                </div>

                <div className="module-card">
                  <h3 className="module-card__title">CAREER MILESTONES</h3>
                  <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        className="hud-logo"
                        style={{
                          fontSize: '0.8rem',
                          padding: '4px',
                          borderColor: totalMoneyEarned > 10000 ? 'var(--color-tow)' : 'var(--color-police)',
                          color: totalMoneyEarned > 10000 ? 'var(--color-tow)' : 'var(--color-police)'
                        }}
                      >
                        {totalMoneyEarned > 50000 ? 'GEN' : totalMoneyEarned > 25000 ? 'COL' : totalMoneyEarned > 10000 ? 'MAJ' : 'CPT'}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 'bold' }}>
                          {totalMoneyEarned > 50000 ? 'COMMAND GENERAL' : totalMoneyEarned > 25000 ? 'COLONEL' : totalMoneyEarned > 10000 ? 'MAJOR' : 'CAPTAIN'}
                        </p>
                        <p className="muted" style={{ margin: 0, fontSize: '0.6rem' }}>CURRENT OPERATIONAL RANK</p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: '4px', marginTop: '8px', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="muted">Total Career Earnings</span>
                        <span style={{ color: 'var(--color-success)' }}>${totalMoneyEarned.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="muted">Field Incidents Resolved</span>
                        <span>{resolvedCount}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button className="cmd-btn cmd-btn--primary" onClick={() => setShowProfile(false)}>
                  SAVE CREDENTIALS
                </button>
              </div>
            </div>
          </Window>
        )}
        {showRadio && (
          <Window
            id="radio"
            title="RADIO TRAFFIC"
            initialPos={{ x: window.innerWidth - 340, y: window.innerHeight - 300 }}
            initialSize={{ width: 320, height: 280 }}
            onClose={() => setShowRadio(false)}
            resetKey={uiResetKey}
          >
            <RadioFeed logs={radioLogs} onIncidentSelect={handleRadioIncidentSelect} />
          </Window>
        )}

        {showTestPanel && (
          <Window
            id="test-tools"
            title="FIELD TOOLS"
            initialPos={{ x: window.innerWidth - 340, y: 96 }}
            initialSize={{ width: 320, height: 350 }}
            onClose={() => setShowTestPanel(false)}
            resetKey={uiResetKey}
          >
            <div className="test-panel__meta">
              <label className="muted">
                Balance Profile
                <select
                  className="cmd-select"
                  value={tuningPresetId}
                  onChange={(event) => setTuningPresetId(event.target.value)}
                >
                  {Object.entries(TUNING_PRESETS).map(([id, preset]) => (
                    <option key={id} value={id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className={`cmd-btn ${showTelemetry ? 'cmd-btn--primary' : ''}`}
                onClick={() => setShowTelemetry((prev) => !prev)}
              >
                {showTelemetry ? 'Hide Intel' : 'Show Intel'}
              </button>
            </div>
            <div className="test-panel__actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
              <button className="cmd-btn" onClick={handleToggleSimSpeed}>
                Sim x{simSpeedMultiplier}
              </button>
              <button
                className="cmd-btn"
                onClick={() => setMoney((prev) => prev + 1000)}
              >
                +$1000
              </button>
              <button
                className="cmd-btn"
                onClick={handleSpawnIncident}
                disabled={!stations.length}
              >
                Spawn Incident
              </button>
              <button
                className="cmd-btn"
                onClick={handleSpawnPoliceIncident}
                disabled={!stations.length}
              >
                Spawn Police
              </button>
              <button
                className="cmd-btn"
                onClick={handleSpawnFireIncident}
                disabled={!stations.length}
              >
                Spawn Fire
              </button>
              <button
                className="cmd-btn"
                onClick={handleSpawnEmsIncident}
                disabled={!stations.length}
              >
                Spawn EMS
              </button>
              <button
                className="cmd-btn"
                onClick={handleSpawnTowIncident}
                disabled={!stations.length}
              >
                Spawn Tow
              </button>
              <button
                className="cmd-btn"
                onClick={handleSpawnPublicWorksIncident}
                disabled={!stations.length}
              >
                Spawn PW
              </button>
              <button
                className="cmd-btn"
                onClick={spawnSpecialEvent}
                disabled={!stations.length}
              >
                Special
              </button>
              <button className="cmd-btn cmd-btn--ghost cmd-btn--small" onClick={handleResetLayout}>
                RESET UI
              </button>
              <button className="cmd-btn cmd-btn--urgent" onClick={handleReset}>
                Reset Save
              </button>
            </div>
          </Window>
        )}

        {!showTestPanel && (
          <button className="cmd-btn test-panel-toggle" onClick={() => setShowTestPanel(true)}>
            TEST TOOLS
          </button>
        )}

        {showTelemetry && (
          <Window
            id="intel"
            title="OPERATIONS INTEL"
            initialPos={{ x: window.innerWidth - 720, y: window.innerHeight - 420 }}
            initialSize={{ width: 360, height: 400 }}
            onClose={() => setShowTelemetry(false)}
            resetKey={uiResetKey}
          >
            <div className="telemetry-grid">
              <p className="eyebrow">Daily Quotas ({missionDayKey})</p>
              <p className="muted">Operations streak: {operationsStreak.successfulDays} day(s)</p>
              {visibleDailyGoals.length === 0 && (
                <div className="telemetry-row telemetry-row--goal telemetry-row--goal-done">
                  <p className="telemetry-row__title">All daily quotas claimed</p>
                  <p className="muted">Great shift. New quotas roll over daily.</p>
                </div>
              )}
              {visibleDailyGoals.map((goal) => {
                const isReady = goal.completed && !goal.claimed
                const isHighlight = goalHighlightIds.includes(goal.id)
                const isDismissing = goalDismissingIds.includes(goal.id)
                return (
                  <div
                    key={goal.id}
                    className={`telemetry-row telemetry-row--goal ${isReady ? 'telemetry-row--goal-ready' : ''} ${isHighlight ? 'telemetry-row--goal-highlight' : ''
                      } ${isDismissing ? 'telemetry-row--goal-dismiss' : ''}`}
                  >
                    <p className="telemetry-row__title">{goal.title}</p>
                    <p className="muted">
                      {goal.progress}/{goal.target} - Reward ${goal.reward} - Trust +{goal.trustBonus}
                    </p>
                    <div className="telemetry-goal__actions">
                      <span className="muted">{isReady ? 'Ready to claim' : 'In progress'}</span>
                      {isReady && (
                        <button className="cmd-btn cmd-btn--primary cmd-btn--small" onClick={() => handleClaimGoal(goal.id)}>
                          Claim
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="telemetry-grid" style={{ marginTop: '16px' }}>
              <div className="telemetry-row">
                <p className="telemetry-row__title">Tick Snapshot</p>
                <p className="muted">
                  Digest {tickSnapshot.digest} - Sim x{tickSnapshot.simSpeed}
                </p>
                <p className="muted">
                  S:{tickSnapshot.stations.length} V:{tickSnapshot.vehicles.length} I:
                  {tickSnapshot.incidents.length} P:{tickSnapshot.prisons.length}
                </p>
              </div>
              {telemetrySnapshot.map((item) => (
                <div key={`telemetry-${item.departmentId}`} className="telemetry-row">
                  <p className="telemetry-row__title">{item.label}</p>
                  <p className="muted">
                    Avg response {formatSeconds(item.avgResponse)} - Miss {item.missRate}% - Util{' '}
                    {item.utilization}%
                  </p>
                  <p className="muted">
                    Open {item.openIncidents} - Resolved {item.resolved} - Revenue $
                    {Math.round(item.rewardTotal)}
                  </p>
                </div>
              ))}
            </div>
          </Window>
        )}
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={13}
          className={`map ${placingStation ? 'map--placing' : ''}`}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Regional Infrastructure - Condition-based Visibility */}
          {progression.emsStationUnlocked && (
            <Marker position={HOSPITAL_POS} icon={emsStationIcon}>
              <Tooltip permanent direction="top" offset={[0, -8]} className="station-badge ems-badge">
                <div className="station-badge__name">REGIONAL HOSPITAL</div>
                <div className="station-badge__meta">LEVEL 1 TRAUMA CENTER</div>
              </Tooltip>
            </Marker>
          )}

          {progression.towYardUnlocked && (
            <Marker position={IMPOUND_POS} icon={towYardIcon}>
              <Tooltip permanent direction="top" offset={[0, -8]} className="station-badge tow-badge">
                <div className="station-badge__name">REGIONAL IMPOUND</div>
                <div className="station-badge__meta">LOGISTICS & RECOVERY</div>
              </Tooltip>
            </Marker>
          )}

          <MapClickHandler
            active={placingStation}
            onMapClick={handleMapClick}
          />
          <MapZoomTracker onZoomChange={setMapZoom} />

          {placingStation && placingStationPosition && (
            <Marker position={placingStationPosition} icon={placementIcon} />
          )}

          {mapLayers.coverage &&
            departmentCoverageOverlays.map((coverage) => {
              const style = DEPARTMENT_COVERAGE_STYLE[coverage.departmentId] || {
                color: 'rgba(148, 163, 184, 0.52)',
                fillColor: 'rgba(148, 163, 184, 0.18)',
              }
              return (
                <Circle
                  key={`coverage-dept-${coverage.departmentId}`}
                  center={coverage.center}
                  radius={coverage.radiusMeters}
                  pathOptions={{
                    color: style.color,
                    weight: 1.2,
                    fillColor: style.fillColor,
                    fillOpacity: 0.1,
                  }}
                />
              )
            })}


          {stations.map((stationItem) => {
            const stationVehicles = vehicles.filter(
              (vehicle) => vehicle.homeStationId === stationItem.id
            )
            const parkedAtStation = stationVehicles.filter((vehicle) => vehicle.parked).length
            const stationMapIcon =
              stationItem.stationType === STATION_TYPES.fire_station.id
                ? fireStationIcon
                : stationItem.stationType === STATION_TYPES.ems_station.id
                  ? emsStationIcon
                  : stationItem.stationType === STATION_TYPES.tow_yard.id
                    ? towYardIcon
                    : stationItem.department === 'public_works'
                      ? pwDepotIcon
                      : stationIcon
            return (
              <Marker
                key={`station-${stationItem.id}`}
                position={stationItem.position}
                icon={stationMapIcon}
                eventHandlers={{
                  click: () => {
                    setActiveStationId(stationItem.id)
                    setShowStation(true)
                  },
                }}
              >
                <Tooltip
                  permanent
                  direction="top"
                  offset={[0, -8]}
                  className={`station-badge ${getDepartmentColorClass(stationItem.department)}`}
                >
                  <div className="station-badge__name">{stationItem.name}</div>
                  <div className="station-badge__meta">
                    Garage {parkedAtStation}/{stationItem.garageCapacity || GARAGE_START_CAPACITY}
                  </div>
                </Tooltip>
                <Popup>
                  <strong>{stationItem.name}</strong>
                  <div>
                    {DEPARTMENTS[stationItem.department || DEFAULT_DEPARTMENT_ID]?.label || 'Station'}{' '}
                    operations hub.
                  </div>
                </Popup>
              </Marker>
            )
          })}

          {prisons.map((facility) => (
            <Marker
              key={`prison-${facility.id}`}
              position={facility.position}
              icon={prisonIcon}
              eventHandlers={{
                click: () => {
                  setActivePrisonId(facility.id)
                  setShowPrison(true)
                },
              }}
            >
              <Tooltip
                permanent
                direction="top"
                offset={[0, -8]}
                className="station-badge prison-badge"
              >
                <div className="station-badge__name">{facility.name}</div>
                <div className="station-badge__meta">
                  Inmates {facility.count || 0}/{facility.capacity || 0}
                </div>
              </Tooltip>
              <Popup>
                <strong>{facility.name}</strong>
                <div>Detention facility.</div>
              </Popup>
            </Marker>
          ))}

          {specialEvents.map((event) => (
            <Marker
              key={`special-${event.id}`}
              position={event.position}
              icon={specialEventIcon}
            >
              <Tooltip
                permanent
                direction="top"
                offset={[0, -8]}
                className="special-label"
              >
                {event.type}
              </Tooltip>
              <Popup>
                <div className="incident-popup">
                  <strong>{event.type}</strong>
                  <div className="incident-popup__meta">
                    <span>Spotted vehicle</span>
                    <span>Moving</span>
                  </div>
                  <div className="incident-popup__detail">
                    <span>Action</span>
                    <span>Report and dispatch</span>
                  </div>
                </div>
                <div className="popup-controls">
                  <button
                    className="btn btn--small"
                    onClick={() => reportSpecialEvent(event.id)}
                  >
                    Report &amp; Dispatch
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          <IncidentHalos
            incidents={mapIncidents}
            incidentStatus={INCIDENT_STATUS}
            getIncidentPriorityVisual={getIncidentPriorityVisual}
            getIncidentRingMetrics={getIncidentRingMetrics}
            getDepartmentId={getDepartmentId}
          />
          <IncidentRings
            incidents={mapIncidents}
            incidentStatus={INCIDENT_STATUS}
            getIncidentPriorityVisual={getIncidentPriorityVisual}
            getIncidentRingMetrics={getIncidentRingMetrics}
            getDepartmentId={getDepartmentId}
          />
          <IncidentMarkers
            incidents={mapIncidents}
            vehicles={vehicles}
            getIncidentPriorityVisual={getIncidentPriorityVisual}
            getIncidentIcon={getIncidentIcon}
            getDepartmentId={getDepartmentId}
            getPriorityConfig={getPriorityConfig}
            getEligibleVehicleIds={getEligibleVehicleIds}
            canDispatchIncident={canDispatchIncident}
            getIncidentRequirementLines={getIncidentRequirementLines}
            getRequiredUnits={getRequiredUnits}
            handleQuickDispatch={handleQuickDispatch}
            getSelectedId={getSelectedId}
            setDispatchSelection={setDispatchSelection}
            getVehicleIneligibilityReason={getVehicleIneligibilityReason}
            getUnitDisplayLabel={getUnitDisplayLabel}
            dispatchVehicle={dispatchVehicle}
          />

          {vehicles
            .filter((vehicle) => !vehicle.parked && vehicle.status !== VEHICLE_STATUS.on_scene)
            .map((vehicle) => {
              const hasDetainee =
                vehicle.returnDestinationType === 'prison' ||
                vehicle.returnDestinationType === 'jail'
              return (
                <Marker
                  key={vehicle.id}
                  position={vehicle.position}
                  icon={getVehicleIcon(
                    vehicle.status,
                    vehicle.unitType || 'patrol',
                    vehicle.department,
                    hasDetainee
                  )}
                >
                  <Tooltip
                    permanent
                    direction="bottom"
                    offset={[0, 12]}
                    className={`vehicle-label vehicle-label--${vehicle.status} ${getDepartmentColorClass(
                      vehicle.department
                    )}`}
                  >
                    {vehicle.name} | {getUnitDisplayLabel(vehicle)} | {vehicle.status.replaceAll('_', ' ')}
                    {hasDetainee && <span className="vehicle-label__detainee">Detainee</span>}
                  </Tooltip>
                  <Popup>
                    <strong>{vehicle.name}</strong>
                    <div>Status: {vehicle.status.replaceAll('_', ' ')}</div>
                    {hasDetainee && <div>Transporting detainee</div>}
                    {(vehicle.status === VEHICLE_STATUS.enroute ||
                      vehicle.status === VEHICLE_STATUS.returning) && (
                        <div>
                          ETA {formatSeconds(Math.min(vehicle.etaSeconds || 0, ETA_LABEL_LIMIT))}
                        </div>
                      )}
                    {vehicle.currentSpeedKph ? (
                      <div>Speed {Math.round(vehicle.currentSpeedKph)} km/h</div>
                    ) : null}
                  </Popup>
                </Marker>
              )
            })}

          <VehicleRoutes
            vehicles={vehicles}
            vehicleStatus={VEHICLE_STATUS}
            getRouteClass={getRouteClass}
          />
        </MapContainer>

        {statusMessage && <div className="toast">{statusMessage}</div>}

        {showNextSteps && nextAction && !showBuildMenu && !placingStation && dismissedActionId !== nextAction.id && (
          <aside className="cmd-panel command-hint">
            <div className="cmd-header">
              <h2 className="cmd-header__title">RECOMMENDED ACTION</h2>
              <button className="cmd-btn cmd-btn--ghost cmd-btn--small" onClick={() => setDismissedActionId(nextAction.id)}>
                X
              </button>
            </div>
            <div className="cmd-content">
              <p className="title">{nextAction.title}</p>
              <p className="muted">{nextAction.detail}</p>
              {nextAction.actionLabel && nextAction.onAction && (
                <button className="cmd-btn cmd-btn--primary cmd-btn--small" style={{ marginTop: '8px' }} onClick={nextAction.onAction}>
                  {nextAction.actionLabel}
                </button>
              )}
            </div>
          </aside>
        )}

        {placingStation && !placingStationPosition && (
          <div className="placement-bar placement-bar--top">
            <div className="hud-section">
              <div className="hud-logo" style={{ borderColor: 'var(--color-police)', color: 'var(--color-police)' }}>GPS</div>
              <div className="hud-info">
                <h1>PLACE {placingBuildingLabel.toUpperCase()}</h1>
                <p className="subhead">Select coordinates on the tactical grid</p>
              </div>
            </div>
            <div className="placement-bar__actions">
              <button className="cmd-btn" onClick={handleCancelPlacement}>
                CANCEL
              </button>
            </div>
          </div>
        )}

        {placingStation && placingStationPosition && (
          <div className="placement-bar placement-bar--top">
            <div className="hud-section">
              <div className="hud-logo" style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)' }}>FIX</div>
              <div className="hud-info">
                <h1>CONFIRM LOCATION</h1>
                <p className="subhead">Verify site suitability for {placingBuildingLabel.toLowerCase()}</p>
              </div>
            </div>
            <div className="placement-bar__actions">
              <button className="cmd-btn" onClick={handleCancelPlacement}>
                RE-SELECT
              </button>
              <button className="cmd-btn cmd-btn--primary" onClick={handleConfirmPlacement}>
                INITIALIZE CONSTRUCTION
              </button>
            </div>
          </div>
        )}


        {showIncidents && (
          <Window
            id="incidents"
            title="ACTIVE INCIDENTS"
            initialPos={{ x: 16, y: 96 }}
            initialSize={{ width: 340, height: 600 }}
            onClose={() => setShowIncidents(false)}
            resetKey={uiResetKey}
          >
            <IncidentsPanel
              incidents={listIncidents}
              getSelectedId={getSelectedId}
              setDispatchSelection={setDispatchSelection}
              dispatchVehicle={dispatchVehicle}
              vehicles={vehicles}
              formatSeconds={formatSeconds}
              getEligibleVehicleIds={getEligibleVehicleIds}
              filters={incidentFilters}
              setFilters={setIncidentFilters}
              getVehicleIneligibilityReason={getVehicleIneligibilityReason}
              onQuickDispatch={handleQuickDispatch}
              getIncidentEdgePercent={getIncidentCrewEdgePercent}
            />
          </Window>
        )}

        {showLayers && (
          <Window
            id="layers"
            title="MAP LAYERS"
            initialPos={{ x: window.innerWidth - 580, y: 96 }}
            initialSize={{ width: 220, height: 180 }}
            onClose={() => setShowLayers(false)}
            resetKey={uiResetKey}
          >
            <label className="layer-toggle">
              <input
                type="checkbox"
                checked={mapLayers.coverage}
                onChange={() =>
                  setMapLayers((prev) => ({ ...prev, coverage: !prev.coverage }))
                }
              />
              <span>Station coverage radius</span>
            </label>
            <label className="layer-toggle">
              <input
                type="checkbox"
                checked={focusMode}
                onChange={() => setFocusMode((prev) => !prev)}
              />
              <span>
                Focus active department <kbd className="key-hint">F</kbd>
              </span>
            </label>
            {isFocusEnabled && (
              <p className="layers-panel__hint">
                Focus: {DEPARTMENTS[focusDepartmentId]?.label || 'Department'}
              </p>
            )}
          </Window>
        )}

        {showCases && (
          <Window
            id="cases"
            title="ARCHIVED CASE FILES"
            initialPos={{ x: window.innerWidth / 2 - 300, y: 150 }}
            initialSize={{ width: 600, height: 500 }}
            onClose={() => setShowCases(false)}
            resetKey={uiResetKey}
          >
            <CasesPanel
              cases={cases}
              activeCase={activeCase}
              onSelectCase={setSelectedCaseId}
              onClose={() => setShowCases(false)}
            />
          </Window>
        )}

        {showAlerts && (
          <Window
            id="alerts"
            title="ALERTS QUEUE"
            initialPos={{ x: window.innerWidth - 336, y: 160 }}
            initialSize={{ width: 320, height: 400 }}
            onClose={() => setShowAlerts(false)}
            resetKey={uiResetKey}
          >
            <div className="cmd-content">
              {alertsQueue.length === 0 ? (
                <div className="alerts__item alerts__item--empty">
                  <div>
                    <p className="title">No active alerts</p>
                    <p className="muted">
                      Live triage queue for urgent, unassigned, or blocked calls. It fills as
                      conditions change.
                    </p>
                  </div>
                </div>
              ) : (
                alertsQueue.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="alerts__item alerts__item--button"
                    onClick={() => handleAlertIncidentSelect(item.incident.id)}
                    title={`Open incident #${item.incident.id}`}
                  >
                    <span className={`priority-tag priority-tag--${item.incident.priority}`}>
                      P{item.incident.priority}
                    </span>
                    <div>
                      <p className="title">{item.incident.type}</p>
                      <p className="muted">{item.reasons.join(' · ')}</p>
                      {item.timeRemaining != null && (
                        <p className="muted">
                          {item.incident.status === INCIDENT_STATUS.open
                            ? `T-MINUS ${formatSeconds(item.timeRemaining)}`
                            : `ETA ${formatSeconds(item.timeRemaining)}`}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </Window>
        )}

        {showSettings && (
          <Window
            id="settings"
            title="SETTINGS"
            initialPos={{ x: window.innerWidth - 520, y: window.innerHeight - 320 }}
            initialSize={{ width: 320, height: 240 }}
            onClose={() => setShowSettings(false)}
            resetKey={uiResetKey}
          >
            <div className="settings-panel">
              <p className="eyebrow">Interface</p>
              <label className="settings-row">
                <span>
                  <strong>Show Next Steps</strong>
                  <small>Toggle the Recommended Action panel.</small>
                </span>
                <input
                  type="checkbox"
                  checked={showNextSteps}
                  onChange={(event) => setShowNextSteps(event.target.checked)}
                />
              </label>
              <label className="settings-row">
                <span>
                  <strong>Remember Window Positions</strong>
                  <small>Save menu/window positions and minimized state.</small>
                </span>
                <input
                  type="checkbox"
                  checked={rememberWindowPositions}
                  onChange={(event) => setRememberWindowPositions(event.target.checked)}
                />
              </label>
              <p className="muted settings-note">
                More game settings can be added here over time.
              </p>
            </div>
          </Window>
        )}

        {showLedger && (
          <Window
            id="ledger"
            title="FINANCIAL AUDIT"
            initialPos={{ x: window.innerWidth / 2 - 300, y: 150 }}
            initialSize={{ width: 600, height: 500 }}
            onClose={() => setShowLedger(false)}
            resetKey={uiResetKey}
          >
            <CashLedger
              transactions={transactions}
              budgetSummary={budgetSummary}
            />
          </Window>
        )}

        {showResearch && (
          <Window
            id="research"
            title="DEPARTMENT RESEARCH LAB"
            initialPos={{ x: window.innerWidth / 2 - 250, y: 120 }}
            initialSize={{ width: 500, height: 450 }}
            onClose={() => setShowResearch(false)}
            resetKey={uiResetKey}
          >
            <div className="cmd-content">
              <p className="muted" style={{ marginBottom: '12px' }}>Spend earned Score (XP) to modernize your operations.</p>
              <div style={{ display: 'grid', gap: '12px' }}>
                {RESEARCH_CATALOG.map((tech) => {
                  const isUnlocked = unlockedTech.includes(tech.id)
                  const canAfford = score >= tech.cost
                  return (
                    <div key={tech.id} className="module-card" style={{ borderLeft: `3px solid ${isUnlocked ? 'var(--color-success)' : 'var(--color-police)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ margin: 0, color: '#fff' }}>{tech.label.toUpperCase()}</h4>
                          <p className="muted" style={{ fontSize: '0.7rem', marginTop: '4px' }}>{tech.detail}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {isUnlocked ? (
                            <span className="status-badge status-badge--safe">UNLOCKED</span>
                          ) : (
                            <button
                              className={`cmd-btn ${canAfford ? 'cmd-btn--primary' : ''}`}
                              onClick={() => handleResearchTech(tech)}
                              disabled={!canAfford}
                            >
                              {tech.cost} XP
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Window>
        )}

        {showStation && activeStation && (
          <Window
            id="station"
            title={`COMMAND: ${activeStation.name.toUpperCase()}`}
            initialPos={{ x: window.innerWidth / 2 - 400, y: 100 }}
            initialSize={{ width: 800, height: 650 }}
            onClose={() => setShowStation(false)}
            resetKey={uiResetKey}
          >
            <StationPanel
              stationPanelTab={stationPanelTab}
              setStationPanelTab={setStationPanelTab}
              station={activeStation}
              stations={stations}
              activeStationId={activeStationId}
              setActiveStationId={setActiveStationId}
              handleBuyVehicle={handleBuyVehicle}
              handleGarageUpgrade={handleGarageUpgrade}
              handleHQUpgrade={handleHQUpgrade}
              vehicles={activeStationVehicles}
              formatSeconds={formatSeconds}
              vehicleStatus={VEHICLE_STATUS}
              progression={progression}
              unitTypes={unitTypeMap}
              availableUnits={departmentUnitCatalog.filter((unit) => {
                const unlocked = isUnitUnlocked(unit, progression)
                if (unit.id === 'k9' && !activeStation?.hasKennel) return false
                return unlocked
              })}
              garageUpgradeCost={GARAGE_UPGRADE_COST}
              hqUpgradeCost={HQ_UPGRADE_COST}
              trainingUpgradeCost={TRAINING_UPGRADE_COST}
              kennelUpgradeCost={KENNEL_COST}
              onKennelUpgrade={handleKennelUpgrade}
              stationNameDraft={stationNameDraft}
              setStationNameDraft={setStationNameDraft}
              onRenameStation={handleRenameStation}
              personnelAssigned={activeStation?.personnelAssigned || 0}
              personnelCapacity={activeStation?.personnelCapacity || PERSONNEL_CAPACITY_START}
              onHirePersonnel={handleHirePersonnel}
              onUpgradePersonnel={handlePersonnelUpgrade}
              personnelHireCost={PERSONNEL_HIRE_COST}
              personnelUpgradeCost={PERSONNEL_UPGRADE_COST}
              onAssignCrew={handleAssignCrew}
              onReleaseCrew={handleReleaseCrew}
              onTrainingUpgrade={handleTrainingUpgrade}
              onTransferDetention={handleTransferDetention}
              onDeleteStation={handleDeleteStation}
              stationSummary={stationSummary}
              prisonSummary={prisonSummary}
              onUnassignCrewMember={handleUnassignCrewMember}
              onAssignCrewMember={handleAssignCrewMember}
            />
          </Window>
        )}

        {showPrison && activePrison && (
          <Window
            id="prison"
            title={`FACILITY: ${activePrison.name.toUpperCase()}`}
            initialPos={{ x: window.innerWidth / 2 - 250, y: 150 }}
            initialSize={{ width: 500, height: 400 }}
            onClose={() => setShowPrison(false)}
            resetKey={uiResetKey}
          >
            <PrisonPanel
              prison={activePrison}
              prisons={prisons}
              activePrisonId={activePrisonId}
              setActivePrisonId={setActivePrisonId}
              prisonNameDraft={prisonNameDraft}
              setPrisonNameDraft={setPrisonNameDraft}
              onRenamePrison={handleRenamePrison}
              onHireStaff={handleHirePrisonStaff}
              onUpgradeStaffCapacity={handleUpgradePrisonStaffCapacity}
              onUpgradeCapacity={handleUpgradePrisonCapacity}
              staffHireCost={PRISON_STAFF_HIRE_COST}
              staffUpgradeCost={PRISON_STAFF_UPGRADE_COST}
              capacityUpgradeCost={PRISON_CAPACITY_UPGRADE_COST}
            />
          </Window>
        )}

        {followUpPromptId && (
          <div className="modal" onClick={() => handleFollowUpDecision(false)}>
            <div className="modal__card" onClick={(event) => event.stopPropagation()}>
              <div className="panel">
                <div className="panel__header">
                  <div>
                    <p className="eyebrow">Follow-up Stage</p>
                    <p className="title">Continue with next step?</p>
                  </div>
                </div>
                <div className="station-card">
                  <p className="station-card__title">
                    {
                      incidents.find((item) => item.id === followUpPromptId)?.type ||
                      'Incident'
                    }
                  </p>
                  <p className="muted">
                    {incidents.find((item) => item.id === followUpPromptId)?.followUpPlan
                      ?.stageLabel || 'Follow-up'}
                  </p>
                </div>
                <div className="station-action-row">
                  <button
                    className="btn btn--ghost"
                    onClick={() => handleFollowUpDecision(false)}
                  >
                    Resolve & Return
                  </button>
                  <button className="btn" onClick={() => handleFollowUpDecision(true)}>
                    Continue
                  </button>
                </div>
              </div>
              <button
                className="btn btn--ghost modal__close"
                onClick={() => handleFollowUpDecision(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {debriefs.length > 0 && (
          <aside className={`debriefs ${showTelemetry ? 'debriefs--shifted' : ''}`}>
            <div className="debriefs__title">After Action</div>
            {debriefs.map((item) => (
              <div key={item.id} className="debriefs__card">
                <div>
                  <p className="debriefs__name">
                    {getPriorityConfig(item.priority).label} {item.type}
                    {item.caseId ? ` · Case #${item.caseId}` : ''}
                  </p>
                  <p className="muted">
                    {item.grade ? item.grade.toUpperCase() : 'COMPLETED'} · Response{' '}
                    {formatSeconds(item.responseSeconds || 0)}
                  </p>
                </div>
                <div className="debriefs__meta">
                  <span className="debriefs__reward">+${item.reward}</span>
                  {item.evidenceDelta != null && (
                    <span className="debriefs__evidence">+{item.evidenceDelta} evidence</span>
                  )}
                  <span className={item.trustDelta >= 0 ? 'debriefs__trust up' : 'debriefs__trust'}>
                    {item.trustDelta >= 0 ? `+${item.trustDelta}` : item.trustDelta} trust
                  </span>
                </div>
              </div>
            ))}
          </aside>
        )}

        {!stations.length && (
          <div className="map-overlay">
            <p>Click "Place Station" then click the map to place your HQ.</p>
          </div>
        )}

        {showWelcome && !stations.length && (
          <WelcomeMessage
            onStart={(name, callsign) => {
              audio.init() // Initialize audio context on first user interaction
              setPlayerName(name)
              setPlayerCallsign(callsign)
              setShowWelcome(false)
              setStationNameDraft(`Station ${nextStationId}`)
              setPlacingBuildingType(STATION_TYPES.police_station.id)
              setPlacingStation(true)
              setPlacingStationPosition(null)
            }}
          />
        )}

        <div className="taskbar">
          <button
            className={`taskbar-item ${showAlerts ? 'taskbar-item--active' : ''} ${alertsQueue.length > 0 ? 'taskbar-item--urgent' : ''}`}
            onClick={() => setShowAlerts(!showAlerts)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            <span className="taskbar-item__tooltip">ALERTS {alertsQueue.length > 0 ? `(${alertsQueue.length})` : ''}</span>
          </button>

          <button
            className={`taskbar-item ${showLayers ? 'taskbar-item--active' : ''}`}
            onClick={() => setShowLayers(!showLayers)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
            <span className="taskbar-item__tooltip">LAYERS</span>
          </button>

          <button
            className={`taskbar-item ${showRadio ? 'taskbar-item--active' : ''}`}
            onClick={() => setShowRadio(!showRadio)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" /><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" /><circle cx="12" cy="12" r="2" /><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" /><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1" /></svg>
            <span className="taskbar-item__tooltip">RADIO</span>
          </button>

          <button
            className={`taskbar-item ${showIncidents ? 'taskbar-item--active' : ''}`}
            onClick={() => setShowIncidents(!showIncidents)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
            <span className="taskbar-item__tooltip">INCIDENTS</span>
          </button>

          <button
            className={`taskbar-item ${showResearch ? 'taskbar-item--active' : ''}`}
            onClick={() => setShowResearch(!showResearch)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v12" /><path d="M18 3v12" /><path d="M3 21h18" /><path d="M6 15a6 6 0 0 0 12 0" /><path d="M10 7h4" /><path d="M12 3v4" /></svg>
            <span className="taskbar-item__tooltip">RESEARCH</span>
          </button>

          <button
            className={`taskbar-item ${showTestPanel ? 'taskbar-item--active' : ''}`}
            onClick={() => setShowTestPanel(!showTestPanel)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
            <span className="taskbar-item__tooltip">TOOLS</span>
          </button>

          <button
            className={`taskbar-item ${showTelemetry ? 'taskbar-item--active' : ''}`}
            onClick={() => setShowTelemetry(!showTelemetry)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M7 14l3-3 3 2 4-5" />
              <circle cx="7" cy="14" r="1" />
              <circle cx="10" cy="11" r="1" />
              <circle cx="13" cy="13" r="1" />
              <circle cx="17" cy="8" r="1" />
            </svg>
            <span className="taskbar-item__tooltip">INTEL</span>
          </button>

          <button
            className={`taskbar-item ${showSettings ? 'taskbar-item--active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6z" />
            </svg>
            <span className="taskbar-item__tooltip">SETTINGS</span>
          </button>

          <button
            className={`taskbar-item ${showLedger ? 'taskbar-item--active' : ''}`}
            onClick={() => setShowLedger(!showLedger)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M7 3v6" />
              <path d="M17 3v6" />
              <path d="M4 10h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
              <path d="M8 14h8" />
              <path d="M8 18h5" />
            </svg>
            <span className="taskbar-item__tooltip">FUNDS</span>
          </button>
        </div>

        <RegionalTicker
          trust={publicTrust}
          resolvedCount={resolvedCount}
          lastResolveType={debriefs[0]?.type}
        />
      </main>
    </div>
  )
}

export default App

