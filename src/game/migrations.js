import { SAVE_SCHEMA_VERSION } from './constants'
import { getMissionDayKey } from './missions'
import { createInitialWeather } from './weather'
import { DEFAULT_CENTER } from './constants'
import { createInitialDepartmentReputation } from './reputation'
import { normalizeUnlockedProgressionHooks } from './progressionHooks'
import { createInitialCampaignState, normalizeCampaignState } from './campaign'
import { getImpoundCapacityForStationType, getPatientCapacityForStationType } from './departments'

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value)

const normalizeUiState = (uiState = {}) => ({
  stationPanelTab: uiState.stationPanelTab || 'overview',
  showLayers: Boolean(uiState.showLayers),
  showCases: Boolean(uiState.showCases),
  showTelemetry: Boolean(uiState.showTelemetry),
  showResearch: Boolean(uiState.showResearch),
  tuningPresetId: uiState.tuningPresetId || 'standard',
  incidentFilters: isObject(uiState.incidentFilters)
    ? uiState.incidentFilters
    : {
      type: 'all',
      department: 'all',
      onlyActiveDepartment: false,
      priority: { 1: true, 2: true, 3: true },
      sort: 'priority',
      isCompact: false,
    },
  showNextSteps: uiState.showNextSteps !== false,
  rememberWindowPositions: Boolean(uiState.rememberWindowPositions),
  accessibilityState: {
    highContrastMode: Boolean(uiState?.accessibilityState?.highContrastMode),
    reducedMotionMode: Boolean(uiState?.accessibilityState?.reducedMotionMode),
    largeTextMode: Boolean(uiState?.accessibilityState?.largeTextMode),
    colorAssistMode: Boolean(uiState?.accessibilityState?.colorAssistMode),
  },
  tutorialFlags: isObject(uiState.tutorialFlags) ? uiState.tutorialFlags : {},
})

const normalizeEconomyReliefState = (state, missionDayKey) => {
  if (!isObject(state)) {
    return {
      dayKey: missionDayKey || getMissionDayKey(),
      grantsToday: 0,
    }
  }
  return {
    dayKey:
      typeof state.dayKey === 'string' && state.dayKey
        ? state.dayKey
        : missionDayKey || getMissionDayKey(),
    grantsToday: Math.max(0, Math.floor(Number(state.grantsToday) || 0)),
  }
}

const migrateToV2 = (saveData) => {
  const migrated = { ...saveData }
  if (!Array.isArray(migrated.stations)) migrated.stations = []
  migrated.stations = migrated.stations.map((station, index) => ({
    ...(station || {}),
    id: Number(station?.id) || index + 1,
    name: station?.name || `Station ${index + 1}`,
    stationType: station?.stationType || 'police_station',
    department: station?.department || 'police',
    position: Array.isArray(station?.position) ? station.position : DEFAULT_CENTER,
    level: Number(station?.level) || 1,
    garageCapacity: Number(station?.garageCapacity) || 3,
    responseBonus: Number(station?.responseBonus) || 0,
    trainingBonus: Number(station?.trainingBonus) || 0,
    operationRadiusKm: Number(station?.operationRadiusKm) || 2,
    shiftPreset: station?.shiftPreset || '24_7',
    minOnDutyDay: Number(station?.minOnDutyDay) || 1,
    minOnDutyNight: Number(station?.minOnDutyNight) || 1,
    personnelAssigned: Number(station?.personnelAssigned) || 2,
    personnelCapacity: Number(station?.personnelCapacity) || 12,
    jailCapacity: Number(station?.jailCapacity) || 3,
    jailCount: Number(station?.jailCount) || 0,
    detentionLog: Array.isArray(station?.detentionLog) ? station.detentionLog : [],
    patientCapacity:
      Number(station?.patientCapacity) ||
      getPatientCapacityForStationType(station?.stationType || 'police_station'),
    patientCount: Number(station?.patientCount) || 0,
    patientLog: Array.isArray(station?.patientLog) ? station.patientLog : [],
    activePatients: Array.isArray(station?.activePatients) ? station.activePatients : [],
    crewMembers: Array.isArray(station?.crewMembers) ? station.crewMembers : [],
    specialization:
      typeof station?.specialization === 'string' && station.specialization
        ? station.specialization
        : 'standard',
  }))
  if (!Array.isArray(migrated.vehicles)) migrated.vehicles = []
  if (!Array.isArray(migrated.incidents)) migrated.incidents = []
  if (!Array.isArray(migrated.transactions)) migrated.transactions = []
  if (!Array.isArray(migrated.debriefs)) migrated.debriefs = []
  if (!Array.isArray(migrated.cases)) migrated.cases = []
  if (!Array.isArray(migrated.prisons)) migrated.prisons = []
  migrated.uiState = normalizeUiState(migrated.uiState)
  return migrated
}

