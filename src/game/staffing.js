export const isStationOnDuty = (station, now = new Date()) => {
  if (!station) return true
  const preset = station.shiftPreset || '24_7'
  if (preset === '24_7') return true
  const hour = now.getHours()
  if (preset === 'day') {
    return hour >= 8 && hour < 20
  }
  if (preset === 'night') {
    return hour >= 20 || hour < 8
  }
  return true
}

export const getStationMinOnDuty = (station, now = new Date()) => {
  if (!station) return 0
  const hour = now.getHours()
  const isNight = hour >= 20 || hour < 8
  return isNight
    ? Number(station.minOnDutyNight) || 0
    : Number(station.minOnDutyDay) || 0
}
