import { DEFAULT_CENTER } from './constants'
import { sanitizePosition } from './geo'
import { clamp } from './utils'

export const WEATHER_CONDITIONS = {
  clear: {
    id: 'clear',
    label: 'Clear',
    speedMultiplier: 1,
    pressure: 0,
  },
  rain: {
    id: 'rain',
    label: 'Rain',
    speedMultiplier: 0.9,
    pressure: 0.18,
  },
  storm: {
    id: 'storm',
    label: 'Storm',
    speedMultiplier: 0.82,
    pressure: 0.36,
  },
  snow: {
    id: 'snow',
    label: 'Snow',
    speedMultiplier: 0.75,
    pressure: 0.42,
  },
  blizzard: {
    id: 'blizzard',
    label: 'Blizzard',
    speedMultiplier: 0.62,
    pressure: 0.6,
  },
  heatwave: {
    id: 'heatwave',
    label: 'Heatwave',
    speedMultiplier: 0.91,
    pressure: 0.3,
  },
  fog: {
    id: 'fog',
    label: 'Fog',
    speedMultiplier: 0.87,
    pressure: 0.22,
  },
}

const CONDITION_IDS = Object.keys(WEATHER_CONDITIONS)

const SEASON_BY_MONTH = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter']

const TEMPERATURE_BANDS = {
  tropical: {
    winter: [22, 32],
    spring: [24, 34],
    summer: [26, 38],
    autumn: [24, 33],
  },
  temperate: {
    winter: [-8, 7],
    spring: [4, 18],
    summer: [18, 34],
    autumn: [6, 20],
  },
  cold: {
    winter: [-22, -2],
    spring: [-6, 10],
    summer: [8, 24],
    autumn: [-2, 12],
  },
}

const WEATHER_WEIGHTS = {
  tropical: {
    winter: { clear: 0.46, rain: 0.33, storm: 0.12, fog: 0.07, heatwave: 0.02 },
    spring: { clear: 0.42, rain: 0.35, storm: 0.13, fog: 0.05, heatwave: 0.05 },
    summer: { clear: 0.33, rain: 0.38, storm: 0.18, fog: 0.03, heatwave: 0.08 },
    autumn: { clear: 0.44, rain: 0.34, storm: 0.13, fog: 0.05, heatwave: 0.04 },
  },
  temperate: {
    winter: { clear: 0.46, rain: 0.17, snow: 0.24, fog: 0.1, storm: 0.03 },
    spring: { clear: 0.42, rain: 0.33, fog: 0.12, storm: 0.08, heatwave: 0.05 },
    summer: { clear: 0.5, rain: 0.24, storm: 0.1, heatwave: 0.12, fog: 0.04 },
    autumn: { clear: 0.37, rain: 0.32, fog: 0.15, storm: 0.1, snow: 0.06 },
  },
  cold: {
    winter: { clear: 0.34, snow: 0.41, blizzard: 0.11, fog: 0.08, rain: 0.06 },
    spring: { clear: 0.36, rain: 0.24, snow: 0.21, fog: 0.11, storm: 0.08 },
    summer: { clear: 0.52, rain: 0.24, storm: 0.11, fog: 0.09, heatwave: 0.04 },
    autumn: { clear: 0.31, rain: 0.26, snow: 0.23, fog: 0.13, storm: 0.07 },
  },
}

const randomBetween = (min, max, rng = Math.random) => min + (max - min) * rng()
const LIVE_WEATHER_ENDPOINT = 'https://api.open-meteo.com/v1/forecast'
const toFiniteNumber = (value, fallback = null) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const pickFromWeights = (weights, rng = Math.random) => {
  const entries = Object.entries(weights)
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  if (total <= 0) return 'clear'
  let roll = rng() * total
  for (let i = 0; i < entries.length; i += 1) {
    const [id, weight] = entries[i]
    roll -= weight
    if (roll <= 0) return id
  }
  return entries[entries.length - 1][0]
}

export const getClimateZone = (position = DEFAULT_CENTER) => {
  const latitude = Math.abs(Number(position?.[0]) || 0)
  if (latitude < 24) return 'tropical'
  if (latitude < 47) return 'temperate'
  return 'cold'
}

