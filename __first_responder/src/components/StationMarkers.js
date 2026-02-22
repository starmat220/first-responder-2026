import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { createPoliceStationIcon } from '../utils/mapIcons';
import { VEHICLE_STATUS } from '../vehicleConfig';
import { STATION_LEVELS } from '../config/stationUpgrades';

const StationMarkers = ({ policeStations, vehicles, onStationClick }) => {
  return (
    <>
      {policeStations.map(station => {
        const stationVehicles = vehicles.filter(v => v.stationId === station.id);
        const availableVehicles = stationVehicles.filter(v => v.status === VEHICLE_STATUS.AVAILABLE);
        const level = station.level || 1;
        const levelInfo = STATION_LEVELS[level];
        
        return (
          <Marker
            key={station.id}
            position={station.position}
            icon={createPoliceStationIcon(level)}
            eventHandlers={{
              click: () => onStationClick(station.id)
            }}
          >
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  marginBottom: '10px'
                }}>
                  <span style={{ fontSize: '28px' }}>{levelInfo?.icon || '🏢'}</span>
                  <div>
                    <h3 style={{ margin: 0 }}>{station.name}</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                      Level {level} • ID: #{station.id}
                    </p>
                  </div>
                </div>
                
                <div style={{ marginBottom: '10px' }}>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Available Units:</strong> {availableVehicles.length}/{stationVehicles.length}
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Capacity:</strong> {levelInfo?.capacity || 3} vehicles
                  </p>
                  {levelInfo?.benefit && (
                    <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>
                      {levelInfo.benefit}
                    </p>
                  )}
                </div>

                {stationVehicles.length > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    <p style={{ margin: '0 0 6px 0', fontWeight: 'bold', fontSize: '12px' }}>
                      Fleet Status:
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {stationVehicles.map(vehicle => (
                        <div
                          key={vehicle.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '4px 8px',
                            backgroundColor: '#f5f5f5',
                            borderRadius: '4px',
                            fontSize: '11px'
                          }}
                        >
                          <span>{vehicle.icon} {vehicle.name || `Unit ${vehicle.id}`}</span>
                          <span style={{
                            color: vehicle.status === VEHICLE_STATUS.AVAILABLE ? '#4CAF50' :
                                   vehicle.status === VEHICLE_STATUS.DISPATCHED ? '#2196F3' :
                                   vehicle.status === VEHICLE_STATUS.ON_SCENE ? '#FF9800' : '#9C27B0'
                          }}>
                            {vehicle.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => onStationClick(station.id)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '12px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Manage Station
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};

export default StationMarkers;