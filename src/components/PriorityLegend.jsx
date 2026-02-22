const PriorityLegend = ({ priorityConfig, formatSeconds }) => (
  <aside className="legend">
    <div className="legend__title">Priority Guide</div>
    <div className="legend__row legend__row--p1">
      <span>{priorityConfig[1].label}</span>
      <span>Critical • {formatSeconds(priorityConfig[1].responseTargetSeconds)}</span>
    </div>
    <div className="legend__row legend__row--p2">
      <span>{priorityConfig[2].label}</span>
      <span>Urgent • {formatSeconds(priorityConfig[2].responseTargetSeconds)}</span>
    </div>
    <div className="legend__row legend__row--p3">
      <span>{priorityConfig[3].label}</span>
      <span>Routine • {formatSeconds(priorityConfig[3].responseTargetSeconds)}</span>
    </div>
  </aside>
)

export default PriorityLegend
