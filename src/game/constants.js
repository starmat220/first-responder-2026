export const DEFAULT_CENTER = [45.8497, -66.4758]
export const STATION_COST = 500
export const STATION_MIN_DISTANCE_KM = 1.2
export const VEHICLE_COST = 300
export const DEFAULT_SPEED_KPH = 50
export const SIM_SPEED_OPTIONS = [1, 2, 4, 10]
export const CITY_CORE_RADIUS_KM = 2
export const URBAN_RADIUS_KM = 6
export const RURAL_RADIUS_KM = 15
export const EMERGENCY_SPEED_BONUS = 1.35
export const ZONE_SPEED_LIMITS_KPH = {
  city: 50,
  urban: 50,
  rural: 80,
  highway: 110,
}
export const COOLDOWN_SECONDS = 12
export const INCIDENT_INTERVAL_MS = 36000
export const INCIDENT_RADIUS_KM = 3.5
export const STATION_OPERATION_RADIUS_KM = 2
export const STATION_OPERATION_RADIUS_BONUS_KM = 2
export const ON_SCENE_SECONDS = 25
export const GARAGE_START_CAPACITY = 3
export const GARAGE_UPGRADE_COST = 800
export const GARAGE_UPGRADE_BONUS = 2
export const JAIL_START_CAPACITY = 4
export const PRISON_BUILD_COST = 2500
export const PRISON_START_CAPACITY = 20
export const PRISON_STAFF_CAPACITY_START = 8
export const PRISON_STAFF_HIRE_COUNT = 2
export const PRISON_STAFF_HIRE_COST = 200
export const PRISON_STAFF_UPGRADE_COST = 600
export const PRISON_CAPACITY_UPGRADE_COST = 1200
export const PRISON_CAPACITY_UPGRADE_BONUS = 10
export const HQ_UPGRADE_COST = 1200
export const HQ_RESPONSE_BONUS = 0.05
export const TRAINING_UPGRADE_COST = 700
export const TRAINING_FATIGUE_REDUCTION = 0.1
export const SHIFT_SECONDS = 600
export const SHIFT_RETURN_THRESHOLD = 0.3
export const FATIGUE_INCREASE_PER_SEC = 0.08
export const FATIGUE_RECOVER_PER_SEC = 0.12
export const SHIFT_RECOVER_PER_SEC = 0.4
export const UPKEEP_INTERVAL_SECONDS = 60
export const UPKEEP_PER_VEHICLE = 12
export const PERSONNEL_UPKEEP_PER_MIN = 2
export const STATION_UPKEEP_PER_MIN = 6
export const DISPATCH_FUEL_COST = 8
export const MULTI_UNIT_UNLOCKED_AT = 4
export const LEVEL_SCORE_STEP = 1000
export const PERSONNEL_HIRE_COUNT = 2
export const PERSONNEL_HIRE_COST = 150
export const PERSONNEL_CAPACITY_START = 12
export const PERSONNEL_UPGRADE_COST = 600
export const PERSONNEL_UPGRADE_BONUS = 6
export const SPECIAL_EVENT_SPEED_KPH = 70
export const SPECIAL_EVENT_RADIUS_KM = 5
export const SPECIAL_EVENT_TTL_SECONDS = 180
export const SAVE_SLOT_COUNT = 3
export const UNIT_TYPE_UPKEEP_PER_MIN = {
  patrol: 8,
  traffic: 10,
  supervisor: 12,
  default: 8,
}
export const OVERTIME_UPKEEP_PER_MIN = 4
export const CREW_REQUIREMENTS = {
  patrol: 2,
  traffic: 2,
  supervisor: 1,
}
export const DEFAULT_CREW_REQUIREMENT = 2
export const GRADE_THRESHOLDS = {
  excellent: 0.65,
  good: 1.0,
  late: 1.35,
}
export const GRADE_MULTIPLIERS = {
  excellent: { reward: 1.25, trust: 3, score: 0.7 },
  good: { reward: 1.05, trust: 1, score: 0.55 },
  late: { reward: 0.75, trust: -1, score: 0.35 },
  poor: { reward: 0.4, trust: -3, score: 0.2 },
}
export const ETA_LABEL_LIMIT = 599
export const STORAGE_KEY = 'fr2026.save.v2'
export const SAVE_SCHEMA_VERSION = 3

export const VEHICLE_STATUS = {
  available: 'available',
  off_shift: 'off_shift',
  routing: 'routing',
  enroute: 'enroute',
  on_scene: 'on_scene',
  awaiting_return_route: 'awaiting_return_route',
  returning: 'returning',
  cooldown: 'cooldown',
}

export const INCIDENT_STATUS = {
  open: 'open',
  responding: 'responding',
  on_scene: 'on_scene',
  resolved: 'resolved',
  missed: 'missed',
}

export const VALID_VEHICLE_STATUSES = new Set(Object.values(VEHICLE_STATUS))
export const VALID_INCIDENT_STATUSES = new Set(Object.values(INCIDENT_STATUS))
export const DISPATCHABLE_STATUSES = new Set([
  VEHICLE_STATUS.available,
  VEHICLE_STATUS.returning,
])

export const UNIT_TYPES = {
  patrol: {
    label: 'Standard',
    cost: VEHICLE_COST,
    baseSpeed: DEFAULT_SPEED_KPH,
  },
  traffic: {
    label: 'Traffic',
    cost: 400,
    baseSpeed: 45,
  },
  supervisor: {
    label: 'Supervisor',
    cost: 500,
    baseSpeed: 55,
  },
}