export const getWeatherSeason = (timestamp = Date.now(), latitude = DEFAULT_CENTER[0]) => {
  const date = new Date(timestamp)
  const month = date.getUTCMonth()
  const northSeason = SEASON_BY_MONTH[month] || 'summer'
  const isSouthernHemisphere = Number(latitude) < 0
  if (!isSouthernHemisphere) return northSeason
  const opposite = {
    winter: 'summer',
    spring: 'autumn',
    summer: 'winter',
    autumn: 'spring',
  }
  return opposite[northSeason] || northSeason
}

const getWeatherWeights = (climateZone, season) =>
  WEATHER_WEIGHTS[climateZone]?.[season] || WEATHER_WEIGHTS.temperate.summer

const getTemperatureRange = (climateZone, season) =>
  TEMPERATURE_BANDS[climateZone]?.[season] || TEMPERATURE_BANDS.temperate.summer

const pickCondition = ({
  climateZone,
  season,
  temperatureC,
  previousCondition = null,
  rng = Math.random,
}) => {
  const shouldPersist = previousCondition && rng() < 0.55
  if (shouldPersist && CONDITION_IDS.includes(previousCondition)) {
    return previousCondition
  }

  const weights = { ...getWeatherWeights(climateZone, season) }
  if (temperatureC <= -2) {
    weights.snow = (weights.snow || 0) + (weights.rain || 0) * 0.65
    weights.blizzard = (weights.blizzard || 0) + 0.03
    weights.rain = (weights.rain || 0) * 0.35
  }
  if (temperatureC >= 32) {
    weights.heatwave = (weights.heatwave || 0) + 0.12
    weights.snow = 0
    weights.blizzard = 0
  }
  return pickFromWeights(weights, rng)
}

const pickIntensity = (condition, rng = Math.random) => {
  if (condition === 'clear') return randomBetween(0.2, 0.45, rng)
  if (condition === 'rain') return randomBetween(0.35, 0.82, rng)
  if (condition === 'storm') return randomBetween(0.55, 1, rng)
  if (condition === 'snow') return randomBetween(0.45, 0.95, rng)
  if (condition === 'blizzard') return randomBetween(0.72, 1, rng)
  if (condition === 'heatwave') return randomBetween(0.55, 1, rng)
  if (condition === 'fog') return randomBetween(0.35, 0.88, rng)
  return randomBetween(0.2, 0.5, rng)
}

const getUpdateIntervalSeconds = (condition, intensity, rng = Math.random) => {
  const severe = condition === 'storm' || condition === 'blizzard' || condition === 'heatwave'
  const active = condition === 'rain' || condition === 'snow' || condition === 'fog'
  if (severe) {
    return Math.round(randomBetween(90, 170, rng) * (1 - intensity * 0.2))
  }
  if (active) {
    return Math.round(randomBetween(130, 240, rng) * (1 - intensity * 0.15))
  }
  return Math.round(randomBetween(190, 320, rng))
}

const isSameAnchor = (a, b) =>
  Math.abs((Number(a?.[0]) || 0) - (Number(b?.[0]) || 0)) < 0.0005 &&
  Math.abs((Number(a?.[1]) || 0) - (Number(b?.[1]) || 0)) < 0.0005

export const buildWeatherState = ({
  position = DEFAULT_CENTER,
  timestamp = Date.now(),
  previous = null,
  rng = Math.random,
}) => {
  const anchor = sanitizePosition(position, DEFAULT_CENTER)
  const climateZone = getClimateZone(anchor)
  const season = getWeatherSeason(timestamp, anchor[0])
  const [minTemp, maxTemp] = getTemperatureRange(climateZone, season)

  const baseTemp = randomBetween(minTemp, maxTemp, rng)
  const prevTemp = Number(previous?.temperatureC)
  const smoothedTemp = Number.isFinite(prevTemp)
    ? prevTemp * 0.65 + baseTemp * 0.35
    : baseTemp

  const condition = pickCondition({
    climateZone,
    season,
    temperatureC: smoothedTemp,
    previousCondition: previous?.condition || null,
    rng,
  })
  const intensity = pickIntensity(condition, rng)

  const correctionTemp =
    condition === 'snow' || condition === 'blizzard'
      ? Math.min(smoothedTemp, randomBetween(-12, 1, rng))
      : condition === 'heatwave'
        ? Math.max(smoothedTemp, randomBetween(30, 41, rng))
        : smoothedTemp

  const updateIntervalSeconds = getUpdateIntervalSeconds(condition, intensity, rng)

  return {
    position: anchor,
    climateZone,
    season,
    condition,
    intensity: clamp(intensity, 0, 1),
    temperatureC: Math.round(correctionTemp * 10) / 10,
    updatedAt: timestamp,
    nextUpdateAt: timestamp + updateIntervalSeconds * 1000,
  }
}