const migrateToV3 = (saveData) => {
  const migrated = { ...saveData }
  if (!migrated.weather || !isObject(migrated.weather)) {
    const firstStationPos = Array.isArray(migrated?.stations?.[0]?.position)
      ? migrated.stations[0].position
      : DEFAULT_CENTER
    migrated.weather = createInitialWeather(firstStationPos)
  }
  if (!isObject(migrated.operationsStreak)) {
    migrated.operationsStreak = {
      successfulDays: 0,
      bestStreak: 0,
      lastEvaluatedDay: null,
    }
  }
  if (!migrated.missionDayKey) migrated.missionDayKey = getMissionDayKey()
  if (!Array.isArray(migrated.dailyGoals)) migrated.dailyGoals = []
  return migrated
}

const migrateToV4 = (saveData) => {
  const migrated = { ...saveData }
  migrated.departmentReputation = createInitialDepartmentReputation(migrated.departmentReputation)
  migrated.progressionHooksUnlocked = normalizeUnlockedProgressionHooks(
    migrated.progressionHooksUnlocked
  )
  if (!isObject(migrated.mutualAidState)) {
    migrated.mutualAidState = {
      cooldownUntil: 0,
      usesToday: 0,
      dayKey: migrated.missionDayKey || getMissionDayKey(),
    }
  } else {
    migrated.mutualAidState = {
      cooldownUntil: Math.max(0, Number(migrated.mutualAidState.cooldownUntil) || 0),
      usesToday: Math.max(0, Number(migrated.mutualAidState.usesToday) || 0),
      dayKey:
        typeof migrated.mutualAidState.dayKey === 'string' && migrated.mutualAidState.dayKey
          ? migrated.mutualAidState.dayKey
          : migrated.missionDayKey || getMissionDayKey(),
    }
  }
  migrated.liveEvent = isObject(migrated.liveEvent) ? migrated.liveEvent : null
  migrated.campaignState = normalizeCampaignState(
    migrated.campaignState || createInitialCampaignState()
  )
  migrated.economyReliefState = normalizeEconomyReliefState(
    migrated.economyReliefState,
    migrated.missionDayKey
  )
  migrated.uiState = normalizeUiState(migrated.uiState)
  return migrated
}

const migrateToV5 = (saveData) => {
  const migrated = { ...saveData }
  if (!Array.isArray(migrated.stations)) migrated.stations = []
  migrated.stations = migrated.stations.map((station) => ({
    ...(station || {}),
    impoundCapacity:
      Number(station?.impoundCapacity) ||
      getImpoundCapacityForStationType(station?.stationType || 'police_station'),
    impoundCount: Math.max(0, Number(station?.impoundCount) || 0),
    activeImpounds: Array.isArray(station?.activeImpounds) ? station.activeImpounds : [],
    impoundLog: Array.isArray(station?.impoundLog) ? station.impoundLog : [],
  }))
  return migrated
}

const MIGRATIONS = {
  2: migrateToV2,
  3: migrateToV3,
  4: migrateToV4,
  5: migrateToV5,
}

export const migrateSaveData = (input, targetSchemaVersion = SAVE_SCHEMA_VERSION) => {
  const source = isObject(input) ? { ...input } : {}
  let working = source
  let schemaVersion = Math.max(1, Number(source.schemaVersion) || 1)

  for (let version = schemaVersion + 1; version <= targetSchemaVersion; version += 1) {
    const migration = MIGRATIONS[version]
    if (migration) {
      working = migration(working)
    }
    schemaVersion = version
    working.schemaVersion = schemaVersion
  }

  // Even if schema is already at/above target, normalize critical shape.
  if (schemaVersion >= 5) {
    working = migrateToV5(migrateToV4(working))
    working.schemaVersion = Math.max(schemaVersion, 5)
  } else if (schemaVersion >= 4) {
    working = migrateToV4(working)
    working.schemaVersion = Math.max(schemaVersion, 4)
  }

  if (!working.schemaVersion) {
    working.schemaVersion = targetSchemaVersion
  }

  return working
}
