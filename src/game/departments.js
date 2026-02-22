export const DEPARTMENTS = {
  police: {
    id: 'police',
    label: 'Police',
    shortLabel: 'PD',
  },
  fire: {
    id: 'fire',
    label: 'Fire',
    shortLabel: 'FD',
  },
  ems: {
    id: 'ems',
    label: 'EMS',
    shortLabel: 'EMS',
  },
  tow: {
    id: 'tow',
    label: 'Tow',
    shortLabel: 'TOW',
  },
}

export const DEFAULT_DEPARTMENT_ID = DEPARTMENTS.police.id

export const STATION_TYPES = {
  police_station: {
    id: 'police_station',
    label: 'Police Station',
    department: DEPARTMENTS.police.id,
  },
  fire_station: {
    id: 'fire_station',
    label: 'Fire Station',
    department: DEPARTMENTS.fire.id,
  },
  ems_station: {
    id: 'ems_station',
    label: 'EMS Station',
    department: DEPARTMENTS.ems.id,
  },
  tow_yard: {
    id: 'tow_yard',
    label: 'Tow Yard',
    department: DEPARTMENTS.tow.id,
  },
  prison: {
    id: 'prison',
    label: 'Prison Facility',
    department: null,
  },
}

export const getDepartment = (departmentId) =>
  DEPARTMENTS[departmentId] || DEPARTMENTS[DEFAULT_DEPARTMENT_ID]
