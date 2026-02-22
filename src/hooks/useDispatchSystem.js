import { useRef } from 'react'
import { buildRoute } from '../game/routes'
import { getTravelSpeedKph } from '../game/speed'
import { getCrewRequirement } from '../game/crew'
import {
  DEFAULT_CENTER,
  DISPATCHABLE_STATUSES,
  DISPATCH_FUEL_COST,
  INCIDENT_STATUS,
  VEHICLE_STATUS,
} from '../game/constants'
import { DEFAULT_DEPARTMENT_ID } from '../game/departments'
import { clamp } from '../game/utils'
import { haversineMeters } from '../game/geo'

export const useDispatchSystem = ({
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
}) => {
  const pendingDispatchIdsRef = useRef(new Set())

  const getRequiredUnits = (incident) => Math.max(1, Number(incident.requiredUnits) || 1)
  const getRequiredUnitType = (incident) =>
    incident.requiredUnitType && incident.requiredUnitType !== 'any'
      ? incident.requiredUnitType
      : null
  const getRequiredDepartment = (incident) =>
    incident.requiredDepartment && incident.requiredDepartment !== 'any'
      ? incident.requiredDepartment
      : DEFAULT_DEPARTMENT_ID

  const canDispatchIncident = (incident) =>
    (incident.status === INCIDENT_STATUS.open ||
      incident.status === INCIDENT_STATUS.responding) &&
    (incident.assignedVehicleIds?.length || 0) < getRequiredUnits(incident)

  const isVehicleEligibleForIncident = (vehicle, incident) => {
    const requiredType = getRequiredUnitType(incident)
    const requiredDepartment = getRequiredDepartment(incident)
    const crewRequired = getCrewRequirement(vehicle.unitType)
    const crewAssigned = Number(vehicle.crewAssigned) || 0
    return (
      DISPATCHABLE_STATUSES.has(vehicle.status) &&
      vehicle.status !== VEHICLE_STATUS.cooldown &&
      vehicle.status !== VEHICLE_STATUS.off_shift &&
      !vehicle.returnDestinationType &&
      crewAssigned >= crewRequired &&
      (!requiredDepartment || (vehicle.department || DEFAULT_DEPARTMENT_ID) === requiredDepartment) &&
      (!requiredType || vehicle.unitType === requiredType)
    )
  }

  const getVehicleIneligibilityReason = (vehicle, incident) => {
    const requiredType = getRequiredUnitType(incident)
    const requiredDepartment = getRequiredDepartment(incident)
    if (vehicle.status === VEHICLE_STATUS.cooldown) return 'cooldown'
    if (vehicle.status === VEHICLE_STATUS.off_shift) return 'off shift'
    if (vehicle.returnDestinationType) return 'transporting detainee'
    if (!DISPATCHABLE_STATUSES.has(vehicle.status)) return 'busy'
    if (requiredDepartment && (vehicle.department || DEFAULT_DEPARTMENT_ID) !== requiredDepartment) {
      return `needs ${requiredDepartment}`
    }
    const crewRequired = getCrewRequirement(vehicle.unitType)
    const crewAssigned = Number(vehicle.crewAssigned) || 0
    if (crewAssigned < crewRequired) return 'no crew'
    if (requiredType && vehicle.unitType !== requiredType) return `needs ${requiredType}`
    return ''
  }

  const getEligibleVehicleIds = (incident) =>
    new Set(
      vehicles
        .filter((vehicle) => isVehicleEligibleForIncident(vehicle, incident))
        .map((item) => item.id)
    )

  const getEligibleVehicles = (incident) => {
    const requiredType = getRequiredUnitType(incident)
    const requiredDepartment = getRequiredDepartment(incident)
    return vehiclesRef.current.filter(
      (vehicle) =>
        DISPATCHABLE_STATUSES.has(vehicle.status) &&
        vehicle.status !== VEHICLE_STATUS.cooldown &&
        vehicle.status !== VEHICLE_STATUS.off_shift &&
        !vehicle.returnDestinationType &&
        (!requiredDepartment || (vehicle.department || DEFAULT_DEPARTMENT_ID) === requiredDepartment) &&
        (Number(vehicle.crewAssigned) || 0) >= getCrewRequirement(vehicle.unitType) &&
        (!requiredType || vehicle.unitType === requiredType)
    )
  }

  const getClosestEligibleVehicleId = (incident) => {
    const eligible = getEligibleVehicles(incident)
    if (!eligible.length) return null
    let closest = eligible[0]
    let shortest = haversineMeters(eligible[0].position, incident.position)
    for (let i = 1; i < eligible.length; i += 1) {
      const candidate = eligible[i]
      const distance = haversineMeters(candidate.position, incident.position)
      if (distance < shortest) {
        shortest = distance
        closest = candidate
      }
    }
    return closest?.id || null
  }

  const getIncidentRequirementLines = (incident) => {
    const lines = []
    const requiredUnits = getRequiredUnits(incident)
    const assigned = incident.assignedVehicleIds?.length || 0
    if (requiredUnits > 1) {
      lines.push(`Needs ${requiredUnits} units (${assigned}/${requiredUnits})`)
    }
    if (incident.requiredUnitType) {
      lines.push(`Requires ${incident.requiredUnitType.toUpperCase()} unit`)
    }
    if (incident.requiredDepartment) {
      lines.push(`Department ${incident.requiredDepartment.toUpperCase()}`)
    }
    const eligibleCount = getEligibleVehicleIds(incident).size
    if (!eligibleCount) {
      lines.push('No eligible units available')
    }
    return lines
  }

  const dispatchVehicle = async (incidentId, requestedVehicleId) => {
    if (pendingDispatchIdsRef.current.has(incidentId)) {
      showMessage('Dispatch already in progress.')
      return
    }
    const incident = incidentsRef.current.find((item) => item.id === incidentId)
    if (!incident) return
    const requiredUnits = getRequiredUnits(incident)
    const alreadyAssigned = Array.isArray(incident.assignedVehicleIds)
      ? incident.assignedVehicleIds
      : []
    if (alreadyAssigned.length >= requiredUnits) {
      showMessage('Incident already has enough units.')
      return
    }
    const eligibleVehicles = getEligibleVehicles(incident)
    const normalizedId =
      Number.isFinite(requestedVehicleId) && requestedVehicleId > 0 ? requestedVehicleId : undefined
    const requestedIsAvailable = eligibleVehicles.some((item) => item.id === normalizedId)
    if (normalizedId && !requestedIsAvailable) {
      showMessage('Selected unit is unavailable.')
      return
    }
    const selectedVehicle = requestedIsAvailable
      ? eligibleVehicles.find((item) => item.id === normalizedId)
      : eligibleVehicles[0]
    if (!selectedVehicle) {
      showMessage('No eligible units available.')
      return
    }
    const neededUnits = requiredUnits - alreadyAssigned.length
    const selectionPool = eligibleVehicles.filter((vehicle) => !alreadyAssigned.includes(vehicle.id))
    const chosenVehicles = []
    if (selectedVehicle && !alreadyAssigned.includes(selectedVehicle.id)) {
      chosenVehicles.push(selectedVehicle)
    }
    selectionPool.forEach((vehicle) => {
      if (chosenVehicles.length >= neededUnits) return
      if (!chosenVehicles.find((item) => item.id === vehicle.id)) {
        chosenVehicles.push(vehicle)
      }
    })

    if (chosenVehicles.length < neededUnits) {
      showMessage(`Need ${neededUnits} eligible units for this call.`)
      return
    }

    pendingDispatchIdsRef.current.add(incidentId)
    const routingStartedAt = Date.now()
    const selectedIds = chosenVehicles.map((vehicle) => vehicle.id)
    vehiclesRef.current = vehiclesRef.current.map((item) =>
      selectedIds.includes(item.id)
        ? {
            ...item,
            status: VEHICLE_STATUS.routing,
            assignedIncidentId: incidentId,
            routingStartedAt,
            parked: false,
          }
        : item
    )

    setVehicles((prev) =>
      prev.map((item) =>
        selectedIds.includes(item.id)
          ? {
              ...item,
              status: VEHICLE_STATUS.routing,
              assignedIncidentId: incidentId,
              routingStartedAt,
              parked: false,
            }
          : item
      )
    )

    // Commit assignment immediately so first click has instant feedback.
    const nextAssigned = [...alreadyAssigned, ...selectedIds].filter(
      (value, index, self) => self.indexOf(value) === index
    )
    incidentsRef.current = incidentsRef.current.map((item) =>
      item.id === incidentId
        ? {
            ...item,
            status: INCIDENT_STATUS.responding,
            assignedVehicleId: nextAssigned[0] || null,
            assignedVehicleIds: nextAssigned,
            dispatchedAt: item.dispatchedAt || Date.now(),
          }
        : item
    )
    setIncidents((prev) =>
      prev.map((item) =>
        item.id === incidentId
          ? {
              ...item,
              status: INCIDENT_STATUS.responding,
              assignedVehicleId: nextAssigned[0] || null,
              assignedVehicleIds: nextAssigned,
              dispatchedAt: item.dispatchedAt || Date.now(),
            }
          : item
      )
    )

    try {
      const routeResults = await Promise.all(
        chosenVehicles.map((vehicle) => buildRoute(vehicle.position, incident.position))
      )
      let bestEta = null

      setVehicles((prev) =>
        prev.map((item) => {
          const index = selectedIds.indexOf(item.id)
          if (index === -1) return item
          const routeData = routeResults[index]
          const fatigueMultiplier = clamp(1 - (item.fatigue || 0) / 160, 0.6, 1)
          const responseBonus = getStationResponseBonus(item.homeStationId)
          const travelSpeedKph = getTravelSpeedKph({
            vehicle: item,
            position: item.position,
            routeData,
            progressMeters: 0,
            responseBonus,
            fatigueMultiplier,
            emergency: true,
            center: DEFAULT_CENTER,
          })
          const speedMps = (travelSpeedKph * simSpeedRef.current * 1000) / 3600
          const etaSeconds = Math.ceil(routeData.totalDistance / speedMps)
          if (bestEta === null || etaSeconds < bestEta) bestEta = etaSeconds
          return {
            ...item,
            status: VEHICLE_STATUS.enroute,
            assignedIncidentId: incidentId,
            routeData,
            progressMeters: 0,
            etaSeconds,
            targetPosition: incident.position,
            progressRatio: 0,
            routingStartedAt: null,
            parked: false,
            cooldownRemaining: 0,
            currentSpeedKph: travelSpeedKph,
            returnDestinationType: null,
            returnDestinationId: null,
            returnIncidentType: null,
          }
          })
      )

      setIncidents((prev) =>
        prev.map((item) =>
          item.id === incidentId
            ? {
                ...item,
                status: item.status === INCIDENT_STATUS.open ? INCIDENT_STATUS.responding : item.status,
                etaSeconds: bestEta ?? item.etaSeconds,
              }
            : item
        )
      )
      setMoney((prev) => Math.max(0, prev - DISPATCH_FUEL_COST * selectedIds.length))
      setTransactions((prev) =>
        [
          {
            id: `fuel-${Date.now()}`,
            label: `Fuel cost (${selectedIds.length} units)`,
            amount: -DISPATCH_FUEL_COST * selectedIds.length,
            time: new Date().toLocaleTimeString(),
          },
          ...prev,
        ].slice(0, 100)
      )
    } finally {
      pendingDispatchIdsRef.current.delete(incidentId)
    }
  }

  const handleQuickDispatch = (incidentId) => {
    const incident = incidentsRef.current.find((item) => item.id === incidentId)
    if (!incident) return
    const vehicleId = getClosestEligibleVehicleId(incident)
    if (!vehicleId) {
      showMessage('No eligible units available.')
      return
    }
    dispatchVehicle(incidentId, vehicleId)
  }

  return {
    getRequiredUnits,
    getRequiredUnitType,
    getRequiredDepartment,
    canDispatchIncident,
    isVehicleEligibleForIncident,
    getVehicleIneligibilityReason,
    getEligibleVehicleIds,
    getIncidentRequirementLines,
    dispatchVehicle,
    handleQuickDispatch,
  }
}
