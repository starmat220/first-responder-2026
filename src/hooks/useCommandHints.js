import { useMemo } from 'react'

export const useCommandHints = ({
  baseIncidents,
  listIncidents,
  vehicles,
  stations,
  activeStation,
  primaryDepartmentId,
  departments,
  defaultDepartmentId,
  personnelCapacityStart,
  incidentStatus,
  showIncidents,
  activeIncidentCount,
  getRequiredUnits,
  getEligibleVehicleIds,
  canDispatchIncident,
  getRequiredDepartment,
  getRequiredUnitType,
  handleQuickDispatch,
  onOpenStation,
  onShowIncidents,
  onFocusMyDepartment,
  onStartPlaceStation,
  onToggleBuildMenu,
  campaignNextObjective = null,
  onOpenCampaign = null,
}) => {
  const alertsQueue = useMemo(() => {
    const bestByIncident = new Map()
    baseIncidents.forEach((incident) => {
      if (
        incident.status !== incidentStatus.open &&
        incident.status !== incidentStatus.responding
      ) {
        return
      }
      const pickAlert = (reason, severity, timeRemaining) => {
        const existing = bestByIncident.get(incident.id)
        if (!existing) {
          bestByIncident.set(incident.id, {
            id: String(incident.id),
            incident,
            reasons: [reason],
            severity,
            timeRemaining,
          })
          return
        }
        if (!existing.reasons.includes(reason)) {
          existing.reasons.push(reason)
        }
        if (
          severity > existing.severity ||
          (severity === existing.severity &&
            (timeRemaining ?? Infinity) < (existing.timeRemaining ?? Infinity))
        ) {
          existing.severity = severity
          existing.timeRemaining = timeRemaining
        }
      }
      const assigned = incident.assignedVehicleIds?.length || 0
      const required = getRequiredUnits(incident)
      const eligibleCount = getEligibleVehicleIds(incident).size
      const timeRemaining =
        incident.status === incidentStatus.open
          ? incident.timeRemaining ?? incident.responseTargetSeconds
          : incident.etaSeconds ?? incident.responseTargetSeconds
      if (incident.priority === 1 && assigned === 0) {
        pickAlert('P1 unassigned', 4, timeRemaining)
      }
      if (eligibleCount === 0) {
        if (assigned === 0 || assigned < required) {
          pickAlert('No eligible units', 4, timeRemaining)
        }
      }
      if (assigned < required && assigned > 0) {
        pickAlert(
          `Needs ${required - assigned} more unit${required - assigned > 1 ? 's' : ''}`,
          3,
          timeRemaining
        )
      }
      if (timeRemaining != null) {
        if (timeRemaining <= 20) {
          pickAlert('Response window critical', 4, timeRemaining)
        } else if (timeRemaining <= 60) {
          pickAlert('Response window closing', 2, timeRemaining)
        }
      }
    })
    return Array.from(bestByIncident.values())
      .sort((a, b) => {
        if (b.severity !== a.severity) return b.severity - a.severity
        return (a.timeRemaining || 0) - (b.timeRemaining || 0)
      })
      .slice(0, 4)
  }, [baseIncidents, getRequiredUnits, getEligibleVehicleIds, incidentStatus])

  const actionableIncident = baseIncidents.find((incident) => canDispatchIncident(incident))
  const actionableWithEligible = baseIncidents.find(
    (incident) => canDispatchIncident(incident) && getEligibleVehicleIds(incident).size > 0
  )
  const activeDepartmentLabel = departments[primaryDepartmentId]?.label || 'Police'
  const departmentOpenIncidents = baseIncidents.filter(
    (incident) => getRequiredDepartment(incident) === primaryDepartmentId
  )
  const departmentDispatchableIncidents = departmentOpenIncidents.filter((incident) =>
    canDispatchIncident(incident)
  )
  const departmentReadyIncident = departmentDispatchableIncidents.find(
    (incident) => getEligibleVehicleIds(incident).size > 0
  )
  const departmentBlockedIncident = departmentDispatchableIncidents.find(
    (incident) => getEligibleVehicleIds(incident).size === 0
  )
  const departmentVehicles = vehicles.filter(
    (vehicle) => (vehicle.department || defaultDepartmentId) === primaryDepartmentId
  )
  const uncrewedDepartmentVehicles = departmentVehicles.filter(
    (vehicle) => (Number(vehicle.crewAssigned) || 0) < (Number(vehicle.crewRequired) || 0)
  )
  const visibleDepartmentIncidents = listIncidents.filter(
    (incident) => getRequiredDepartment(incident) === primaryDepartmentId
  )

  const nextAction = (() => {
    if (!stations.length) {
      return {
        title: 'Deploy your first station',
        detail: 'Click Place Station and pick an anchor location on the map.',
        actionLabel: 'Place Station',
        onAction: onStartPlaceStation,
      }
    }
    if (!vehicles.length) {
      return {
        title: 'Buy your first response unit',
        detail: 'Open station operations and purchase a unit so dispatch can start.',
        actionLabel: 'Open Station',
        onAction: onOpenStation,
      }
    }
    if (!showIncidents && activeIncidentCount > 0) {
      return {
        title: 'Incidents panel is hidden',
        detail: 'Open the incidents panel to monitor timers and dispatch progress.',
        actionLabel: 'Show Incidents',
        onAction: onShowIncidents,
      }
    }
    if (departmentReadyIncident) {
      return {
        title: `${activeDepartmentLabel} call ready for dispatch`,
        detail: `Use one-click dispatch on "${departmentReadyIncident.type}" to prevent deadline loss.`,
        actionLabel: 'Dispatch Best Unit',
        onAction: () => handleQuickDispatch(departmentReadyIncident.id),
      }
    }
    if (departmentBlockedIncident) {
      const requiredType = getRequiredUnitType(departmentBlockedIncident)
      if (!departmentVehicles.length) {
        return {
          title: `${activeDepartmentLabel} has no active units`,
          detail: `Open station operations and purchase a ${activeDepartmentLabel.toLowerCase()} unit to clear "${departmentBlockedIncident.type}".`,
          actionLabel: 'Open Station',
          onAction: onOpenStation,
        }
      }
      if (uncrewedDepartmentVehicles.length > 0) {
        return {
          title: `${activeDepartmentLabel} units need crews`,
          detail: `${uncrewedDepartmentVehicles.length} unit(s) are uncrewed and blocking dispatch.`,
          actionLabel: 'Manage Staffing',
          onAction: onOpenStation,
        }
      }
      if (visibleDepartmentIncidents.length === 0) {
        return {
          title: `${activeDepartmentLabel} calls are filtered out`,
          detail: 'Focus incidents on your active department so blocked calls are visible.',
          actionLabel: 'Focus My Dept',
          onAction: onFocusMyDepartment,
        }
      }
      return {
        title: `${activeDepartmentLabel} dispatch bottleneck`,
        detail: requiredType
          ? `No eligible ${requiredType.toUpperCase()} unit is currently ready for "${departmentBlockedIncident.type}".`
          : `No eligible ${activeDepartmentLabel.toLowerCase()} unit is currently ready for "${departmentBlockedIncident.type}".`,
        actionLabel: 'Open Station',
        onAction: onOpenStation,
      }
    }
    if (departmentOpenIncidents.length > 0 && visibleDepartmentIncidents.length === 0) {
      return {
        title: `${activeDepartmentLabel} calls are filtered out`,
        detail: 'Switch the incidents feed to your active department.',
        actionLabel: 'Focus My Dept',
        onAction: onFocusMyDepartment,
      }
    }
    if (actionableWithEligible) {
      return {
        title: 'Active call is ready for dispatch',
        detail: `Use one-click dispatch on "${actionableWithEligible.type}" to keep trust high.`,
        actionLabel: 'Dispatch Best Unit',
        onAction: () => handleQuickDispatch(actionableWithEligible.id),
      }
    }
    if (actionableIncident) {
      return {
        title: 'Calls are waiting for crewed units',
        detail: 'Assign crews or buy another unit to clear blocked incidents.',
        actionLabel: 'Open Station',
        onAction: onOpenStation,
      }
    }
    if (
      activeStation &&
      (activeStation.personnelAssigned || 0) <
        (activeStation.personnelCapacity || personnelCapacityStart)
    ) {
      return {
        title: 'Increase staffing capacity',
        detail: 'Hire personnel to keep more units available each shift.',
        actionLabel: 'Manage Staffing',
        onAction: onOpenStation,
      }
    }
    if (campaignNextObjective?.title) {
      return {
        title: campaignNextObjective.title,
        detail: campaignNextObjective.detail,
        actionLabel: campaignNextObjective.actionLabel || (onOpenCampaign ? 'Open Campaign' : null),
        onAction: campaignNextObjective.onAction || onOpenCampaign || null,
      }
    }
    return {
      title: 'Operations stable',
      detail: 'Expand with a new building or continue responding to maintain momentum.',
      actionLabel: stations.length ? 'Add Building' : null,
      onAction: stations.length ? onToggleBuildMenu : null,
    }
  })()

  return { alertsQueue, nextAction }
}
