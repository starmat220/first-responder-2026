import { useEffect, useRef } from 'react'
import { SAVE_SCHEMA_VERSION } from '../game/constants'

const STORAGE_BACKUP_SUFFIX = '.backup.latest'

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

const collectCandidateSaveKeys = (storageKey) => {
  const { slotSuffix, withoutSlot, familyBase } = splitStorageKey(storageKey)
  const candidates = new Set([
    storageKey,
    buildKeyWithSlot(withoutSlot, slotSuffix),
    buildKeyWithSlot(familyBase, slotSuffix),
  ])

  for (let version = 1; version <= 8; version += 1) {
    candidates.add(buildKeyWithSlot(`${familyBase}.v${version}`, slotSuffix))
  }

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
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

const parseSaveCandidate = (key) => {
  const raw = localStorage.getItem(key)
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

export const usePersistence = ({
  storageKey,
  hasLoadedSave,
  setHasLoadedSave,
  applyDefaultState,
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
    const candidates = collectCandidateSaveKeys(storageKey)
      .map(parseSaveCandidate)
      .filter(Boolean)
      .sort(rankCandidates)

    const selected = candidates[0] || null
    if (!selected) {
      applyDefaultStateRef.current({ showWelcome: true })
      setHasLoadedSaveRef.current(true)
      return
    }
    try {
      if (selected.key !== storageKey) {
        localStorage.setItem(storageKey, selected.raw)
      }
      localStorage.setItem(`${storageKey}${STORAGE_BACKUP_SUFFIX}`, selected.raw)
      loadStateRef.current(selected.data)
    } catch (error) {
      console.warn('Failed to load save data.', error)
      applyDefaultStateRef.current({ showWelcome: true })
    } finally {
      setHasLoadedSaveRef.current(true)
    }
  }, [storageKey])

  // Save logic
  useEffect(() => {
    if (!hasLoadedSave) return
    const saveData = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAt: Date.now(),
      ...gameState
    }
    try {
      const existing = localStorage.getItem(storageKey)
      if (existing) {
        localStorage.setItem(`${storageKey}${STORAGE_BACKUP_SUFFIX}`, existing)
      }
      localStorage.setItem(storageKey, JSON.stringify(saveData))
    } catch (error) {
      console.warn('Failed to save data.', error)
    }
  }, [gameState, hasLoadedSave, storageKey])
}