export const createInitialWeather = (position = DEFAULT_CENTER, timestamp = Date.now()) =>
  buildWeatherState({
    position,
    timestamp,
  })

export const maybeAdvanceWeather = (
  currentWeather,
  position = DEFAULT_CENTER,
  timestamp = Date.now()
) => {
  if (!currentWeather || typeof currentWeather !== 'object') {
    return createInitialWeather(position, timestamp)
  }
  const anchor = sanitizePosition(position, DEFAULT_CENTER)
  const anchorChanged = !isSameAnchor(currentWeather.position, anchor)
  const needsUpdate = Number(currentWeather.nextUpdateAt) <= timestamp
  if (!anchorChanged && !needsUpdate) return currentWeather
  return buildWeatherState({
    position: anchor,
    timestamp,
    previous: currentWeather,
  })
}

export const mapWeatherCodeToCondition = (
  weatherCode,
  temperatureC = 20,
  windSpeedKph = 0
) => {
  const code = Math.round(Number(weatherCode))
  if (code === 45 || code === 48) return 'fog'
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return code === 77 || code === 86 || windSpeedKph >= 45 ? 'blizzard' : 'snow'
  }
  if ([95, 96, 99].includes(code)) return 'storm'
  if ([56, 57, 66, 67].includes(code)) {
    return temperatureC <= 0 ? 'snow' : 'rain'
  }
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
    return windSpeedKph >= 55 ? 'storm' : 'rain'
  }
  if (temperatureC >= 34 && [0, 1, 2, 3].includes(code)) return 'heatwave'
  return 'clear'
}

export const estimateLiveWeatherIntensity = ({
  condition,
  temperatureC,
  precipitationMm = 0,
  cloudCoverPct = 0,
  windSpeedKph = 0,
}) => {
  const precipScore = clamp((Number(precipitationMm) || 0) / 6, 0, 1)
  const cloudScore = clamp((Number(cloudCoverPct) || 0) / 100, 0, 1)
  const windScore = clamp((Number(windSpeedKph) || 0) / 85, 0, 1)
  const tempScore = clamp(((Number(temperatureC) || 20) - 32) / 12, 0, 1)

  if (condition === 'storm') {
    return clamp(0.6 + precipScore * 0.2 + windScore * 0.3, 0.55, 1)
  }
  if (condition === 'blizzard') {
    return clamp(0.72 + precipScore * 0.1 + windScore * 0.2, 0.72, 1)
  }
  if (condition === 'snow') {
    return clamp(0.45 + precipScore * 0.32 + windScore * 0.22, 0.45, 0.95)
  }
  if (condition === 'rain') {
    return clamp(0.35 + precipScore * 0.45 + windScore * 0.2, 0.35, 0.95)
  }
  if (condition === 'heatwave') {
    return clamp(0.55 + tempScore * 0.35 + windScore * 0.1, 0.55, 1)
  }
  if (condition === 'fog') {
    return clamp(0.35 + cloudScore * 0.35 + precipScore * 0.2, 0.35, 0.88)
  }
  return clamp(0.2 + cloudScore * 0.2, 0.2, 0.45)
}

