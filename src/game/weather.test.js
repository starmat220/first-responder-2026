import { describe, expect, it } from 'vitest'
import {
  buildWeatherState,
  estimateLiveWeatherIntensity,
  fetchLiveWeatherForPosition,
  getWeatherSeason,
  getWeatherSpeedMultiplier,
  getWeatherIncidentPressure,
  mapWeatherCodeToCondition,
  maybeAdvanceWeather,
} from './weather'

describe('weather system', () => {
  it('flips seasons between hemispheres', () => {
    const julyTs = Date.UTC(2026, 6, 15)
    expect(getWeatherSeason(julyTs, 45)).toBe('summer')
    expect(getWeatherSeason(julyTs, -45)).toBe('winter')
  })

  it('does not advance weather before next update time', () => {
    const now = Date.UTC(2026, 0, 15)
    const weather = buildWeatherState({
      position: [45.8, -66.4],
      timestamp: now,
    })
    const unchanged = maybeAdvanceWeather(
      weather,
      [45.8, -66.4],
      now + 3000
    )
    expect(unchanged).toBe(weather)
  })

  it('applies heavier speed penalties in snow than clear conditions', () => {
    const clear = getWeatherSpeedMultiplier({ condition: 'clear', intensity: 0.3 })
    const snow = getWeatherSpeedMultiplier({ condition: 'snow', intensity: 0.8 })
    expect(snow).toBeLessThan(clear)
  })

  it('increases incident pressure during severe weather', () => {
    const clearPressure = getWeatherIncidentPressure({ condition: 'clear', intensity: 0.2 })
    const stormPressure = getWeatherIncidentPressure({ condition: 'storm', intensity: 0.9 })
    expect(stormPressure).toBeGreaterThan(clearPressure)
  })

  it('maps live weather codes into gameplay conditions', () => {
    expect(mapWeatherCodeToCondition(45, 8, 5)).toBe('fog')
    expect(mapWeatherCodeToCondition(71, -5, 20)).toBe('snow')
    expect(mapWeatherCodeToCondition(86, -2, 50)).toBe('blizzard')
    expect(mapWeatherCodeToCondition(95, 12, 35)).toBe('storm')
    expect(mapWeatherCodeToCondition(0, 36, 5)).toBe('heatwave')
  })

  it('derives stronger live intensity for storms than clear conditions', () => {
    const clear = estimateLiveWeatherIntensity({
      condition: 'clear',
      temperatureC: 20,
      precipitationMm: 0,
      cloudCoverPct: 10,
      windSpeedKph: 8,
    })
    const storm = estimateLiveWeatherIntensity({
      condition: 'storm',
      temperatureC: 18,
      precipitationMm: 5.4,
      cloudCoverPct: 100,
      windSpeedKph: 60,
    })
    expect(storm).toBeGreaterThan(clear)
  })

  it('builds location-aware live weather state from API metrics', async () => {
    const mockFetch = async () => ({
      ok: true,
      json: async () => ({
        current: {
          time: '2026-03-03T12:00',
          temperature_2m: 19.6,
          weather_code: 61,
          wind_speed_10m: 18,
          precipitation: 1.2,
          cloud_cover: 76,
        },
      }),
    })
    const weather = await fetchLiveWeatherForPosition([34.0522, -118.2437], {
      fetchImpl: mockFetch,
      timestamp: Date.UTC(2026, 2, 3, 12, 0, 0),
    })
    expect(weather).toBeTruthy()
    expect(weather?.condition).toBe('rain')
    expect(weather?.climateZone).toBe('temperate')
    expect(weather?.position?.[0]).toBeCloseTo(34.0522, 4)
    expect(weather?.position?.[1]).toBeCloseTo(-118.2437, 4)
  })

  it('returns null when live weather fetch fails', async () => {
    const mockFetch = async () => ({ ok: false })
    const weather = await fetchLiveWeatherForPosition([37.7749, -122.4194], {
      fetchImpl: mockFetch,
    })
    expect(weather).toBeNull()
  })
})
