import { describe, expect, it } from 'vitest'
import {
  createSaveExportPayload,
  parseSaveImportPayload,
  serializeSaveExport,
} from './saveTransfer'

describe('save transfer', () => {
  it('serializes and parses exported payloads', () => {
    const payload = createSaveExportPayload({
      gameState: { money: 2300, score: 420, stations: [{ id: 1 }] },
      saveSlot: 2,
      schemaVersion: 3,
      exportedAt: 123456,
    })
    const raw = serializeSaveExport(payload)
    const parsed = parseSaveImportPayload(raw)
    expect(parsed.saveSlot).toBe(2)
    expect(parsed.schemaVersion).toBe(3)
    expect(parsed.data.money).toBe(2300)
  })

  it('supports legacy raw save objects', () => {
    const parsed = parseSaveImportPayload(JSON.stringify({ money: 500, schemaVersion: 2 }))
    expect(parsed.data.money).toBe(500)
    expect(parsed.schemaVersion).toBe(2)
  })

  it('throws on invalid JSON payload', () => {
    expect(() => parseSaveImportPayload('{bad')).toThrow(/valid JSON/i)
  })
})
