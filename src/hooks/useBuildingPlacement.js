import { useMemo, useState } from 'react'
import { BUILDING_CATALOG } from '../game/catalog'
import { PROGRESSION_MILESTONES } from '../game/constants'
import { STATION_TYPES } from '../game/departments'

export const useBuildingPlacement = ({
  getBuildingCost,
  progression,
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
        const type = STATION_TYPES[building.id]
        const dept = type?.department

        let enabled = false

        // Base Police/Prison always enabled
        if (dept === 'police' && type.size !== 'elite') enabled = true
        if (building.id === STATION_TYPES.prison.id) enabled = true

        // Fire gates
        if (dept === 'fire' && progression?.fireStationUnlocked) enabled = true

        // EMS gates
        if (dept === 'ems' && progression?.emsStationUnlocked) enabled = true

        // Tow gates
        if (dept === 'tow' && progression?.towYardUnlocked) enabled = true

        // Coastal gates
        if (dept === 'coastal' && progression?.towYardUnlocked) enabled = true // Coastal unlocks with Tow

        // Public Works gates
        if (dept === 'public_works' && progression?.publicWorksUnlocked) enabled = true // PW unlocks later

        // Logistics/Hubs gates - require more experience (e.g. 25 resolved)
        if (type?.category === 'hub' || type?.category === 'training' || type?.category === 'medical_hub') {
          enabled = enabled && (progression?.resolvedCount >= PROGRESSION_MILESTONES.hubUnlockAt)
        }

        // Aviation/Water gates - require some experience (e.g. 10 resolved)
        if (type?.category === 'aviation' || type?.category === 'water') {
          enabled = enabled && (progression?.resolvedCount >= PROGRESSION_MILESTONES.aviationUnlockAt)
        }

        return {
          ...building,
          enabled,
          cost: getBuildingCost(building.id),
        }
      }),
    [getBuildingCost, progression]
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
