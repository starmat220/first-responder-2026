import { describe, expect, it } from 'vitest'
import { resolveIncidentSpawnLocation } from './spawnLocation'

describe('resolveIncidentSpawnLocation', () => {
  it('uses snapped road geometry and reverse-geocoded address when available', async () => {
    const fetchImpl = async (url) => {
      if (url.includes('/nearest/')) {
        return {
          ok: true,
          json: async () => ({
            waypoints: [
              {
                location: [-66.47, 45.85],
                name: 'Main Street',
                distance: 12,
              },
            ],
          }),
        }
      }

      return {
        ok: true,
        json: async () => ({
          display_name: 'Main Street, Oromocto, New Brunswick',
          category: 'highway',
          type: 'residential',
          address: {
            house_number: '100',
            road: 'Main Street',
            town: 'Oromocto',
          },
        }),
      }
    }

    const result = await resolveIncidentSpawnLocation({
      anchor: [45.8497, -66.4758],
      radiusKm: 2,
      randomPointNear: () => [45.85, -66.47],
      fetchImpl,
    })

    expect(result).toEqual({
      position: [45.85, -66.47],
      roadName: 'Main Street',
      address: '100 Main Street, Oromocto',
      usedFallback: false,
    })
  })

  it('falls back to snapped road name when reverse geocoding fails', async () => {
    const fetchImpl = async (url) => {
      if (url.includes('/nearest/')) {
        return {
          ok: true,
          json: async () => ({
            waypoints: [
              {
                location: [-66.46, 45.84],
                name: 'Broad Road',
                distance: 18,
              },
            ],
          }),
        }
      }

      throw new Error('reverse geocoder unavailable')
    }

    const result = await resolveIncidentSpawnLocation({
      anchor: [45.8497, -66.4758],
      radiusKm: 2,
      randomPointNear: () => [45.84, -66.46],
      fetchImpl,
    })

    expect(result).toEqual({
      position: [45.84, -66.46],
      roadName: 'Broad Road',
      address: 'Broad Road, Oromocto',
      usedFallback: true,
    })
  })

  it('still returns a generic spawn point when routing services fail entirely', async () => {
    const result = await resolveIncidentSpawnLocation({
      anchor: [45.8497, -66.4758],
      radiusKm: 2,
      randomPointNear: () => [45.83, -66.45],
      fetchImpl: async () => {
        throw new Error('offline')
      },
    })

    expect(result).toEqual({
      position: [45.83, -66.45],
      roadName: 'Local Road',
      address: 'Local Road, Oromocto',
      usedFallback: true,
    })
  })
})
