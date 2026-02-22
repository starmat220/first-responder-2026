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

const CashLedger = ({ transactions, onClose, budgetSummary }) => {
  const income = transactions.filter((entry) => entry.amount > 0)
  const expenses = transactions.filter((entry) => entry.amount < 0)
  const totalIncome = income.reduce((sum, entry) => sum + entry.amount, 0)
  const totalExpenses = expenses.reduce((sum, entry) => sum + entry.amount, 0)
  const net = totalIncome + totalExpenses
  const topExpenseSources = summarizeByLabel(expenses).slice(0, 4)
  const topIncomeSources = summarizeByLabel(income).slice(0, 4)

  return (
    <aside className="panel ledger">
      <div className="ledger__header">
        <div>
          <p className="eyebrow">Cash Ledger</p>
          <p className="muted">Income and expenses overview</p>
        </div>
        <button className="btn btn--ghost btn--small" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="ledger__summary">
        <div>
          <p className="label">Income</p>
          <p className="value ledger__amount--pos">{formatAmount(totalIncome)}</p>
        </div>
        <div>
          <p className="label">Expenses</p>
          <p className="value ledger__amount--neg">{formatAmount(totalExpenses)}</p>
        </div>
        <div>
          <p className="label">Net</p>
          <p className={`value ${net >= 0 ? 'ledger__amount--pos' : 'ledger__amount--neg'}`}>
            {formatAmount(net)}
          </p>
        </div>
      </div>
      <div className="ledger__grid">
        <div className="ledger__block">
          <p className="station-card__title">Top Expenses</p>
          {topExpenseSources.length === 0 && <p className="muted">No expenses yet.</p>}
          {topExpenseSources.map((entry) => (
            <div key={entry.label} className="ledger__mini">
              <span>{entry.label}</span>
              <span className="ledger__amount ledger__amount--neg">
                {formatAmount(entry.amount)}
              </span>
            </div>
          ))}
        </div>
        {budgetSummary && (
          <div className="ledger__block">
            <p className="station-card__title">Budget Report</p>
            <div className="ledger__mini">
              <span>Unit upkeep / min</span>
              <span className="ledger__amount ledger__amount--neg">
                {formatAmount(-budgetSummary.unitPerMin)}
              </span>
            </div>
            {budgetSummary.unitTypes.map((entry) => (
              <div key={`unit-${entry.type}`} className="ledger__mini">
                <span>
                  {entry.type[0].toUpperCase() + entry.type.slice(1)} ({entry.count})
                </span>
                <span className="ledger__amount ledger__amount--neg">
                  {formatAmount(-entry.costPerMin)}
                </span>
              </div>
            ))}
            <div className="ledger__mini">
              <span>Personnel / min</span>
              <span className="ledger__amount ledger__amount--neg">
                {formatAmount(-budgetSummary.personnelPerMin)}
              </span>
            </div>
            <div className="ledger__mini">
              <span>Stations / min</span>
              <span className="ledger__amount ledger__amount--neg">
                {formatAmount(-budgetSummary.stationPerMin)}
              </span>
            </div>
            <div className="ledger__mini">
              <span>Overtime / min ({budgetSummary.overtimeCount})</span>
              <span className="ledger__amount ledger__amount--neg">
                {formatAmount(-budgetSummary.overtimePerMin)}
              </span>
            </div>
            <div className="ledger__mini">
              <span>Projected / hour</span>
              <span className="ledger__amount ledger__amount--neg">
                {formatAmount(-budgetSummary.totalPerMin * 60)}
              </span>
            </div>
          </div>
        )}
        <div className="ledger__block">
          <p className="station-card__title">Top Income</p>
          {topIncomeSources.length === 0 && <p className="muted">No income yet.</p>}
          {topIncomeSources.map((entry) => (
            <div key={entry.label} className="ledger__mini">
              <span>{entry.label}</span>
              <span className="ledger__amount ledger__amount--pos">
                {formatAmount(entry.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="ledger__list">
        <p className="station-card__title">Latest Transactions</p>
        {transactions.length === 0 && <p className="muted">No transactions yet.</p>}
        {transactions.map((entry) => (
          <div key={entry.id} className="ledger__item">
            <div>
              <p className="title">{entry.label}</p>
              <p className="muted">{entry.time}</p>
            </div>
            <span
              className={`ledger__amount ${entry.amount >= 0 ? 'ledger__amount--pos' : 'ledger__amount--neg'}`}
            >
              {formatAmount(entry.amount)}
            </span>
          </div>
        ))}
      </div>
    </aside>
  )
}

export default CashLedger
