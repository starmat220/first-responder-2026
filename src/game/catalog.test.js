import { describe, expect, it } from 'vitest'
import { DEPARTMENTS, DEFAULT_DEPARTMENT_ID } from './departments'
import {
  BUILDING_CATALOG,
  getUnitById,
  getUnitsByDepartment,
  isUnitUnlocked,
  toUnitTypeMap,
} from './catalog'
import { normalizeRequirementSet } from './requirements'

describe('department catalog core', () => {
  it('provides police units and lookup map', () => {
    const units = getUnitsByDepartment(DEPARTMENTS.police.id)
    expect(units.length).toBeGreaterThan(0)
    expect(units.some((unit) => unit.id === 'patrol')).toBe(true)

    const map = toUnitTypeMap(DEPARTMENTS.police.id)
    expect(map.patrol.label).toBe('Standard')
  })

  it('resolves unit by id with fallback', () => {
    const patrol = getUnitById('patrol')
    expect(patrol.id).toBe('patrol')

    const fallback = getUnitById('unknown-id')
    expect(fallback).toBeTruthy()
  })

  it('evaluates unlock keys', () => {
    const traffic = getUnitById('traffic')
    expect(isUnitUnlocked(traffic, { trafficUnitUnlocked: false })).toBe(false)
    expect(isUnitUnlocked(traffic, { trafficUnitUnlocked: true })).toBe(true)
  })

  it('contains multi-department building catalog entries', () => {
    const departments = new Set(BUILDING_CATALOG.map((entry) => entry.department).filter(Boolean))
    expect(departments.has(DEPARTMENTS.police.id)).toBe(true)
    expect(departments.has(DEPARTMENTS.fire.id)).toBe(true)
    expect(departments.has(DEPARTMENTS.ems.id)).toBe(true)
    expect(departments.has(DEPARTMENTS.tow.id)).toBe(true)
  })

  it('normalizes requirement sets', () => {
    const normalized = normalizeRequirementSet({
      requiredUnits: 0,
      requiredUnitType: 'any',
      requiredDepartment: null,
    })
    expect(normalized.requiredUnits).toBe(1)
    expect(normalized.requiredUnitType).toBeNull()
    expect(normalized.requiredDepartment).toBe(DEFAULT_DEPARTMENT_ID)
  })
})
