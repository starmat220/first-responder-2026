import React from 'react';
import { VEHICLE_STATUS } from '../vehicleConfig';
import { STATION_LEVELS } from '../config/stationUpgrades';

const ControlPanel = ({ 
  activeTab, 
  setActiveTab, 
  emergencies, 
  vehicles, 
  policeStations,
  resolvedIncidents,
  onDispatchVehicle,
  onCancelIncident,
  onCancelVehicleDispatch,
  onStationClick,
  onEmergencyClick
}) => {
  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      width: '380px',
      maxHeight: '70vh',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '10px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      pointerEvents: 'auto',
    }}>
      {/* Tab Headers */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '2px solid #e0e0e0',
        backgroundColor: '#f5f5f5',
        borderRadius: '10px 10px 0 0',
      }}>
        {['Active Incidents', 'Stations', 'Traffic Archive'].map((tab, index) => (
          <button
            key={tab}
            onClick={() => setActiveTab(index)}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              backgroundColor: activeTab === index ? '#fff' : 'transparent',
              borderBottom: activeTab === index ? '2px solid #2196F3' : 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === index ? 'bold' : 'normal',
              color: activeTab === index ? '#2196F3' : '#666',
              transition: 'all 0.3s ease',
            }}
          >
            {tab}
            {index === 0 && emergencies.length > 0 && (
              <span style={{
                marginLeft: '8px',
                backgroundColor: '#f44336',
                color: 'white',
                borderRadius: '10px',
                padding: '2px 6px',
                fontSize: '12px',
              }}>
                {emergencies.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto', 
        padding: '15px',
        maxHeight: '50vh',
      }}>
        {/* Active Incidents Tab */}
        {activeTab === 0 && (
          <div>
            {emergencies.length === 0 ? (
              <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                No active incidents
              </p>
            ) : (
              emergencies.map(emergency => {
                const assignedVehicle = vehicles.find(v => v.assignedIncidentId === emergency.id);
                const now = Date.now();
                const timeRemaining = Math.max(0, emergency.expiresAt - now);
                const minutes = Math.floor(timeRemaining / 60000);
                const seconds = Math.floor((timeRemaining % 60000) / 1000);
                
                return (
                  <div 
                    key={emergency.id}
                    onClick={() => onEmergencyClick(emergency.id)}
                    style={{
                      marginBottom: '10px',
                      padding: '12px',
                      backgroundColor: assignedVehicle ? '#e3f2fd' : '#ffebee',
                      borderRadius: '8px',
                      border: `2px solid ${assignedVehicle ? '#2196F3' : '#f44336'}`,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <span style={{ fontSize: '20px' }}>{emergency.icon}</span>
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: 'bold',
                        color: timeRemaining < 60000 ? '#f44336' : '#333'
                      }}>
                        {minutes}:{seconds.toString().padStart(2, '0')}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                      <strong>{emergency.title}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {emergency.description}
                    </div>
                    {emergency.requiredVehicles && emergency.requiredVehicles.length > 0 && (
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                        Requires: {emergency.requiredVehicles.join(', ')}
                      </div>
                    )}
                    {assignedVehicle && (
                      <div style={{ 
                        marginTop: '8px', 
                        fontSize: '12px', 
                        color: '#1976d2',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>Unit {assignedVehicle.id} - {assignedVehicle.status}</span>
                        {assignedVehicle.status === VEHICLE_STATUS.DISPATCHED && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCancelVehicleDispatch(assignedVehicle.id);
                            }}
                            style={{
                              padding: '2px 8px',
                              fontSize: '11px',
                              backgroundColor: '#f44336',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                    {!assignedVehicle && (
                      <div style={{ 
                        display: 'flex', 
                        gap: '8px',
                        marginTop: '8px' 
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDispatchVehicle(emergency.id);
                          }}
                          style={{
                            flex: 1,
                            padding: '6px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          Dispatch Unit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCancelIncident(emergency.id);
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Stations Tab */}
        {activeTab === 1 && (
          <div>
            {policeStations.map(station => {
              const stationVehicles = vehicles.filter(v => v.stationId === station.id);
              const availableVehicles = stationVehicles.filter(v => v.status === VEHICLE_STATUS.AVAILABLE);
              const level = station.level || 1;
              const levelInfo = STATION_LEVELS[level];
              
              return (
                <div 
                  key={station.id}
                  onClick={() => onStationClick(station.id)}
                  style={{
                    marginBottom: '10px',
                    padding: '12px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px',
                    border: '2px solid #e0e0e0',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px' }}>{levelInfo?.icon || '🏢'}</span>
                      <strong>{station.name}</strong>
                    </div>
                    <span style={{ 
                      backgroundColor: '#2196F3',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}>
                      Level {level}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Units: {availableVehicles.length}/{stationVehicles.length} available
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    gap: '4px', 
                    marginTop: '8px',
                    flexWrap: 'wrap'
                  }}>
                    {stationVehicles.map(vehicle => (
                      <div
                        key={vehicle.id}
                        style={{
                          padding: '2px 6px',
                          backgroundColor: vehicle.status === VEHICLE_STATUS.AVAILABLE ? '#4CAF50' : 
                                         vehicle.status === VEHICLE_STATUS.DISPATCHED ? '#2196F3' :
                                         vehicle.status === VEHICLE_STATUS.ON_SCENE ? '#FF9800' : '#9C27B0',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '11px',
                        }}
                      >
                        {vehicle.icon} {vehicle.id}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Traffic Archive Tab */}
        {activeTab === 2 && (
          <div>
            <div style={{ 
              fontSize: '12px', 
              color: '#666', 
              marginBottom: '10px',
              padding: '8px',
              backgroundColor: '#e3f2fd',
              borderRadius: '4px'
            }}>
              Total resolved: {resolvedIncidents.length} incidents
            </div>
            {resolvedIncidents.slice(-10).reverse().map((incident, index) => {
              const responseTime = incident.responseTime || 0;
              const minutes = Math.floor(responseTime / 60000);
              const seconds = Math.floor((responseTime % 60000) / 1000);
              
              return (
                <div 
                  key={`resolved-${incident.id}-${index}`}
                  style={{
                    marginBottom: '8px',
                    padding: '10px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>
                      <span style={{ fontSize: '16px', marginRight: '8px' }}>{incident.icon}</span>
                      {incident.title}
                    </span>
                    <span style={{ color: '#4CAF50' }}>+${incident.credits || 100}</span>
                  </div>
                  <div style={{ color: '#666', fontSize: '11px' }}>
                    Response time: {minutes}:{seconds.toString().padStart(2, '0')}
                  </div>
                  {incident.vehicleId && (
                    <div style={{ color: '#666', fontSize: '11px' }}>
                      Handled by: Unit {incident.vehicleId}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;