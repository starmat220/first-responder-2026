import { VEHICLE_STATUS, canHandleIncident } from '../vehicleConfig';
import { calculateRoute } from './routeCalculator';

// Dispatch a vehicle to an incident
export const dispatchVehicle = async (emergencyId, emergencies, vehicles, policeStations, setVehicles) => {
  const emergency = emergencies.find(e => e.id === emergencyId);
  if (!emergency) return;
  
  // Find the nearest available vehicle that can handle this incident
  let nearestVehicle = null;
  let shortestDistance = Infinity;
  
  for (const vehicle of vehicles) {
    if (vehicle.status !== VEHICLE_STATUS.AVAILABLE) continue;
    if (!canHandleIncident(vehicle.type, emergency.type)) continue;
    
    const station = policeStations.find(s => s.id === vehicle.stationId);
    if (!station) continue;
    
    const distance = Math.sqrt(
      Math.pow(station.position[0] - emergency.position[0], 2) +
      Math.pow(station.position[1] - emergency.position[1], 2)
    );
    
    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestVehicle = vehicle;
    }
  }
  
  if (!nearestVehicle) {
    console.log('No available vehicle found for incident');
    return;
  }
  
  const station = policeStations.find(s => s.id === nearestVehicle.stationId);
  if (!station) return;
  
  // Calculate route
  const routeData = await calculateRoute(station.position, emergency.position);
  
  // Update vehicle
  setVehicles(prev => prev.map(v => 
    v.id === nearestVehicle.id 
      ? {
          ...v,
          status: VEHICLE_STATUS.DISPATCHED,
          assignedIncidentId: emergency.id,
          targetPosition: emergency.position,
          route: routeData.coordinates,
          routeIndex: 0,
          position: station.position,
          dispatchTime: Date.now(),
          estimatedArrival: Date.now() + (routeData.duration * 1000),
        }
      : v
  ));
};

// Cancel a vehicle dispatch and return it to station
export const cancelVehicleDispatch = async (vehicleId, vehicles, policeStations, setVehicles) => {
  const vehicle = vehicles.find(v => v.id === vehicleId);
  if (!vehicle || vehicle.status === VEHICLE_STATUS.AVAILABLE) return;
  
  const station = policeStations.find(s => s.id === vehicle.stationId);
  if (!station) return;
  
  // Calculate return route from current position
  const routeData = await calculateRoute(vehicle.position, station.position);
  
  setVehicles(prev => prev.map(v => 
    v.id === vehicleId 
      ? {
          ...v,
          status: VEHICLE_STATUS.RETURNING,
          assignedIncidentId: null,
          targetPosition: station.position,
          route: routeData.coordinates,
          routeIndex: 0,
          dispatchTime: Date.now(),
          estimatedArrival: Date.now() + (routeData.duration * 1000),
          arrivedAt: null,
        }
      : v
  ));
};