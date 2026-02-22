import { useEffect } from 'react';
import { VEHICLE_STATUS } from '../vehicleConfig';

export const useIncidentResolver = (vehicles, emergencies, setVehicles, setEmergencies, onScoreChange, setResolvedIncidents) => {
  useEffect(() => {
    const resolutionInterval = setInterval(() => {
      vehicles.forEach(vehicle => {
        if (vehicle.status === VEHICLE_STATUS.ON_SCENE && vehicle.arrivedAt) {
          const now = Date.now();
          const workDuration = 3000; // 3 seconds to handle incident
          const workElapsed = now - vehicle.arrivedAt;
          
          if (workElapsed >= workDuration) {
            // Find the incident
            const incident = emergencies.find(e => e.id === vehicle.assignedIncidentId);
            
            if (incident && !incident.resolved) {
              console.log(`Vehicle ${vehicle.id} resolved incident ${incident.id}`);
              
              // Calculate credits (base 100 + bonus for quick response)
              const responseTime = now - incident.createdAt;
              const maxResponseTime = incident.expiresAt - incident.createdAt;
              const responseRatio = 1 - (responseTime / maxResponseTime);
              const credits = Math.round(100 * (1 + responseRatio * 0.5)); // 50% bonus for instant response
              
              // Resolve the incident
              setEmergencies(prev => prev.map(e => 
                e.id === incident.id 
                  ? { ...e, resolved: true, resolvedAt: now, credits }
                  : e
              ));
              
              // Award credits
              if (onScoreChange) {
                onScoreChange(credits);
              }
              
              // Add to resolved incidents
              setResolvedIncidents(prev => [...prev, {
                ...incident,
                resolvedAt: now,
                responseTime: responseTime,
                vehicleId: vehicle.id,
                credits: credits
              }]);
              
              // Set vehicle to return to station
              setVehicles(prev => prev.map(v => 
                v.id === vehicle.id 
                  ? { 
                      ...v, 
                      status: VEHICLE_STATUS.RETURNING,
                      assignedIncidentId: null,
                      needsReturnRoute: true,
                      arrivedAt: null
                    }
                  : v
              ));
            }
          }
        }
      });
    }, 100); // Check every 100ms
    
    return () => clearInterval(resolutionInterval);
  }, [vehicles, emergencies, setVehicles, setEmergencies, onScoreChange, setResolvedIncidents]);
};