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
  onStartPlaceStation,
  placingStation,
  onCancelPlacement,
  showBuildMenu,
  onToggleBuildMenu,
  buildOptions,
  placingBuildingType,
  onChangeBuildingType,
  onStartBuildingPlacement,
  onCancelBuildMenu,
  onMutualAid,
  onResetLayout,
  onOpenFunds,
  playerName,
  playerCallsign,
  playerTitle,
  playerAvatar,
  missionDayKey,
  weatherSummary,
  weatherNextUpdateLabel,
  operationsPhase,
  onEditProfile,
}) => {
  const tacticalTime = new Date().toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const weatherLabel = weatherSummary || 'Clear 20C'
  const weatherEtaLabel = weatherNextUpdateLabel || '--:--'
  const dayLabel = missionDayKey || 'DAY-01'
  const phaseLabel = operationsPhase || 'BASIC OPS'

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
        <div className="hud-stat" style={{ marginLeft: '12px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px', borderRight: 'none' }}>
          <span className="label">TACTICAL TIME</span>
          <span className="value" style={{ letterSpacing: '0.15em', fontSize: '1.2rem', color: 'var(--color-police)' }}>
            {tacticalTime}
          </span>
        </div>
        <div className="hud-weather">
          <span className="label">WX · {dayLabel}</span>
          <span className="value">{weatherLabel} · NX {weatherEtaLabel}</span>
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
        <div className="hud-stat">
          <span className="label">FLEET</span>
          <span className="value">{parkedCount}/{totalVehicles}</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="hud-section hud-section--actions">
        {placingStation ? (
          <button className="cmd-btn cmd-btn--primary" onClick={onCancelPlacement}>CANCEL</button>
        ) : (
          <button
            className="cmd-btn"
            onClick={station ? onToggleBuildMenu : onStartPlaceStation}
          >
            {station ? '+ BUILD' : 'INIT STATION'}
          </button>
        )}

        {showBuildMenu && !placingStation && (
          <div className="hud-popover">
            <select
              className="cmd-select"
              value={placingBuildingType}
              onChange={(e) => onChangeBuildingType(e.target.value)}
            >
              {buildOptions.map(b => (
                <option key={b.id} value={b.id}>{b.label} (${b.cost})</option>
              ))}
            </select>
            <button className="cmd-btn cmd-btn--primary" onClick={onStartBuildingPlacement}>PLACE</button>
            <button className="cmd-btn cmd-btn--ghost" onClick={onCancelBuildMenu}>X</button>
          </div>
        )}

        <button className="cmd-btn" onClick={onResetLayout} title="Reset Layout">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
        </button>

        <button className="cmd-btn cmd-btn--urgent" onClick={onMutualAid}>BACKUP</button>

        <select
          className="cmd-select cmd-select--slot"
          value={saveSlot}
          onChange={(e) => setSaveSlot(Number(e.target.value))}
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
