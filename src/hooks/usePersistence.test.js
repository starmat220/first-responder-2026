import { describe, expect, it } from 'vitest'
import {
  collectCandidateSaveKeys,
  getBackupStorageKey,
  pickBestSaveCandidate,
  rehydrateSaveFromStorage,
  writeSaveToStorage,
} from './usePersistence'

const createMemoryStorage = (entries = {}) => {
  const store = new Map(Object.entries(entries))
  return {
    get length() {
      return store.size
    },
    key(index) {
      return Array.from(store.keys())[index] || null
    },
    getItem(key) {
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      store.set(String(key), String(value))
    },
    removeItem(key) {
      store.delete(key)
    },
  }
}

describe('usePersistence helpers', () => {
  it('discovers same-slot candidate keys across save versions', () => {
    const storage = createMemoryStorage({
      'fr2026.save.v1.slot1': '{}',
      'fr2026.save.v2.slot1': '{}',
      'fr2026.save.v2.slot1.backup.latest': '{}',
      'fr2026.save.v2.slot2': '{}',
    })
    const keys = collectCandidateSaveKeys('fr2026.save.v3.slot1', storage)
    expect(keys).toContain('fr2026.save.v1.slot1')
    expect(keys).toContain('fr2026.save.v2.slot1')
    expect(keys).not.toContain('fr2026.save.v2.slot1.backup.latest')
    expect(keys).not.toContain('fr2026.save.v2.slot2')
  })

  it('prefers newest save candidate by savedAt timestamp', () => {
    const storage = createMemoryStorage({
      'fr2026.save.v2.slot1': JSON.stringify({ schemaVersion: 2, savedAt: 1000, resolvedCount: 15 }),
      'fr2026.save.v1.slot1': JSON.stringify({ schemaVersion: 1, savedAt: 900, resolvedCount: 40 }),
    })
    const best = pickBestSaveCandidate('fr2026.save.v3.slot1', storage)
    expect(best?.key).toBe('fr2026.save.v2.slot1')
    expect(best?.data?.resolvedCount).toBe(15)
  })

  it('falls back to progress score when timestamps are missing', () => {
    const storage = createMemoryStorage({
      'fr2026.save.v2.slot1': JSON.stringify({
        schemaVersion: 2,
        stations: [{ id: 1 }, { id: 2 }],
        incidents: [{ id: 1 }],
        resolvedCount: 12,
      }),
      'fr2026.save.v1.slot1': JSON.stringify({
        schemaVersion: 1,
        stations: [{ id: 1 }],
        incidents: [],
        resolvedCount: 2,
      }),
    })
    const best = pickBestSaveCandidate('fr2026.save.v3.slot1', storage)
    expect(best?.key).toBe('fr2026.save.v2.slot1')
  })

  it('rehydrates old-version save into current key and backup', () => {
    const oldKey = 'fr2026.save.v1.slot1'
    const currentKey = 'fr2026.save.v3.slot1'
    const payload = { schemaVersion: 1, savedAt: 100, resolvedCount: 8 }
    const storage = createMemoryStorage({
      [oldKey]: JSON.stringify(payload),
    })

    const loaded = rehydrateSaveFromStorage(currentKey, storage)

    expect(loaded?.resolvedCount).toBe(8)
    expect(storage.getItem(currentKey)).toBe(JSON.stringify(payload))
    expect(storage.getItem(getBackupStorageKey(currentKey))).toBe(JSON.stringify(payload))
  })

  it('writes save payload and keeps previous value as backup', () => {
    const storageKey = 'fr2026.save.v2.slot1'
    const existing = JSON.stringify({ schemaVersion: 2, savedAt: 1, resolvedCount: 2 })
    const storage = createMemoryStorage({ [storageKey]: existing })

    const wrote = writeSaveToStorage(
      storageKey,
      { resolvedCount: 9, stations: [{ id: 1 }] },
      {
        schemaVersion: 3,
        savedAt: 1000,
        storage,
      }
    )

    expect(wrote).toBe(true)
    expect(storage.getItem(getBackupStorageKey(storageKey))).toBe(existing)
    const saved = JSON.parse(storage.getItem(storageKey))
    expect(saved.schemaVersion).toBe(3)
    expect(saved.savedAt).toBe(1000)
    expect(saved.resolvedCount).toBe(9)
  })
})
