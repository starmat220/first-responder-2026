import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { createEmergencyIcon } from '../utils/mapIcons';
import { VEHICLE_TYPES, VEHICLE_CONFIG, VEHICLE_STATUS, getVehicleIcon, canHandleIncident } from '../vehicleConfig';

const EmergencyMarkers = ({ 
  emergencies, 
  vehicles, 
  policeStations, 
  openPopupId, 
  onDispatchVehicle, 
  onCancelIncident, 
  onResolveEmergency 
}) => {
  return (
    <>
      {emergencies.map(emergency => {
        const assignedVehicle = vehicles.find(v => v.assignedIncidentId === emergency.id);
        
        return (
          <Marker
            key={emergency.id}
            position={emergency.position}
            icon={createEmergencyIcon(emergency, assignedVehicle)}
          >
            <Popup
              autoClose={false}
              closeOnClick={false}
              className="emergency-popup"
              eventHandlers={{
                add: (e) => {
                  // Custom popup styling
                  const popup = e.target;
                  const container = popup.getElement();
                  if (container) {
                    container.style.pointerEvents = 'auto';
                  }
                }
              }}
            >
              <div style={{ minWidth: '280px', maxWidth: '350px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  marginBottom: '10px',
                  padding: '8px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '6px'
                }}>
                  <span style={{ fontSize: '24px' }}>{emergency.icon}</span>
                  <div>
                    <h3 style={{ margin: 0, color: emergency.color }}>{emergency.displayName || emergency.type}</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                      ID: #{emergency.id} • {emergency.timestamp}
                    </p>
                  </div>
                </div>
                
                <div style={{ marginBottom: '10px' }}>
                  <p style={{ margin: '4px 0' }}><strong>Location:</strong> {emergency.address?.full || 'Unknown'}</p>
                  <p style={{ margin: '4px 0' }}><strong>Description:</strong> {emergency.description}</p>
                  {emergency.caller && (
                    <p style={{ margin: '4px 0' }}><strong>Caller:</strong> {emergency.caller}</p>
                  )}
                  {emergency.priority && (
                    <p style={{ margin: '4px 0' }}>
                      <strong>Priority:</strong> 
                      <span style={{ 
                        marginLeft: '8px',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '11px',
                        backgroundColor: emergency.priority === 'high' ? '#f44336' : 
                                      emergency.priority === 'medium' ? '#ff9800' : '#4caf50',
                        color: 'white'
                      }}>
                        {emergency.priority.toUpperCase()}
                      </span>
                    </p>
                  )}
                </div>

                {assignedVehicle ? (
                  <div style={{
                    padding: '10px',
                    backgroundColor: assignedVehicle.status === VEHICLE_STATUS.ON_SCENE ? '#fff3e0' : '#e3f2fd',
                    borderRadius: '6px',
                    border: `1px solid ${assignedVehicle.status === VEHICLE_STATUS.ON_SCENE ? '#ff9800' : '#2196f3'}`
                  }}>
                    <p style={{ margin: '0 0 6px 0', fontWeight: 'bold' }}>
                      {getVehicleIcon(assignedVehicle.type)} {assignedVehicle.name} - {assignedVehicle.status}
                    </p>
                    {assignedVehicle.status === VEHICLE_STATUS.DISPATCHED && (
                      <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>En route to incident...</p>
                    )}
                    {assignedVehicle.status === VEHICLE_STATUS.ON_SCENE && (
                      <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Working on incident...</p>
                    )}
                  </div>
                ) : (
                  !emergency.resolved && (
                    <div style={{ marginTop: '10px' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Available Units:</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {policeStations.map(station => {
                          const availableVehicles = vehicles.filter(v => 
                            v.stationId === station.id && 
                            v.status === VEHICLE_STATUS.AVAILABLE &&
                            canHandleIncident(v.type, emergency.type)
                          );
                          
                          if (availableVehicles.length === 0) return null;
                          
                          return (
                            <div key={station.id} style={{ marginBottom: '6px' }}>
                              <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 'bold' }}>
                                {station.name}:
                              </p>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {availableVehicles.map(vehicle => (
                                  <button
                                    key={vehicle.id}
                                    onClick={() => onDispatchVehicle(vehicle.id, emergency.id)}
                                    style={{
                                      padding: '6px 10px',
                                      fontSize: '11px',
                                      backgroundColor: '#4CAF50',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    {getVehicleIcon(vehicle.type)} {vehicle.id}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        
                        {vehicles.filter(v => 
                          v.status === VEHICLE_STATUS.AVAILABLE && 
                          canHandleIncident(v.type, emergency.type)
                        ).length === 0 && (
                          <p style={{ 
                            margin: 0, 
                            fontSize: '12px', 
                            color: '#f44336',
                            fontStyle: 'italic' 
                          }}>
                            No available units for this incident type
                          </p>
                        )}
                      </div>
                    </div>
                  )
                )}

                <div style={{ 
                  marginTop: '12px', 
                  paddingTop: '8px', 
                  borderTop: '1px solid #eee',
                  display: 'flex',
                  gap: '6px'
                }}>
                  {!emergency.resolved && (
                    <>
                      <button
                        onClick={() => onResolveEmergency(emergency.id)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          fontSize: '12px',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Resolve Manually
                      </button>
                      <button
                        onClick={() => onCancelIncident(emergency.id)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          fontSize: '12px',
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel Incident
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};

export default EmergencyMarkers;