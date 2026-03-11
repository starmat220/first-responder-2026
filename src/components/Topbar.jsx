import React from 'react'
import '../Theme.css'

const Topbar = ({
  money,
  activeIncidentCount,
  publicTrust,
  score,
  level,
  parkedCount,
  totalVehicles,
  station,
  hasStations,
  saveSlot,
  setSaveSlot,
  saveSlotCount,
  onOpenFunds,
  playerName,
  playerCallsign,
  playerTitle,
  playerAvatar,
  weatherSummary,
  weatherConditionLabel,
  weatherTemperatureLabel,
  weatherNextUpdateLabel,
  weatherLocationLabel,
  weatherLocalTimeLabel,
  weatherTimezoneLabel,
  operationsPhase,
  liveEventStatusLabel,
  campaignStatusLabel,
  departmentReputationLabel,
  onEditProfile,
}) => {
  const tacticalTime = new Date().toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const weatherLabel = weatherSummary || 'Clear 20C'
  const weatherCondition = weatherConditionLabel || 'Clear'
  const weatherTempLabel = weatherTemperatureLabel || weatherLabel
  const weatherDisplayLabel = `${weatherCondition} · ${weatherTempLabel}`
  const weatherEtaLabel = weatherNextUpdateLabel || '--:--'
  const weatherAreaLabel = weatherLocationLabel || 'Local'
  const weatherClockLabel = weatherLocalTimeLabel
    ? `${weatherLocalTimeLabel}${weatherTimezoneLabel ? ` ${weatherTimezoneLabel}` : ''}`
    : '--:--'
  const phaseLabel = operationsPhase || 'BASIC OPS'
  const liveEventLabel = liveEventStatusLabel || 'No active regional event'
  const liveEventIsActive =
    !/no active regional event/i.test(liveEventLabel) &&
    !/locked/i.test(liveEventLabel)
  const liveEventShortLabel = liveEventIsActive ? 'ACTIVE' : 'NONE'
  const campaignLabel = campaignStatusLabel || 'Campaign initializing'
  const reputationLabel = departmentReputationLabel || 'Reputation locked'

  return (
    <div className="hud-top">
      {/* Left: Branding & Station Context */}
      <div className="hud-section hud-section--brand">
        <div
          className="avatar avatar--dispatcher"
          style={{ cursor: 'pointer', borderColor: 'var(--color-police)' }}
          onClick={onEditProfile}
          title="Edit Profile"
        >
          <img src={playerAvatar} alt="Dispatcher" />
        </div>
        <div className="hud-info">
          <h1>{playerCallsign.toUpperCase()} CONTROL</h1>
          <p className="subhead">
            {playerTitle} {playerName.toUpperCase()} · {station ? `ACTIVE: ${station.name}` : hasStations ? 'STATION DISCONNECTED' : 'SYSTEM OFFLINE'} · {phaseLabel}
          </p>
        </div>
        <div className="hud-stat hud-stat--time" style={{ marginLeft: '12px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px', borderRight: 'none' }}>
          <span className="label">TACTICAL TIME</span>
          <span className="value" style={{ color: 'var(--color-police)' }}>
            {tacticalTime}
          </span>
        </div>
        <div className="hud-weather">
          <span className="label">{weatherAreaLabel}</span>
          <span
            className="value"
            title={`${weatherLabel} · ${weatherClockLabel} · NX ${weatherEtaLabel}`}
          >
            {weatherDisplayLabel}
          </span>
        </div>
      </div>

      {/* Center: Vital Stats */}
      <div className="hud-section hud-section--stats">
        <button
          type="button"
          className={`hud-stat ${onOpenFunds ? 'hud-stat--interactive' : ''}`}
          onClick={onOpenFunds}
          title="Open Financial Audit"
        >
          <span className="label">FUNDS</span>
          <span className="value">${money.toLocaleString()}</span>
        </button>
        <div className="hud-stat">
          <span className="label">TRUST</span>
          <span className="value" style={{ color: publicTrust < 40 ? 'var(--color-urgent)' : 'var(--color-success)' }}>
            {publicTrust}%
          </span>
        </div>
        <div className="hud-stat">
          <span className="label">LEVEL</span>
          <span className="value">{level}</span>
        </div>
        <div className="hud-stat">
          <span className="label">SCORE</span>
          <span className="value">{score.toLocaleString()}</span>
        </div>
        <div className="hud-stat">
          <span className="label">ACTIVE</span>
          <span className="value">{activeIncidentCount}</span>
        </div>
        <div className="hud-stat" title={`EVENT: ${liveEventLabel} · ${campaignLabel} · ${reputationLabel}`}>
          <span className="label">EVENT</span>
          <span
            className="value"
            style={{ color: liveEventIsActive ? 'var(--color-urgent)' : 'var(--color-text-muted)' }}
          >
            {liveEventShortLabel}
          </span>
        </div>
        <div className="hud-stat">
          <span className="label">FLEET</span>
          <span className="value">{parkedCount}/{totalVehicles}</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="hud-section hud-section--actions">
        <select
          className="cmd-select cmd-select--slot"
          value={saveSlot}
          onChange={(e) => setSaveSlot(Number(e.target.value))}
          title="Save Slot"
          style={{ width: '80px' }}
        >
          {Array.from({ length: saveSlotCount }).map((_, i) => (
            <option key={i} value={i + 1}>SLOT {i + 1}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default Topbar
