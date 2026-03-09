import React, { useEffect, useState } from 'react'

/**
 * In-game tutorial that walks new players through their first steps.
 * Shows as a dismissable overlay at a specific corner of the screen.
 *
 * Props:
 *   tutorialStep  — current step id (string | null)
 *   onDismiss     — called when user clicks "Got it" or "Skip Tutorial"
 *   resolvedCount — number of resolved incidents so far
 *   stations      — station array
 *   vehicles      — vehicle array
 */

const STEPS = {
  place_station: {
    id: 'place_station',
    badge: '01',
    color: 'var(--color-police)',
    title: 'Place Your HQ',
    body: 'The map is now in placement mode. Click anywhere on the map to set your Police Station. Pick a spot near the centre of town — you\'ll build outward from here.',
    tip: 'The blue "Place Station" button in the top bar will confirm your choice.',
  },
  buy_vehicle: {
    id: 'buy_vehicle',
    badge: '02',
    color: 'var(--color-success)',
    title: 'Buy a Patrol Unit',
    body: 'Your station is placed! Now you need a vehicle. Open the station panel (click your station on the map or use the INCIDENTS bar) and purchase a patrol car.',
    tip: 'A unit needs at least 1 crew member assigned before it can be dispatched.',
  },
  first_dispatch: {
    id: 'first_dispatch',
    badge: '03',
    color: 'var(--color-ems)',
    title: 'Respond to an Incident',
    body: 'An incident has appeared on the map! Find it in the Incidents panel and click "Quick Dispatch" to send your nearest available unit. Respond fast — there\'s a timer!',
    tip: 'Incidents have a response window. Excellent responses earn more money and trust.',
  },
  first_resolve: {
    id: 'first_resolve',
    badge: '04',
    color: 'var(--color-tow)',
    title: 'Incident Resolved!',
    body: 'Great work! You\'ve resolved your first call. The money earned goes toward hiring more staff, buying more units, or building a Fire / EMS station.',
    tip: 'Check the Recommended Action panel (top-center of map) to know what to do next.',
  },
}

const TutorialOverlay = ({ tutorialStep, onDismiss }) => {
  const [visible, setVisible] = useState(true)
  const [fadeIn, setFadeIn] = useState(false)

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setFadeIn(true))
    })
    return () => cancelAnimationFrame(t)
  }, [tutorialStep])

  const step = STEPS[tutorialStep]
  if (!step || !visible) return null

  const handleDismiss = () => {
    setVisible(false)
    onDismiss?.(tutorialStep)
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '80px',
        left: '16px',
        width: '300px',
        zIndex: 600,
        pointerEvents: 'auto',
        opacity: fadeIn ? 1 : 0,
        transform: fadeIn ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
      }}
    >
      <div style={{
        background: 'rgba(10, 14, 20, 0.97)',
        border: `1px solid ${step.color}44`,
        borderLeft: `3px solid ${step.color}`,
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)`,
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 14px 10px',
          borderBottom: `1px solid rgba(255,255,255,0.06)`,
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '6px',
            background: `${step.color}22`, border: `1px solid ${step.color}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontSize: '0.6rem', fontWeight: 900,
            color: step.color, letterSpacing: '0.05em', fontFamily: 'var(--font-display)',
          }}>{step.badge}</div>
          <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.04em' }}>
            {step.title}
          </p>
          <button
            onClick={handleDismiss}
            title="Dismiss"
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
              fontSize: '14px', lineHeight: 1, padding: '2px',
            }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '12px 14px' }}>
          <p style={{ margin: '0 0 10px', color: '#c8d8ea', fontSize: '0.72rem', lineHeight: 1.55 }}>
            {step.body}
          </p>
          <div style={{
            background: `${step.color}11`, border: `1px solid ${step.color}22`,
            borderRadius: '6px', padding: '8px 10px',
          }}>
            <p style={{ margin: 0, color: step.color, fontSize: '0.65rem', lineHeight: 1.45 }}>
              💡 {step.tip}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 14px 12px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <button
            onClick={handleDismiss}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem',
              letterSpacing: '0.06em', textTransform: 'uppercase', padding: 0,
            }}
          >
            Skip Tutorial
          </button>
          <button
            onClick={handleDismiss}
            style={{
              background: `${step.color}22`,
              border: `1px solid ${step.color}55`,
              borderRadius: '6px', padding: '6px 14px',
              color: step.color, fontSize: '0.68rem', fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.04em',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

export default TutorialOverlay
