import {
  OVERTIME_UPKEEP_PER_MIN,
  PERSONNEL_UPKEEP_PER_MIN,
  STATION_UPKEEP_PER_MIN,
  UNIT_TYPE_UPKEEP_PER_MIN,
  UPKEEP_INTERVAL_SECONDS,
  VEHICLE_STATUS,
} from './constants'

export const applyUpkeepTick = ({ economyTimer, step, vehicles, stations, now = Date.now() }) => {
  const nextTimer = economyTimer + step
  if (nextTimer < UPKEEP_INTERVAL_SECONDS) {
    return {
      economyTimer: nextTimer,
      moneyDelta: 0,
      ledgerEntries: [],
    }
  }

  const cycles = Math.floor(nextTimer / UPKEEP_INTERVAL_SECONDS)
  const remainingTimer = nextTimer - cycles * UPKEEP_INTERVAL_SECONDS
  const timestamp = now
  const timeLabel = new Date(now).toLocaleTimeString()

  const unitTypeCounts = vehicles.reduce((acc, vehicle) => {
    const type = vehicle.unitType || 'patrol'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  const upkeepCostPerCycle = Object.entries(unitTypeCounts).reduce((sum, [type, count]) => {
    const rate = UNIT_TYPE_UPKEEP_PER_MIN[type] ?? UNIT_TYPE_UPKEEP_PER_MIN.default
    return sum + rate * count
  }, 0)

  const personnelCount = stations.reduce((sum, station) => sum + (station.personnelAssigned || 0), 0)
  const personnelCost = cycles * PERSONNEL_UPKEEP_PER_MIN * personnelCount
  const stationCost = cycles * STATION_UPKEEP_PER_MIN * stations.length
  const overtimeCount = vehicles.filter(
    (vehicle) =>
      vehicle.status === VEHICLE_STATUS.enroute || vehicle.status === VEHICLE_STATUS.on_scene
  ).length
  const overtimeCost = cycles * OVERTIME_UPKEEP_PER_MIN * overtimeCount

  const totalCost = upkeepCostPerCycle * cycles + personnelCost + stationCost + overtimeCost
  const ledgerEntries = []

  Object.entries(unitTypeCounts).forEach(([type, count]) => {
    const rate = UNIT_TYPE_UPKEEP_PER_MIN[type] ?? UNIT_TYPE_UPKEEP_PER_MIN.default
    const lineCost = rate * count * cycles
    if (lineCost <= 0) return
    ledgerEntries.push({
      id: `upkeep-${type}-${timestamp}-${cycles}`,
      label: `${type[0].toUpperCase()}${type.slice(1)} upkeep (${count})`,
      amount: -lineCost,
      time: timeLabel,
    })
  })

  if (personnelCost > 0) {
    ledgerEntries.push({
      id: `personnel-${timestamp}-${cycles}`,
      label: `Personnel salaries (${personnelCount})`,
      amount: -personnelCost,
      time: timeLabel,
    })
  }

  if (stationCost > 0) {
    ledgerEntries.push({
      id: `station-upkeep-${timestamp}-${cycles}`,
      label: `Station upkeep (${stations.length})`,
      amount: -stationCost,
      time: timeLabel,
    })
  }

  if (overtimeCost > 0) {
    ledgerEntries.push({
      id: `overtime-${timestamp}-${cycles}`,
      label: `Overtime (${overtimeCount} active)`,
      amount: -overtimeCost,
      time: timeLabel,
    })
  }

  return {
    economyTimer: remainingTimer,
    moneyDelta: -totalCost,
    ledgerEntries,
  }
}
