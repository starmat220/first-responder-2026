import React, { useState } from 'react'
import '../Theme.css'

const WelcomeMessage = ({ onStart }) => {
  const [tempName, setTempName] = useState('Commander')
  const [tempCallsign, setTempCallsign] = useState('Central')

  return (
    <div className="welcome-overlay">
      <div className="welcome-terminal">
        <div className="welcome-header">
          <h1>OROMOCTO COMMAND</h1>
          <span className="status-badge status-badge--live">SYSTEM INITIALIZING</span>
        </div>
        <div className="welcome-body">
          <div className="welcome-advisor">
            <div className="avatar">
              <img src="/images/headshots/police_officer_01.png" alt="Advisor" />
            </div>
            <div className="welcome-briefing">
              <h3>OPERATOR CLEARANCE REQUIRED</h3>
              <p>
                <strong>LT. MORGAN:</strong> "Commander, before we hand over the tactical grid, I need your credentials for the regional record. Identify yourself."
              </p>
            </div>
          </div>

          <div className="module-card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'grid', gap: '4px' }}>
                <label className="label" style={{ fontSize: '0.6rem' }}>OFFICER NAME</label>
                <input 
                  className="cmd-select" 
                  value={tempName} 
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="Enter Name..."
                  style={{ width: '100%', fontSize: '1rem', padding: '10px' }}
                />
              </div>
              <div style={{ display: 'grid', gap: '4px' }}>
                <label className="label" style={{ fontSize: '0.6rem' }}>TACTICAL CALLSIGN</label>
                <input 
                  className="cmd-select" 
                  value={tempCallsign} 
                  onChange={(e) => setTempCallsign(e.target.value)}
                  placeholder="e.g. ALPHA-1, VANGUARD..."
                  style={{ width: '100%', fontSize: '1rem', padding: '10px' }}
                />
              </div>
            </div>
          </div>

          <div className="welcome-briefing">
            <ul>
              <li>IDENTIFY your callsign for radio communications.</li>
              <li>PLACE your headquarters to activate the response grid.</li>
              <li>START with basic police calls, then unlock new departments over time.</li>
              <li>DISPATCH units to protect the Oromocto citizens.</li>
            </ul>
          </div>
        </div>
        <div className="welcome-footer">
          <button 
            className="cmd-btn cmd-btn--primary cmd-btn--large" 
            onClick={() => onStart(tempName, tempCallsign)}
          >
            AUTHORIZE & BOOT SYSTEM
          </button>
        </div>
      </div>
    </div>
  )
}

export default WelcomeMessage
