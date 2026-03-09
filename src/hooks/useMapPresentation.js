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
  mapZoom = 13,
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
      const zoomFactor = Math.pow(1.15, mapZoom - 13)
      const ringRadius = Math.round(18 * zoomFactor)
      const haloRadius = Math.round(22 * zoomFactor)
      const ringCircumference = 2 * Math.PI * ringRadius
      const progress = clamp(
        (incident.status === incidentStatus.on_scene
          ? incident.onSceneRemaining || onSceneSeconds
          : incident.timeRemaining || incident.responseTargetSeconds) /
          (incident.status === incidentStatus.on_scene
            ? onSceneSeconds
            : incident.responseTargetSeconds),
        0,
        1
      )
      const ringProgress = Math.max(0, Math.min(1, progress))
      const arcLength = ringCircumference * ringProgress
      
      // Keep the ring anchored at 12 o'clock (CSS rotates the circle),
      // and let the gap open from that anchor as time runs down.
      const dashArray = `${arcLength} ${ringCircumference}`
      const dashOffset = ringCircumference - arcLength

      const isUrgent =
        incident.priority === 1 ||
        (incident.status !== incidentStatus.on_scene && progress < 0.25)

      return {
        ringRadius,
        haloRadius,
        ringCircumference,
        arcLength,
        dashOffset,
        dashArray,
        isUrgent,
      }
    },
    [incidentStatus.on_scene, mapZoom, onSceneSeconds]
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
