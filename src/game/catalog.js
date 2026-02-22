import { DEFAULT_SPEED_KPH, UNIT_TYPES, VEHICLE_COST } from './constants'
import { DEPARTMENTS, STATION_TYPES } from './departments'

export const UNIT_CATALOG = [
  {
    id: 'patrol',
    label: 'Standard',
    department: DEPARTMENTS.police.id,
    stationType: STATION_TYPES.police_station.id,
    cost: UNIT_TYPES.patrol?.cost ?? VEHICLE_COST,
    baseSpeed: UNIT_TYPES.patrol?.baseSpeed ?? DEFAULT_SPEED_KPH,
    unlockKey: null,
  },
  {
    id: 'traffic',
    label: 'Traffic',
    department: DEPARTMENTS.police.id,
    stationType: STATION_TYPES.police_station.id,
    cost: UNIT_TYPES.traffic?.cost ?? 400,
    baseSpeed: UNIT_TYPES.traffic?.baseSpeed ?? 45,
    unlockKey: 'trafficUnitUnlocked',
  },
  {
    id: 'supervisor',
    label: 'Supervisor',
    department: DEPARTMENTS.police.id,
    stationType: STATION_TYPES.police_station.id,
    cost: UNIT_TYPES.supervisor?.cost ?? 500,
    baseSpeed: UNIT_TYPES.supervisor?.baseSpeed ?? 55,
    unlockKey: 'supervisorUnlocked',
  },
  {
    id: 'engine',
    label: 'Fire Engine',
    department: DEPARTMENTS.fire.id,
    stationType: STATION_TYPES.fire_station.id,
    cost: 650,
    baseSpeed: 45,
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
]

export const BUILDING_CATALOG = [
  {
    id: STATION_TYPES.police_station.id,
    label: STATION_TYPES.police_station.label,
    department: DEPARTMENTS.police.id,
    category: 'station',
  },
  {
    id: STATION_TYPES.fire_station.id,
    label: STATION_TYPES.fire_station.label,
    department: DEPARTMENTS.fire.id,
    category: 'station',
  },
  {
    id: STATION_TYPES.ems_station.id,
    label: STATION_TYPES.ems_station.label,
    department: DEPARTMENTS.ems.id,
    category: 'station',
  },
  {
    id: STATION_TYPES.tow_yard.id,
    label: STATION_TYPES.tow_yard.label,
    department: DEPARTMENTS.tow.id,
    category: 'station',
  },
  {
    id: STATION_TYPES.prison.id,
    label: STATION_TYPES.prison.label,
    department: null,
    category: 'detention',
  },
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
  !unit.unlockKey || Boolean(progression[unit.unlockKey])
