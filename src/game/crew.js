import { CREW_REQUIREMENTS, DEFAULT_CREW_REQUIREMENT } from './constants'

export const getCrewRequirement = (unitType) =>
  CREW_REQUIREMENTS[unitType] || DEFAULT_CREW_REQUIREMENT

export const autoAssignCrew = (vehicles, personnelAssigned, stationId) => {
  let remaining = personnelAssigned
  return vehicles.map((vehicle) => {
    if (stationId && vehicle.homeStationId !== stationId) return vehicle
    const crewRequired = Number(vehicle.crewRequired) || getCrewRequirement(vehicle.unitType)
    let crewAssigned = Number(vehicle.crewAssigned)
    if (!Number.isFinite(crewAssigned) || crewAssigned < 0) crewAssigned = 0
    if (crewAssigned === 0 && remaining >= crewRequired) {
      crewAssigned = crewRequired
      remaining -= crewRequired
    } else {
      remaining = Math.max(0, remaining - crewAssigned)
    }
    return {
      ...vehicle,
      crewRequired,
      crewAssigned,
    }
  })
}

export const autoAssignCrewForStations = (vehicles, stations) => {
  let nextVehicles = vehicles
  stations.forEach((station) => {
    nextVehicles = autoAssignCrew(
      nextVehicles,
      station.personnelAssigned || 0,
      station.id
    )
  })
  return nextVehicles
}
