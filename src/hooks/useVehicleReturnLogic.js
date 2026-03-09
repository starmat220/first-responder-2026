import { useEffect, useRef } from 'react'
import { buildRoute } from '../game/routes'
import { getTravelSpeedKph } from '../game/speed'
import { clamp } from '../game/utils'
import { getUnitById } from '../game/catalog'
import { VEHICLE_STATUS, DEFAULT_CENTER, HOSPITAL_POS, IMPOUND_POS } from '../game/constants'

export const useVehicleReturnLogic = ({
  vehicles,
  vehiclesRef,
  activeStation,
  getPrisonById,
  getStationById,
  getStationResponseBonus,
  simSpeedRef,
  setVehicles,
  addRadioLogRef,
  getDepartmentShortLabel,
  progression,
  weather,
}) => {
  const pendingReturnRoutes = useRef(new Set())

  useEffect(() => {
    const awaiting = vehicles.filter(
      (vehicle) =>
        vehicle.status === VEHICLE_STATUS.awaiting_return_route &&
        !pendingReturnRoutes.current.has(vehicle.id)
    )
    if (!awaiting.length) return

    awaiting.forEach(async (vehicle) => {
      pendingReturnRoutes.current.add(vehicle.id)

      let destination = null
      let destPos = null

      try {
        if (vehicle.returnDestinationType === 'hospital' && progression?.emsStationUnlocked) {
          destPos = HOSPITAL_POS
          destination = { name: 'Regional Hospital', position: HOSPITAL_POS }
        } else if (vehicle.returnDestinationType === 'impound' && progression?.towYardUnlocked) {
          destPos = IMPOUND_POS
          destination = { name: 'Regional Impound', position: IMPOUND_POS }
        } else if (vehicle.returnDestinationType === 'prison') {
          destination = getPrisonById(vehicle.returnDestinationId)
          destPos = destination?.position
        }

        if (!destination) {
          const destinationId = vehicle.returnDestinationId || vehicle.homeStationId
          destination = getStationById(destinationId) || getStationById(vehicle.homeStationId) || activeStation
          destPos = destination?.position
        }
        if (!destPos) return
        
        pendingReturnRoutes.current.add(vehicle.id)
        const unitDef = getUnitById(vehicle.unitType)
        const isDirect = !!unitDef?.isAviation || !!unitDef?.isWater
        const routeData = await buildRoute(vehicle.position, destPos, isDirect)
        const fatigueMultiplier = clamp(1 - (vehicle.fatigue || 0) / 160, 0.6, 1)
        const responseBonus =
          destination?.responseBonus || getStationResponseBonus(vehicle.homeStationId)

        const travelSpeedKph = getTravelSpeedKph({
          vehicle,
          position: vehicle.position,
          routeData,
          progressMeters: 0,
          responseBonus,
          fatigueMultiplier,
          emergency: false,
          center: DEFAULT_CENTER,
          weather,
        })

        const speedMps = (travelSpeedKph * simSpeedRef.current * 1000) / 3600
        const etaSeconds = speedMps > 0 ? Math.ceil(routeData.totalDistance / speedMps) : 0

        const applyReturningPatch = (list) => {
          let changed = false
          const next = list.map((item) => {
            if (item.id !== vehicle.id || item.status !== VEHICLE_STATUS.awaiting_return_route) {
              return item
            }
            changed = true
            return {
              ...item,
              status: VEHICLE_STATUS.returning,
              routeData,
              progressMeters: 0,
              etaSeconds,
              targetPosition: destPos,
              progressRatio: 0,
              routingStartedAt: null,
              parked: false,
              currentSpeedKph: travelSpeedKph,
              watchdogLastProgressMeters: 0,
              watchdogStalledAt: null,
              watchdogRerouteUsed: false,
            }
          })
          return { next, changed }
        }

        let updated = null
        if (vehiclesRef?.current) {
          const result = applyReturningPatch(vehiclesRef.current)
          if (result.changed) {
            vehiclesRef.current = result.next
            setVehicles(() => result.next)
            updated = result.next.find((item) => item.id === vehicle.id)
          }
        } else {
          let fallbackUpdated = null
          setVehicles((prev) => {
            const result = applyReturningPatch(prev)
            if (result.changed) {
              fallbackUpdated = result.next.find((item) => item.id === vehicle.id)
              return result.next
            }
            return prev
          })
          updated = fallbackUpdated
        }

        if (updated?.status === VEHICLE_STATUS.returning) {
          const label = vehicle.returnDestinationType ? 'Relocating to' : 'Returning to'
          addRadioLogRef.current?.(
            `${vehicle.name} 10-19 ${label} ${destination.name}`,
            'default',
            getDepartmentShortLabel(vehicle.department),
            '10-19',
            vehicle.id
          )
        }
      } finally {
        pendingReturnRoutes.current.delete(vehicle.id)
      }
    })
  }, [vehicles, vehiclesRef, activeStation, getPrisonById, getStationById, getStationResponseBonus, simSpeedRef, setVehicles, addRadioLogRef, getDepartmentShortLabel, weather, progression])
}
