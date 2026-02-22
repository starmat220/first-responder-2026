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
  STATION_MIN_DISTANCE_KM,
  STATION_OPERATION_RADIUS_BONUS_KM,
  STATION_OPERATION_RADIUS_KM,
  STATION_UPKEEP_PER_MIN,
  STORAGE_KEY,
  TRAINING_FATIGUE_REDUCTION,
  TRAINING_UPGRADE_COST,
  UNIT_TYPE_UPKEEP_PER_MIN,
  UPKEEP_PER_VEHICLE,
  VEHICLE_COST,
  VEHICLE_STATUS,
  VALID_INCIDENT_STATUSES,
  VALID_VEHICLE_STATUSES,
} from './game/constants'
import { clamp, formatSeconds } from './game/utils'
import { haversineMeters, randomPointNear, sanitizePosition } from './game/geo'
import { buildRoute, positionFromProgress } from './game/routes'
import { getTravelSpeedKph } from './game/speed'
import { autoAssignCrew, autoAssignCrewForStations, getCrewRequirement } from './game/crew'
import { ensureCaseEntry } from './game/cases'
import { DEFAULT_DEPARTMENT_ID, DEPARTMENTS, STATION_TYPES } from './game/departments'
import {
  getUnitById,
  getUnitsByDepartment,
  isUnitUnlocked,
  toUnitTypeMap,
} from './game/catalog'
import { normalizeRequirementSet } from './game/requirements'
import { createDailyGoals, getMissionDayKey, applyGoalProgress } from './game/missions'
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
import './App.css'


const getIncidentStagePlan = (type, priority) => {
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
}

