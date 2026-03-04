export const DEFAULT_CENTER = [45.8497, -66.4758]
export const STATION_COST = 500
export const STATION_COST_SMALL = 250
export const STATION_COST_SPECIALIZED = 1000
export const STATION_COST_HUB = 2500
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
export const ON_SCENE_SECONDS = 45
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
export const KENNEL_COST = 800
export const TRAINING_FATIGUE_REDUCTION = 0.1
export const SHIFT_SECONDS = 600
export const SHIFT_RETURN_THRESHOLD = 0.3
export const FATIGUE_INCREASE_PER_SEC = 0.08
export const FATIGUE_RECOVER_PER_SEC = 0.12
export const SHIFT_RECOVER_PER_SEC = 0.4
export const UPKEEP_INTERVAL_SECONDS = 60
export const UPKEEP_PER_VEHICLE = 18
export const PERSONNEL_UPKEEP_PER_MIN = 2
export const STATION_UPKEEP_PER_MIN = 6
export const DISPATCH_FUEL_COST = 8
export const MULTI_UNIT_UNLOCKED_AT = 8
export const STARTER_PHASE_RESOLVED_LIMIT = 4
export const EARLY_PHASE_RESOLVED_LIMIT = 10
export const PROGRESSION_MILESTONES = {
  trafficUnitUnlockedAt: 4,
  supervisorUnlockedAt: 8,
  precinctUpgradeUnlockedAt: 12,
  fireRescueUnlockedAt: 6,
  emsAdvancedCareUnlockedAt: 6,
  towHeavyRecoveryUnlockedAt: 6,
  fireStationUnlockedAt: 8,
  emsStationUnlockedAt: 16,
  towYardUnlockedAt: 24,
  publicWorksUnlockedAt: 40,
  aviationUnlockAt: 14,
  hubUnlockAt: 30,
}
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
  excellent: { reward: 1.15, trust: 3, score: 0.7 },
  good: { reward: 1.05, trust: 1, score: 0.55 },
  late: { reward: 0.75, trust: -1, score: 0.35 },
  poor: { reward: 0.4, trust: -3, score: 0.2 },
}
export const ETA_LABEL_LIMIT = 599
export const STORAGE_KEY = 'fr2026.save.v2'
export const SAVE_SCHEMA_VERSION = 4
export const APP_VERSION = '0.9.0'

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
    baseSpeed: 55,
  },
  supervisor: {
    label: 'Supervisor',
    cost: 500,
    baseSpeed: 55,
  },
  k9: {
    label: 'K-9 Unit',
    cost: 600,
    baseSpeed: 60,
    department: 'police',
  },
}

export const SKILL_TYPES = {
  tactics: 'tactics',
  suppression: 'suppression',
  medical: 'medical',
  recovery: 'recovery',
}

export const CREW_ROLES = {
  officer: { label: 'Officer', department: 'police', skill: 'tactics' },
  handler: { label: 'K-9 Handler', department: 'police', skill: 'tactics' },
  medic: { label: 'Paramedic', department: 'ems', skill: 'medical' },
  firefighter: { label: 'Firefighter', department: 'fire', skill: 'suppression' },
  operator: { label: 'Tow Operator', department: 'tow', skill: 'recovery' },
}

export const UNIT_LEVEL_CAP = 5
export const XP_PER_RESOLVE = 100
export const XP_PER_LEVEL = 1000
export const MUTUAL_AID_COST = 800
export const MUTUAL_AID_DURATION = 120 // Seconds
export const ESCALATION_CHANCE_PER_TICK = 0.005 // Low chance per tick when time is low
export const RADIO_CODES = {
  dispatch: '10-76', // Enroute
  arrived: '10-23', // Arrived
  clear: '10-8', // Available
  panic: '10-78', // Officer needs assistance (Escalation)
}

export const HOSPITAL_POS = [45.8535, -66.4855]
export const PRECINCT_POS = [45.8485, -66.4755] // Central processing
export const IMPOUND_POS = [45.8625, -66.4625] // Logistics/Tow yard
export const TICKER_SPEED = 45
export const MAJOR_INCIDENT_CHANCE = 0.15 // 15% of spawns are multi-agency

