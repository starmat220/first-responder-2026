import React from 'react'
import '../Theme.css'

const CasesPanel = ({ cases, activeCase, onSelectCase, onClose }) => {
  const sortedCases = [...cases].sort((a, b) => {
    const timeA = a.updatedAt || a.createdAt || 0
    const timeB = b.updatedAt || b.createdAt || 0
    return timeB - timeA
  })

  return (
    <aside className="cmd-panel cases-panel">
      <div className="cmd-header">
        <h2 className="cmd-header__title">ARCHIVED CASE FILES</h2>
        <button className="cmd-btn cmd-btn--ghost cmd-btn--small" onClick={onClose}>
          CLOSE
        </button>
      </div>
      <div className="cmd-content cases-panel__content" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxHeight: '600px' }}>
        <div className="cases-panel__list" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sortedCases.length === 0 && <p className="muted">No case records found.</p>}
          {sortedCases.map((entry) => (
            <button
              key={`case-${entry.caseId}`}
              className={`case-item ${
                (activeCase?.caseId || null) === entry.caseId ? 'case-item--active' : ''
              }`}
              onClick={() => onSelectCase(entry.caseId)}
              style={{
                background: (activeCase?.caseId || null) === entry.caseId ? 'rgba(96, 171, 255, 0.1)' : 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                padding: '8px',
                borderRadius: '6px',
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="status-badge" style={{ fontSize: '0.55rem' }}>P{entry.priority || 2}</span>
                <span className="case-score" style={{ color: 'var(--color-police)' }}>{entry.evidenceScore ?? 0} EV</span>
              </div>
              <p className="title" style={{ fontSize: '0.8rem', margin: '4px 0 0', color: '#fff' }}>CASE #{entry.caseId}</p>
              <p className="muted" style={{ fontSize: '0.65rem' }}>{entry.type}</p>
            </button>
          ))}
        </div>
        <div className="cases-panel__detail" style={{ overflowY: 'auto' }}>
          {activeCase ? (
            <div style={{ display: 'grid', gap: '12px' }}>
              <div className="module-card">
                <h3 className="module-card__title">EVIDENCE TIMELINE</h3>
                <div className="case-notes" style={{ display: 'grid', gap: '8px', marginTop: '8px' }}>
                  {activeCase.notes?.length ? (
                    activeCase.notes.map((note, index) => (
                      <div key={`note-${activeCase.caseId}-${index}`} className="case-note" style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem' }}>
                          <span className="muted">{note.time}</span>
                          {note.delta != null && (
                            <span className={`case-note__delta ${note.delta >= 0 ? 'up' : ''}`} style={{ color: note.delta >= 0 ? 'var(--color-success)' : 'var(--color-urgent)' }}>
                              {note.delta >= 0 ? `+${note.delta}` : note.delta}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.75rem', margin: '4px 0 0', color: '#d0d9e0' }}>{note.note}</p>
                      </div>
                    ))
                  ) : (
                    <p className="muted">No investigative notes.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p className="muted">SELECT A RECORD TO VIEW DOSSIER</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

export default CasesPanel
