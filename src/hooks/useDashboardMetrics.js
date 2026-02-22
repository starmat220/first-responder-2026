import { useMemo } from 'react'

export const useDashboardMetrics = ({
  vehicles,
  stations,
  prisons,
  cases,
  selectedCaseId,
  score,
  levelScoreStep,
  incidents,
  incidentStatus,
  vehicleStatus,
  unitTypeUpkeepPerMin,
  personnelUpkeepPerMin,
  stationUpkeepPerMin,
  overtimeUpkeepPerMin,
}) => {
  const budgetSummary = useMemo(() => {
    const unitTypeCounts = vehicles.reduce((acc, vehicle) => {
      const type = vehicle.unitType || 'patrol'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})
    const unitTypes = Object.entries(unitTypeCounts).map(([type, count]) => {
      const rate = unitTypeUpkeepPerMin[type] ?? unitTypeUpkeepPerMin.default
      return {
        type,
        count,
        rate,
        costPerMin: rate * count,
      }
    })
    const personnelCount = stations.reduce(
      (sum, station) => sum + (station.personnelAssigned || 0),
      0
    )
    const personnelPerMin = personnelCount * personnelUpkeepPerMin
    const stationPerMin = stations.length * stationUpkeepPerMin
    const overtimeCount = vehicles.filter(
      (vehicle) =>
        vehicle.status === vehicleStatus.enroute || vehicle.status === vehicleStatus.on_scene
    ).length
    const overtimePerMin = overtimeCount * overtimeUpkeepPerMin
    const unitPerMin = unitTypes.reduce((sum, entry) => sum + entry.costPerMin, 0)
    const totalPerMin = unitPerMin + personnelPerMin + stationPerMin + overtimePerMin
    return {
      unitTypes,
      personnelCount,
      personnelPerMin,
      stationPerMin,
      overtimeCount,
      overtimePerMin,
      unitPerMin,
      totalPerMin,
    }
  }, [
    overtimeUpkeepPerMin,
    personnelUpkeepPerMin,
    stationUpkeepPerMin,
    stations,
    unitTypeUpkeepPerMin,
    vehicles,
    vehicleStatus.enroute,
    vehicleStatus.on_scene,
  ])

  const prisonSummary = useMemo(() => {
    const totalCapacity = prisons.reduce(
      (sum, prison) => sum + (prison.capacity || 0),
      0
    )
    const totalCount = prisons.reduce((sum, prison) => sum + (prison.count || 0), 0)
    return {
      totalCapacity,
      totalCount,
      available: Math.max(0, totalCapacity - totalCount),
    }
  }, [prisons])

  const activeCase = useMemo(() => {
    const sortedCases = [...cases].sort((a, b) => {
      const timeA = a.updatedAt || a.createdAt || 0
      const timeB = b.updatedAt || b.createdAt || 0
      return timeB - timeA
    })
    if (selectedCaseId) {
      return cases.find((item) => item.caseId === selectedCaseId) || sortedCases[0] || null
    }
    return sortedCases[0] || null
  }, [cases, selectedCaseId])

  const level = useMemo(
    () => Math.max(1, Math.floor(score / levelScoreStep) + 1),
    [levelScoreStep, score]
  )

  const activeIncidentCount = useMemo(
    () =>
      incidents.filter(
        (item) =>
          item.status === incidentStatus.open ||
          item.status === incidentStatus.responding ||
          item.status === incidentStatus.on_scene
      ).length,
    [incidents, incidentStatus.on_scene, incidentStatus.open, incidentStatus.responding]
  )

  return {
    budgetSummary,
    prisonSummary,
    activeCase,
    level,
    activeIncidentCount,
  }
}
