export const ensureCaseEntry = (cases, incident) => {
  if (!incident?.caseId) return cases
  if (cases.some((item) => item.caseId === incident.caseId)) return cases
  const entry = {
    caseId: incident.caseId,
    type: incident.type,
    priority: incident.priority,
    createdAt: incident.createdAt || Date.now(),
    evidenceScore: incident.caseScore || 0,
    notes: incident.caseNotes?.length
      ? incident.caseNotes
      : [
          {
            time: new Date().toLocaleTimeString(),
            note: 'Case opened',
            delta: 0,
          },
        ],
  }
  return [entry, ...cases]
}

export const applyCaseUpdates = (cases, updates) => {
  if (!updates.length) return cases
  const next = [...cases]
  updates.forEach((update) => {
    const index = next.findIndex((item) => item.caseId === update.caseId)
    if (index === -1) {
      next.unshift({
        caseId: update.caseId,
        type: update.type,
        priority: update.priority,
        createdAt: update.updatedAt || Date.now(),
        evidenceScore: update.evidenceScore,
        notes: update.notes,
        updatedAt: update.updatedAt,
      })
    } else {
      next[index] = {
        ...next[index],
        type: update.type || next[index].type,
        priority: update.priority || next[index].priority,
        evidenceScore: update.evidenceScore,
        notes: update.notes,
        updatedAt: update.updatedAt,
      }
    }
  })
  return next
}
