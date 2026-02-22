import { useMemo } from 'react'

export const useIncidentViewModel = ({
  incidents,
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
        if (a.priority !== b.priority) return a.priority - b.priority
        const aTime =
          a.status === incidentStatus.on_scene
            ? Number(a.onSceneRemaining) || 0
            : Number(a.timeRemaining) || Number(a.responseTargetSeconds) || 0
        const bTime =
          b.status === incidentStatus.on_scene
            ? Number(b.onSceneRemaining) || 0
            : Number(b.timeRemaining) || Number(b.responseTargetSeconds) || 0
        return aTime - bTime
      })
  }, [
    baseIncidents,
    defaultDepartmentId,
    incidentFilters.department,
    incidentFilters.onlyActiveDepartment,
    incidentFilters.type,
    primaryDepartmentId,
    incidentStatus.on_scene,
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
