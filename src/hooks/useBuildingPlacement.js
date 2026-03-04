import { useMemo, useState } from 'react'
import { BUILDING_CATALOG } from '../game/catalog'
import { PROGRESSION_MILESTONES } from '../game/constants'
import { STATION_TYPES } from '../game/departments'
import { evaluateBuildingTierAccess } from '../game/buildings'

export const useBuildingPlacement = ({
  getBuildingCost,
  progression,
  level = 1,
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
        let lockedReason = ''

        // Base Police/Prison always enabled
        if (dept === 'police' && type.size !== 'elite') enabled = true
        if (dept === 'police' && type.size === 'elite' && progression?.precinctUpgradeUnlocked) {
          enabled = true
        } else if (dept === 'police' && type.size === 'elite') {
          lockedReason = `Requires ${PROGRESSION_MILESTONES.precinctUpgradeUnlockedAt} resolved calls to unlock elite police stations.`
        }
        if (building.id === STATION_TYPES.prison.id) enabled = true
        if (dept === 'logistics') enabled = true

        // Fire gates
        if (dept === 'fire' && progression?.fireStationUnlocked) {
          enabled = true
        } else if (dept === 'fire') {
          lockedReason = `Requires ${PROGRESSION_MILESTONES.fireStationUnlockedAt} resolved calls to unlock Fire.`
        }

        // EMS gates
        if (dept === 'ems' && progression?.emsStationUnlocked) {
          enabled = true
        } else if (dept === 'ems') {
          lockedReason = `Requires ${PROGRESSION_MILESTONES.emsStationUnlockedAt} resolved calls to unlock EMS.`
        }

        // Tow gates
        if (dept === 'tow' && progression?.towYardUnlocked) {
          enabled = true
        } else if (dept === 'tow') {
          lockedReason = `Requires ${PROGRESSION_MILESTONES.towYardUnlockedAt} resolved calls to unlock Tow.`
        }

        // Coastal gates
        if (dept === 'coastal' && progression?.towYardUnlocked) {
          enabled = true // Coastal unlocks with Tow
        } else if (dept === 'coastal') {
          lockedReason = `Requires ${PROGRESSION_MILESTONES.towYardUnlockedAt} resolved calls to unlock Coastal.`
        }

        // Public Works gates
        if (dept === 'public_works' && progression?.publicWorksUnlocked) {
          enabled = true // PW unlocks later
        } else if (dept === 'public_works') {
          lockedReason = `Requires ${PROGRESSION_MILESTONES.publicWorksUnlockedAt} resolved calls to unlock Public Works.`
        }

        // Logistics/Hubs gates - require more experience (e.g. 25 resolved)
        if (type?.category === 'hub' || type?.category === 'training' || type?.category === 'medical_hub') {
          enabled = enabled && (progression?.resolvedCount >= PROGRESSION_MILESTONES.hubUnlockAt)
          if (!enabled && !lockedReason) {
            lockedReason = `Requires ${PROGRESSION_MILESTONES.hubUnlockAt} resolved calls.`
          }
        }

        // Aviation/Water gates - require some experience (e.g. 10 resolved)
        if (type?.category === 'aviation' || type?.category === 'water') {
          enabled = enabled && (progression?.resolvedCount >= PROGRESSION_MILESTONES.aviationUnlockAt)
          if (!enabled && !lockedReason) {
            lockedReason = `Requires ${PROGRESSION_MILESTONES.aviationUnlockAt} resolved calls.`
          }
        }
        if (
          type?.category === 'aviation' &&
          progression?.specializedStationsCount < 2
        ) {
          enabled = false
          lockedReason = 'Requires at least 2 specialized stations before aviation facilities can be deployed.'
        }
        if (
          (building.id === STATION_TYPES.federal_police.id ||
            building.id === STATION_TYPES.fire_marshal.id) &&
          progression?.specializedStationsCount < 3
        ) {
          enabled = false
          lockedReason = 'Requires 3 specialized stations to unlock command-grade facilities.'
        }
        if (
          type?.category === 'hub' &&
          !progression?.departmentReputationUnlocked
        ) {
          enabled = false
          lockedReason = 'Requires Department Reputation milestone before regional hubs unlock.'
        }

        const tierAccess = evaluateBuildingTierAccess({
          building,
          level,
          resolvedCount: progression?.resolvedCount || 0,
        })
        if (!tierAccess.unlocked) {
          enabled = false
          lockedReason = tierAccess.reason
        }

        return {
          ...building,
          enabled,
          lockedReason,
          cost: getBuildingCost(building.id),
        }
      }),
    [getBuildingCost, level, progression]
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
      onUnavailableBuilding(selectedBuilding?.label || 'Building', selectedBuilding?.lockedReason || '')
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
