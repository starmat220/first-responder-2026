import { useMemo } from 'react'
import { haversineMeters } from '../game/geo'

export const useIncidentViewModel = ({
  incidents,
  vehicles,
  incidentFilters,
  primaryDepartmentId,
  defaultDepartmentId,
  incidentStatus,
}) => {
  const baseIncidents = useMemo(
    () =>
      incidents.filter(
        (incident) =>
          incident.status !== incidentStatus.resolved && incident.status !== incidentStatus.missed
      ),
    [incidents, incidentStatus.missed, incidentStatus.resolved]
  )

  const incidentTypeOptions = useMemo(() => {
    const types = new Set(baseIncidents.map((incident) => incident.type))
    return ['all', ...Array.from(types).sort()]
  }, [baseIncidents])

  const mapIncidents = useMemo(() => {
    const effectiveDepartmentFilter = incidentFilters.onlyActiveDepartment
      ? primaryDepartmentId
      : incidentFilters.department

    return baseIncidents
      .filter((incident) => {
        if (effectiveDepartmentFilter !== 'all') {
          const department = incident.requiredDepartment || defaultDepartmentId
          if (department !== effectiveDepartmentFilter) return false
        }
        if (incidentFilters.type === 'all') return true
        return incident.type === incidentFilters.type
      })
      .sort((a, b) => {
        if (incidentFilters.sort === 'type') {
          return String(a.type).localeCompare(String(b.type))
        }
        if (incidentFilters.sort === 'department') {
          return String(a.requiredDepartment).localeCompare(String(b.requiredDepartment))
        }

        if (incidentFilters.sort === 'distance' && vehicles?.length) {
          const getMinDist = (incident) => {
            let min = Infinity
            vehicles.forEach(v => {
              const d = haversineMeters(v.position, incident.position)
              if (d < min) min = d
            })
            return min
          }
          return getMinDist(a) - getMinDist(b)
        }

        const aTime =
          a.status === incidentStatus.on_scene
            ? Number(a.onSceneRemaining) || 0
            : Number(a.timeRemaining) || Number(a.responseTargetSeconds) || 0
        const bTime =
          b.status === incidentStatus.on_scene
            ? Number(b.onSceneRemaining) || 0
            : Number(b.timeRemaining) || Number(b.responseTargetSeconds) || 0

        if (incidentFilters.sort === 'time') {
          return aTime - bTime
        }

        // Default: Priority then Time
        if (a.priority !== b.priority) return a.priority - b.priority
        return aTime - bTime
      })
  }, [
    baseIncidents,
    defaultDepartmentId,
    incidentFilters.department,
    incidentFilters.onlyActiveDepartment,
    incidentFilters.type,
    incidentFilters.sort,
    primaryDepartmentId,
    incidentStatus.on_scene,
    vehicles,
  ])

  const listIncidents = useMemo(
    () => mapIncidents.filter((incident) => incidentFilters.priority[incident.priority]),
    [incidentFilters.priority, mapIncidents]
  )

  const departmentCounts = useMemo(
    () =>
      baseIncidents.reduce((acc, incident) => {
        const department = incident.requiredDepartment || defaultDepartmentId
        acc[department] = (acc[department] || 0) + 1
        return acc
      }, {}),
    [baseIncidents, defaultDepartmentId]
  )

  return {
    baseIncidents,
    mapIncidents,
    listIncidents,
    incidentTypeOptions,
    departmentCounts,
  }
}
