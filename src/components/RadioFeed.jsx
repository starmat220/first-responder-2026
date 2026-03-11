import React, { useEffect, useMemo, useRef, useState } from 'react'

const RADIO_CHANNEL_FILTERS = [
  { value: 'ALL', label: 'ALL', tone: 'all' },
  { value: 'PD', label: 'PD', tone: 'pd' },
  { value: 'FD', label: 'FD', tone: 'fd' },
  { value: 'EMS', label: 'EMS', tone: 'ems' },
  { value: 'TOW', label: 'TOW', tone: 'tow' },
  { value: 'DISPATCH', label: 'DSP', tone: 'dispatch' },
  { value: 'SYSTEM', label: 'SYS', tone: 'system' },
]

const getRadioTone = (channel) => {
  const normalized = String(channel || '').toUpperCase()
  if (normalized === 'PD') return 'pd'
  if (normalized === 'FD' || normalized === 'FIRE' || normalized === 'ALARM') return 'fd'
  if (normalized === 'EMS') return 'ems'
  if (normalized === 'TOW') return 'tow'
  if (normalized === 'DISPATCH') return 'dispatch'
  if (normalized === 'SYSTEM') return 'system'
  return 'all'
}

const RadioFeed = ({ logs, onIncidentSelect }) => {
  const endRef = useRef(null)
  const [channelFilter, setChannelFilter] = useState('ALL')

  const filteredLogs = useMemo(
    () =>
      channelFilter === 'ALL'
        ? logs
        : logs.filter((log) => (log.channel || '').toUpperCase() === channelFilter),
    [logs, channelFilter]
  )

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [filteredLogs])

  return (
    <div className="radio-feed-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="radio-feed__toolbar">
        <div className="radio-filter-bar" role="tablist" aria-label="Radio channels">
          {RADIO_CHANNEL_FILTERS.map((channel) => (
            <button
              key={channel.value}
              type="button"
              role="tab"
              aria-selected={channelFilter === channel.value}
              className={`radio-filter-btn radio-filter-btn--${channel.tone} ${
                channelFilter === channel.value ? 'radio-filter-btn--active' : ''
              }`}
              onClick={() => setChannelFilter(channel.value)}
              title={channel.value === 'ALL' ? 'Show all traffic' : `Show ${channel.value} traffic`}
            >
              {channel.label}
            </button>
          ))}
        </div>
      </div>
      <div className="radio-feed__list" style={{ flex: 1, overflowY: 'auto' }}>
        {filteredLogs.length === 0 && (
          <div className="radio-feed__empty">
            {logs.length === 0 ? 'No traffic.' : `No traffic for ${channelFilter}.`}
          </div>
        )}
        {filteredLogs.map((log) => {
          const tone = getRadioTone(log.channel)

          return (
            <div
              key={log.id}
              className={`radio-entry radio-entry--${log.type} radio-entry--tone-${tone}`}
            >
              {log.avatar && (
                <div className="avatar avatar--officer radio-entry__avatar">
                  <img src={log.avatar} alt="Unit" />
                </div>
              )}
              <span className="radio-entry__time">{log.time}</span>
              <span className={`radio-entry__channel radio-entry__channel--${tone}`}>{log.channel}</span>
              <span className="radio-entry__msg">
                {log.incidentId != null && (
                  <button
                    type="button"
                    className={`radio-incident-tag radio-incident-tag--${tone}`}
                    title={log.incidentAddress || 'Incident linked'}
                    onClick={() => onIncidentSelect?.(log.incidentId)}
                  >
                    INC #{log.incidentId}
                  </button>
                )}
                <span className={`radio-code radio-code--${tone}`}>{log.code}</span> {log.message}
              </span>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>
    </div>
  )
}

export default RadioFeed
