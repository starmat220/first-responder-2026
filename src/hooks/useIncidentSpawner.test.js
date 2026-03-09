import { describe, expect, it } from 'vitest'
import { isIncidentTypeWeatherCompatible } from './useIncidentSpawner'

describe('incident weather compatibility', () => {
  it('blocks heat exhaustion incidents in mild weather', () => {
    const weather = { condition: 'clear', temperatureC: 18 }
    const allowed = isIncidentTypeWeatherCompatible('Heat Exhaustion / Dehydration', weather)
    expect(allowed).toBe(false)
  })

  it('allows heat-related incidents in heatwave conditions', () => {
    const weather = { condition: 'heatwave', temperatureC: 36 }
    const allowed = isIncidentTypeWeatherCompatible('Heatstroke (Unresponsive)', weather)
    expect(allowed).toBe(true)
  })

  it('blocks hypothermia incidents outside cold profiles', () => {
    const weather = { condition: 'clear', temperatureC: 22 }
    const allowed = isIncidentTypeWeatherCompatible('Hypothermia / Cold Exposure', weather)
    expect(allowed).toBe(false)
  })

  it('allows cold-weather incidents during snow', () => {
    const weather = { condition: 'snow', temperatureC: -4 }
    const allowed = isIncidentTypeWeatherCompatible('Hypothermia emergency', weather)
    expect(allowed).toBe(true)
  })

  it('blocks fog-specific incidents when it is not foggy', () => {
    const weather = { condition: 'rain', temperatureC: 9 }
    const allowed = isIncidentTypeWeatherCompatible('Low-visibility collision', weather)
    expect(allowed).toBe(false)
  })

  it('blocks wet-weather incidents during clear weather', () => {
    const weather = { condition: 'clear', temperatureC: 21 }
    const allowed = isIncidentTypeWeatherCompatible('Flood-Stalled Vehicle Recovery', weather)
    expect(allowed).toBe(false)
  })

  it('allows wet-weather incidents when raining', () => {
    const weather = { condition: 'rain', temperatureC: 14 }
    const allowed = isIncidentTypeWeatherCompatible('Flood-Stalled Vehicle Recovery', weather)
    expect(allowed).toBe(true)
  })
})
