import { useEffect } from 'react';
import { VEHICLE_STATUS } from '../vehicleConfig';
import { calculateRoute } from '../utils/routeCalculator';

export const useVehicleReturnRoutes = (vehicles, policeStations, setVehicles) => {
  useEffect(() => {
    const processReturnRoutes = async () => {
      // Debug: Check all vehicles
      const returningVehicles = vehicles.filter(v => v.status === VEHICLE_STATUS.RETURNING);
      if (returningVehicles.length > 0) {
        console.log('All RETURNING vehicles:', returningVehicles.map(v => ({
          id: v.id,
          needsReturnRoute: v.needsReturnRoute,
          hasRoute: !!v.route,
          currentPos: v.currentPosition,
          targetPos: v.targetPosition
        })));
      }
      
      const vehiclesNeedingRoutes = vehicles.filter(v => v.needsReturnRoute && v.status === VEHICLE_STATUS.RETURNING && !v.route);
      
      if (vehiclesNeedingRoutes.length === 0) {
        return;
      }
      
      console.log(`Processing ${vehiclesNeedingRoutes.length} vehicles needing return routes:`, vehiclesNeedingRoutes.map(v => v.id));
      
      for (const vehicle of vehiclesNeedingRoutes) {
        const station = policeStations.find(s => s.id === vehicle.stationId);
        if (station) {
          // Ensure we have a valid current position
          const vehiclePosition = vehicle.currentPosition || vehicle.targetPosition || vehicle.position;
          if (!vehiclePosition) {
            console.error(`No valid position found for vehicle ${vehicle.id}`);
            continue;
          }
          
          console.log(`Calculating return route for vehicle ${vehicle.id} from`, vehiclePosition, 'to', station.position);
          
          try {
            const routeData = await calculateRoute(vehiclePosition, station.position);
            const returnRoute = routeData.coordinates;
            const returnDistance = routeData.distance / 1000; // Convert meters to km
            console.log(`Return route calculated for vehicle ${vehicle.id}: ${returnRoute.length} points, ${returnDistance.toFixed(2)}km`);
            
            setVehicles(prev => prev.map(v => 
              v.id === vehicle.id ? {
                ...v,
                route: returnRoute,
                routeDistance: returnDistance,
                vehicleSpeed: 400, // Fast return speed same as dispatch
                departureTime: Date.now(),
                distanceTraveled: 0,
                routeIndex: 0,
                needsReturnRoute: false,
                // Maintain current position
                currentPosition: vehiclePosition
              } : v
            ));
          } catch (error) {
            console.error(`Error calculating return route for vehicle ${vehicle.id}:`, error);
            // Fallback: create a simple direct route
            const directRoute = [vehiclePosition, station.position];
            console.log(`Using direct route fallback for vehicle ${vehicle.id}`);
            
            setVehicles(prev => prev.map(v => 
              v.id === vehicle.id ? {
                ...v,
                route: directRoute,
                routeDistance: 1, // Assume 1km for direct route
                vehicleSpeed: 400, // Fast return speed
                departureTime: Date.now(),
                distanceTraveled: 0,
                routeIndex: 0,
                needsReturnRoute: false,
                // Maintain current position
                currentPosition: vehiclePosition
              } : v
            ));
          }
        } else {
          console.error(`Station not found for vehicle ${vehicle.id}, making available`);
          setVehicles(prev => prev.map(v => 
            v.id === vehicle.id ? {
              ...v,
              status: VEHICLE_STATUS.AVAILABLE,
              needsReturnRoute: false,
              assignedIncidentId: null,
              incidentCompleted: false,
              route: null,
              targetPosition: null
            } : v
          ));
        }
      }
    };

    // Process immediately on mount
    processReturnRoutes();
    
    // Check frequently for vehicles needing routes
    const interval = setInterval(processReturnRoutes, 100); // Check every 100ms for faster response
    
    return () => clearInterval(interval);
  }, [vehicles, policeStations, setVehicles]);
};