const TELEMETRY_DEPARTMENT_IDS = [
  DEPARTMENTS.police.id,
  DEPARTMENTS.fire.id,
  DEPARTMENTS.ems.id,
  DEPARTMENTS.tow.id,
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

const MapClickHandler = ({ active, onMapClick }) => {
  useMapEvents({
    click: (event) => {
      if (active) onMapClick(event.latlng)
    },
  })
  return null
}

function App() {
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
  const [isCompactDock, setIsCompactDock] = useState(false)
  const [showLedger, setShowLedger] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [stationNameDraft, setStationNameDraft] = useState('')
  const [prisonNameDraft, setPrisonNameDraft] = useState('')
  const [simSpeedIndex, setSimSpeedIndex] = useState(0)
  const [showLayers, setShowLayers] = useState(false)
  const [showCases, setShowCases] = useState(false)
  const [showTelemetry, setShowTelemetry] = useState(false)
  const [showTestPanel, setShowTestPanel] = useState(true)
  const [tuningPresetId, setTuningPresetId] = useState(DEFAULT_TUNING_PRESET_ID)
  const [mapLayers, setMapLayers] = useState({
    coverage: true,
  })
  const [cases, setCases] = useState([])
  const [selectedCaseId, setSelectedCaseId] = useState(null)
  const [followUpPromptId, setFollowUpPromptId] = useState(null)
  const [telemetryStats, setTelemetryStats] = useState(createDepartmentTelemetry)
  const [missionDayKey, setMissionDayKey] = useState(getMissionDayKey())
  const [dailyGoals, setDailyGoals] = useState(() => createDailyGoals(getMissionDayKey()))
  const [goalHighlightIds, setGoalHighlightIds] = useState([])
  const [goalDismissingIds, setGoalDismissingIds] = useState([])
  const followUpPromptTimer = useRef(null)
  const [incidentFilters, setIncidentFilters] = useState({
    type: 'all',
    department: 'all',
    onlyActiveDepartment: false,
    priority: { 1: true, 2: true, 3: true },
  })
  const storageKey = `${STORAGE_KEY}.slot${saveSlot}`
  const simSpeedMultiplier = SIM_SPEED_OPTIONS[simSpeedIndex] || 1
  const tuningPreset = getTuningPreset(tuningPresetId)

  const vehiclesRef = useLatestRef(vehicles)
  const incidentsRef = useLatestRef(incidents)
  const stationsRef = useLatestRef(stations)
  const specialEventsRef = useLatestRef(specialEvents)
  const prisonsRef = useLatestRef(prisons)
  const nextIncidentIdRef = useLatestRef(nextIncidentId)
  const nextCaseIdRef = useLatestRef(nextCaseId)
  const rewardMultiplierRef = useLatestRef(tuningPreset.rewardMultiplier)
  const missPenaltyMultiplierRef = useLatestRef(tuningPreset.missPenaltyMultiplier)
  const pendingReturnRoutes = useRef(new Set())
  const pendingRebuildRoutes = useRef(new Set())
  const economyTimer = useRef(0)
  const simSpeedRef = useRef(simSpeedMultiplier)

  useEffect(() => {
    simSpeedRef.current = simSpeedMultiplier
  }, [simSpeedMultiplier])

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
  const departmentUnitCatalog = useMemo(
    () => getUnitsByDepartment(primaryDepartmentId),
    [primaryDepartmentId]
  )
  const unitTypeMap = useMemo(
    () => toUnitTypeMap(primaryDepartmentId),
    [primaryDepartmentId]
  )
  const activePrison =
    prisons.find((item) => item.id === activePrisonId) || prisons[0] || null

  useEffect(() => {
    if (activeStation?.name) {
      setStationNameDraft(activeStation.name)
    }
  }, [activeStation?.name])
  useEffect(() => {
    if (activePrison?.name) {
      setPrisonNameDraft(activePrison.name)
    }
  }, [activePrison?.name])
  useEffect(() => {
    if (
      stationPanelTab === 'detention' &&
      activeStation &&
      activeStation.department !== DEFAULT_DEPARTMENT_ID
    ) {
      setStationPanelTab('overview')
    }
  }, [activeStation, stationPanelTab])

  useEffect(() => {
    const updateCompact = () => {
      setIsCompactDock(window.innerHeight < 820)
    }
    updateCompact()
    window.addEventListener('resize', updateCompact)
    return () => window.removeEventListener('resize', updateCompact)
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
    setDailyGoals(createDailyGoals(nextMissionDayKey))
    economyTimer.current = 0
  }

  useEffect(() => {
    setHasLoadedSave(false)
    const raw = localStorage.getItem(storageKey)
    if (!raw) {
      applyDefaultState({ showWelcome: true })
      setHasLoadedSave(true)
      return
    }
    try {
      const data = JSON.parse(raw)
      const rawStations = Array.isArray(data.stations)
        ? data.stations
        : data.station
        ? [data.station]
        : []
      const inferStationTypeAndDepartment = (stationItem, stationId) => {
        const stationTypeValues = Object.values(STATION_TYPES).map((item) => item.id)
        const savedStationType = stationItem?.stationType
        const savedDepartment = stationItem?.department
        const stationName = String(stationItem?.name || '').toLowerCase()
        const vehiclesForStation = Array.isArray(data.vehicles)
          ? data.vehicles.filter(
              (vehicle) =>
                Number(vehicle.homeStationId || vehicle.stationId) === Number(stationId)
            )
          : []
        const hasUnitType = (unitType) =>
          vehiclesForStation.some((vehicle) => String(vehicle.unitType || '') === unitType)

        let stationType = stationTypeValues.includes(savedStationType)
          ? savedStationType
          : STATION_TYPES.police_station.id
        let department = savedDepartment || DEFAULT_DEPARTMENT_ID

        if (!savedStationType || savedStationType === STATION_TYPES.police_station.id) {
          if (stationName.includes('fire') || savedDepartment === DEPARTMENTS.fire.id || hasUnitType('engine')) {
            stationType = STATION_TYPES.fire_station.id
            department = DEPARTMENTS.fire.id
          } else if (
            stationName.includes('ems') ||
            stationName.includes('medical') ||
            savedDepartment === DEPARTMENTS.ems.id ||
            hasUnitType('ambulance')
          ) {
            stationType = STATION_TYPES.ems_station.id
            department = DEPARTMENTS.ems.id
          } else if (
            stationName.includes('tow') ||
            savedDepartment === DEPARTMENTS.tow.id ||
            hasUnitType('tow_truck')
          ) {
            stationType = STATION_TYPES.tow_yard.id
            department = DEPARTMENTS.tow.id
          }
        }

        return { stationType, department }
      }
      const safeStations = rawStations
        .map((stationItem, index) => {
          if (!stationItem?.position) return null
          const capacity =
            Number(stationItem.personnelCapacity) || PERSONNEL_CAPACITY_START
          const assignedRaw = Number(stationItem.personnelAssigned)
          const assigned = Number.isFinite(assignedRaw)
            ? assignedRaw
            : Math.min(PERSONNEL_HIRE_COUNT, capacity)
          const jailCapacity =
            Number(stationItem.jailCapacity) || JAIL_START_CAPACITY
          const jailCount = Math.max(0, Number(stationItem.jailCount) || 0)
          const detentionLog = Array.isArray(stationItem.detentionLog)
            ? stationItem.detentionLog
            : []
          const id = Number(stationItem.id) || index + 1
          const level = Number(stationItem.level) || 1
          const operationRadiusKm =
            Number(stationItem.operationRadiusKm) ||
            STATION_OPERATION_RADIUS_KM +
              Math.max(0, level - 1) * STATION_OPERATION_RADIUS_BONUS_KM
          const normalizedStation = inferStationTypeAndDepartment(stationItem, id)
          return {
            id,
            name: stationItem.name || `Station ${id}`,
            stationType: normalizedStation.stationType,
            department: normalizedStation.department,
            position: sanitizePosition(stationItem.position, DEFAULT_CENTER),
            level,
            garageCapacity: Number(stationItem.garageCapacity) || GARAGE_START_CAPACITY,
            responseBonus: Number(stationItem.responseBonus) || 0,
            trainingBonus: Number(stationItem.trainingBonus) || 0,
            operationRadiusKm,
            shiftPreset: stationItem.shiftPreset || '24_7',
            minOnDutyDay: Number(stationItem.minOnDutyDay) || 1,
            minOnDutyNight: Number(stationItem.minOnDutyNight) || 1,
            personnelAssigned: clamp(assigned, 0, capacity),
            personnelCapacity: capacity,
            jailCapacity,
            jailCount: Math.min(jailCount, jailCapacity),
            detentionLog,
          }
        })
        .filter(Boolean)
      const primaryStation = safeStations[0] || null

      const safeVehicles = Array.isArray(data.vehicles)
        ? data.vehicles
            .map((vehicle) => {
              const id = Number(vehicle.id)
              if (!Number.isFinite(id) || id <= 0) return null
              const savedStatus = VALID_VEHICLE_STATUSES.has(vehicle.status)
                ? vehicle.status
                : VEHICLE_STATUS.available
              const normalizedSavedStatus =
                savedStatus === VEHICLE_STATUS.routing ? VEHICLE_STATUS.available : savedStatus
              const fallbackPosition = primaryStation ? primaryStation.position : DEFAULT_CENTER
              const safeTarget = vehicle.targetPosition
                ? sanitizePosition(vehicle.targetPosition, fallbackPosition)
                : null
              const normalizedStatus =
                (normalizedSavedStatus === VEHICLE_STATUS.enroute ||
                  normalizedSavedStatus === VEHICLE_STATUS.returning) &&
                !safeTarget
                  ? VEHICLE_STATUS.available
                  : normalizedSavedStatus
              const unitType = vehicle.unitType || 'patrol'
              const unitConfig = getUnitById(unitType)
              const crewRequired = Number(vehicle.crewRequired) || getCrewRequirement(unitType)
              const crewAssignedRaw = Number(vehicle.crewAssigned)
              const crewAssigned = Number.isFinite(crewAssignedRaw) ? crewAssignedRaw : 0
              const homeStationId =
                Number(vehicle.homeStationId) ||
                Number(vehicle.stationId) ||
                primaryStation?.id ||
                1
              return {
                id,
                name: vehicle.name || `Unit ${id}`,
                unitType,
                department: vehicle.department || unitConfig?.department || DEFAULT_DEPARTMENT_ID,
                status: normalizedStatus,
                position: sanitizePosition(
                  vehicle.position,
                  fallbackPosition
                ),
                speedKph:
                  Number(vehicle.speedKph) ||
                  getUnitById(unitType)?.baseSpeed ||
                  DEFAULT_SPEED_KPH,
                routeData: null,
                progressMeters: 0,
                etaSeconds: 0,
                currentSpeedKph: Number(vehicle.currentSpeedKph) || 0,
                assignedIncidentId: Number(vehicle.assignedIncidentId) || null,
                onSceneRemaining: Number(vehicle.onSceneRemaining) || 0,
                targetPosition: safeTarget,
                progressRatio: Number(vehicle.progressRatio) || 0,
                routingStartedAt: Number(vehicle.routingStartedAt) || null,
                parked:
                  typeof vehicle.parked === 'boolean'
                    ? vehicle.parked
                    : normalizedStatus === VEHICLE_STATUS.available && !!primaryStation,
                cooldownRemaining: Number(vehicle.cooldownRemaining) || 0,
                fatigue: Number(vehicle.fatigue) || 0,
                shiftRemaining:
                  Number.isFinite(vehicle.shiftRemaining)
                    ? Number(vehicle.shiftRemaining)
                    : SHIFT_SECONDS,
                crewRequired,
                crewAssigned,
                homeStationId,
                returnDestinationType: vehicle.returnDestinationType || null,
                returnDestinationId: Number(vehicle.returnDestinationId) || null,
                returnIncidentType: vehicle.returnIncidentType || null,
              }
            })
            .filter(Boolean)
        : []

      const safeIncidents = Array.isArray(data.incidents)
        ? data.incidents
            .map((incident) => {
              const id = Number(incident.id)
              if (!Number.isFinite(id) || id <= 0) return null
              const status = VALID_INCIDENT_STATUSES.has(incident.status)
                ? incident.status
                : INCIDENT_STATUS.open
              const priority = Number(incident.priority) || 2
              return {
                id,
                type: incident.type || 'Call for service',
                position: sanitizePosition(
                  incident.position,
                  primaryStation ? primaryStation.position : DEFAULT_CENTER
                ),
                address: incident.address || 'Local Road, Oromocto',
                caller: incident.caller || 'Unknown caller',
                status,
                createdAt: incident.createdAt || Date.now(),
                assignedVehicleId: Number(incident.assignedVehicleId) || null,
                assignedVehicleIds: Array.isArray(incident.assignedVehicleIds)
                  ? incident.assignedVehicleIds
                  : [],
                onSceneVehicleIds: Array.isArray(incident.onSceneVehicleIds)
                  ? incident.onSceneVehicleIds
                  : [],
                etaSeconds: Number(incident.etaSeconds) || 0,
                onSceneRemaining: Number(incident.onSceneRemaining) || ON_SCENE_SECONDS,
                priority,
                requiredUnits: Number(incident.requiredUnits) || 1,
                requiredUnitType: incident.requiredUnitType || null,
                requiredDepartment: incident.requiredDepartment || DEFAULT_DEPARTMENT_ID,
                responseTargetSeconds:
                  Number(incident.responseTargetSeconds) ||
                  getPriorityConfig(priority).responseTargetSeconds,
                rewardMultiplier: Number(incident.rewardMultiplier) || 1,
                missPenaltyMultiplier: Number(incident.missPenaltyMultiplier) || 1,
                onSceneDurationSeconds:
                  Number(incident.onSceneDurationSeconds) || ON_SCENE_SECONDS,
                dispatchedAt: Number(incident.dispatchedAt) || null,
                arrivedAt: Number(incident.arrivedAt) || null,
                responseSeconds: Number(incident.responseSeconds) || null,
                timeRemaining: Number(incident.timeRemaining) || null,
                stage: Number(incident.stage) || 1,
                stageLabel: incident.stageLabel || null,
                stageTotal: Number(incident.stageTotal) || 1,
                followUpPlan: incident.followUpPlan || null,
                followUpGenerated: Boolean(incident.followUpGenerated),
                awaitingFollowUp: Boolean(incident.awaitingFollowUp),
                parentIncidentId: Number(incident.parentIncidentId) || null,
                caseId: Number(incident.caseId) || id,
                caseScore: Number(incident.caseScore) || 0,
                caseNotes: Array.isArray(incident.caseNotes) ? incident.caseNotes : [],
                requiresDetention:
                  incident.requiresDetention != null
                    ? Boolean(incident.requiresDetention)
                    : incidentNeedsDetention(incident),
              }
            })
            .filter(Boolean)
        : []
      const safeCases = Array.isArray(data.cases) ? data.cases : []
      const safePrisons = Array.isArray(data.prisons)
        ? data.prisons
            .map((prisonItem, index) => {
              if (!prisonItem?.position) return null
              const id = Number(prisonItem.id) || index + 1
              const capacity =
                Number(prisonItem.capacity) || PRISON_START_CAPACITY
              const count = Math.max(0, Number(prisonItem.count) || 0)
              const staffCapacity =
                Number(prisonItem.staffCapacity) || PRISON_STAFF_CAPACITY_START
              const staffAssigned = Math.max(0, Number(prisonItem.staffAssigned) || 0)
              return {
                id,
                name: prisonItem.name || `Prison ${id}`,
                position: sanitizePosition(prisonItem.position, DEFAULT_CENTER),
                capacity,
                count: Math.min(count, capacity),
                staffCapacity,
                staffAssigned: Math.min(staffAssigned, staffCapacity),
                detentionLog: Array.isArray(prisonItem.detentionLog) ? prisonItem.detentionLog : [],
              }
            })
            .filter(Boolean)
        : []

      const maxVehicleId = safeVehicles.reduce((max, vehicle) => Math.max(max, vehicle.id), 0)
      const maxIncidentId = safeIncidents.reduce((max, incident) => Math.max(max, incident.id), 0)
      const maxStationId = safeStations.reduce((max, station) => Math.max(max, station.id), 0)
      const maxPrisonId = safePrisons.reduce((max, prison) => Math.max(max, prison.id), 0)

      const staffedVehiclesWithCrew = autoAssignCrewForStations(
        safeVehicles,
        safeStations
      )

      setMoney(Number(data.money) || 1500)
      setScore(Number(data.score) || 0)
      setPublicTrust(Number(data.publicTrust) || 60)
      setResolvedCount(Number(data.resolvedCount) || 0)
      setDebriefs(Array.isArray(data.debriefs) ? data.debriefs : [])
      setTransactions(Array.isArray(data.transactions) ? data.transactions : [])
      setShowWelcome(!safeStations.length)
      setShowStation(false)
      setStations(safeStations)
      setPrisons(safePrisons)
      setActiveStationId(null)
      setActivePrisonId(null)
      setShowPrison(false)
      setStationNameDraft(safeStations[0]?.name || '')
      setPrisonNameDraft(safePrisons[0]?.name || '')
      setVehicles(staffedVehiclesWithCrew)
      setIncidents(safeIncidents)
      resetBuildingPlacement()
      setFollowUpPromptId(null)
      setCases(safeCases)
      setSelectedCaseId(safeCases[0]?.caseId || null)
      setSpecialEvents([])
      setNextVehicleId(Number(data.nextVehicleId) || maxVehicleId + 1 || 1)
      setNextStationId(Number(data.nextStationId) || maxStationId + 1 || 1)
      setNextPrisonId(Number(data.nextPrisonId) || maxPrisonId + 1 || 1)
      setNextIncidentId(Number(data.nextIncidentId) || maxIncidentId + 1 || 1)
      setNextCaseId(Number(data.nextCaseId) || maxIncidentId + 1 || 1)
      setNextSpecialId(Number(data.nextSpecialId) || 1)
      const uiState =
        data.uiState && typeof data.uiState === 'object' ? data.uiState : {}
      const savedFilters =
        uiState.incidentFilters && typeof uiState.incidentFilters === 'object'
          ? uiState.incidentFilters
          : {}
      const savedPriority = savedFilters.priority || {}
      setStationPanelTab(
        typeof uiState.stationPanelTab === 'string' ? uiState.stationPanelTab : 'overview'
      )
      setShowLayers(Boolean(uiState.showLayers))
      setShowCases(Boolean(uiState.showCases))
      setShowTelemetry(Boolean(uiState.showTelemetry))
      setIncidentFilters({
        type: typeof savedFilters.type === 'string' ? savedFilters.type : 'all',
        department:
          typeof savedFilters.department === 'string' ? savedFilters.department : 'all',
        onlyActiveDepartment: Boolean(savedFilters.onlyActiveDepartment),
        priority: {
          1: savedPriority[1] !== false,
          2: savedPriority[2] !== false,
          3: savedPriority[3] !== false,
        },
      })
      setTuningPresetId(
        typeof uiState.tuningPresetId === 'string' && TUNING_PRESETS[uiState.tuningPresetId]
          ? uiState.tuningPresetId
          : DEFAULT_TUNING_PRESET_ID
      )
      const nextMissionDayKey =
        typeof data.missionDayKey === 'string' ? data.missionDayKey : getMissionDayKey()
      setMissionDayKey(nextMissionDayKey)
      const loadedGoals = Array.isArray(data.dailyGoals)
        ? data.dailyGoals
            .filter((goal) => goal && goal.departmentId && goal.id)
            .map((goal) => ({
              ...goal,
              dayKey: goal.dayKey || nextMissionDayKey,
              progress: Math.max(0, Number(goal.progress) || 0),
              target: Math.max(1, Number(goal.target) || 1),
              reward: Math.max(0, Number(goal.reward) || 0),
              trustBonus: Number(goal.trustBonus) || 0,
              completed: Boolean(goal.completed),
              claimed: Boolean(goal.claimed),
            }))
        : []
      setDailyGoals(
        loadedGoals.length && loadedGoals.every((goal) => goal.dayKey === nextMissionDayKey)
          ? loadedGoals
          : createDailyGoals(nextMissionDayKey)
      )
      const savedTelemetry = data.telemetryStats || {}
      const normalizedTelemetry = createDepartmentTelemetry()
      TELEMETRY_DEPARTMENT_IDS.forEach((departmentId) => {
        const source = savedTelemetry[departmentId]
        if (!source) return
        normalizedTelemetry[departmentId] = {
          resolved: Math.max(0, Number(source.resolved) || 0),
          missed: Math.max(0, Number(source.missed) || 0),
          rewardTotal: Math.max(0, Number(source.rewardTotal) || 0),
          responseTotal: Math.max(0, Number(source.responseTotal) || 0),
          responseSamples: Math.max(0, Number(source.responseSamples) || 0),
        }
      })
      setTelemetryStats(normalizedTelemetry)
    } catch (error) {
      console.warn('Failed to load save data.', error)
      applyDefaultState({ showWelcome: true })
    } finally {
      setHasLoadedSave(true)
    }
  }, [storageKey])

  useEffect(() => {
    if (!hasLoadedSave) return
      const saveData = {
        schemaVersion: SAVE_SCHEMA_VERSION,
        money,
        score,
        publicTrust,
        resolvedCount,
        debriefs,
        transactions,
        stations,
        activeStationId,
        prisons: prisons.map((prison) => ({
          id: prison.id,
          name: prison.name,
          position: prison.position,
          capacity: prison.capacity,
          count: prison.count,
          staffCapacity: prison.staffCapacity,
          staffAssigned: prison.staffAssigned,
          detentionLog: prison.detentionLog || [],
        })),
      cases,
      vehicles: vehicles.map((vehicle) => ({
        id: vehicle.id,
        name: vehicle.name,
        unitType: vehicle.unitType,
        department: vehicle.department || DEFAULT_DEPARTMENT_ID,
        status: vehicle.status,
        position: vehicle.position,
        speedKph: vehicle.speedKph,
        assignedIncidentId: vehicle.assignedIncidentId,
        onSceneRemaining: vehicle.onSceneRemaining,
        currentSpeedKph: vehicle.currentSpeedKph,
        targetPosition: vehicle.targetPosition,
        progressRatio:
          vehicle.routeData && vehicle.routeData.totalDistance > 0
            ? vehicle.progressMeters / vehicle.routeData.totalDistance
            : vehicle.progressRatio || 0,
        routingStartedAt: vehicle.routingStartedAt,
        parked: vehicle.parked,
        cooldownRemaining: vehicle.cooldownRemaining,
        fatigue: vehicle.fatigue,
        shiftRemaining: vehicle.shiftRemaining,
        crewRequired: vehicle.crewRequired,
        crewAssigned: vehicle.crewAssigned,
        homeStationId: vehicle.homeStationId,
        returnDestinationType: vehicle.returnDestinationType || null,
        returnDestinationId: vehicle.returnDestinationId || null,
        returnIncidentType: vehicle.returnIncidentType || null,
      })),
      incidents: incidents
        .filter((incident) => incident.status !== INCIDENT_STATUS.resolved)
        .map((incident) => ({
          id: incident.id,
          type: incident.type,
          position: incident.position,
          createdAt: incident.createdAt,
          status: incident.status,
          assignedVehicleId: incident.assignedVehicleId,
          assignedVehicleIds: incident.assignedVehicleIds || [],
          onSceneVehicleIds: incident.onSceneVehicleIds || [],
          etaSeconds: incident.etaSeconds,
          onSceneRemaining: incident.onSceneRemaining,
          address: incident.address,
          caller: incident.caller,
          priority: incident.priority,
          requiredUnits: incident.requiredUnits,
          requiredUnitType: incident.requiredUnitType,
          requiredDepartment: incident.requiredDepartment || DEFAULT_DEPARTMENT_ID,
          responseTargetSeconds: incident.responseTargetSeconds,
          rewardMultiplier: incident.rewardMultiplier || 1,
          missPenaltyMultiplier: incident.missPenaltyMultiplier || 1,
          onSceneDurationSeconds: incident.onSceneDurationSeconds || ON_SCENE_SECONDS,
          dispatchedAt: incident.dispatchedAt,
          arrivedAt: incident.arrivedAt,
          responseSeconds: incident.responseSeconds,
          timeRemaining: incident.timeRemaining,
          stage: incident.stage,
          stageLabel: incident.stageLabel,
          stageTotal: incident.stageTotal,
          followUpPlan: incident.followUpPlan,
          followUpGenerated: incident.followUpGenerated,
          awaitingFollowUp: incident.awaitingFollowUp,
          parentIncidentId: incident.parentIncidentId,
          caseId: incident.caseId,
          caseScore: incident.caseScore,
          caseNotes: incident.caseNotes,
          requiresDetention: incident.requiresDetention,
        })),
      nextVehicleId,
      nextStationId,
      nextPrisonId,
      nextIncidentId,
        nextCaseId,
        nextSpecialId,
        missionDayKey,
        dailyGoals,
        telemetryStats,
        uiState: {
          stationPanelTab,
          showLayers,
          showCases,
          showTelemetry,
          tuningPresetId,
          incidentFilters,
        },
      }
    localStorage.setItem(storageKey, JSON.stringify(saveData))
  }, [
    money,
    score,
    publicTrust,
    resolvedCount,
    debriefs,
    stations,
    activeStationId,
    prisons,
    cases,
    vehicles,
    incidents,
    nextVehicleId,
    nextStationId,
    nextPrisonId,
    nextIncidentId,
    nextCaseId,
    nextSpecialId,
    stationPanelTab,
    showLayers,
    showCases,
    showTelemetry,
    tuningPresetId,
    incidentFilters,
    missionDayKey,
    dailyGoals,
    telemetryStats,
    hasLoadedSave,
    transactions,
    storageKey,
  ])

  useEffect(() => {
    if (!followUpPromptId) {
      if (followUpPromptTimer.current) {
        clearTimeout(followUpPromptTimer.current)
        followUpPromptTimer.current = null
      }
      return
    }
    if (followUpPromptTimer.current) {
      clearTimeout(followUpPromptTimer.current)
    }
    followUpPromptTimer.current = setTimeout(() => {
      handleFollowUpDecision(true)
    }, 12000)
    return () => {
      if (followUpPromptTimer.current) {
        clearTimeout(followUpPromptTimer.current)
        followUpPromptTimer.current = null
      }
    }
  }, [followUpPromptId])

  const getDepartmentId = (departmentId) => departmentId || DEFAULT_DEPARTMENT_ID
  const getDepartmentShortLabel = (departmentId) =>
    DEPARTMENTS[getDepartmentId(departmentId)]?.shortLabel || DEPARTMENTS.police.shortLabel

  const getDepartmentBadgeMarkup = (departmentId) => {
    const dept = getDepartmentId(departmentId)
    return `<span class="marker__dept marker__dept--${dept}">${getDepartmentShortLabel(dept)}</span>`
  }

  const getCustomMarkerMarkup = (candidates, fallbackMarkup, departmentId = null) => {
    const custom = pickCustomIconUrl(candidates)
    const badgeMarkup = departmentId ? getDepartmentBadgeMarkup(departmentId) : ''
    if (custom) return `<img class="marker__img marker__img--custom" src="${custom}" alt="" />`
    return `${fallbackMarkup}${badgeMarkup}`
  }
  const stationIcon = useMemo(
    () =>
      makeMarkerIcon(
        'marker--station',
        getCustomMarkerMarkup(['station-police.png'], ICONS.station, DEPARTMENTS.police.id)
      ),
    []
  )
  const fireStationIcon = useMemo(
    () =>
      makeMarkerIcon(
        'marker--station marker--station-fire',
        getCustomMarkerMarkup(['station-fire.png'], ICONS.fire_station, DEPARTMENTS.fire.id)
      ),
    []
  )
  const emsStationIcon = useMemo(
    () =>
      makeMarkerIcon(
        'marker--station marker--station-ems',
        getCustomMarkerMarkup(['station-ems.png'], ICONS.ems_station, DEPARTMENTS.ems.id)
      ),
    []
  )
  const towYardIcon = useMemo(
    () =>
      makeMarkerIcon(
        'marker--station marker--station-tow',
        getCustomMarkerMarkup(['station-tow.png'], ICONS.tow_yard, DEPARTMENTS.tow.id)
      ),
    []
  )
  const prisonIcon = useMemo(
    () =>
      makeMarkerIcon(
        'marker--prison',
        getCustomMarkerMarkup(['station-prison.png'], ICONS.prison)
      ),
    []
  )
  const placementIcon = useMemo(
    () => makeMarkerIcon('marker--placement', ICONS.placement),
    []
  )
  const specialEventIcon = useMemo(
    () => makeMarkerIcon('marker--special', ICONS.incident),
    []
  )
  const iconCache = useRef(new Map())

  const getIncidentUnitBadgeMarkup = (unitType, departmentId) => {
    if (!unitType) return ''
    const dept = getDepartmentId(departmentId)
    const departmentIconBase =
      dept === DEPARTMENTS.fire.id
        ? ['unit-fire']
        : dept === DEPARTMENTS.ems.id
        ? ['unit-ems']
        : dept === DEPARTMENTS.tow.id
        ? ['unit-tow']
        : []
    const custom = pickCustomIconUrl([
      `unit-${unitType}.png`,
      ...departmentIconBase.map((name) => `${name}.png`),
      'unit-patrol.png',
    ])
    if (custom) {
      return `<img class="marker__unit-img marker__img--dept-${dept}" src="${custom}" alt="" />`
    }
    if (dept === DEPARTMENTS.fire.id) return ICONS.fire_vehicle
    if (dept === DEPARTMENTS.ems.id) return ICONS.ems_vehicle
    return ICONS.vehicle
  }

  const getIncidentIconMarkup = (
    priority,
    departmentId,
    hasAssignedUnit = false,
    badgeUnitType = null,
    badgeUnitDepartment = null
  ) => {
    const custom =
      pickCustomIconUrl([`incident-priority-${priority}.png`]) ||
      pickCustomIconUrl(['incident-default.png'])
    const core = custom ? `<img class="marker__img" src="${custom}" alt="" />` : ICONS.incident
    const dept = getDepartmentId(departmentId)
    const unitBadge = hasAssignedUnit
      ? `<span class="marker__unit marker__unit--${getDepartmentId(
          badgeUnitDepartment || dept
        )}" aria-hidden="true">${getIncidentUnitBadgeMarkup(
          badgeUnitType || 'patrol',
          badgeUnitDepartment || dept
        )}</span>`
      : ''
    const badge = `<span class="marker__dept marker__dept--${dept}">${getDepartmentShortLabel(dept)}</span>`
    return `${core}${unitBadge}${badge}`
  }

  const getIncidentIcon = (
    status,
    priority,
    departmentId,
    hasAssignedUnit = false,
    badgeUnitType = null,
    badgeUnitDepartment = null
  ) => {
    const key = `incident-${status}-${priority}-${getDepartmentId(departmentId)}-${hasAssignedUnit ? 'unit' : 'nounit'}-${badgeUnitType || 'none'}-${getDepartmentId(badgeUnitDepartment || departmentId)}`
    if (iconCache.current.has(key)) return iconCache.current.get(key)
    const className =
      status === INCIDENT_STATUS.open || status === INCIDENT_STATUS.responding
        ? 'marker--incident'
        : 'marker--incident-hot'
    const icon = makeMarkerIcon(
      className,
      getIncidentIconMarkup(
        priority,
        departmentId,
        hasAssignedUnit,
        badgeUnitType,
        badgeUnitDepartment
      )
    )
    iconCache.current.set(key, icon)
    return icon
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
    const deptBadge = getDepartmentBadgeMarkup(dept)
    const fallbackIcon =
      dept === DEPARTMENTS.fire.id
        ? ICONS.fire_vehicle
        : dept === DEPARTMENTS.ems.id
        ? ICONS.ems_vehicle
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
    if (status === VEHICLE_STATUS.enroute) {
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

    if (status === VEHICLE_STATUS.returning) {
      const returning =
        pickCustomIconUrl(
          unitIconBase.flatMap((name) => [`${name}-return.png`])
        ) ||
        pickCustomIconUrl(['unit-patrol-return.png'])
      if (returning) {
        return `<img class="marker__img marker__img--custom marker__img--dept-${dept}" src="${returning}" alt="" />`
      }
    }

    const custom =
      pickCustomIconUrl(unitIconBase.flatMap((name) => [`${name}.png`])) ||
      pickCustomIconUrl(['unit-patrol.png'])
    if (custom) {
      return `<img class="marker__img marker__img--custom marker__img--dept-${dept}" src="${custom}" alt="" />`
    }
    return `${fallbackIcon}${deptBadge}`
  }

  const getVehicleIcon = (status, unitType, department, hasDetainee) => {
    const key = `vehicle-${status}-${unitType}-${department || DEFAULT_DEPARTMENT_ID}-${hasDetainee ? 'det' : 'nodet'}`
    if (iconCache.current.has(key)) return iconCache.current.get(key)
    const className =
      status === VEHICLE_STATUS.enroute
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
    const combinedClass = hasDetainee
      ? `${className} ${departmentClass} marker--vehicle-detainee`
      : `${className} ${departmentClass}`
    const icon = makeMarkerIcon(combinedClass, getUnitIconMarkup(unitType, status, department))
    iconCache.current.set(key, icon)
    return icon
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

  const getStationBuildCost = () => STATION_COST + stations.length * 250
  const getBuildingCost = (buildingType) => {
    if (buildingType === STATION_TYPES.police_station.id) return getStationBuildCost()
    if (buildingType === STATION_TYPES.prison.id) return PRISON_BUILD_COST
    return 0
  }

  const getDefaultStationName = (stationType, stationId) => {
    if (stationType === STATION_TYPES.fire_station.id) return `Fire Station ${stationId}`
    if (stationType === STATION_TYPES.ems_station.id) return `EMS Station ${stationId}`
    if (stationType === STATION_TYPES.tow_yard.id) return `Tow Yard ${stationId}`
    return `Station ${stationId}`
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
    const newStation = {
      id: newStationId,
      name: stationNameDraft?.trim() || getDefaultStationName(stationType, newStationId),
      stationType,
      department: building.department || DEFAULT_DEPARTMENT_ID,
      position: newPosition,
      level: 1,
      garageCapacity: GARAGE_START_CAPACITY,
      responseBonus: 0,
      trainingBonus: 0,
      operationRadiusKm: STATION_OPERATION_RADIUS_KM,
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
    if (accepted) {
      setIncidents((prev) =>
        prev.map((item) =>
          item.id === incidentId
            ? {
                ...item,
                awaitingFollowUp: false,
                followUpGenerated: true,
                stage: (item.stage || 1) + 1,
                stageLabel: item.followUpPlan?.stageLabel || 'Follow-up',
                stageTotal: Math.max(item.stageTotal || 1, (item.stage || 1) + 1),
                onSceneRemaining: ON_SCENE_SECONDS,
                timeRemaining: item.responseTargetSeconds,
              }
            : item
        )
      )
      setVehicles((prev) =>
        prev.map((vehicle) =>
          vehicle.assignedIncidentId === incidentId &&
          vehicle.status === VEHICLE_STATUS.on_scene
            ? {
                ...vehicle,
                onSceneRemaining: ON_SCENE_SECONDS,
              }
            : vehicle
        )
      )
      showMessage('Follow-up action started.')
      return
    }
    setIncidents((prev) =>
      prev.map((item) =>
        item.id === incidentId
          ? {
              ...item,
              awaitingFollowUp: false,
              followUpGenerated: true,
              followUpPlan: null,
            }
          : item
      )
    )
    showMessage('Follow-up declined.')
  }

  const handleUpdateShiftPreset = (preset) => {
    if (!activeStation) return
    setStations((prev) =>
      prev.map((item) =>
        item.id === activeStation.id
          ? {
              ...item,
              shiftPreset: preset,
            }
          : item
      )
    )
  }

  const handleUpdateMinOnDuty = (field, value) => {
    if (!activeStation) return
    const safeValue = Math.max(0, Math.min(10, Number(value) || 0))
    setStations((prev) =>
      prev.map((item) =>
        item.id === activeStation.id
          ? {
              ...item,
              [field]: safeValue,
            }
          : item
      )
    )
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
    setStations((prev) =>
      prev.map((item) =>
        item.id === activeStation.id
          ? {
              ...item,
              personnelAssigned: nextAssigned,
              personnelCapacity: capacity,
            }
          : item
      )
    )
    setVehicles((prev) =>
      autoAssignCrew(prev, nextAssigned, activeStation.id)
    )
    setMoney((prev) => prev - PERSONNEL_HIRE_COST)
    setTransactions((prev) =>
      [
        {
          id: `hire-${Date.now()}`,
          label: 'Personnel hiring',
          amount: -PERSONNEL_HIRE_COST,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 100)
    )
    showMessage('New personnel hired.')
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

  const progression = useMemo(
    () => ({
      trafficUnitUnlocked: resolvedCount >= 3,
      supervisorUnlocked: resolvedCount >= 6,
      precinctUpgradeUnlocked: resolvedCount >= 8,
      fireRescueUnlocked: (telemetryStats.fire?.resolved || 0) >= 4,
      emsAdvancedCareUnlocked: (telemetryStats.ems?.resolved || 0) >= 4,
      towHeavyRecoveryUnlocked: (telemetryStats.tow?.resolved || 0) >= 4,
    }),
    [resolvedCount, telemetryStats]
  )

  const departmentIncidentModifiers = useMemo(() => {
    const modifiers = {
      [DEPARTMENTS.police.id]: {
        responseTargetMultiplier: 1,
        rewardMultiplier: 1,
        missPenaltyMultiplier: 1,
        onSceneMultiplier: 1,
      },
      [DEPARTMENTS.fire.id]: {
        responseTargetMultiplier: 1,
        rewardMultiplier: 1,
        missPenaltyMultiplier: 1,
        onSceneMultiplier: 1,
      },
      [DEPARTMENTS.ems.id]: {
        responseTargetMultiplier: 1,
        rewardMultiplier: 1,
        missPenaltyMultiplier: 1,
        onSceneMultiplier: 1,
      },
      [DEPARTMENTS.tow.id]: {
        responseTargetMultiplier: 1,
        rewardMultiplier: 1,
        missPenaltyMultiplier: 1,
        onSceneMultiplier: 1,
      },
    }
    const fireMissRate =
      (telemetryStats.fire?.resolved || 0) + (telemetryStats.fire?.missed || 0) > 0
        ? (telemetryStats.fire?.missed || 0) /
          ((telemetryStats.fire?.resolved || 0) + (telemetryStats.fire?.missed || 0))
        : 0
    if (progression.fireRescueUnlocked) {
      modifiers.fire.responseTargetMultiplier = clamp(1.03 + fireMissRate * 0.12, 1.03, 1.18)
      modifiers.fire.missPenaltyMultiplier = clamp(0.94 - fireMissRate * 0.18, 0.72, 0.94)
      modifiers.fire.rewardMultiplier = 1.04
    }
    const emsAvgResponse =
      (telemetryStats.ems?.responseSamples || 0) > 0
        ? (telemetryStats.ems?.responseTotal || 0) / (telemetryStats.ems?.responseSamples || 1)
        : 0
    if (progression.emsAdvancedCareUnlocked) {
      modifiers.ems.responseTargetMultiplier = emsAvgResponse > 180 ? 1.12 : 1.06
      modifiers.ems.onSceneMultiplier = 0.84
      modifiers.ems.rewardMultiplier = 1.05
    }
    const towUnits = vehicles.filter(
      (vehicle) => (vehicle.department || DEFAULT_DEPARTMENT_ID) === DEPARTMENTS.tow.id
    )
    const towActive = towUnits.filter(
      (vehicle) =>
        vehicle.status === VEHICLE_STATUS.enroute || vehicle.status === VEHICLE_STATUS.on_scene
    ).length
    const towUtilization = towUnits.length > 0 ? towActive / towUnits.length : 0
    if (progression.towHeavyRecoveryUnlocked) {
      modifiers.tow.onSceneMultiplier = clamp(0.9 - towUtilization * 0.2, 0.74, 0.9)
      modifiers.tow.responseTargetMultiplier = 1.05
      modifiers.tow.missPenaltyMultiplier = 0.9
    }
    return modifiers
  }, [progression, telemetryStats, vehicles])

  const spawnUnlocks = {
    traffic: progression.trafficUnitUnlocked,
    supervisor: progression.supervisorUnlocked,
    allowMultiUnit: resolvedCount >= MULTI_UNIT_UNLOCKED_AT,
  }

  const { spawnIncident } = useIncidentSpawner({
    stations,
    vehicles,
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

  const handleSpawnIncident = () => {
    spawnIncident()
    setTimeout(() => spawnIncident(), 60)
  }

  const handleSpawnDepartmentIncident = (departmentId) => {
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
    const preferredStation =
      eligibleStations[Math.floor(Math.random() * eligibleStations.length)] || null
    const anchor = preferredStation?.position || DEFAULT_CENTER
    const radiusKm = preferredStation?.operationRadiusKm || STATION_OPERATION_RADIUS_KM
    const position = randomPointNear(anchor, radiusKm)
    const pool = INCIDENT_TYPES_BY_DEPARTMENT[departmentId] || INCIDENT_TYPES
    const type = pool[Math.floor(Math.random() * pool.length)] || 'Call for service'
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
      address: 'Development spawn',
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
    const stagePlan = followUpPlan || getIncidentStagePlan(type, priorityValue)
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
      createdAt: Date.now(),
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
      stageTotal: Number(stageTotal) || (stagePlan ? 2 : 1),
      followUpPlan: stagePlan?.followUp || null,
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
    if ((type.includes('traffic stop') || type.includes('traffic')) && Math.random() < 0.35) {
      return {
        type: 'Vehicle pursuit',
        priority: 1,
        requiredUnits: 2,
        requiredUnitType: 'traffic',
        caller: 'Officer request',
      }
    }
    if ((type.includes('burglary') || type.includes('breaking')) && Math.random() < 0.25) {
      return {
        type: 'Suspicious person',
        priority: 2,
        requiredUnits: 1,
        caller: 'Neighbor report',
      }
    }
    if (type.includes('domestic') && Math.random() < 0.2) {
      return {
        type: 'Restraining order violation',
        priority: 2,
        requiredUnits: 1,
        caller: 'Follow-up call',
      }
    }
    if ((type.includes('stolen') || type.includes('theft')) && Math.random() < 0.2) {
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
    const lowered = incident.type.toLowerCase()
    if ((grade === 'poor' || grade === 'late') && Math.random() < 0.35) {
      return {
        type: `Complaint review: ${incident.type}`,
        priority: Math.min(3, incident.priority + 1),
        requiredUnits: 1,
        caller: 'Internal affairs',
        stageLabel: 'Review',
      }
    }
    if (incident.priority === 1 && (grade === 'poor' || caseScore < 6) && Math.random() < 0.4) {
      return {
        type: `Search continuation: ${incident.type}`,
        priority: 1,
        requiredUnits: Math.max(2, incident.requiredUnits || 1),
        caller: 'Command',
        stageLabel: 'Search',
      }
    }
    if (lowered.includes('burglary') && grade !== 'excellent' && Math.random() < 0.25) {
      return {
        type: 'Neighborhood canvas',
        priority: 2,
        requiredUnits: 1,
        caller: 'Detective unit',
        stageLabel: 'Investigation',
      }
    }
    return getFollowUpIncident(incident)
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
    const type = specialTypes[Math.floor(Math.random() * specialTypes.length)]
    const newEvent = {
      id: eventId,
      type,
      position: start,
      routeData,
      progressMeters: 0,
      speedKph: SPECIAL_EVENT_SPEED_KPH,
      createdAt: Date.now(),
      expiresAt: Date.now() + SPECIAL_EVENT_TTL_SECONDS * 1000,
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
        showMessage('Daily quota complete. Claim reward in Intel panel.')
      }
    }
  }
  const telemetryEventRef = useLatestRef(recordTelemetryEvent)


  useGameSimulation({
    vehiclesRef,
    incidentsRef,
    stationsRef,
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
  })


  useEffect(() => {
    const awaiting = vehicles.filter(
      (vehicle) =>
        vehicle.status === VEHICLE_STATUS.awaiting_return_route &&
        !pendingReturnRoutes.current.has(vehicle.id)
    )
    if (!awaiting.length) return

    awaiting.forEach(async (vehicle) => {
      let destination = null
      if (vehicle.returnDestinationType === 'prison') {
        destination = getPrisonById(vehicle.returnDestinationId)
      }
      if (!destination) {
        const destinationId = vehicle.returnDestinationId || vehicle.homeStationId
        destination = getStationById(destinationId) || getStationById(vehicle.homeStationId) || activeStation
      }
      if (!destination) return
      pendingReturnRoutes.current.add(vehicle.id)
      const routeData = await buildRoute(vehicle.position, destination.position)
      const fatigueMultiplier = clamp(1 - (vehicle.fatigue || 0) / 160, 0.6, 1)
      const responseBonus =
        destination?.responseBonus || getStationResponseBonus(vehicle.homeStationId)
      const travelSpeedKph = getTravelSpeedKph({
        vehicle,
        position: vehicle.position,
        routeData,
        progressMeters: 0,
        responseBonus,
        fatigueMultiplier,
        emergency: false,
        center: DEFAULT_CENTER,
      })
      setVehicles((prev) =>
        prev.map((item) =>
          item.id === vehicle.id
            ? {
                ...item,
                status: VEHICLE_STATUS.returning,
                routeData,
                progressMeters: 0,
                etaSeconds: Math.ceil(
                  routeData.totalDistance /
                    ((travelSpeedKph * simSpeedRef.current * 1000) / 3600)
                ),
                targetPosition: destination.position,
                progressRatio: 0,
                routingStartedAt: null,
                parked: false,
                currentSpeedKph: travelSpeedKph,
              }
            : item
        )
      )
      pendingReturnRoutes.current.delete(vehicle.id)
    })
  }, [vehicles, activeStation])

  useEffect(() => {
    const availableIdsByIncident = new Map()
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
  }, [vehicles, incidents])

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
      const responseBonus = getStationResponseBonus(vehicle.homeStationId)
      const travelSpeedKph = getTravelSpeedKph({
        vehicle,
        position,
        routeData,
        progressMeters,
        responseBonus,
        fatigueMultiplier,
        emergency: status === VEHICLE_STATUS.enroute,
        center: DEFAULT_CENTER,
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
  }, [vehicles, hasLoadedSave])

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
    incidentTypeOptions,
    departmentCounts,
  } = useIncidentViewModel({
    incidents,
    incidentFilters,
    primaryDepartmentId,
    defaultDepartmentId: DEFAULT_DEPARTMENT_ID,
    incidentStatus: INCIDENT_STATUS,
  })
  const dispatchRecommendations = useMemo(() => {
    return listIncidents
      .filter((incident) => {
        if (!canDispatchIncident(incident)) return false
        if (
          incident.status !== INCIDENT_STATUS.open &&
          incident.status !== INCIDENT_STATUS.responding
        ) {
          return false
        }
        const assignedCount = incident.assignedVehicleIds?.length || 0
        return assignedCount < getRequiredUnits(incident)
      })
      .map((incident) => {
        const eligibleIds = Array.from(getEligibleVehicleIds(incident))
        if (!eligibleIds.length) return null
        const preferredId = Number(getSelectedId(incident))
        const vehicleId = eligibleIds.includes(preferredId) ? preferredId : eligibleIds[0]
        const vehicle = vehicles.find((item) => item.id === vehicleId)
        return {
          incidentId: incident.id,
          incidentType: incident.type,
          priority: incident.priority,
          departmentId: incident.requiredDepartment || DEFAULT_DEPARTMENT_ID,
          vehicleId,
          vehicleName: vehicle?.name || `Unit ${vehicleId}`,
          vehicleType: vehicle ? getUnitDisplayLabel(vehicle) : null,
        }
      })
      .filter(Boolean)
  }, [
    canDispatchIncident,
    getEligibleVehicleIds,
    getRequiredUnits,
    getSelectedId,
    listIncidents,
    vehicles,
  ])
  const handleDispatchRecommendation = (incidentId, vehicleId) =>
    dispatchVehicle(incidentId, vehicleId)
  const handleDispatchAllRecommendations = () => {
    if (!dispatchRecommendations.length) return
    dispatchRecommendations.forEach((item, index) => {
      setTimeout(() => {
        handleQuickDispatch(item.incidentId)
      }, index * 120)
    })
    showMessage(`Queued ${dispatchRecommendations.length} manual dispatch recommendations.`)
  }
  const handleToggleSimSpeed = () => {
    setSimSpeedIndex((prev) => (prev + 1) % SIM_SPEED_OPTIONS.length)
  }
  const activeStationVehicles = activeStation
    ? vehicles.filter((vehicle) => vehicle.homeStationId === activeStation.id)
    : vehicles
  const parkedCount = activeStationVehicles.filter((vehicle) => vehicle.parked).length
  const unitStatusCounts = vehicles.reduce((acc, vehicle) => {
    const status = vehicle.status || VEHICLE_STATUS.available
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})
  const stationSummary = useMemo(() => {
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
  }, [activeStation, vehicles, baseIncidents, stations])
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
    })
  useEffect(() => {
    if (!debriefs.length) return
    const interval = setInterval(() => {
      setDebriefs((prev) => prev.filter((item) => Date.now() - item.createdAt < 180000))
    }, 15000)
    return () => clearInterval(interval)
  }, [debriefs.length])

  useEffect(() => {
    const interval = setInterval(() => {
      const today = getMissionDayKey()
      if (today === missionDayKey) return
      setMissionDayKey(today)
      setDailyGoals(createDailyGoals(today))
      setGoalHighlightIds([])
      setGoalDismissingIds([])
      showMessage('New daily operations goals available.')
    }, 60000)
    return () => clearInterval(interval)
  }, [missionDayKey])

  const visibleDailyGoals = dailyGoals.filter((goal) => !goal.claimed)
  const handleClaimGoal = (goalId) => {
    const goal = dailyGoals.find((item) => item.id === goalId)
    if (!goal || !goal.completed || goal.claimed) return
    if (goalDismissingIds.includes(goalId)) return
    setGoalDismissingIds((prev) => [...prev, goalId])
    setMoney((prev) => prev + goal.reward)
    setPublicTrust((prev) => clamp(prev + goal.trustBonus, 0, 100))
    setTransactions((prev) =>
      [
        {
          id: `goal-reward-${Date.now()}-${goalId}`,
          label: `Daily quota claimed: ${goal.title}`,
          amount: goal.reward,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 100)
    )
    showMessage(`${goal.title} claimed (+$${goal.reward}, +${goal.trustBonus} trust)`)
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
        showIncidents={showIncidents}
        setShowIncidents={setShowIncidents}
        station={activeStation}
        hasStations={stations.length > 0}
        onToggleLedger={() => setShowLedger((prev) => !prev)}
        saveSlot={saveSlot}
        setSaveSlot={setSaveSlot}
        saveSlotCount={SAVE_SLOT_COUNT}
        onStartPlaceStation={handleStartPlaceStation}
        placingStation={placingStation}
        onCancelPlacement={handleCancelPlacement}
        stationBuildCost={getStationBuildCost()}
        showCases={showCases}
        onToggleCases={() => setShowCases((prev) => !prev)}
        showBuildMenu={showBuildMenu}
        onToggleBuildMenu={handleToggleBuildMenu}
        buildOptions={buildOptions}
        placingBuildingType={placingBuildingType}
        onChangeBuildingType={setPlacingBuildingType}
        onStartBuildingPlacement={handleStartBuildingPlacement}
        onCancelBuildMenu={() => setShowBuildMenu(false)}
        selectedBuildOption={selectedBuildOption}
      />

      <main className="map-shell">
        {showTestPanel ? (
        <aside className="panel test-panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Testing</p>
              <p className="muted">Tools for development</p>
            </div>
            <button className="btn btn--ghost btn--small" onClick={() => setShowTestPanel(false)}>
              Minimize
            </button>
          </div>
          <div className="test-panel__meta">
            <label className="muted">
              Balance Profile
              <select
                className="filter-select"
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
              className={`btn btn--ghost btn--small ${showTelemetry ? 'btn--active' : ''}`}
              onClick={() => setShowTelemetry((prev) => !prev)}
            >
              {showTelemetry ? 'Hide Intel' : 'Show Intel'}
            </button>
          </div>
          <div className="test-panel__actions">
            <button className="btn btn--ghost btn--small" onClick={handleToggleSimSpeed}>
              Sim x{simSpeedMultiplier}
            </button>
            <button
              className="btn btn--ghost btn--small"
              onClick={() => setMoney((prev) => prev + 1000)}
            >
              +$1000
            </button>
            <button
              className="btn btn--ghost btn--small"
              onClick={handleSpawnIncident}
              disabled={!stations.length}
            >
              Spawn Incident
            </button>
            <button
              className="btn btn--ghost btn--small"
              onClick={handleSpawnPoliceIncident}
              disabled={!stations.length}
            >
              Spawn Police Incident
            </button>
            <button
              className="btn btn--ghost btn--small"
              onClick={handleSpawnFireIncident}
              disabled={!stations.length}
            >
              Spawn Fire Incident
            </button>
            <button
              className="btn btn--ghost btn--small"
              onClick={handleSpawnEmsIncident}
              disabled={!stations.length}
            >
              Spawn EMS Incident
            </button>
            <button
              className="btn btn--ghost btn--small"
              onClick={handleSpawnTowIncident}
              disabled={!stations.length}
            >
              Spawn Tow Incident
            </button>
            <button
              className="btn btn--ghost btn--small"
              onClick={spawnSpecialEvent}
              disabled={!stations.length}
            >
              Special Incident
            </button>
            <button className="btn btn--danger btn--small" onClick={handleReset}>
              Reset
            </button>
          </div>
        </aside>
        ) : (
          <button className="btn btn--ghost btn--small test-panel-toggle" onClick={() => setShowTestPanel(true)}>
            Testing
          </button>
        )}

        {showTelemetry && (
          <aside className="panel intel-panel">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Operations Intel</p>
                <p className="muted">Live goals and department performance</p>
              </div>
              <button className="btn btn--ghost btn--small" onClick={() => setShowTelemetry(false)}>
                Close
              </button>
            </div>
            <div className="telemetry-grid">
              <p className="eyebrow">Daily Quotas ({missionDayKey})</p>
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
                    className={`telemetry-row telemetry-row--goal ${isReady ? 'telemetry-row--goal-ready' : ''} ${
                      isHighlight ? 'telemetry-row--goal-highlight' : ''
                    } ${isDismissing ? 'telemetry-row--goal-dismiss' : ''}`}
                  >
                    <p className="telemetry-row__title">{goal.title}</p>
                    <p className="muted">
                      {goal.progress}/{goal.target} - Reward ${goal.reward} - Trust +{goal.trustBonus}
                    </p>
                    <div className="telemetry-goal__actions">
                      <span className="muted">{isReady ? 'Ready to claim' : 'In progress'}</span>
                      {isReady && (
                        <button className="btn btn--small" onClick={() => handleClaimGoal(goal.id)}>
                          Claim
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="telemetry-grid">
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
          </aside>
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
          <MapClickHandler
            active={placingStation}
            onMapClick={handleMapClick}
          />

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

        {nextAction && !showBuildMenu && !placingStation && (
          <aside className="panel command-hint">
            <p className="eyebrow">Next Action</p>
            <p className="title">{nextAction.title}</p>
            <p className="muted">{nextAction.detail}</p>
            {nextAction.actionLabel && nextAction.onAction && (
              <button className="btn btn--small" onClick={nextAction.onAction}>
                {nextAction.actionLabel}
              </button>
            )}
          </aside>
        )}

        {placingStation && !placingStationPosition && (
          <div className="placement-bar placement-bar--top">
            <div>
              <p className="eyebrow">Place {placingBuildingLabel}</p>
              <p className="muted">Click the map to choose a location.</p>
            </div>
            <div className="placement-bar__actions">
              <button className="btn btn--ghost btn--small" onClick={handleCancelPlacement}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {placingStation && placingStationPosition && (
          <div className="placement-bar placement-bar--top">
            <div>
              <p className="eyebrow">Place {placingBuildingLabel}</p>
              <p className="muted">
                Confirm this location for your new {placingBuildingLabel.toLowerCase()}.
              </p>
            </div>
            <div className="placement-bar__actions">
              <button className="btn btn--ghost btn--small" onClick={handleCancelPlacement}>
                Cancel
              </button>
              <button className="btn btn--small" onClick={handleConfirmPlacement}>
                Place {placingBuildingLabel}
              </button>
            </div>
          </div>
        )}


        <aside className={`dock ${isCompactDock ? 'dock--compact' : ''}`}>
          {showIncidents && (
            <IncidentsPanel
              incidents={listIncidents}
              getSelectedId={getSelectedId}
              setDispatchSelection={setDispatchSelection}
              dispatchVehicle={dispatchVehicle}
              vehicles={vehicles}
              formatSeconds={formatSeconds}
              getPriorityConfig={getPriorityConfig}
              getEligibleVehicleIds={getEligibleVehicleIds}
              getRequiredUnits={getRequiredUnits}
              canDispatchIncident={canDispatchIncident}
              filters={incidentFilters}
              activeDepartmentId={primaryDepartmentId}
              setFilters={setIncidentFilters}
              incidentTypeOptions={incidentTypeOptions}
              departmentCounts={departmentCounts}
              onSceneSeconds={ON_SCENE_SECONDS}
              getVehicleIneligibilityReason={getVehicleIneligibilityReason}
              getIncidentRequirementLines={getIncidentRequirementLines}
              onQuickDispatch={handleQuickDispatch}
              formatVehicleUnitLabel={getUnitDisplayLabel}
              focusMode={focusMode}
            focusDepartmentId={focusDepartmentId}
            dispatchRecommendations={dispatchRecommendations}
            onDispatchRecommendation={handleDispatchRecommendation}
            onDispatchAllRecommendations={handleDispatchAllRecommendations}
          />
          )}
        </aside>

        <aside className="layers-toggle">
          <button
            className={`btn btn--ghost btn--small ${showLayers ? 'btn--active' : ''}`}
            onClick={() => setShowLayers((prev) => !prev)}
          >
            Layers
          </button>
        </aside>

        {showLayers && (
          <aside className="panel layers-panel">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Map Layers</p>
                <p className="muted">Toggle operational overlays</p>
              </div>
              <button className="btn btn--ghost btn--small" onClick={() => setShowLayers(false)}>
                Close
              </button>
            </div>
            <label className="layer-toggle">
              <input
                type="checkbox"
                checked={mapLayers.coverage}
                onChange={() =>
                  setMapLayers((prev) => ({ ...prev, coverage: !prev.coverage }))
                }
              />
              Station coverage radius
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
          </aside>
        )}

        {showCases && (
          <CasesPanel
            cases={cases}
            activeCase={activeCase}
            onSelectCase={setSelectedCaseId}
            onClose={() => setShowCases(false)}
          />
        )}

        <aside className="unit-strip">
          <div className="unit-strip__title">Unit Status</div>
          <div className="unit-strip__grid">
            <div>
              <span>Available</span>
              <strong>{unitStatusCounts[VEHICLE_STATUS.available] || 0}</strong>
            </div>
            <div>
              <span>Enroute</span>
              <strong>{unitStatusCounts[VEHICLE_STATUS.enroute] || 0}</strong>
            </div>
            <div>
              <span>On scene</span>
              <strong>{unitStatusCounts[VEHICLE_STATUS.on_scene] || 0}</strong>
            </div>
            <div>
              <span>Returning</span>
              <strong>{unitStatusCounts[VEHICLE_STATUS.returning] || 0}</strong>
            </div>
            <div>
              <span>Cooldown</span>
              <strong>{unitStatusCounts[VEHICLE_STATUS.cooldown] || 0}</strong>
            </div>
            <div>
              <span>Off shift</span>
              <strong>{unitStatusCounts[VEHICLE_STATUS.off_shift] || 0}</strong>
            </div>
          </div>
        </aside>

        {alertsQueue.length > 0 && (
          <aside className={`alerts ${showTelemetry ? 'alerts--shifted' : ''}`}>
            <div className="alerts__title">Alerts Queue</div>
            {alertsQueue.map((item) => (
              <div key={item.id} className="alerts__item">
                <span className={`priority-tag priority-tag--${item.incident.priority}`}>
                  {getPriorityConfig(item.incident.priority).label}
                </span>
                <div>
                  <p className="title">{item.incident.type}</p>
                  <p className="muted">{item.reasons.join(' · ')}</p>
                  {item.timeRemaining != null && (
                    <p className="muted">
                      {item.incident.status === INCIDENT_STATUS.open
                        ? `Dispatch in ${formatSeconds(item.timeRemaining)}`
                        : `ETA ${formatSeconds(item.timeRemaining)}`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </aside>
        )}

        {showLedger && (
          <CashLedger
            transactions={transactions}
            onClose={() => setShowLedger(false)}
            budgetSummary={budgetSummary}
          />
        )}

        {showStation && (
          <div className="modal" onClick={() => setShowStation(false)}>
            <div className="modal__card" onClick={(event) => event.stopPropagation()}>
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
                availableUnits={departmentUnitCatalog.filter((unit) =>
                  isUnitUnlocked(unit, progression)
                )}
                garageUpgradeCost={GARAGE_UPGRADE_COST}
                hqUpgradeCost={HQ_UPGRADE_COST}
                trainingUpgradeCost={TRAINING_UPGRADE_COST}
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
                onUpdateShiftPreset={handleUpdateShiftPreset}
                onUpdateMinOnDuty={handleUpdateMinOnDuty}
              />
              <button
                className="btn btn--ghost modal__close"
                onClick={() => setShowStation(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showPrison && (
          <div className="modal" onClick={() => setShowPrison(false)}>
            <div className="modal__card" onClick={(event) => event.stopPropagation()}>
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
              <button
                className="btn btn--ghost modal__close"
                onClick={() => setShowPrison(false)}
              >
                Close
              </button>
            </div>
          </div>
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
          <div className="welcome">
            <div className="welcome__panel">
              <p className="eyebrow">Welcome</p>
              <h2>Oromocto Mission Control</h2>
              <p className="muted">
                You are the duty commander for Oromocto. Build your first station, buy a standard
                unit, and start responding to calls on real roads.
              </p>
              <div className="welcome__steps">
                <div className="welcome__step">
                  <span className="welcome__badge">1</span>
                  <p>Click "Place Station", then choose a spot on the map.</p>
                </div>
                <div className="welcome__step">
                  <span className="welcome__badge">2</span>
                  <p>Buy your first standard unit from the station window.</p>
                </div>
                <div className="welcome__step">
                  <span className="welcome__badge">3</span>
                  <p>Dispatch units to open incidents and keep trust high.</p>
                </div>
              </div>
              <div className="welcome__actions">
                <button
                  className="btn"
                  onClick={() => {
                    setShowWelcome(false)
                    setStationNameDraft(`Station ${nextStationId}`)
                    setPlacingBuildingType(STATION_TYPES.police_station.id)
                    setPlacingStation(true)
                    setPlacingStationPosition(null)
                  }}
                >
                  Place Station
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App

