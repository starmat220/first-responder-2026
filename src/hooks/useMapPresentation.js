import { useCallback } from 'react'
import { clamp } from '../game/utils'

export const useMapPresentation = ({
  priorityFilters,
  getFocusFactor,
  incidentStatus,
  onSceneSeconds,
  vehicleStatus,
  defaultDepartmentId,
  isFocusEnabled,
}) => {
  const getIncidentPriorityVisual = useCallback(
    (incident, inactivePriorityDim = 0.25) => {
      const priorityActive = priorityFilters[incident.priority]
      const focusFactor = getFocusFactor(incident.requiredDepartment)
      return {
        priorityActive,
        dimFactor: (priorityActive ? 1 : inactivePriorityDim) * focusFactor,
      }
    },
    [getFocusFactor, priorityFilters]
  )

  const getIncidentRingMetrics = useCallback(
    (incident) => {
      const ringRadius = 24
      const ringCircumference = 2 * Math.PI * ringRadius
      const ringProgress = clamp(
        (incident.status === incidentStatus.on_scene
          ? incident.onSceneRemaining || onSceneSeconds
          : incident.timeRemaining || incident.responseTargetSeconds) /
          (incident.status === incidentStatus.on_scene
            ? onSceneSeconds
            : incident.responseTargetSeconds),
        0.06,
        1
      )
      const arcLength = Math.max(10, ringCircumference * ringProgress)
      const dashOffset = ringCircumference * 0.125
      return {
        ringRadius,
        ringCircumference,
        arcLength,
        dashOffset,
      }
    },
    [incidentStatus.on_scene, onSceneSeconds]
  )

  const getRouteClass = useCallback(
    (vehicle) => {
      const department = vehicle.department || defaultDepartmentId
      const isReturning = vehicle.status === vehicleStatus.returning
      const focusDimClass =
        isFocusEnabled && getFocusFactor(department) < 1 ? 'route--focus-dim' : ''
      return `route route--dept-${department} ${
        isReturning ? 'route--return' : 'route--outbound'
      } ${focusDimClass}`.trim()
    },
    [defaultDepartmentId, getFocusFactor, isFocusEnabled, vehicleStatus.returning]
  )

  return {
    getIncidentPriorityVisual,
    getIncidentRingMetrics,
    getRouteClass,
  }
}
