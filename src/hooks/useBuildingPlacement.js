import { useMemo, useState } from 'react'
import { FEATURE_FLAGS } from '../config/features'
import { BUILDING_CATALOG } from '../game/catalog'
import { STATION_TYPES } from '../game/departments'

export const useBuildingPlacement = ({
  getBuildingCost,
  onStartPlacement,
  onUnavailableBuilding,
  onCancelPlacement,
}) => {
  const [placingStation, setPlacingStation] = useState(false)
  const [placingStationPosition, setPlacingStationPosition] = useState(null)
  const [placingBuildingType, setPlacingBuildingType] = useState(STATION_TYPES.police_station.id)
  const [showBuildMenu, setShowBuildMenu] = useState(false)

  const getBuildingDefinition = (buildingType) =>
    BUILDING_CATALOG.find((item) => item.id === buildingType) || BUILDING_CATALOG[0]

  const buildOptions = useMemo(
    () =>
      BUILDING_CATALOG.map((building) => {
        const enabled =
          building.id === STATION_TYPES.police_station.id ||
          building.id === STATION_TYPES.prison.id ||
          (building.id === STATION_TYPES.fire_station.id && FEATURE_FLAGS.enableFireStationPreview) ||
          (building.id === STATION_TYPES.ems_station.id && FEATURE_FLAGS.enableEmsStationPreview) ||
          (building.id === STATION_TYPES.tow_yard.id && FEATURE_FLAGS.enableTowYardPreview)
        return {
          ...building,
          enabled,
          cost: getBuildingCost(building.id),
        }
      }),
    [getBuildingCost]
  )

  const selectedBuildOption =
    buildOptions.find((item) => item.id === placingBuildingType) || null
  const placingBuilding = getBuildingDefinition(placingBuildingType)
  const placingBuildingLabel = placingBuilding?.label || 'Building'

  const handleToggleBuildMenu = () => {
    const firstEnabledBuildOption = buildOptions.find((item) => item.enabled) || null
    setShowBuildMenu((prev) => {
      const next = !prev
      if (next && firstEnabledBuildOption) {
        setPlacingBuildingType(firstEnabledBuildOption.id)
      }
      return next
    })
  }

  const handleStartBuildingPlacement = () => {
    const selectedBuilding = buildOptions.find((item) => item.id === placingBuildingType)
    if (!selectedBuilding?.enabled) {
      onUnavailableBuilding(selectedBuilding?.label || 'Building')
      return
    }
    onStartPlacement(selectedBuilding.id)
    setPlacingStation(true)
    setPlacingStationPosition(null)
    setShowBuildMenu(false)
  }

  const handleMapClick = (latlng) => {
    if (!placingStation) return
    setPlacingStationPosition([latlng.lat, latlng.lng])
  }

  const handleCancelPlacement = () => {
    setPlacingStation(false)
    setPlacingStationPosition(null)
    setPlacingBuildingType(STATION_TYPES.police_station.id)
    onCancelPlacement()
  }

  const resetBuildingPlacement = () => {
    setPlacingStation(false)
    setPlacingStationPosition(null)
    setPlacingBuildingType(STATION_TYPES.police_station.id)
    setShowBuildMenu(false)
  }

  return {
    placingStation,
    setPlacingStation,
    placingStationPosition,
    setPlacingStationPosition,
    placingBuildingType,
    setPlacingBuildingType,
    showBuildMenu,
    setShowBuildMenu,
    buildOptions,
    selectedBuildOption,
    placingBuildingLabel,
    getBuildingDefinition,
    handleToggleBuildMenu,
    handleStartBuildingPlacement,
    handleMapClick,
    handleCancelPlacement,
    resetBuildingPlacement,
  }
}
