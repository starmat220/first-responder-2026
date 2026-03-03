import { 
  DEFAULT_CENTER, 
  PERSONNEL_CAPACITY_START, 
  PERSONNEL_HIRE_COUNT,
  JAIL_START_CAPACITY,
  STATION_OPERATION_RADIUS_KM,
  STATION_OPERATION_RADIUS_BONUS_KM,
  GARAGE_START_CAPACITY,
  SHIFT_SECONDS,
  DEFAULT_SPEED_KPH,
  VALID_VEHICLE_STATUSES,
  VALID_INCIDENT_STATUSES,
  VEHICLE_STATUS,
  INCIDENT_STATUS,
  ON_SCENE_SECONDS
} from './constants'
import { sanitizePosition } from './geo'
import { getUnitById } from './catalog'
import { getCrewRequirement } from './crew'
import { STATION_TYPES, DEPARTMENTS, DEFAULT_DEPARTMENT_ID } from './departments'
import { getPriorityConfig } from '../config/priority'
import { clamp } from './utils'
import { WEATHER_CONDITIONS } from './weather'

const normalizeCrewMember = (member, departmentId) => {
  if (!member || typeof member !== 'object') return null
  const sourceSkills = member.skills || member.stats || {}
  const normalizedSkills = {
    driving: Math.max(1, Math.min(10, Number(sourceSkills.driving) || 1)),
    tactics: Math.max(1, Math.min(10, Number(sourceSkills.tactics) || 1)),
    suppression: Math.max(1, Math.min(10, Number(sourceSkills.suppression) || 1)),
    medical: Math.max(1, Math.min(10, Number(sourceSkills.medical) || 1)),
    recovery: Math.max(1, Math.min(10, Number(sourceSkills.recovery) || 1)),
  }

  return {
    id: member.id || `crew-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: member.name || 'Unnamed Responder',
    department: member.department || departmentId || DEFAULT_DEPARTMENT_ID,
    skills: normalizedSkills,
    stats: normalizedSkills,
    role: member.role || 'Responder',
    level: Math.max(1, Number(member.level) || 1),
    xp: Math.max(0, Number(member.xp) || 0),
    trait: member.trait || 'resilient',
    certifications: Array.isArray(member.certifications) ? member.certifications : [],
    status: member.status || 'available',
    assignedVehicleId: Number(member.assignedVehicleId) || null,
    fatigue: clamp(Number(member.fatigue) || 0, 0, 100),
    stress: clamp(Number(member.stress) || 0, 0, 100),
    shiftRemaining: Number.isFinite(member.shiftRemaining) ? Number(member.shiftRemaining) : 100,
  }
}

export const normalizeStation = (stationItem, index) => {
  if (!stationItem?.position) return null
  const id = Number(stationItem.id) || index + 1
  const level = Number(stationItem.level) || 1
  const capacity = Number(stationItem.personnelCapacity) || PERSONNEL_CAPACITY_START
  const assignedRaw = Number(stationItem.personnelAssigned)
  const assigned = Number.isFinite(assignedRaw) ? assignedRaw : Math.min(PERSONNEL_HIRE_COUNT, capacity)
  
  // Advanced Crew: Handle crewMembers array
  const crewMembers = Array.isArray(stationItem.crewMembers)
    ? stationItem.crewMembers
      .map((member) => normalizeCrewMember(member, stationItem.department))
      .filter(Boolean)
    : []
  
  // Infer type if missing
  let stationType = stationItem.stationType || STATION_TYPES.police_station.id
  let department = stationItem.department || DEFAULT_DEPARTMENT_ID
  
  return {
    id,
    name: stationItem.name || `Station ${id}`,
    stationType,
    department,
    position: sanitizePosition(stationItem.position, DEFAULT_CENTER),
    level,
    garageCapacity: Number(stationItem.garageCapacity) || GARAGE_START_CAPACITY,
    responseBonus: Number(stationItem.responseBonus) || 0,
    trainingBonus: Number(stationItem.trainingBonus) || 0,
    operationRadiusKm: Number(stationItem.operationRadiusKm) || (STATION_OPERATION_RADIUS_KM + Math.max(0, level - 1) * STATION_OPERATION_RADIUS_BONUS_KM),
    shiftPreset: stationItem.shiftPreset || '24_7',
    minOnDutyDay: Number(stationItem.minOnDutyDay) || 1,
    minOnDutyNight: Number(stationItem.minOnDutyNight) || 1,
    personnelAssigned: clamp(assigned, 0, capacity),
    personnelCapacity: capacity,
    crewMembers,
    jailCapacity: Number(stationItem.jailCapacity) || JAIL_START_CAPACITY,
    jailCount: Math.max(0, Number(stationItem.jailCount) || 0),
    detentionLog: Array.isArray(stationItem.detentionLog) ? stationItem.detentionLog : [],
  }
}

export const normalizeVehicle = (vehicle, primaryStationPosition = DEFAULT_CENTER) => {
  const id = Number(vehicle.id)
  if (!Number.isFinite(id) || id <= 0) return null
  
  const unitType = vehicle.unitType || 'patrol'
  const unitConfig = getUnitById(unitType)
  const status = VALID_VEHICLE_STATUSES.has(vehicle.status) ? vehicle.status : VEHICLE_STATUS.available
  const normalizedStatus = status === VEHICLE_STATUS.routing ? VEHICLE_STATUS.available : status
  
  // Advanced Crew: assignedCrewIds
  const assignedCrewIds = Array.isArray(vehicle.assignedCrewIds) ? vehicle.assignedCrewIds : []

  return {
    id,
    name: vehicle.name || `Unit ${id}`,
    unitType,
    department: vehicle.department || unitConfig?.department || DEFAULT_DEPARTMENT_ID,
    status: normalizedStatus,
    position: sanitizePosition(vehicle.position, primaryStationPosition),
    speedKph: Number(vehicle.speedKph) || unitConfig?.baseSpeed || DEFAULT_SPEED_KPH,
    routeData: null,
    progressMeters: 0,
    etaSeconds: 0,
    currentSpeedKph: Number(vehicle.currentSpeedKph) || 0,
    assignedIncidentId: Number(vehicle.assignedIncidentId) || null,
    onSceneRemaining: Number(vehicle.onSceneRemaining) || 0,
    targetPosition: vehicle.targetPosition ? sanitizePosition(vehicle.targetPosition, primaryStationPosition) : null,
    progressRatio: Number(vehicle.progressRatio) || 0,
    routingStartedAt: null,
    parked: typeof vehicle.parked === 'boolean' ? vehicle.parked : normalizedStatus === VEHICLE_STATUS.available,
    cooldownRemaining: Number(vehicle.cooldownRemaining) || 0,
    fatigue: Number(vehicle.fatigue) || 0,
    shiftRemaining: Number.isFinite(vehicle.shiftRemaining) ? Number(vehicle.shiftRemaining) : SHIFT_SECONDS,
    crewRequired: Number(vehicle.crewRequired) || getCrewRequirement(unitType),
    crewAssigned: assignedCrewIds.length,
    assignedCrewIds,
    homeStationId: Number(vehicle.homeStationId) || 1,
    returnDestinationType: vehicle.returnDestinationType || null,
    returnDestinationId: Number(vehicle.returnDestinationId) || null,
    returnIncidentType: vehicle.returnIncidentType || null,
    xp: Number(vehicle.xp) || 0,
    level: Number(vehicle.level) || 1,
  }
}

export const normalizeIncident = (incident, fallbackPos = DEFAULT_CENTER) => {
  const id = Number(incident.id)
  if (!Number.isFinite(id) || id <= 0) return null
  
  const priority = Number(incident.priority) || 2
  return {
    id,
    type: incident.type || 'Call for service',
    position: sanitizePosition(incident.position, fallbackPos),
    address: incident.address || 'Local Road',
    caller: incident.caller || 'Unknown',
    status: VALID_INCIDENT_STATUSES.has(incident.status) ? incident.status : INCIDENT_STATUS.open,
    createdAt: incident.createdAt || Date.now(),
    assignedVehicleIds: Array.isArray(incident.assignedVehicleIds) ? incident.assignedVehicleIds : [],
    onSceneVehicleIds: Array.isArray(incident.onSceneVehicleIds) ? incident.onSceneVehicleIds : [],
    etaSeconds: Number(incident.etaSeconds) || 0,
    onSceneRemaining: Number(incident.onSceneRemaining) || ON_SCENE_SECONDS,
    priority,
    requiredUnits: Number(incident.requiredUnits) || 1,
    requiredUnitType: incident.requiredUnitType || null,
    requiredDepartment: incident.requiredDepartment || DEFAULT_DEPARTMENT_ID,
    responseTargetSeconds: Number(incident.responseTargetSeconds) || getPriorityConfig(priority).responseTargetSeconds,
    rewardMultiplier: Number(incident.rewardMultiplier) || 1,
    missPenaltyMultiplier: Number(incident.missPenaltyMultiplier) || 1,
    onSceneDurationSeconds: Number(incident.onSceneDurationSeconds) || ON_SCENE_SECONDS,
    dispatchedAt: Number(incident.dispatchedAt) || null,
    arrivedAt: Number(incident.arrivedAt) || null,
    responseSeconds: Number(incident.responseSeconds) || null,
    timeRemaining: Number(incident.timeRemaining) || null,
    stage: Number(incident.stage) || 1,
    stageLabel: incident.stageLabel || null,
    stageTotal: Number(incident.stageTotal) || 1,
    followUpPlan: incident.followUpPlan || null,
    queuedFollowUps: Array.isArray(incident.queuedFollowUps) ? incident.queuedFollowUps : [],
    followUpGenerated: Boolean(incident.followUpGenerated),
    awaitingFollowUp: Boolean(incident.awaitingFollowUp),
    parentIncidentId: Number(incident.parentIncidentId) || null,
    caseId: Number(incident.caseId) || id,
    caseScore: Number(incident.caseScore) || 0,
    caseNotes: Array.isArray(incident.caseNotes) ? incident.caseNotes : [],
    requiresDetention: Boolean(incident.requiresDetention),
  }
}

export const normalizeWeather = (weather, fallbackPos = DEFAULT_CENTER) => {
  if (!weather || typeof weather !== 'object') return null
  const condition = WEATHER_CONDITIONS[weather.condition] ? weather.condition : 'clear'
  return {
    position: sanitizePosition(weather.position, fallbackPos),
    climateZone: weather.climateZone || 'temperate',
    season: weather.season || 'summer',
    condition,
    intensity: clamp(Number(weather.intensity) || 0.2, 0, 1),
    temperatureC: Number.isFinite(Number(weather.temperatureC))
      ? Number(weather.temperatureC)
      : 20,
    updatedAt: Number(weather.updatedAt) || Date.now(),
    nextUpdateAt: Number(weather.nextUpdateAt) || Date.now() + 180000,
  }
}
