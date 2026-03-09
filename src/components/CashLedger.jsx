import React from 'react'
import '../Theme.css'

const formatAmount = (amount) => {
  const abs = Math.abs(amount).toLocaleString()
  return amount >= 0 ? `+$${abs}` : `-$${abs}`
}

const summarizeByLabel = (entries) => {
  const totals = new Map()
  entries.forEach((entry) => {
    totals.set(entry.label, (totals.get(entry.label) || 0) + entry.amount)
  })
  return Array.from(totals.entries())
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
}

const CashLedger = ({ transactions = [], budgetSummary }) => {
  const income = transactions.filter((entry) => entry.amount > 0)
  const expenses = transactions.filter((entry) => entry.amount < 0)
  const totalIncome = income.reduce((sum, entry) => sum + entry.amount, 0)
  const totalExpenses = expenses.reduce((sum, entry) => sum + entry.amount, 0)
  const net = totalIncome + totalExpenses
  const topIncomeSources = summarizeByLabel(income).slice(0, 4)

  return (
    <div className="panel-content-only menu-shell">
      <div className="menu-shell__header">
        <div>
          <p className="menu-shell__title">Financial Audit</p>
          <p className="menu-shell__hint">Track cashflow, upkeep pressure, and revenue sources.</p>
        </div>
        <div className="menu-shell__metrics">
          <span className="menu-stat-badge">Income {formatAmount(totalIncome)}</span>
          <span className="menu-stat-badge">Net {formatAmount(net)}</span>
        </div>
      </div>

      <div className="menu-shell__body menu-scroll-pane">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            overflow: 'hidden',
            marginBottom: '16px',
          }}
        >
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', textAlign: 'center' }}>
            <p className="label" style={{ fontSize: '0.55rem' }}>Income</p>
            <p style={{ color: 'var(--color-success)', fontFamily: 'var(--font-display)', fontSize: '1.2rem', margin: 0 }}>{formatAmount(totalIncome)}</p>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', textAlign: 'center' }}>
            <p className="label" style={{ fontSize: '0.55rem' }}>Expenses</p>
            <p style={{ color: 'var(--color-urgent)', fontFamily: 'var(--font-display)', fontSize: '1.2rem', margin: 0 }}>{formatAmount(totalExpenses)}</p>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', textAlign: 'center' }}>
            <p className="label" style={{ fontSize: '0.55rem' }}>Net Operating</p>
            <p
              style={{
                color: net >= 0 ? 'var(--color-success)' : 'var(--color-urgent)',
                fontFamily: 'var(--font-display)',
                fontSize: '1.2rem',
                margin: 0,
              }}
            >
              {formatAmount(net)}
            </p>
          </div>
        </div>

        <div className="department-module" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="module-card">
            <h3 className="module-card__title">Budget Allocation (Per Min)</h3>
            {budgetSummary ? (
              <div style={{ display: 'grid', gap: '6px', fontSize: '0.7rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted">Units</span>
                  <span style={{ color: 'var(--color-urgent)' }}>{formatAmount(-budgetSummary.unitPerMin)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted">Personnel</span>
                  <span style={{ color: 'var(--color-urgent)' }}>{formatAmount(-budgetSummary.personnelPerMin)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted">Facilities</span>
                  <span style={{ color: 'var(--color-urgent)' }}>{formatAmount(-budgetSummary.stationPerMin)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px', marginTop: '4px' }}>
                  <span>Projected Hourly</span>
                  <span style={{ color: 'var(--color-urgent)' }}>{formatAmount(-budgetSummary.totalPerMin * 60)}</span>
                </div>
              </div>
            ) : (
              <p className="menu-empty">No budget data available.</p>
            )}
          </div>

          <div className="module-card">
            <h3 className="module-card__title">Revenue Sources</h3>
            <div style={{ display: 'grid', gap: '6px', fontSize: '0.7rem' }}>
              {topIncomeSources.map((entry) => (
                <div key={entry.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted" style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.label}
                  </span>
                  <span style={{ color: 'var(--color-success)' }}>{formatAmount(entry.amount)}</span>
                </div>
              ))}
              {topIncomeSources.length === 0 && <p className="menu-empty">Pending receipts...</p>}
            </div>
          </div>
        </div>

        <div className="module-card" style={{ marginTop: '12px' }}>
          <h3 className="module-card__title">Transaction Log</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
            {transactions.slice(0, 20).map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(0,0,0,0.1)',
                  padding: '6px 8px',
                  borderRadius: '4px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', color: '#fff' }}>{entry.label}</span>
                  <span className="muted" style={{ fontSize: '0.55rem' }}>{entry.time}</span>
                </div>
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-display)',
                    color: entry.amount >= 0 ? 'var(--color-success)' : 'var(--color-urgent)',
                  }}
                >
                  {formatAmount(entry.amount)}
                </span>
              </div>
            ))}
            {transactions.length === 0 && <p className="menu-empty">Log empty.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CashLedger