const extractLiveWeatherMetrics = (payload) => {
  const current = payload?.current || null
  if (current && typeof current === 'object') {
    return {
      temperatureC: toFiniteNumber(current.temperature_2m),
      weatherCode: toFiniteNumber(current.weather_code),
      windSpeedKph: toFiniteNumber(current.wind_speed_10m, 0),
      precipitationMm: toFiniteNumber(current.precipitation, 0),
      cloudCoverPct: toFiniteNumber(current.cloud_cover, 0),
      observedAt:
        typeof current.time === 'string' && Number.isFinite(Date.parse(current.time))
          ? Date.parse(current.time)
          : null,
    }
  }
  const legacy = payload?.current_weather || null
  if (!legacy || typeof legacy !== 'object') return null
  return {
    temperatureC: toFiniteNumber(legacy.temperature),
    weatherCode: toFiniteNumber(legacy.weathercode),
    windSpeedKph: toFiniteNumber(legacy.windspeed, 0),
    precipitationMm: 0,
    cloudCoverPct: 0,
    observedAt:
      typeof legacy.time === 'string' && Number.isFinite(Date.parse(legacy.time))
        ? Date.parse(legacy.time)
        : null,
  }
}

export const fetchLiveWeatherForPosition = async (
  position = DEFAULT_CENTER,
  {
    fetchImpl = typeof fetch === 'function' ? fetch : null,
    timestamp = Date.now(),
  } = {}
) => {
  if (typeof fetchImpl !== 'function') return null
  const anchor = sanitizePosition(position, DEFAULT_CENTER)
  const params = new URLSearchParams({
    latitude: `${anchor[0]}`,
    longitude: `${anchor[1]}`,
    current: 'temperature_2m,precipitation,weather_code,cloud_cover,wind_speed_10m',
    timezone: 'auto',
    forecast_days: '1',
  })
  const endpoint = `${LIVE_WEATHER_ENDPOINT}?${params.toString()}`

  try {
    const response = await fetchImpl(endpoint, {
      method: 'GET',
      headers: { accept: 'application/json' },
    })
    if (!response.ok) return null
    const payload = await response.json()
    const metrics = extractLiveWeatherMetrics(payload)
    if (!metrics || !Number.isFinite(metrics.temperatureC)) return null
    const condition = mapWeatherCodeToCondition(
      metrics.weatherCode,
      metrics.temperatureC,
      metrics.windSpeedKph
    )
    const intensity = estimateLiveWeatherIntensity({
      condition,
      temperatureC: metrics.temperatureC,
      precipitationMm: metrics.precipitationMm,
      cloudCoverPct: metrics.cloudCoverPct,
      windSpeedKph: metrics.windSpeedKph,
    })
    const observedAt =
      Number.isFinite(metrics.observedAt) && metrics.observedAt > 0
        ? metrics.observedAt
        : timestamp
    const severeCondition = condition === 'storm' || condition === 'blizzard'
    const nextUpdateMs = severeCondition ? 10 * 60 * 1000 : 15 * 60 * 1000

    return {
      position: anchor,
      climateZone: getClimateZone(anchor),
      season: getWeatherSeason(observedAt, anchor[0]),
      condition,
      intensity,
      temperatureC: Math.round(metrics.temperatureC * 10) / 10,
      updatedAt: observedAt,
      nextUpdateAt: observedAt + nextUpdateMs,
    }
  } catch {
    return null
  }
}

export const getWeatherSpeedMultiplier = (weather, emergency = false) => {
  const conditionId = weather?.condition
  const base = WEATHER_CONDITIONS[conditionId]?.speedMultiplier || 1
  const intensity = clamp(Number(weather?.intensity) || 0, 0, 1)
  const scaled = 1 - (1 - base) * (0.68 + intensity * 0.62)
  if (!emergency) return clamp(scaled, 0.55, 1.04)
  const penalty = 1 - scaled
  const emergencyAdjusted = 1 - penalty * 0.72
  return clamp(emergencyAdjusted, 0.62, 1.08)
}

export const getWeatherIncidentPressure = (weather) => {
  const conditionId = weather?.condition
  const basePressure = WEATHER_CONDITIONS[conditionId]?.pressure || 0
  const intensity = clamp(Number(weather?.intensity) || 0, 0, 1)
  return clamp(basePressure + intensity * 0.18, 0, 0.82)
}

export const getWeatherSpawnIntervalMultiplier = (weather) => {
  const pressure = getWeatherIncidentPressure(weather)
  return clamp(1 - pressure * 0.28, 0.72, 1.05)
}

export const describeWeather = (weather) => {
  if (!weather) return 'Clear 20C'
  const condition = WEATHER_CONDITIONS[weather.condition]?.label || 'Weather'
  const temp = Math.round(Number(weather.temperatureC) || 20)
  return `${condition} ${temp}C`
}
