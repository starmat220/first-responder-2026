import { useEffect, useRef } from 'react'
import { SAVE_SCHEMA_VERSION } from '../game/constants'

const STORAGE_BACKUP_SUFFIX = '.backup.latest'
const MAX_DISCOVERED_SAVE_VERSIONS = 12
const DEFAULT_STARTUP_STATE = { showWelcome: true }

const resolveStorage = (storage) => {
  if (storage) return storage
  if (typeof localStorage !== 'undefined') return localStorage
  return null
}

const getSlotSuffix = (storageKey) => {
  const match = String(storageKey || '').match(/\.slot\d+$/)
  return match ? match[0] : ''
}

const splitStorageKey = (storageKey) => {
  const normalized = String(storageKey || '')
  const slotSuffix = getSlotSuffix(normalized)
  const withoutSlot = slotSuffix
    ? normalized.slice(0, -slotSuffix.length)
    : normalized
  const familyBase = withoutSlot.replace(/\.v\d+$/, '')
  return { slotSuffix, withoutSlot, familyBase }
}

const buildKeyWithSlot = (base, slotSuffix) => `${base}${slotSuffix}`

export const getBackupStorageKey = (storageKey) =>
  `${String(storageKey || '')}${STORAGE_BACKUP_SUFFIX}`

export const collectCandidateSaveKeys = (storageKey, storage = null) => {
  const activeStorage = resolveStorage(storage)
  if (!activeStorage) return []
  const { slotSuffix, withoutSlot, familyBase } = splitStorageKey(storageKey)
  const candidates = new Set([
    storageKey,
    buildKeyWithSlot(withoutSlot, slotSuffix),
    buildKeyWithSlot(familyBase, slotSuffix),
  ])

  for (let version = 1; version <= MAX_DISCOVERED_SAVE_VERSIONS; version += 1) {
    candidates.add(buildKeyWithSlot(`${familyBase}.v${version}`, slotSuffix))
  }

  for (let index = 0; index < activeStorage.length; index += 1) {
    const key = activeStorage.key(index)
    if (!key || key.endsWith(STORAGE_BACKUP_SUFFIX)) continue
    if (slotSuffix) {
      const inSameSlot = key.endsWith(slotSuffix)
      const inSaveFamily =
        key === buildKeyWithSlot(familyBase, slotSuffix) ||
        key.startsWith(`${familyBase}.v`)
      if (inSameSlot && inSaveFamily) {
        candidates.add(key)
      }
      continue
    }
    if (key === familyBase || key.startsWith(`${familyBase}.v`)) {
      candidates.add(key)
    }
  }

  return Array.from(candidates)
}

export const parseSaveCandidate = (key, storage = null) => {
  const activeStorage = resolveStorage(storage)
  if (!activeStorage) return null
  const raw = activeStorage.getItem(key)
  if (!raw) return null
  try {
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object') return null
    return { key, raw, data }
  } catch {
    return null
  }
}

const getCandidateScore = (data) => {
  const stationScore = Array.isArray(data.stations) ? Math.min(data.stations.length, 10) * 10 : 0
  const incidentScore = Array.isArray(data.incidents) ? Math.min(data.incidents.length, 20) : 0
  const resolvedScore = Math.max(0, Number(data.resolvedCount) || 0)
  const schemaScore = Number.isFinite(Number(data.schemaVersion)) ? Number(data.schemaVersion) * 2 : 0
  return stationScore + incidentScore + resolvedScore + schemaScore
}

const rankCandidates = (a, b) => {
  const aSavedAt = Number(a.data.savedAt) || Number(a.data.updatedAt) || 0
  const bSavedAt = Number(b.data.savedAt) || Number(b.data.updatedAt) || 0
  if (aSavedAt !== bSavedAt) return bSavedAt - aSavedAt
  return getCandidateScore(b.data) - getCandidateScore(a.data)
}

export const pickBestSaveCandidate = (storageKey, storage = null) => {
  const activeStorage = resolveStorage(storage)
  if (!activeStorage) return null
  const candidates = collectCandidateSaveKeys(storageKey, activeStorage)
    .map((key) => parseSaveCandidate(key, activeStorage))
    .filter(Boolean)
    .sort(rankCandidates)
  return candidates[0] || null
}

export const rehydrateSaveFromStorage = (storageKey, storage = null) => {
  const activeStorage = resolveStorage(storage)
  if (!activeStorage) return null
  const selected = pickBestSaveCandidate(storageKey, activeStorage)
  if (!selected) return null
  if (selected.key !== storageKey) {
    activeStorage.setItem(storageKey, selected.raw)
  }
  activeStorage.setItem(getBackupStorageKey(storageKey), selected.raw)
  return selected.data
}

export const writeSaveToStorage = (
  storageKey,
  gameState,
  {
    schemaVersion = SAVE_SCHEMA_VERSION,
    savedAt = Date.now(),
    storage = null,
  } = {}
) => {
  const activeStorage = resolveStorage(storage)
  if (!activeStorage) return false
  const saveData = {
    schemaVersion,
    savedAt,
    ...gameState
  }
  const previous = activeStorage.getItem(storageKey)
  if (previous) {
    activeStorage.setItem(getBackupStorageKey(storageKey), previous)
  }
  activeStorage.setItem(storageKey, JSON.stringify(saveData))
  return true
}

export const usePersistence = ({
  storageKey,
  hasLoadedSave,
  setHasLoadedSave,
  applyDefaultState,
  migrateLoadedData,
  gameState, // Object containing all values to save
  loadState // Function to set all values from loaded data
}) => {
  const setHasLoadedSaveRef = useRef(setHasLoadedSave)
  const applyDefaultStateRef = useRef(applyDefaultState)
  const loadStateRef = useRef(loadState)

  useEffect(() => {
    setHasLoadedSaveRef.current = setHasLoadedSave
    applyDefaultStateRef.current = applyDefaultState
    loadStateRef.current = loadState
  }, [applyDefaultState, loadState, setHasLoadedSave])

  // Load logic
  useEffect(() => {
    setHasLoadedSaveRef.current(false)
    const loadedData = rehydrateSaveFromStorage(storageKey)
    if (!loadedData) {
      applyDefaultStateRef.current(DEFAULT_STARTUP_STATE)
      setHasLoadedSaveRef.current(true)
      return
    }
    try {
      const migratedData = typeof migrateLoadedData === 'function'
        ? migrateLoadedData(loadedData)
        : loadedData
      loadStateRef.current(migratedData)
    } catch (error) {
      console.warn('Failed to load save data.', error)
      applyDefaultStateRef.current(DEFAULT_STARTUP_STATE)
    } finally {
      setHasLoadedSaveRef.current(true)
    }
  }, [storageKey, migrateLoadedData])

  // Save logic
  useEffect(() => {
    if (!hasLoadedSave) return
    try {
      writeSaveToStorage(storageKey, gameState)
    } catch (error) {
      console.warn('Failed to save data.', error)
    }
  }, [gameState, hasLoadedSave, storageKey])
}
