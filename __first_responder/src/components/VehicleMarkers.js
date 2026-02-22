import React from 'react';
import { Marker, Popup, Polyline } from 'react-leaflet';
import { VEHICLE_STATUS, getVehicleIcon } from '../vehicleConfig';
import { createVehicleIcon } from '../utils/mapIcons';

const VehicleMarkers = ({ vehicles, emergencies, onCancelVehicleDispatch }) => {
  return (
    <>
      {vehicles.map(vehicle => {
        if (!vehicle.position && !vehicle.currentPosition) return null;
        
        const currentPos = vehicle.currentPosition || vehicle.position;
        
        // Determine route color based on vehicle status
        let routeColor = '#2196F3'; // Blue for dispatched
        if (vehicle.status === VEHICLE_STATUS.ON_SCENE) {
          routeColor = '#FF9800'; // Orange for on scene
        } else if (vehicle.status === VEHICLE_STATUS.RETURNING) {
          routeColor = '#9C27B0'; // Purple for returning
        }
        
        // Calculate traveled route for animation
        let traveledRoute = [];
        if (vehicle.route && vehicle.routeIndex > 0) {
          traveledRoute = vehicle.route.slice(0, vehicle.routeIndex + 1);
          if (vehicle.currentPosition) {
            traveledRoute[traveledRoute.length - 1] = vehicle.currentPosition;
          }
        }
        
        return (
          <div key={vehicle.id}>
            {/* Vehicle routes */}
            {vehicle.route && vehicle.route.length > 1 && (
              <>
                {/* Full route - light solid line */}
                <Polyline
                  positions={vehicle.route}
                  color={routeColor}
                  weight={2}
                  opacity={0.3}
                />
                {/* Traveled route - solid line exactly to vehicle position */}
                {traveledRoute.length > 1 && (
                  <Polyline
                    positions={traveledRoute}
                    color={routeColor}
                    weight={5}
                    opacity={0.8}
                  />
                )}
              </>
            )}
            
            {/* Vehicle marker */}
            <Marker
              position={currentPos}
              icon={createVehicleIcon(vehicle, emergencies)}
            >
              <Popup>
                <div>
                  <h4 style={{ margin: '0 0 8px 0' }}>
                    {getVehicleIcon(vehicle.type)} {vehicle.name || `Unit ${vehicle.id}`}
                  </h4>
                  <p><strong>Type:</strong> {vehicle.type}</p>
                  <p><strong>Status:</strong> {vehicle.status}</p>
                  {vehicle.assignedIncidentId && (
                    <p><strong>Assigned to:</strong> Incident #{vehicle.assignedIncidentId}</p>
                  )}
                  {vehicle.status === VEHICLE_STATUS.DISPATCHED && (
                    <button
                      onClick={() => onCancelVehicleDispatch(vehicle.id)}
                      style={{
                        marginTop: '8px',
                        padding: '6px 12px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel Dispatch
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          </div>
        );
      })}
    </>
  );
};

export default VehicleMarkers;