import React from 'react';
import { VEHICLE_TYPES, VEHICLE_CONFIG, VEHICLE_STATUS } from '../vehicleConfig';
import { STATION_LEVELS, calculateStationCapacity } from '../config/stationUpgrades';

const StationManagementDrawer = ({ 
  selectedStation, 
  stations,
  vehicles,
  money,
  onClose,
  onPurchaseVehicle,
  onUpgradeStation
}) => {
  if (!selectedStation) return null;
  
  const station = stations.find(s => s.id === selectedStation);
  if (!station) return null;
  
  const stationVehicles = vehicles.filter(v => v.stationId === station.id);
  const currentLevel = station.level || 1;
  const nextLevel = currentLevel + 1;
  const currentLevelInfo = STATION_LEVELS[currentLevel];
  const nextLevelInfo = STATION_LEVELS[nextLevel];
  const capacity = calculateStationCapacity(currentLevel);
  
  // Group vehicles by status
  const vehiclesByStatus = {
    available: stationVehicles.filter(v => v.status === VEHICLE_STATUS.AVAILABLE),
    dispatched: stationVehicles.filter(v => v.status === VEHICLE_STATUS.DISPATCHED),
    onScene: stationVehicles.filter(v => v.status === VEHICLE_STATUS.ON_SCENE),
    returning: stationVehicles.filter(v => v.status === VEHICLE_STATUS.RETURNING),
  };

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      width: '400px',
      maxHeight: '90vh',
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '10px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      zIndex: 1001,
      display: 'flex',
      flexDirection: 'column',
      pointerEvents: 'auto',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '2px solid #e0e0e0',
        backgroundColor: '#2196F3',
        color: 'white',
        borderRadius: '10px 10px 0 0',
        position: 'relative',
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '5px',
          }}
        >
          ×
        </button>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '28px' }}>{currentLevelInfo?.icon || '🏢'}</span>
          {station.name}
        </h3>
        <div style={{ fontSize: '14px', marginTop: '5px', opacity: 0.9 }}>
          Level {currentLevel} Station
        </div>
      </div>

      {/* Content */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto',
        padding: '20px',
      }}>
        {/* Station Info */}
        <div style={{
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>Station Status</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
            <div>
              <strong>Capacity:</strong> {stationVehicles.length}/{capacity} units
            </div>
            <div>
              <strong>Available:</strong> {vehiclesByStatus.available.length} units
            </div>
            <div>
              <strong>Dispatched:</strong> {vehiclesByStatus.dispatched.length} units
            </div>
            <div>
              <strong>On Scene:</strong> {vehiclesByStatus.onScene.length} units
            </div>
          </div>
        </div>

        {/* Vehicle Fleet */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0' }}>Vehicle Fleet</h4>
          {stationVehicles.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
              No vehicles at this station
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stationVehicles.map(vehicle => (
                <div key={vehicle.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px',
                  backgroundColor: vehicle.status === VEHICLE_STATUS.AVAILABLE ? '#e8f5e9' : 
                                 vehicle.status === VEHICLE_STATUS.DISPATCHED ? '#e3f2fd' :
                                 vehicle.status === VEHICLE_STATUS.ON_SCENE ? '#fff3e0' : '#f3e5f5',
                  borderRadius: '6px',
                  border: `1px solid ${
                    vehicle.status === VEHICLE_STATUS.AVAILABLE ? '#4CAF50' : 
                    vehicle.status === VEHICLE_STATUS.DISPATCHED ? '#2196F3' :
                    vehicle.status === VEHICLE_STATUS.ON_SCENE ? '#FF9800' : '#9C27B0'
                  }`,
                }}>
                  <span style={{ fontSize: '24px', marginRight: '10px' }}>{vehicle.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold' }}>Unit {vehicle.id} - {vehicle.type}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Status: {vehicle.status}
                      {vehicle.assignedIncidentId && ` (Incident #${vehicle.assignedIncidentId})`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Purchase Vehicles */}
        {stationVehicles.length < capacity && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Purchase Vehicles</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {Object.entries(VEHICLE_TYPES).map(([type, vehicleType]) => {
                const config = VEHICLE_CONFIG[type];
                const canAfford = money >= config.cost;
                
                return (
                  <button
                    key={type}
                    onClick={() => onPurchaseVehicle(type, station.id)}
                    disabled={!canAfford}
                    style={{
                      padding: '15px',
                      backgroundColor: canAfford ? '#fff' : '#f5f5f5',
                      border: `2px solid ${canAfford ? '#4CAF50' : '#e0e0e0'}`,
                      borderRadius: '8px',
                      cursor: canAfford ? 'pointer' : 'not-allowed',
                      opacity: canAfford ? 1 : 0.6,
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>{config.icon}</span>
                    <div style={{ fontWeight: 'bold' }}>{vehicleType}</div>
                    <div style={{ fontSize: '14px', color: canAfford ? '#4CAF50' : '#666' }}>
                      ${config.cost}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', textAlign: 'center' }}>
                      Speed: {config.speed}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Station Upgrade */}
        {nextLevelInfo && (
          <div style={{
            backgroundColor: '#e3f2fd',
            borderRadius: '8px',
            padding: '15px',
          }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Station Upgrade</h4>
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{ fontSize: '24px' }}>{currentLevelInfo?.icon}</span>
                <span style={{ fontSize: '20px' }}>→</span>
                <span style={{ fontSize: '24px' }}>{nextLevelInfo.icon}</span>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Upgrade to Level {nextLevel}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {nextLevelInfo.name}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                • Capacity: {capacity} → {calculateStationCapacity(nextLevel)} units<br />
                • {nextLevelInfo.benefit}
              </div>
              <button
                onClick={() => onUpgradeStation(station.id)}
                disabled={money < nextLevelInfo.cost}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: money >= nextLevelInfo.cost ? '#2196F3' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: money >= nextLevelInfo.cost ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease',
                }}
              >
                Upgrade (${nextLevelInfo.cost})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StationManagementDrawer;