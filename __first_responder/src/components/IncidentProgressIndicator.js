import React from 'react';

const IncidentProgressIndicator = ({ progress, color, showCountdown, remainingTime }) => {
  // Convert remaining time from milliseconds to seconds
  const remainingSeconds = Math.ceil(remainingTime / 1000);
  
  return (
    <div style={{
      position: 'absolute',
      bottom: '-10px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '40px',
      textAlign: 'center',
      pointerEvents: 'none'
    }}>
      {/* Progress bar style */}
      <div style={{
        width: '40px',
        height: '4px',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '2px',
        overflow: 'hidden',
        marginBottom: '2px'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          backgroundColor: color,
          transition: 'width 0.3s linear',
          borderRadius: '2px'
        }}></div>
      </div>
      
      {/* Countdown number */}
      {showCountdown && remainingSeconds > 0 && (
        <div style={{
          fontSize: '10px',
          fontWeight: 'bold',
          color: color,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '1px 4px',
          borderRadius: '3px',
          minWidth: '20px'
        }}>
          {remainingSeconds}s
        </div>
      )}
    </div>
  );
};

export default IncidentProgressIndicator;