import { DEFAULT_SPEED_KPH, UNIT_TYPES, VEHICLE_COST } from './constants'
import { DEPARTMENTS, STATION_TYPES } from './departments'

export const UNIT_CATALOG = [
  {
    id: 'patrol',
    label: 'Standard',
    department: DEPARTMENTS.police.id,
    stationType: STATION_TYPES.police_station.id,
    cost: UNIT_TYPES.patrol?.cost ?? VEHICLE_COST,
    baseSpeed: 50,
    unlockKey: null,
  },
  {
    id: 'traffic',
    label: 'Traffic',
    department: DEPARTMENTS.police.id,
    stationType: STATION_TYPES.police_station.id,
    cost: UNIT_TYPES.traffic?.cost ?? 400,
    baseSpeed: 55,
    unlockKey: 'trafficUnitUnlocked',
  },
  {
    id: 'supervisor',
    label: 'Supervisor',
    department: DEPARTMENTS.police.id,
    stationType: STATION_TYPES.police_station.id,
    cost: UNIT_TYPES.supervisor?.cost ?? 500,
    baseSpeed: 55,
    unlockKey: 'supervisorUnlocked',
  },
  {
    id: 'k9',
    label: 'K-9 Unit',
    department: DEPARTMENTS.police.id,
    stationType: STATION_TYPES.police_station.id,
    cost: 600,
    baseSpeed: 60,
    unlockKey: 'supervisorUnlocked',
    unlockRequirements: {
      requiredHook: 'specializationDoctrineUnlocked',
      requiredSpecializationAssignments: 1,
    },
  },
  {
    id: 'engine',
    label: 'Fire Engine',
    department: DEPARTMENTS.fire.id,
    stationType: STATION_TYPES.fire_station.id,
    cost: 650,
    baseSpeed: 50,
    unlockKey: null,
  },
  {
    id: 'ambulance',
    label: 'Ambulance',
    department: DEPARTMENTS.ems.id,
    stationType: STATION_TYPES.ems_station.id,
    cost: 550,
    baseSpeed: 60,
    unlockKey: null,
  },
  {
    id: 'tow_truck',
    label: 'Tow Truck',
    department: DEPARTMENTS.tow.id,
    stationType: STATION_TYPES.tow_yard.id,
    cost: 500,
    baseSpeed: 55,
    unlockKey: null,
  },
  // New Specialized Units
  {
    id: 'police_helicopter',
    label: 'Police Helicopter',
    department: DEPARTMENTS.police.id,
    stationType: STATION_TYPES.police_aviation.id,
    cost: 1500,
    baseSpeed: 120, // Very fast
    isAviation: true,
    unlockRequirements: {
      minLevel: 6,
      minResolved: 32,
      requiredHook: 'liveOpsNetworkUnlocked',
      requiredSpecializationAssignments: 2,
    },
  },
  {
    id: 'med_helicopter',
    label: 'Medical Helicopter',
    department: DEPARTMENTS.ems.id,
    stationType: STATION_TYPES.med_helicopter.id,
    cost: 1500,
    baseSpeed: 130,
    isAviation: true,
    unlockRequirements: {
      minLevel: 6,
      minResolved: 34,
      requiredHook: 'liveOpsNetworkUnlocked',
      requiredSpecializationAssignments: 2,
    },
  },
  {
    id: 'fire_plane',
    label: 'Firefighting Plane',
    department: DEPARTMENTS.fire.id,
    stationType: STATION_TYPES.fire_plane_station.id,
    cost: 2000,
    baseSpeed: 150,
    isAviation: true,
    unlockRequirements: {
      minLevel: 7,
      minResolved: 40,
      requiredHook: 'liveOpsNetworkUnlocked',
      requiredSpecializationAssignments: 3,
    },
  },
  {
    id: 'rescue_boat',
    label: 'Rescue Boat',
    department: DEPARTMENTS.coastal.id,
    stationType: STATION_TYPES.rescue_boat_dock.id,
    cost: 800,
    baseSpeed: 40,
    isWater: true,
    unlockRequirements: {
      minLevel: 5,
      minResolved: 26,
      requiredHook: 'incidentChainProtocolUnlocked',
      requiredSpecializationAssignments: 1,
    },
  },
  {
    id: 'fire_boat',
    label: 'Fire Boat',
    department: DEPARTMENTS.fire.id,
    stationType: STATION_TYPES.fire_boat_dock.id,
    cost: 1000,
    baseSpeed: 35,
    isWater: true,
    unlockRequirements: {
      minLevel: 6,
      minResolved: 30,
      requiredHook: 'incidentChainProtocolUnlocked',
      requiredSpecializationAssignments: 2,
    },
  },
  {
    id: 'utility_truck',
    label: 'Utility Truck',
    department: DEPARTMENTS.public_works.id,
    stationType: STATION_TYPES.pw_depot.id,
    cost: 450,
    baseSpeed: 45,
    unlockKey: null,
  },
  {
    id: 'heavy_machinery',
    label: 'Heavy Machinery',
    department: DEPARTMENTS.public_works.id,
    stationType: STATION_TYPES.pw_depot.id,
    cost: 1200,
    baseSpeed: 30,
    unlockKey: 'heavyMachineryUnlocked',
    unlockRequirements: {
      minLevel: 7,
      minResolved: 44,
      requiredHook: 'liveOpsNetworkUnlocked',
      requiredSpecializationAssignments: 2,
    },
  },
]

