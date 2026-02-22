import { getPriorityConfig } from '../config/priority'

const CasesPanel = ({ cases, activeCase, onSelectCase, onClose }) => {
  const sortedCases = [...cases].sort((a, b) => {
    const timeA = a.updatedAt || a.createdAt || 0
    const timeB = b.updatedAt || b.createdAt || 0
    return timeB - timeA
  })

  return (
    <aside className="panel cases-panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Case Files</p>
          <p className="muted">Evidence and notes log</p>
        </div>
        <button className="btn btn--ghost btn--small" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="cases-panel__content">
        <div className="cases-panel__list">
          {sortedCases.length === 0 && <p className="muted">No cases yet.</p>}
          {sortedCases.map((entry) => (
            <button
              key={`case-${entry.caseId}`}
              className={`case-item ${
                (activeCase?.caseId || null) === entry.caseId ? 'case-item--active' : ''
              }`}
              onClick={() => onSelectCase(entry.caseId)}
            >
              <span className={`priority-tag priority-tag--${entry.priority || 2}`}>
                {getPriorityConfig(entry.priority || 2).label}
              </span>
              <div>
                <p className="title">Case #{entry.caseId}</p>
                <p className="muted">{entry.type}</p>
              </div>
              <span className="case-score">{entry.evidenceScore ?? 0} ev</span>
            </button>
          ))}
        </div>
        <div className="cases-panel__detail">
          {activeCase ? (
            <>
              <p className="station-card__title">Evidence Timeline</p>
              <div className="case-detail__meta">
                <span>Case #{activeCase.caseId}</span>
                <span>Evidence {activeCase.evidenceScore ?? 0}</span>
              </div>
              <div className="case-notes">
                {activeCase.notes?.length ? (
                  activeCase.notes.map((note, index) => (
                    <div key={`note-${activeCase.caseId}-${index}`} className="case-note">
                      <span className="muted">{note.time}</span>
                      <p>{note.note}</p>
                      {note.delta != null && (
                        <span className={`case-note__delta ${note.delta >= 0 ? 'up' : ''}`}>
                          {note.delta >= 0 ? `+${note.delta}` : note.delta}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="muted">No notes yet.</p>
                )}
              </div>
            </>
          ) : (
            <p className="muted">Select a case to view details.</p>
          )}
        </div>
      </div>
    </aside>
  )
}

export default CasesPanel
