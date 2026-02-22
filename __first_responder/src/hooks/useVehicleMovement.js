import { useEffect } from 'react';
import { VEHICLE_STATUS } from '../vehicleConfig';

export const useVehicleMovement = (vehicles, setVehicles, policeStations, setEmergencies, onScoreChange, setResolvedIncidents) => {
  useEffect(() => {
    const animationInterval = setInterval(() => {
      setVehicles(prevVehicles => 
        prevVehicles.map(vehicle => {
          if ((vehicle.status === VEHICLE_STATUS.DISPATCHED || vehicle.status === VEHICLE_STATUS.RETURNING) && 
              vehicle.route && vehicle.routeIndex < vehicle.route.length && vehicle.departureTime) {
            
            const now = Date.now();
            const elapsedTime = (now - vehicle.departureTime) / 1000; // seconds
            
            // Calculate position based on distance and speed
            const totalDistance = vehicle.routeDistance || 10; // km
            const speed = vehicle.vehicleSpeed || 60; // km/h
            const distancePerSecond = speed / 3600; // km/s
            const targetDistance = elapsedTime * distancePerSecond; // km traveled
            
            // Find which segment we should be on
            let accumulatedDistance = 0;
            let currentSegmentIndex = 0;
            let segmentProgress = 0;
            
            // Helper function to calculate distance between two points
            const calculateSegmentDistance = (point1, point2) => {
              const R = 6371; // Earth's radius in km
              const dLat = (point2[0] - point1[0]) * Math.PI / 180;
              const dLng = (point2[1] - point1[1]) * Math.PI / 180;
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(point1[0] * Math.PI / 180) * Math.cos(point2[0] * Math.PI / 180) *
                        Math.sin(dLng/2) * Math.sin(dLng/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              return R * c;
            };
            
            // Calculate segment distances and find current position
            for (let i = 0; i < vehicle.route.length - 1; i++) {
              const segmentDist = calculateSegmentDistance(vehicle.route[i], vehicle.route[i + 1]);
              
              if (accumulatedDistance + segmentDist >= targetDistance) {
                currentSegmentIndex = i;
                const remainingDistance = targetDistance - accumulatedDistance;
                segmentProgress = remainingDistance / segmentDist;
                break;
              }
              
              accumulatedDistance += segmentDist;
            }
            
            // Interpolate position on current segment
            const fromPoint = vehicle.route[currentSegmentIndex];
            const toPoint = vehicle.route[Math.min(currentSegmentIndex + 1, vehicle.route.length - 1)];
            
            const newPosition = [
              fromPoint[0] + (toPoint[0] - fromPoint[0]) * segmentProgress,
              fromPoint[1] + (toPoint[1] - fromPoint[1]) * segmentProgress
            ];
            
            // Check if reached destination
            if (targetDistance >= totalDistance || currentSegmentIndex >= vehicle.route.length - 2) {
              // Vehicle has arrived
              console.log(`Vehicle ${vehicle.id} arrived at destination`);
              
              if (vehicle.status === VEHICLE_STATUS.DISPATCHED) {
                // Arrived at incident
                return {
                  ...vehicle,
                  status: VEHICLE_STATUS.ON_SCENE,
                  currentPosition: vehicle.targetPosition,
                  arrivedAt: now,
                  route: null,
                  routeIndex: null,
                  distanceTraveled: null
                };
              } else if (vehicle.status === VEHICLE_STATUS.RETURNING) {
                // Back at station - NOW remove the completed incident
                if (vehicle.assignedIncidentId && vehicle.incidentCompleted) {
                  const incidentId = vehicle.assignedIncidentId;
                  console.log(`Vehicle ${vehicle.id} has arrived back at station. NOW removing completed incident ${incidentId}`);
                  
                  // Add a small delay before removing the incident for visual feedback
                  setTimeout(() => {
                    setEmergencies(prev => prev.filter(emergency => emergency.id !== incidentId));
                  }, 500);
                }
                
                const station = policeStations.find(s => s.id === vehicle.stationId);
                console.log(`Vehicle ${vehicle.id} has returned to station and is now available`);
                return {
                  ...vehicle,
                  status: VEHICLE_STATUS.AVAILABLE,
                  currentPosition: station ? station.position : vehicle.currentPosition,
                  route: null,
                  routeIndex: 0,
                  departureTime: null,
                  distanceTraveled: null,
                  vehicleSpeed: null,
                  targetPosition: null,
                  arrivedAt: null,
                  assignedIncidentId: null,
                  incidentCompleted: false,
                  needsReturnRoute: false
                };
              }
            }
            
            // Update position
            return {
              ...vehicle,
              currentPosition: newPosition,
              routeIndex: currentSegmentIndex + 1,
              distanceTraveled: targetDistance
            };
          }
          
          // Handle vehicles on scene - check if work is complete
          if (vehicle.status === VEHICLE_STATUS.ON_SCENE && vehicle.arrivedAt) {
            const timeOnScene = Date.now() - vehicle.arrivedAt;
            const responseTime = vehicle.responseTime || 3000;
            
            if (timeOnScene >= responseTime) {
              // Work completed, resolve incident and start return journey
              console.log(`Vehicle ${vehicle.id} work completed, starting return journey to station`);
              
              const incidentId = vehicle.assignedIncidentId;
              const station = policeStations.find(s => s.id === vehicle.stationId);
              
              // Mark incident as resolved but DON'T remove it yet
              setTimeout(() => {
                setEmergencies(prev => prev.map(e => 
                  e.id === incidentId && !e.resolved
                    ? { ...e, resolved: true, resolvedBy: vehicle.id, resolvedAt: Date.now() }
                    : e
                ));
                setResolvedIncidents(prev => [...prev, {
                  id: incidentId,
                  resolvedAt: Date.now(),
                  responseTime: timeOnScene,
                  vehicleId: vehicle.id,
                  credits: 100
                }]);
                if (onScoreChange) {
                  onScoreChange(100);
                }
              }, 10);
              
              if (!station) {
                console.error(`No station found for vehicle ${vehicle.id}`);
                return vehicle;
              }
              
              console.log(`Vehicle ${vehicle.id} will return to station at:`, station.position);
              console.log(`Vehicle ${vehicle.id} current position:`, vehicle.currentPosition || vehicle.targetPosition || vehicle.position);
              
              const updatedVehicle = {
                ...vehicle,
                status: VEHICLE_STATUS.RETURNING,
                needsReturnRoute: true,
                arrivedAt: null,
                incidentCompleted: true,
                targetPosition: station.position,
                currentPosition: vehicle.currentPosition || vehicle.targetPosition || vehicle.position,
                route: null,
                routeIndex: 0,
                departureTime: null,
                distanceTraveled: 0
              };
              
              console.log(`Vehicle ${vehicle.id} state after work completion:`, {
                status: updatedVehicle.status,
                needsReturnRoute: updatedVehicle.needsReturnRoute,
                currentPosition: updatedVehicle.currentPosition,
                targetPosition: updatedVehicle.targetPosition
              });
              
              return updatedVehicle;
            }
          }
          
          return vehicle;
        })
      );
    }, 50); // Update 20 times per second for smooth animation
    
    return () => clearInterval(animationInterval);
  }, [setVehicles, policeStations, setEmergencies, onScoreChange, setResolvedIncidents]);
};