export const BUILDING_CATALOG = [
  // Police
  { id: STATION_TYPES.police_station.id, label: 'Police Station', department: 'police', category: 'station' },
  { id: STATION_TYPES.police_station_small.id, label: 'Small Police Station', department: 'police', category: 'station' },
  { id: STATION_TYPES.police_academy.id, label: 'Police Academy', department: 'police', category: 'training' },
  { id: STATION_TYPES.police_aviation.id, label: 'Police Aviation', department: 'police', category: 'aviation' },
  { id: STATION_TYPES.federal_police.id, label: 'Federal Police Station', department: 'police', category: 'station' },

  // Fire
  { id: STATION_TYPES.fire_station.id, label: 'Fire Station', department: 'fire', category: 'station' },
  { id: STATION_TYPES.fire_station_small.id, label: 'Small Fire Station', department: 'fire', category: 'station' },
  { id: STATION_TYPES.fire_academy.id, label: 'Fire Academy', department: 'fire', category: 'training' },
  { id: STATION_TYPES.fire_boat_dock.id, label: 'Fire Boat Dock', department: 'fire', category: 'water' },
  { id: STATION_TYPES.fire_plane_station.id, label: 'Firefighting Plane Station', department: 'fire', category: 'aviation' },
  { id: STATION_TYPES.fire_marshal.id, label: "Fire Marshal's Office", department: 'fire', category: 'station' },

  // EMS
  { id: STATION_TYPES.ems_station.id, label: 'Ambulance Station', department: 'ems', category: 'station' },
  { id: STATION_TYPES.ems_station_small.id, label: 'Small Ambulance Station', department: 'ems', category: 'station' },
  { id: STATION_TYPES.ems_academy.id, label: 'EMS Academy', department: 'ems', category: 'training' },
  { id: STATION_TYPES.hospital.id, label: 'Hospital', department: 'ems', category: 'medical' },
  { id: STATION_TYPES.clinic.id, label: 'Clinic', department: 'ems', category: 'medical' },
  { id: STATION_TYPES.med_helicopter.id, label: 'Med Helicopter Station', department: 'ems', category: 'aviation' },

  // Coastal
  { id: STATION_TYPES.coastal_rescue.id, label: 'Coastal Rescue Station', department: 'coastal', category: 'station' },
  { id: STATION_TYPES.lifeguard_post.id, label: 'Lifeguard Post', department: 'coastal', category: 'station' },
  { id: STATION_TYPES.coastal_school.id, label: 'Coastal Rescue School', department: 'coastal', category: 'training' },
  { id: STATION_TYPES.coastal_air.id, label: 'Coastal Air Station', department: 'coastal', category: 'aviation' },
  { id: STATION_TYPES.rescue_boat_dock.id, label: 'Rescue Boat Dock', department: 'coastal', category: 'water' },

  // Logistics
  { id: STATION_TYPES.dispatch_center.id, label: 'Dispatch Center', department: 'logistics', category: 'logistics' },
  { id: STATION_TYPES.staging_area.id, label: 'Staging Area', department: 'logistics', category: 'logistics' },

  { id: STATION_TYPES.prison.id, label: 'Prison', department: 'police', category: 'detention' },
  { id: STATION_TYPES.tow_yard.id, label: 'Tow Truck Station', department: 'tow', category: 'station' },

  // Public Works
  { id: STATION_TYPES.pw_depot.id, label: 'Public Works Depot', department: 'public_works', category: 'station' },
  { id: STATION_TYPES.pw_outpost.id, label: 'Public Works Outpost', department: 'public_works', category: 'station' },
]

export const getUnitsByDepartment = (departmentId) =>
  UNIT_CATALOG.filter((unit) => unit.department === departmentId)

export const getUnitById = (unitId) =>
  UNIT_CATALOG.find((unit) => unit.id === unitId) || UNIT_CATALOG[0]

export const toUnitTypeMap = (departmentId = DEPARTMENTS.police.id) =>
  Object.fromEntries(
    getUnitsByDepartment(departmentId).map((unit) => [unit.id, unit])
  )

export const isUnitUnlocked = (unit, progression = {}) =>
  (() => {
    if (unit.unlockKey && !progression[unit.unlockKey]) return false
    const requirements = unit.unlockRequirements || {}
    if ((Number(requirements.minResolved) || 0) > (Number(progression.resolvedCount) || 0)) {
      return false
    }
    if ((Number(requirements.minLevel) || 0) > (Number(progression.playerLevel) || 1)) {
      return false
    }
    if (
      requirements.requiredHook &&
      !progression[requirements.requiredHook]
    ) {
      return false
    }
    if (
      (Number(requirements.requiredSpecializationAssignments) || 0) >
      (Number(progression.specializedStationsCount) || 0)
    ) {
      return false
    }
    return true
  })()
