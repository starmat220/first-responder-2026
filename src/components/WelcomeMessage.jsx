import React, { useState } from 'react'
import '../Theme.css'

const STEPS = [
  {
    id: 'intro',
    title: 'OROMOCTO COMMAND',
    subtitle: 'Emergency Response Management System',
  },
  {
    id: 'identity',
    title: 'OPERATOR CLEARANCE',
    subtitle: 'Identify yourself before accessing the grid.',
  },
  {
    id: 'briefing',
    title: 'MISSION BRIEFING',
    subtitle: 'Review your objectives before deployment.',
  },
]

const WelcomeMessage = ({ onStart }) => {
  const [step, setStep] = useState(0)
  const [tempName, setTempName] = useState('Commander')
  const [tempCallsign, setTempCallsign] = useState('Central')

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const handleNext = () => {
    if (isLast) {
      onStart(tempName, tempCallsign)
    } else {
      setStep((s) => s + 1)
    }
  }

  const canProceed = step !== 1 || (tempName.trim().length > 0 && tempCallsign.trim().length > 0)

  return (
    <div className="welcome-overlay">
      <div className="welcome-terminal welcome-terminal--wide">

        {/* Header */}
        <div className="welcome-header">
          <div>
            <h1 style={{ margin: 0 }}>{current.title}</h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}>
              {current.subtitle}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                style={{
                  width: i === step ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: i <= step ? 'var(--color-police)' : 'rgba(255,255,255,0.15)',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="welcome-body">

          {/* ── Step 0: Welcome / Introduction ── */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="welcome-advisor">
                <div className="avatar" style={{ width: '80px', height: '80px', flexShrink: 0, borderWidth: '3px' }}>
                  <img src="/images/headshots/police_officer_01.png" alt="Lt. Morgan" />
                </div>
                <div>
                  <p style={{ margin: '0 0 8px', color: 'var(--color-police)', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.06em' }}>LT. MORGAN — FIELD OPERATIONS</p>
                  <p style={{ margin: 0, color: '#c8d8ea', lineHeight: 1.6 }}>
                    "Welcome to <strong style={{ color: '#fff' }}>Oromocto Command</strong>. You're taking control of emergency response services across the region. Citizens are counting on you."
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { icon: '🏛️', label: 'Build Stations', desc: 'Place Police, Fire, EMS, and Tow stations across the map.' },
                  { icon: '🚔', label: 'Dispatch Units', desc: 'Send vehicles to incidents before the response clock expires.' },
                  { icon: '📈', label: 'Grow Operations', desc: 'Earn money and XP to hire staff, upgrade equipment, and unlock new departments.' },
                  { icon: '🏆', label: 'Maintain Trust', desc: 'Fast responses and resolved cases keep public trust high.' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="welcome-feature-card"
                  >
                    <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                    <div>
                      <p style={{ margin: '0 0 4px', color: '#fff', fontWeight: 700, fontSize: '0.78rem' }}>{item.label}</p>
                      <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.68rem', lineHeight: 1.4 }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 1: Identity ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="welcome-advisor">
                <div className="avatar" style={{ width: '70px', height: '70px', flexShrink: 0, borderWidth: '3px' }}>
                  <img src="/images/headshots/police_officer_01.png" alt="Lt. Morgan" />
                </div>
                <p style={{ margin: 0, color: '#c8d8ea', lineHeight: 1.6 }}>
                  "Before we hand over the tactical grid, I need your credentials for the regional record."
                </p>
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                    Commander Name
                  </label>
                  <input
                    className="welcome-input"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="e.g. Alexandra Reid"
                    autoFocus
                  />
                  <p style={{ margin: '4px 0 0', fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>Shown in radio communications and incident reports.</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                    Tactical Callsign
                  </label>
                  <input
                    className="welcome-input"
                    value={tempCallsign}
                    onChange={(e) => setTempCallsign(e.target.value)}
                    placeholder="e.g. ALPHA-1, VANGUARD, CENTRAL"
                    onKeyDown={(e) => e.key === 'Enter' && canProceed && handleNext()}
                  />
                  <p style={{ margin: '4px 0 0', fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>Used as your radio identifier throughout all operations.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Briefing / How to Play ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="welcome-briefing" style={{ background: 'rgba(96,171,255,0.06)', borderColor: 'rgba(96,171,255,0.2)' }}>
                <h3 style={{ margin: '0 0 12px', color: 'var(--color-police)', fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Your First Steps
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    {
                      step: '01',
                      color: 'var(--color-police)',
                      title: 'Place your HQ',
                      detail: 'Click the map where you want your Police Station. Pick somewhere central — you\'ll expand from here.',
                    },
                    {
                      step: '02',
                      color: 'var(--color-success)',
                      title: 'Buy a patrol unit',
                      detail: 'Open the station panel and purchase your first patrol car. It needs at least 1 crew member assigned.',
                    },
                    {
                      step: '03',
                      color: 'var(--color-ems)',
                      title: 'Respond to incidents',
                      detail: 'Incidents appear on the map. Use "Quick Dispatch" or select a unit manually. Respond fast for better grades.',
                    },
                    {
                      step: '04',
                      color: 'var(--color-tow)',
                      title: 'Earn and expand',
                      detail: 'Money from resolved calls lets you hire staff, build new stations, and unlock Fire & EMS departments.',
                    },
                  ].map((item) => (
                    <div key={item.step} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '6px', flexShrink: 0,
                        background: `${item.color}22`, border: `1px solid ${item.color}44`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.6rem', fontWeight: 900, color: item.color, letterSpacing: '0.05em',
                      }}>{item.step}</div>
                      <div>
                        <p style={{ margin: '0 0 2px', color: '#fff', fontWeight: 700, fontSize: '0.78rem' }}>{item.title}</p>
                        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.68rem', lineHeight: 1.45 }}>{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="welcome-briefing" style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' }}>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                  💡 <strong style={{ color: '#fff' }}>Tip:</strong> The <span style={{ color: 'var(--color-police)' }}>Recommended Action</span> panel (top-center of the map) always tells you what to do next. Check it if you get stuck.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="welcome-footer" style={{ justifyContent: 'space-between' }}>
          {step > 0 ? (
            <button
              className="cmd-btn cmd-btn--ghost"
              onClick={() => setStep((s) => s - 1)}
              style={{ padding: '10px 20px', fontSize: '0.8rem' }}
            >
              ← Back
            </button>
          ) : (
            <span />
          )}
          <button
            className="cmd-btn cmd-btn--primary cmd-btn--large"
            onClick={handleNext}
            disabled={!canProceed}
            style={{ opacity: canProceed ? 1 : 0.5 }}
          >
            {isLast ? '🚨 DEPLOY TO OPERATIONS' : step === 1 ? 'Confirm Identity →' : 'Continue →'}
          </button>
        </div>

      </div>
    </div>
  )
}

export default WelcomeMessage
