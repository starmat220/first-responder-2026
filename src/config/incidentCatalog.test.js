import { describe, expect, it } from 'vitest'
import {
  CURATED_POLICE_INCIDENT_TYPES,
  EMS_INCIDENT_TYPES,
  FIRE_INCIDENT_TYPES,
  INCIDENT_TYPES,
  INCIDENT_TYPES_BY_DEPARTMENT,
  TOW_INCIDENT_TYPES,
} from './incidentCatalog'

describe('incident catalog', () => {
  it('includes curated fire incidents in fire department pool', () => {
    expect(FIRE_INCIDENT_TYPES).toContain('Structure fire')
    expect(FIRE_INCIDENT_TYPES).toContain('Gas leak')
    expect(INCIDENT_TYPES_BY_DEPARTMENT.fire.length).toBeGreaterThanOrEqual(10)
  })

  it('includes fire incidents in flattened incident type list', () => {
    expect(INCIDENT_TYPES).toContain('Structure fire')
    expect(INCIDENT_TYPES).toContain('Industrial fire')
  })

  it('includes expanded ems and tow incident pools', () => {
    expect(EMS_INCIDENT_TYPES).toContain('Cardiac arrest')
    expect(EMS_INCIDENT_TYPES).toContain('Unconscious person')
    expect(TOW_INCIDENT_TYPES).toContain('Flat tire change')
    expect(TOW_INCIDENT_TYPES).toContain('Vehicle extraction (ditch/snow)')
  })

  it('includes curated police additions', () => {
    expect(CURATED_POLICE_INCIDENT_TYPES).toContain('School lockdown assist')
    expect(CURATED_POLICE_INCIDENT_TYPES).toContain(
      'Demonstration against the construction of a highway project'
    )
    expect(INCIDENT_TYPES_BY_DEPARTMENT.police.length).toBeGreaterThanOrEqual(10)
  })
})
