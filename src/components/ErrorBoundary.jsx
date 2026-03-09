import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    console.error('[ErrorBoundary]', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, info: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(5, 10, 15, 0.97)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{
          width: 'min(560px, 92vw)',
          background: 'rgba(12, 18, 26, 0.95)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 0 60px rgba(239, 68, 68, 0.15)',
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <h2 style={{ margin: 0, color: '#ef4444', fontSize: '1rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              System Fault Detected
            </h2>
          </div>
          <div style={{ padding: '24px' }}>
            <p style={{ color: '#c8d8ea', marginTop: 0, lineHeight: 1.6 }}>
              An unexpected error occurred in the dispatch system. Your save data should be intact — click <strong style={{ color: '#fff' }}>Reload Dispatch</strong> to recover.
            </p>
            {this.state.error && (
              <details style={{ marginBottom: '16px' }}>
                <summary style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', letterSpacing: '0.05em' }}>
                  Technical Details
                </summary>
                <pre style={{
                  marginTop: '8px', padding: '12px',
                  background: 'rgba(0,0,0,0.4)', borderRadius: '8px',
                  color: '#fca5a5', fontSize: '0.65rem', overflowX: 'auto',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {this.state.error.toString()}
                  {this.state.info?.componentStack ? `\n\nComponent Stack:${this.state.info.componentStack}` : ''}
                </pre>
              </details>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  flex: 1, padding: '12px', borderRadius: '8px', cursor: 'pointer',
                  background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#fca5a5', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Reload Dispatch
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '12px 20px', borderRadius: '8px', cursor: 'pointer',
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem',
                }}
              >
                Try Resume
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
