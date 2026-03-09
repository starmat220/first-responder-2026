export const SAVE_EXPORT_FORMAT_VERSION = 1

export const createSaveExportPayload = ({
  gameState,
  saveSlot,
  schemaVersion,
  exportedAt = Date.now(),
}) => ({
  formatVersion: SAVE_EXPORT_FORMAT_VERSION,
  exportedAt,
  saveSlot: Number(saveSlot) || 1,
  schemaVersion: Number(schemaVersion) || 1,
  data: gameState,
})

export const serializeSaveExport = (payload) => JSON.stringify(payload, null, 2)

const isValidPayloadObject = (value) => value && typeof value === 'object' && !Array.isArray(value)

export const parseSaveImportPayload = (rawText) => {
  let parsed
  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new Error('Save import file is not valid JSON.')
  }
  if (!isValidPayloadObject(parsed)) {
    throw new Error('Save import file must contain an object payload.')
  }

  if (isValidPayloadObject(parsed.data)) {
    return {
      formatVersion: Number(parsed.formatVersion) || SAVE_EXPORT_FORMAT_VERSION,
      exportedAt: Number(parsed.exportedAt) || Date.now(),
      saveSlot: Number(parsed.saveSlot) || 1,
      schemaVersion: Number(parsed.schemaVersion) || 1,
      data: parsed.data,
    }
  }

  // Support importing raw legacy saves that are just game-state objects.
  return {
    formatVersion: SAVE_EXPORT_FORMAT_VERSION,
    exportedAt: Date.now(),
    saveSlot: 1,
    schemaVersion: Number(parsed.schemaVersion) || 1,
    data: parsed,
  }
}
