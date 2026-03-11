import React from 'react'
import '../Theme.css'

const RegionalTicker = ({
  trust,
  resolvedCount,
  lastResolveType,
  liveEventStatus,
  departmentReputationLabel,
}) => {
  const getMessages = () => {
    const msgs = [
      `REGIONAL NEWS: Oromocto Public Trust currently at ${trust}%`,
      `WEATHER: Low visibility reported near the Saint John River. All units use caution.`,
      `POLITICS: Mayor praises regional dispatch for resolving ${resolvedCount} total incidents.`,
      `ALERT: EMS intake teams report treatment bays running near surge load.`,
    ]
    
    if (trust < 40) msgs.push("OPINION: Citizens concerned over slow emergency response times. #OromoctoAlert")
    if (lastResolveType) msgs.push(`UPDATE: Successful resolution of ${lastResolveType} on regional tactical grid.`)
    if (liveEventStatus) msgs.push(`LIVE OPS: ${liveEventStatus}`)
    if (departmentReputationLabel) msgs.push(`OPS REP: ${departmentReputationLabel}`)

    return msgs.join(' | --- | ')
  }

  return (
    <div className="regional-ticker">
      <div className="regional-ticker__label">INTEL FEED</div>
      <div className="regional-ticker__track">
        <div className="regional-ticker__content">
          {getMessages()}
        </div>
      </div>
    </div>
  )
}

export default RegionalTicker