export const MAJOR_INCIDENT_TYPES = {
  'Pile-up Accident': {
    requiredDepartments: ['police', 'fire', 'ems', 'tow'],
    requiredUnits: 4,
    rewardScale: 5,
    priority: 1
  },
  'Structure Fire with Injuries': {
    requiredDepartments: ['fire', 'ems'],
    requiredUnits: 3,
    rewardScale: 3,
    priority: 1
  },
  'Armed Standoff': {
    requiredDepartments: ['police', 'ems'],
    requiredUnits: 3,
    rewardScale: 4,
    priority: 1
  }
}

export const CHAINED_EVENTS = {
  'Structure Fire': [
    { type: 'Smoke Inhalation', chance: 0.7, department: 'ems' },
    { type: 'Fire Scene Investigation', chance: 0.4, department: 'police' }
  ],
  'Vehicle Accident': [
    { type: 'Road Cleanup', chance: 0.6, department: 'tow' },
    { type: 'Major Trauma', chance: 0.3, department: 'ems' }
  ],
  'Armed Robbery': [
    { type: 'Evidence Search', chance: 0.5, department: 'police', needsK9: true },
    { type: 'Victim Assistance', chance: 0.3, department: 'ems' }
  ],
  'Vehicle pursuit': [
    { type: 'Road hazard mitigation', chance: 0.45, department: 'tow' },
    { type: 'Officer Needs Assistance (10-78)', chance: 0.25, department: 'police' },
  ],
  'Multi-vehicle collision': [
    { type: 'Motor Vehicle Crash (Injuries)', chance: 0.5, department: 'ems' },
    { type: 'Roadway Obstruction (Debris)', chance: 0.6, department: 'tow' },
  ],
  'Wildland Fire (Wind Driven)': [
    { type: 'Evacuation support', chance: 0.35, department: 'police' },
    { type: 'Air quality medical checks', chance: 0.3, department: 'ems' },
  ],
  'Downed power lines': [
    { type: 'Power outage neighborhood patrol', chance: 0.45, department: 'police' },
    { type: 'Electrocution (Downed Line)', chance: 0.28, department: 'ems' },
  ],
  'Flooded intersection': [
    { type: 'Flood-Stalled Vehicle Recovery', chance: 0.55, department: 'tow' },
    { type: 'Storm Drain Overflow Response', chance: 0.35, department: 'public_works' },
  ],
  'Heat exhaustion': [
    { type: 'Cooling shelter standby', chance: 0.55, department: 'ems' },
    { type: 'Water distribution point support', chance: 0.25, department: 'public_works' },
  ],
  'Hypothermia / Cold Exposure': [
    { type: 'Shelter transfer assist', chance: 0.45, department: 'ems' },
    { type: 'Snow route obstruction', chance: 0.3, department: 'public_works' },
  ],
  'Pothole Repair (Major Artery)': [
    { type: 'Traffic flow restoration', chance: 0.42, department: 'tow' },
    { type: 'Bridge icing traffic control', chance: 0.25, department: 'police' },
  ],
}

export const TITLES = ['COMMANDER', 'CHIEF', 'DISPATCHER', 'DUTY OFFICER', 'SUPERVISOR']
export const AVATAR_OPTIONS = [
  { id: 'dispatch', path: '/images/headshots/dispatch.png', label: 'Duty Dispatcher' },
  { id: 'officer1', path: '/images/headshots/police_officer_01.png', label: 'Senior Officer' },
  { id: 'officer2', path: '/images/headshots/police_officer_02.png', label: 'Field Officer' },
  { id: 'citizen', path: '/images/headshots/concerned_citizen.png', label: 'Local Contact' },
]

export const RESEARCH_CATALOG = [
  {
    id: 'advanced_dispatch',
    label: 'Advanced Dispatch AI',
    detail: 'Reduces vehicle routing time by 50%.',
    cost: 500,
    category: 'tech'
  },
  {
    id: 'body_cams',
    label: 'Digital Body Cameras',
    detail: 'Increases Public Trust gains by 20%.',
    cost: 1000,
    category: 'tech'
  },
  {
    id: 'hi_vis_sirens',
    label: 'High-Vis LED Sirens',
    detail: 'Increases enroute speed by 10%.',
    cost: 1500,
    category: 'tech'
  },
  {
    id: 'forensic_suite',
    label: 'Forensic Lab Suite',
    detail: 'Increases evidence score for all cases by 15%.',
    cost: 2000,
    category: 'tech'
  },
  {
    id: 'rapid_response',
    label: 'Rapid Response Protocol',
    detail: 'Reduces on-scene turnaround time (cooldown) by 30%.',
    cost: 3000,
    category: 'tech'
  }
]
