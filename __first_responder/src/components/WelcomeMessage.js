import React from 'react';

const WelcomeMessage = ({ isFirstTimePlayer, onClose }) => {
  if (!isFirstTimePlayer) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '15px',
      padding: '30px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      zIndex: 2000,
      maxWidth: '500px',
      textAlign: 'center',
      pointerEvents: 'auto',
    }}>
      <h2 style={{ marginBottom: '20px', color: '#2196F3' }}>
        🚔 Welcome to Emergency Dispatcher! 🚨
      </h2>
      <div style={{ marginBottom: '20px', lineHeight: '1.6' }}>
        <p>As the city's emergency dispatcher, your job is to:</p>
        <ul style={{ textAlign: 'left', margin: '15px 0' }}>
          <li>📍 Build police stations around the city</li>
          <li>🚓 Purchase and manage emergency vehicles</li>
          <li>🚨 Respond to incidents before they expire</li>
          <li>💰 Earn credits to expand your operations</li>
        </ul>
        <p style={{ marginTop: '15px', fontWeight: 'bold' }}>
          Start by clicking "Build Station" and placing your first station on the map!
        </p>
      </div>
      <button
        onClick={onClose}
        style={{
          padding: '12px 30px',
          backgroundColor: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        Let's Go!
      </button>
    </div>
  );
};

export default WelcomeMessage;