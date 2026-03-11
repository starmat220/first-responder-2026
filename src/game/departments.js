export const DEPARTMENTS = {
  police: { id: 'police', label: 'Police', shortLabel: 'PD' },
  fire: { id: 'fire', label: 'Fire', shortLabel: 'FD' },
  ems: { id: 'ems', label: 'EMS', shortLabel: 'EMS' },
  tow: { id: 'tow', label: 'Tow', shortLabel: 'TOW' },
  coastal: { id: 'coastal', label: 'Coastal Rescue', shortLabel: 'CR' },
  public_works: { id: 'public_works', label: 'Public Works', shortLabel: 'PW' },
  logistics: { id: 'logistics', label: 'Logistics', shortLabel: 'LOG' },
}

export const DEFAULT_DEPARTMENT_ID = DEPARTMENTS.police.id

export const STATION_TYPES = {
  // Police
  police_station: { id: 'police_station', label: 'Police Station', department: 'police', size: 'large' },
  police_station_small: { id: 'police_station_small', label: 'Police Post (Small)', department: 'police', size: 'small' },
  police_academy: { id: 'police_academy', label: 'Police Academy', department: 'police', category: 'training' },
  police_aviation: { id: 'police_aviation', label: 'Police Aviation', department: 'police', category: 'aviation' },
  federal_police: { id: 'federal_police', label: 'Federal Police Station', department: 'police', size: 'elite' },

  // Fire
  fire_station: { id: 'fire_station', label: 'Fire Station', department: 'fire', size: 'large' },
  fire_station_small: { id: 'fire_station_small', label: 'Fire Post (Small)', department: 'fire', size: 'small' },
  fire_academy: { id: 'fire_academy', label: 'Fire Academy', department: 'fire', category: 'training' },
  fire_boat_dock: { id: 'fire_boat_dock', label: 'Fire Boat Dock', department: 'fire', category: 'water' },
  fire_plane_station: { id: 'fire_plane_station', label: 'Firefighting Plane Station', department: 'fire', category: 'aviation' },
  fire_marshal: { id: 'fire_marshal', label: "Fire Marshal's Office", department: 'fire', category: 'investigation' },

  // EMS
  ems_station: { id: 'ems_station', label: 'Ambulance Station', department: 'ems', size: 'large' },
  ems_station_small: { id: 'ems_station_small', label: 'Ambulance Post (Small)', department: 'ems', size: 'small' },
  ems_academy: { id: 'ems_academy', label: 'Rescue (EMS) Academy', department: 'ems', category: 'training' },
  hospital: { id: 'hospital', label: 'Hospital', department: 'ems', category: 'medical_hub' },
  clinic: { id: 'clinic', label: 'Clinic', department: 'ems', category: 'medical_outpost' },
  med_helicopter: { id: 'med_helicopter', label: 'Medical Helicopter Station', department: 'ems', category: 'aviation' },

  // Coastal
  coastal_rescue: { id: 'coastal_rescue', label: 'Coastal Rescue Station', department: 'coastal', size: 'large' },
  lifeguard_post: { id: 'lifeguard_post', label: 'Lifeguard Post', department: 'coastal', size: 'small' },
  coastal_school: { id: 'coastal_school', label: 'Coastal Rescue School', department: 'coastal', category: 'training' },
  coastal_air: { id: 'coastal_air', label: 'Coastal Air Station', department: 'coastal', category: 'aviation' },
  rescue_boat_dock: { id: 'rescue_boat_dock', label: 'Rescue Boat Dock', department: 'coastal', category: 'water' },

  // Logistics & Special
  dispatch_center: { id: 'dispatch_center', label: 'Dispatch Center', department: 'logistics', category: 'hub' },
  staging_area: { id: 'staging_area', label: 'Staging Area', department: 'logistics', category: 'temp' },
  prison: { id: 'prison', label: 'Prison', department: 'police', category: 'detention' },
  tow_yard: { id: 'tow_yard', label: 'Tow Truck Station', department: 'tow', size: 'large' },

  // Public Works
  pw_depot: { id: 'pw_depot', label: 'Public Works Depot', department: 'public_works', size: 'large' },
  pw_outpost: { id: 'pw_outpost', label: 'Public Works Outpost', department: 'public_works', size: 'small' },
}

export const getDepartment = (departmentId) =>
  DEPARTMENTS[departmentId] || DEPARTMENTS[DEFAULT_DEPARTMENT_ID]

export const getPatientCapacityForStationType = (stationType) => {
  switch (stationType) {
    case STATION_TYPES.ems_station.id:
      return 2
    case STATION_TYPES.ems_station_small.id:
      return 1
    case STATION_TYPES.clinic.id:
      return 4
    case STATION_TYPES.hospital.id:
      return 10
    default:
      return 0
  }
}

export const getImpoundCapacityForStationType = (stationType) => {
  switch (stationType) {
    case STATION_TYPES.tow_yard.id:
      return 4
    default:
      return 0
  }
}

export const isHospitalStationType = (stationType) => stationType === STATION_TYPES.hospital.id
