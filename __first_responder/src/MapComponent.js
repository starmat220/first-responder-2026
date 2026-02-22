import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VEHICLE_TYPES, VEHICLE_CONFIG, VEHICLE_STATUS, getVehicleIcon, canHandleIncident } from './vehicleConfig';

// Import the enhanced incident generator
import { generateIncident, getIncidentSpawnRate, getMaxConcurrentIncidents } from './utils/incidentGeneratorV2';
// Import station upgrades
import { STATION_LEVELS, calculateStationCapacity } from './config/stationUpgrades';
// Import vehicle-specific incident helpers
import { getMissingVehicles } from './config/vehicleIncidents';

// Import extracted utilities and components
import { createPoliceStationIcon, createEmergencyIcon } from './utils/mapIcons';
import { calculateRoute } from './utils/routeCalculator';
import MapClickHandler from './components/MapClickHandler';

// Import utility functions
import { getRandomMapPoint } from './utils/mapHelpers';

// Import hooks
import { useVehicleReturnRoutes } from './hooks/useVehicleReturnRoutes';

// Fix for default marker icons in webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: null, // Remove shadow to prevent duplicate icons
});




function MapComponent({ onScoreChange, money, onSpendMoney, gameData, onGameDataUpdate }) {
  const [emergencies, setEmergencies] = useState([]);
  const [policeStations, setPoliceStations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [nextEmergencyId, setNextEmergencyId] = useState(1);
  const [nextStationId, setNextStationId] = useState(1);
  const [nextVehicleId, setNextVehicleId] = useState(1);
  const [isBuildingStation, setIsBuildingStation] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [resolvedIncidents, setResolvedIncidents] = useState([]);
  const [openPopupId, setOpenPopupId] = useState(null);
  // const [openStationId, setOpenStationId] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [playerLevel, setPlayerLevel] = useState(1);
  const mapRef = useRef(null);
  const emergenciesRef = useRef([]);
  const vehiclesRef = useRef([]);
  // const stationRefs = useRef({});
  
  const defaultCenter = useMemo(() => [45.8497, -66.4758], []); // Oromocto, New Brunswick
  
  // Keep refs updated with current state
  emergenciesRef.current = emergencies;
  vehiclesRef.current = vehicles;
  
  // Calculate player level based on resolved incidents
  useEffect(() => {
    const totalIncidents = resolvedIncidents.length;
    // Level up every 5 incidents resolved, starting at level 1
    const newLevel = Math.floor(totalIncidents / 5) + 1;
    setPlayerLevel(Math.min(newLevel, 100)); // Cap at level 100
  }, [resolvedIncidents]);

  // Load initial game data from parent component
  useEffect(() => {
    if (gameData && !hasLoadedInitialData) {
      if (gameData.policeStations) {
        setPoliceStations(gameData.policeStations);
      }
      if (gameData.emergencies) {
        setEmergencies(gameData.emergencies);
      }
      if (gameData.vehicles) {
        setVehicles(gameData.vehicles);
      }
      if (gameData.resolvedIncidents) {
        setResolvedIncidents(gameData.resolvedIncidents);
      }
      if (gameData.nextStationId) setNextStationId(gameData.nextStationId);
      if (gameData.nextEmergencyId) setNextEmergencyId(gameData.nextEmergencyId);
      if (gameData.nextVehicleId) setNextVehicleId(gameData.nextVehicleId);
      setHasLoadedInitialData(true);
    } else if (!gameData && !hasLoadedInitialData) {
      // For new games, just mark as loaded without creating initial stations
      setHasLoadedInitialData(true);
    }
  }, [gameData, hasLoadedInitialData]);

  // Update parent with current game data whenever state changes (but not during initial load)
  useEffect(() => {
    if (onGameDataUpdate && hasLoadedInitialData) {
      const currentData = {
        policeStations,
        emergencies,
        vehicles,
        resolvedIncidents,
        nextStationId,
        nextEmergencyId,
        nextVehicleId
      };
      onGameDataUpdate(currentData);
    }
  }, [policeStations, emergencies, vehicles, resolvedIncidents, nextStationId, nextEmergencyId, nextVehicleId, hasLoadedInitialData, onGameDataUpdate]);


  // Manual emergency spawning function for testing
  const manualSpawnEmergency = async () => {
    const position = getRandomMapPoint(policeStations, defaultCenter);
    
    // Get unique vehicle types available
    const availableVehicleTypes = [...new Set(vehicles
      .filter(v => v.status === VEHICLE_STATUS.AVAILABLE)
      .map(v => v.type))];
    
    // Use the new enhanced incident generator
    const newIncident = await generateIncident(position, playerLevel, availableVehicleTypes);
    
    if (newIncident) {
      setEmergencies(prev => [...prev, newIncident]);
      setNextEmergencyId(prev => prev + 1);
    }
  };

  // Automatic emergency spawning
  useEffect(() => {
    // Don't spawn emergencies if no stations exist
    if (policeStations.length === 0) {
      return;
    }

    const spawnEmergency = async () => {
      // Get current state values from refs to avoid stale closures
      const currentEmergencies = emergenciesRef.current;
      const currentVehicles = vehiclesRef.current;
      
      // Check max concurrent incidents (Mission Chief style)
      const maxIncidents = getMaxConcurrentIncidents(policeStations.length);
      const activeIncidents = currentEmergencies.filter(e => !e.resolved).length;
      
      if (activeIncidents >= maxIncidents) {
        return; // Exit early
      }
      
      // Spawn chance increases with fewer active incidents
      const spawnChance = Math.max(0.3, 0.8 - (activeIncidents / maxIncidents));
      
      if (Math.random() < spawnChance) {
        // Generate random position near stations
        const position = getRandomMapPoint(policeStations, defaultCenter);
        
        // Get available vehicle types
        const availableVehicleTypes = [...new Set(currentVehicles
          .filter(v => v.status === VEHICLE_STATUS.AVAILABLE)
          .map(v => v.type))];
        
        // Generate incident using new system
        try {
          const newIncident = await generateIncident(position, playerLevel, availableVehicleTypes);
          if (newIncident) {
            // Single state update to add the incident
            setEmergencies(prev => [...prev, newIncident]);
            setNextEmergencyId(prev => prev + 1);
          }
        } catch (error) {
          console.error('Error generating incident:', error);
        }
      }
    };

    // Dynamic spawn timing based on progression
    let timeoutId;
    let cancelled = false;
    
    const scheduleNextSpawn = () => {
      if (cancelled) return;
      
      const spawnRate = getIncidentSpawnRate(playerLevel, policeStations.length);
      const nextSpawnTime = spawnRate.min + Math.random() * (spawnRate.max - spawnRate.min);
      
      timeoutId = setTimeout(() => {
        if (!cancelled) {
          spawnEmergency();
          scheduleNextSpawn();
        }
      }, nextSpawnTime);
    };
    
    // First spawn after 3-8 seconds
    const firstSpawnTime = 3000 + Math.random() * 5000;
    timeoutId = setTimeout(() => {
      if (!cancelled) {
        spawnEmergency();
        scheduleNextSpawn();
      }
    }, firstSpawnTime);
    
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [policeStations, playerLevel, defaultCenter]); // Re-run when stations or level change

  // Remove expired incidents
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setEmergencies(prev => prev.filter(e => 
        e.resolved || !e.expiresAt || e.expiresAt > now || e.assignedVehicleId
      ));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Hook to calculate return routes for vehicles
  useVehicleReturnRoutes(vehicles, policeStations, setVehicles);

  // Smooth vehicle movement system with constant speed
  useEffect(() => {
    let lastFrameTime = Date.now();
    let animationFrameId;
    let isCancelled = false;
    
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
    
    const moveVehicles = () => {
      if (isCancelled) return;
      const currentTime = Date.now();
      const deltaTime = (currentTime - lastFrameTime) / 1000; // Convert to seconds
      lastFrameTime = currentTime;
      
      setVehicles(prevVehicles => {
        if (isCancelled) return prevVehicles;
        
        // Debug: Log all vehicles with RETURNING status
        const returningVehicles = prevVehicles.filter(v => v.status === VEHICLE_STATUS.RETURNING);
        if (returningVehicles.length > 0) {
          console.log('DEBUG: Returning vehicles:', returningVehicles.map(v => ({
            id: v.id,
            status: v.status,
            hasRoute: !!v.route,
            routeLength: v.route?.length,
            speed: v.vehicleSpeed,
            distance: v.distanceTraveled,
            totalDistance: v.routeDistance
          })));
        }
        
        return prevVehicles.map(vehicle => {
          // For RETURNING vehicles without a route, keep them at their current position
          if (vehicle.status === VEHICLE_STATUS.RETURNING && (!vehicle.route || vehicle.route.length <= 1)) {
            // Don't move, just maintain current position
            return vehicle;
          }
          
          // Only move vehicles that are dispatched or returning with valid routes
          if ((vehicle.status === VEHICLE_STATUS.DISPATCHED || vehicle.status === VEHICLE_STATUS.RETURNING) && vehicle.route && vehicle.route.length > 1) {
            // Calculate distance to travel this frame based on constant speed
            const distancePerSecond = vehicle.vehicleSpeed / 3600; // km per second
            const distanceThisFrame = distancePerSecond * deltaTime;
            
            // Update accumulated distance traveled
            const currentDistanceTraveled = (vehicle.distanceTraveled || 0) + distanceThisFrame;
            const progress = Math.min(currentDistanceTraveled / vehicle.routeDistance, 1);
            
            if (vehicle.status === VEHICLE_STATUS.RETURNING) {
              console.log(`Vehicle ${vehicle.id} returning: ${(progress * 100).toFixed(1)}% complete (${currentDistanceTraveled.toFixed(3)}/${vehicle.routeDistance.toFixed(3)} km)`);
            }
            
            if (progress >= 1) {
              // Vehicle has reached destination
              if (vehicle.status === VEHICLE_STATUS.DISPATCHED) {
                // Change status to ON_SCENE
                console.log(`Vehicle ${vehicle.id} arrived on scene at incident ${vehicle.assignedIncidentId}`);
                return {
                  ...vehicle,
                  status: VEHICLE_STATUS.ON_SCENE,
                  arrivedAt: Date.now(),
                  currentPosition: vehicle.route[vehicle.route.length - 1]
                };
              } else if (vehicle.status === VEHICLE_STATUS.RETURNING) {
                console.log(`Vehicle ${vehicle.id} has returned to station`);
                const station = policeStations.find(s => s.id === vehicle.stationId);
                
                // If this vehicle was returning from a completed incident, remove the incident now
                if (vehicle.assignedIncidentId && vehicle.incidentCompleted) {
                  const incidentId = vehicle.assignedIncidentId;
                  console.log(`Vehicle ${vehicle.id} has arrived back at station. Will remove completed incident ${incidentId} after visual feedback`);
                  
                  // Remove the completed incident from the map with a longer delay for visual feedback
                  setTimeout(() => {
                    console.log(`NOW removing completed incident ${incidentId}`);
                    setEmergencies(prev => prev.filter(emergency => emergency.id !== incidentId));
                  }, 1500); // 1.5 second delay for better visual feedback
                }
                
                return {
                  ...vehicle,
                  status: VEHICLE_STATUS.AVAILABLE,
                  route: null,
                  routeDistance: null,
                  vehicleSpeed: null,
                  routeProgress: null,
                  currentPosition: station ? station.position : vehicle.currentPosition,
                  departureTime: null,
                  distanceTraveled: null,
                  assignedIncidentId: null,
                  arrivedAt: null,
                  responseTime: null,
                  needsReturnRoute: false,
                  incidentCompleted: false
                };
              }
            } else {
              // Find current position on route based on distance traveled
              let accumulatedDistance = 0;
              let currentSegmentIndex = 0;
              let segmentProgress = 0;
              
              // Find which segment we're on
              for (let i = 1; i < vehicle.route.length; i++) {
                const segmentStart = vehicle.route[i - 1];
                const segmentEnd = vehicle.route[i];
                
                // Validate coordinates before calculation
                if (!segmentStart || !segmentEnd || 
                    isNaN(segmentStart[0]) || isNaN(segmentStart[1]) ||
                    isNaN(segmentEnd[0]) || isNaN(segmentEnd[1])) {
                  console.warn('Invalid route coordinates detected, skipping segment');
                  continue;
                }
                
                const segmentDistance = calculateSegmentDistance(segmentStart, segmentEnd);
                
                if (accumulatedDistance + segmentDistance >= currentDistanceTraveled) {
                  currentSegmentIndex = i - 1;
                  const distanceIntoSegment = currentDistanceTraveled - accumulatedDistance;
                  segmentProgress = distanceIntoSegment / segmentDistance;
                  
                  // Debug log for returning vehicles
                  if (vehicle.status === VEHICLE_STATUS.RETURNING) {
                    console.log(`Vehicle ${vehicle.id} segment progress: ${segmentProgress.toFixed(3)} on segment ${currentSegmentIndex}`);
                  }
                  break;
                }
                
                accumulatedDistance += segmentDistance;
              }
              
              // If we've traveled the full distance, ensure we're at the end
              if (progress >= 1) {
                currentSegmentIndex = Math.max(0, vehicle.route.length - 2);
                segmentProgress = 1;
              }
              
              // Linear interpolation for constant speed (no easing)
              const startPoint = vehicle.route[currentSegmentIndex];
              const endPoint = vehicle.route[Math.min(currentSegmentIndex + 1, vehicle.route.length - 1)];
              
              // Validate points before interpolation
              if (!startPoint || !endPoint || 
                  isNaN(startPoint[0]) || isNaN(startPoint[1]) ||
                  isNaN(endPoint[0]) || isNaN(endPoint[1])) {
                console.warn('Invalid interpolation points, using vehicle position');
                return vehicle; // Return unchanged vehicle
              }
              
              const currentPosition = [
                startPoint[0] + (endPoint[0] - startPoint[0]) * segmentProgress,
                startPoint[1] + (endPoint[1] - startPoint[1]) * segmentProgress
              ];
              
              // Final validation of current position
              if (isNaN(currentPosition[0]) || isNaN(currentPosition[1])) {
                console.warn('Calculated position is NaN, using last valid position');
                return vehicle; // Return unchanged vehicle
              }
              
              return {
                ...vehicle,
                currentPosition: currentPosition,
                routeProgress: progress,
                distanceTraveled: currentDistanceTraveled
              };
            }
          }
          
          // Handle vehicles on scene - using functional approach to avoid state references
          if (vehicle.status === VEHICLE_STATUS.ON_SCENE && vehicle.arrivedAt) {
            const timeOnScene = Date.now() - vehicle.arrivedAt;
            const responseTime = vehicle.responseTime || 3000; // Reduced to 3 seconds for testing
            
            console.log(`Vehicle ${vehicle.id} on scene for ${Math.round(timeOnScene/1000)}s of ${responseTime/1000}s`);
            
            if (timeOnScene >= responseTime) {
              console.log(`Vehicle ${vehicle.id} work completed! Starting immediate return journey...`);
              
              // Resolve the incident immediately (no setTimeout)
              const incidentId = vehicle.assignedIncidentId;
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
              
              // Find station and create simple direct route
              const station = policeStations.find(s => s.id === vehicle.stationId);
              if (!station) {
                console.error(`No station found for vehicle ${vehicle.id}`);
                return vehicle;
              }
              
              // Mark vehicle as needing return route calculation
              const currentPos = vehicle.currentPosition || vehicle.targetPosition || vehicle.position;
              
              console.log(`Vehicle ${vehicle.id} completed work, marking for return route calculation`);
              
              return {
                ...vehicle,
                status: VEHICLE_STATUS.RETURNING,
                route: null, // Will be calculated by route calculator
                routeDistance: null,
                vehicleSpeed: 400, // Fast return speed (same as dispatch)
                departureTime: null, // Don't set until route is calculated
                distanceTraveled: 0,
                arrivedAt: null,
                incidentCompleted: true,
                needsReturnRoute: true, // This triggers route calculation
                currentPosition: currentPos,
                targetPosition: station.position
              };
            }
          }
          
          return vehicle;
        });
      });
      
      if (!isCancelled) {
        animationFrameId = requestAnimationFrame(moveVehicles);
      }
    };

    // Start animation loop
    animationFrameId = requestAnimationFrame(moveVehicles);
    
    return () => {
      isCancelled = true;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [policeStations, onScoreChange, setEmergencies, setResolvedIncidents]); // Include all dependencies

  // Handle incident resolution separately to avoid infinite loops
  useEffect(() => {
    const resolveInterval = setInterval(() => {
      console.log('Resolution interval running...');
      
      // Use functional state update to avoid dependencies
      setVehicles(prevVehicles => {
        const vehiclesNeedingResolution = prevVehicles.filter(v => v.needsIncidentResolution && !v.isProcessingResolution);
        
        if (vehiclesNeedingResolution.length === 0) {
          return prevVehicles;
        }
        
        console.log('Processing vehicles for resolution:', vehiclesNeedingResolution.length);
        
        // Mark vehicles as being processed first
        const updatedVehicles = prevVehicles.map(vehicle => {
          if (vehicle.needsIncidentResolution && !vehicle.isProcessingResolution) {
            console.log(`Resolving incident for vehicle ${vehicle.id}`);
            
            // Resolve incident immediately
            setEmergencies(prevEmergencies => 
              prevEmergencies.map(e => {
                if (e.id === vehicle.assignedIncidentId && !e.resolved) {
                  console.log(`Incident ${e.id} resolved by ${vehicle.name}`);
                  onScoreChange(e.creditReward || 75);
                  
                  const resolvedIncident = { ...e, resolved: true, resolvedBy: vehicle.name, resolvedAt: Date.now() };
                  setResolvedIncidents(prev => [...prev, resolvedIncident]);
                  
                  // Don't remove incident yet - wait for vehicle to return to station
                  return resolvedIncident;
                }
                return e;
              })
            );
            
            console.log(`Vehicle ${vehicle.id} finishing incident work, will calculate return route`);
            
            const station = policeStations.find(s => s.id === vehicle.stationId);
            if (!station) {
              console.error(`No station found for vehicle ${vehicle.id}`);
              return vehicle;
            }
            
            return {
              ...vehicle,
              status: VEHICLE_STATUS.RETURNING,
              needsIncidentResolution: false,
              isProcessingResolution: false,
              arrivedAt: null,
              route: null,
              routeDistance: null,
              vehicleSpeed: 400,
              departureTime: null, // Don't set until route is calculated
              distanceTraveled: 0,
              needsReturnRoute: true, // The hook will handle route calculation
              incidentCompleted: true,
              targetPosition: station.position,
              currentPosition: vehicle.currentPosition || vehicle.targetPosition || vehicle.position
            };
          }
          return vehicle;
        });
        
        return updatedVehicles;
      });
    }, 1000);

    return () => clearInterval(resolveInterval);
  }, [onScoreChange, policeStations]);

  // Use the imported hook for return route calculation
  useVehicleReturnRoutes(vehicles, policeStations, setVehicles);

  const buildPoliceStation = (position) => {
    const stationCost = 1000;
    if (money >= stationCost) {
      const newStation = {
        id: nextStationId,
        position: [position.lat, position.lng],
        name: `Station ${nextStationId}`,
        level: 1,
        upgrades: {},
        vehicles: 0,
        staff: 6, // Start with basic staff
        maxVehicles: 3,
        createdAt: Date.now()
      };
      
      const updatedStations = [...policeStations, newStation];
      
      // Update all local state
      setPoliceStations(updatedStations);
      setNextStationId(prev => prev + 1);
      setIsBuildingStation(false);
      onSpendMoney(stationCost);
      
      // Immediate update to parent with all current state
      if (onGameDataUpdate) {
        onGameDataUpdate({
          policeStations: updatedStations,
          emergencies,
          vehicles,
          resolvedIncidents,
          nextStationId: nextStationId + 1,
          nextEmergencyId,
          nextVehicleId
        });
      }
    }
  };

  

  const purchaseVehicle = (stationId, vehicleType) => {
    const vehicleConfig = VEHICLE_CONFIG[vehicleType];
    if (!vehicleConfig) return;

    const station = policeStations.find(s => s.id === stationId);
    if (!station) return;

    // Calculate actual capacity with upgrades
    const capacity = calculateStationCapacity(station);
    const stationVehicles = vehicles.filter(v => v.stationId === stationId);
    if (stationVehicles.length >= capacity.maxVehicles) return;

    if (money < vehicleConfig.cost) return;

    const newVehicle = {
      id: nextVehicleId,
      type: vehicleType,
      name: `${vehicleConfig.name} ${nextVehicleId}`,
      stationId: stationId,
      status: VEHICLE_STATUS.AVAILABLE,
      position: station.position,
      capabilities: vehicleConfig.capabilities,
      maxCrew: vehicleConfig.maxCrew,
      currentCrew: vehicleConfig.maxCrew, // Start with full crew
      assignedIncidentId: null
    };
    
    const updatedVehicles = [...vehicles, newVehicle];
    
    // Update local state
    setVehicles(updatedVehicles);
    setNextVehicleId(prev => prev + 1);
    onSpendMoney(vehicleConfig.cost);

    // Immediate update to parent
    if (onGameDataUpdate) {
      onGameDataUpdate({
        policeStations,
        emergencies,
        vehicles: updatedVehicles,
        resolvedIncidents,
        nextStationId,
        nextEmergencyId,
        nextVehicleId: nextVehicleId + 1
      });
    }
  };


  const dispatchVehicle = async (vehicleId, incidentId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    const incident = emergencies.find(e => e.id === incidentId);
    
    if (!vehicle || !incident) return;
    if (vehicle.status !== VEHICLE_STATUS.AVAILABLE) return;
    
    // Calculate route using GPS-style routing
    const routeData = await calculateRoute(vehicle.position, incident.position);
    const route = routeData.coordinates;
    const routeDistance = routeData.distance / 1000; // Convert meters to km
    
    // Calculate travel time based on vehicle type and distance
    const vehicleConfig = VEHICLE_CONFIG[vehicle.type];
    const baseSpeed = 400; // 400 km/h base speed for testing
    const vehicleSpeed = baseSpeed * (vehicleConfig?.speed || 1.0);
    const travelTimeSeconds = Math.max(3, Math.round((routeDistance / vehicleSpeed) * 3600)); // Convert to seconds, minimum 3s

    // Update vehicle status with route information
    setVehicles(prev => prev.map(v => 
      v.id === vehicleId 
        ? {
            ...v,
            status: VEHICLE_STATUS.DISPATCHED,
            assignedIncidentId: incidentId,
            targetPosition: incident.position,
            departureTime: Date.now(),
            route: route,
            routeDistance: routeDistance,
            vehicleSpeed: vehicleSpeed,
            routeIndex: 0,
            currentPosition: vehicle.position,
            distanceTraveled: 0,
            responseTime: incident.responseTime || 3000 // Get response time from incident (3 seconds for testing)
          }
        : v
    ));

    // Update incident status
    setEmergencies(prev => prev.map(e => 
      e.id === incidentId 
        ? {
            ...e,
            assignedVehicleId: vehicleId,
            status: 'Responding',
            estimatedTime: travelTimeSeconds
          }
        : e
    ));
  };

  const cancelIncident = (emergencyId) => {
    setEmergencies(prev => prev.filter(e => e.id !== emergencyId));
  };

  const cancelVehicleDispatch = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    
    if (vehicle && (vehicle.status === VEHICLE_STATUS.DISPATCHED || vehicle.status === VEHICLE_STATUS.RETURNING)) {
      // Return vehicle to station
      const station = policeStations.find(s => s.id === vehicle.stationId);
      if (station) {
        // If vehicle is dispatched, start return journey
        if (vehicle.status === VEHICLE_STATUS.DISPATCHED) {
          const currentPos = vehicle.currentPosition || vehicle.position;
          calculateRoute(currentPos, station.position).then(routeData => {
            const returnRoute = routeData.coordinates;
            const returnDistance = routeData.distance / 1000; // Convert meters to km
            
            setVehicles(prev => prev.map(v => 
              v.id === vehicleId ? {
                ...v,
                status: VEHICLE_STATUS.RETURNING,
                route: returnRoute,
                routeDistance: returnDistance,
                departureTime: Date.now(),
                assignedIncidentId: null,
                currentPosition: currentPos,
                distanceTraveled: 0
              } : v
            ));
          });
        } else {
          // If already returning, just make it available immediately
          setVehicles(prev => prev.map(v => 
            v.id === vehicleId ? {
              ...v,
              status: VEHICLE_STATUS.AVAILABLE,
              route: null,
              routeDistance: null,
              vehicleSpeed: null,
              routeProgress: null,
              currentPosition: station.position,
              departureTime: null,
              distanceTraveled: null,
              assignedIncidentId: null
            } : v
          ));
        }
      }
    }
  };

  const resolveEmergency = (id) => {
    setEmergencies(prev => 
      prev.map(emergency => {
        if (emergency.id === id) {
          const resolvedIncident = { ...emergency, resolved: true, resolvedBy: 'Manual', resolvedAt: Date.now() };
          setResolvedIncidents(prevResolved => [...prevResolved, resolvedIncident]);
          // Manual resolve gets half the credit reward
          const creditReward = Math.floor((emergency.creditReward || 50) / 2);
          onScoreChange(creditReward);
          return resolvedIncident;
        }
        return emergency;
      })
    );
  };



  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
      <MapContainer 
        center={defaultCenter} 
        zoom={14} 
        style={{ 
          height: '100%', 
          width: '100%',
          cursor: isBuildingStation ? 'crosshair' : 'grab'
        }}
        ref={mapRef}
        whenCreated={setMapInstance => mapRef.current = setMapInstance}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {isBuildingStation && <MapClickHandler onMapClick={buildPoliceStation} isBuilding={isBuildingStation} />}
        
        {/* Police Stations */}
        {policeStations.map(station => {
          // const stationVehicles = vehicles.filter(v => v.stationId === station.id);
          return (
            <Marker 
              key={`station-${station.id}`} 
              position={station.position}
              icon={createPoliceStationIcon(station.level || 1)}
              eventHandlers={{
                click: () => {
                  console.log('Station clicked via eventHandlers:', station.id, station.name);
                  if (!isBuildingStation) {
                    setSelectedStation(station);
                  }
                }
              }}
            >
              <Popup>
                <div onClick={(e) => {
                  e.stopPropagation();
                  console.log('Station popup clicked:', station.id);
                  setSelectedStation(station);
                }}>
                  Click to manage {station.name}
                </div>
              </Popup>
            </Marker>
          );
        })}
        
        {/* Vehicle Markers - only show vehicles that are not at station and not on scene */}
        {vehicles.filter(vehicle => {
          // Hide vehicles that are ON_SCENE (working on incidents)
          if (vehicle.status === VEHICLE_STATUS.ON_SCENE) {
            return false;
          }
          
          // Hide vehicles that are available and at their station
          if (vehicle.status === VEHICLE_STATUS.AVAILABLE) {
            const station = policeStations.find(s => s.id === vehicle.stationId);
            if (station) {
              const currentPos = vehicle.currentPosition || vehicle.position;
              const atStation = currentPos[0] === station.position[0] && currentPos[1] === station.position[1];
              return !atStation; // Only show if NOT at station
            }
          }
          return true; // Show all other vehicles
        }).map(vehicle => {
          const position = vehicle.currentPosition || vehicle.position;
          // let iconColorName = 'green'; // Available - Green
          // 
          // if (vehicle.status === VEHICLE_STATUS.DISPATCHED) iconColorName = 'orange'; // Dispatched - Orange
          // if (vehicle.status === VEHICLE_STATUS.RETURNING) iconColorName = 'blue'; // Returning - Blue
          // if (vehicle.status === VEHICLE_STATUS.ON_SCENE) iconColorName = 'red'; // On Scene - Red
          
          
          // Create vehicle icon with growing border animation when on scene
          const createVehicleIcon = () => {
            const vehicleEmoji = getVehicleIcon(vehicle.type, vehicle.status);
            const showGrowingBorder = vehicle.status === VEHICLE_STATUS.ON_SCENE && vehicle.arrivedAt;
            
            if (showGrowingBorder) {
              const emergency = emergencies.find(e => e.id === vehicle.assignedIncidentId);
              const duration = emergency?.responseTime || 3000;
              const elapsed = Date.now() - vehicle.arrivedAt;
              const progress = Math.min((elapsed / duration) * 100, 100);
              
              return L.divIcon({
                html: `
                  <div style="
                    position: relative;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  ">
                    <div style="
                      position: absolute;
                      width: 100%;
                      height: 100%;
                      border-radius: 50%;
                      border: 3px solid transparent;
                      background: conic-gradient(#4CAF50 ${progress}%, transparent ${progress}%);
                      border-radius: 50%;
                      animation: rotate 2s linear infinite;
                    "></div>
                    <div style="
                      font-size: 20px; 
                      filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5));
                      z-index: 2;
                      position: relative;
                    ">
                      ${vehicleEmoji}
                    </div>
                  </div>
                  <style>
                    @keyframes rotate {
                      from { transform: rotate(0deg); }
                      to { transform: rotate(360deg); }
                    }
                  </style>
                `,
                iconSize: [40, 40],
                iconAnchor: [20, 20],
                popupAnchor: [0, -20],
                className: 'custom-div-icon'
              });
            }
            
            return L.divIcon({
              html: `
                <div style="text-align: center;">
                  <div style="font-size: 20px; filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5));">
                    ${vehicleEmoji}
                  </div>
                </div>
              `,
              iconSize: [30, 30],
              iconAnchor: [15, 15],
              popupAnchor: [0, -15],
              className: 'custom-div-icon'
            });
          };
          
          const customVehicleIcon = createVehicleIcon();
          
          return (
            <Marker 
              key={`vehicle-${vehicle.id}`} 
              position={position}
              icon={customVehicleIcon}
            >
              <Popup className="custom-popup">
                <div style={{ 
                  textAlign: 'center', 
                  minWidth: '180px',
                  backgroundColor: '#1a1a1a',
                  color: 'white',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid #333'
                }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#4CAF50' }}>{getVehicleIcon(vehicle.type)} {vehicle.name}</h3>
                  <p style={{ margin: '5px 0' }}>
                    <span style={{ color: '#888' }}>Status:</span> 
                    <span style={{ 
                      color: vehicle.status === VEHICLE_STATUS.AVAILABLE ? '#4CAF50' : 
                             vehicle.status === VEHICLE_STATUS.ON_SCENE ? '#f44336' : '#FF9800',
                      fontWeight: 'bold'
                    }}>{vehicle.status}</span>
                  </p>
                  <p style={{ margin: '5px 0' }}>
                    <span style={{ color: '#888' }}>Type:</span> <span style={{ color: '#fff' }}>{VEHICLE_CONFIG[vehicle.type]?.name}</span>
                  </p>
                  
                  {vehicle.status === VEHICLE_STATUS.DISPATCHED && vehicle.routeDistance && (
                    <div>
                      <p><strong>Progress:</strong> {Math.round((vehicle.routeProgress || 0) * 100)}%</p>
                      <p><strong>Distance Left:</strong> {((vehicle.routeDistance * (1 - (vehicle.routeProgress || 0)))).toFixed(1)}km</p>
                      <p><strong>ETA:</strong> {Math.ceil(((vehicle.routeDistance * (1 - (vehicle.routeProgress || 0))) / vehicle.vehicleSpeed) * 3600)}s</p>
                    </div>
                  )}
                  
                  {vehicle.status === VEHICLE_STATUS.ON_SCENE && vehicle.arrivedAt && (
                    <div>
                      <p><strong>On Scene</strong></p>
                      <p style={{ fontSize: '12px' }}>Resolving incident...</p>
                    </div>
                  )}
                  
                  {vehicle.status === VEHICLE_STATUS.RETURNING && vehicle.routeDistance && (
                    <div>
                      <p><strong>Returning to station</strong></p>
                      <p><strong>Progress:</strong> {Math.round((vehicle.routeProgress || 0) * 100)}%</p>
                      <p><strong>ETA:</strong> {Math.ceil(((vehicle.routeDistance * (1 - (vehicle.routeProgress || 0))) / vehicle.vehicleSpeed) * 3600)}s</p>
                    </div>
                  )}
                  
                  {vehicle.status === VEHICLE_STATUS.AVAILABLE && (
                    <p style={{ color: '#4CAF50', fontWeight: 'bold', marginTop: '10px' }}>Ready for dispatch</p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
        
        {/* Vehicle Routes */}
        {vehicles.map(vehicle => {
          if (vehicle.route && vehicle.route.length > 1 && (vehicle.status === VEHICLE_STATUS.DISPATCHED || vehicle.status === VEHICLE_STATUS.RETURNING)) {
            const routeColor = '#2196F3'; // Blue for all routes
            
            // Get the vehicle's exact current position
            const currentPos = vehicle.currentPosition || vehicle.position;
            
            // Simple approach: draw the full route in light color, then just the traveled portion in solid color
            const distanceTraveled = vehicle.distanceTraveled || 0;
            const routeDistance = vehicle.routeDistance || 1;
            const progress = Math.min(distanceTraveled / routeDistance, 1);
            
            // Find the exact point on the route where the vehicle should be
            let traveledRoute = [vehicle.route[0]]; // Start with origin
            
            if (progress > 0) {
              let accumulatedDistance = 0;
              let targetDistance = distanceTraveled;
              
              // Calculate distance-based route segments
              for (let i = 1; i < vehicle.route.length; i++) {
                const segmentStart = vehicle.route[i - 1];
                const segmentEnd = vehicle.route[i];
                
                // Calculate segment distance using same formula as movement
                const R = 6371; // Earth's radius in km
                const dLat = (segmentEnd[0] - segmentStart[0]) * Math.PI / 180;
                const dLng = (segmentEnd[1] - segmentStart[1]) * Math.PI / 180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                          Math.cos(segmentStart[0] * Math.PI / 180) * Math.cos(segmentEnd[0] * Math.PI / 180) *
                          Math.sin(dLng/2) * Math.sin(dLng/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                const segmentDistance = R * c;
                
                if (accumulatedDistance + segmentDistance >= targetDistance) {
                  // Vehicle is on this segment - add the exact position
                  traveledRoute.push(currentPos);
                  break;
                } else {
                  // Vehicle has passed this segment completely
                  traveledRoute.push(segmentEnd);
                  accumulatedDistance += segmentDistance;
                }
              }
            }
            
            return (
              <div key={`route-${vehicle.id}`}>
                {/* Full route - light dashed line */}
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
              </div>
            );
          }
          return null;
        })}
        
        {/* Emergencies - show all including recently resolved */}
        {emergencies.map(emergency => {
          const availableVehicles = vehicles.filter(v => v.status === VEHICLE_STATUS.AVAILABLE);
          const assignedVehicle = emergency.assignedVehicleId ? vehicles.find(v => v.id === emergency.assignedVehicleId) : null;
          
          return (
            <Marker 
              key={`emergency-${emergency.id}`} 
              position={emergency.position}
              icon={createEmergencyIcon(emergency, assignedVehicle)}
              ref={(ref) => {
                if (ref && openPopupId === emergency.id) {
                  ref.openPopup();
                  setOpenPopupId(null); // Reset after opening
                }
              }}
            >
              <Popup className="custom-popup">
                <div style={{ 
                  textAlign: 'left', 
                  minWidth: '350px',
                  backgroundColor: '#1a1a1a',
                  color: 'white',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #333'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                    <span style={{ fontSize: '24px', marginRight: '10px' }}>{emergency.icon || '🚨'}</span>
                    <div>
                      <h3 style={{ margin: 0, color: emergency.color || '#f44336' }}>
                        {emergency.displayName || emergency.type}
                      </h3>
                      <span style={{ 
                        fontSize: '11px', 
                        padding: '2px 8px', 
                        borderRadius: '12px',
                        backgroundColor: emergency.priority === 'high' ? '#f44336' : 
                                        emergency.priority === 'medium' ? '#FF9800' : '#4CAF50',
                        color: 'white',
                        textTransform: 'uppercase',
                        fontWeight: 'bold'
                      }}>
                        {emergency.priority || 'medium'} priority
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ 
                    backgroundColor: 'rgba(255,255,255,0.05)', 
                    padding: '10px', 
                    borderRadius: '6px',
                    marginBottom: '10px'
                  }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#888' }}>INCIDENT REPORT</p>
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5' }}>
                      {emergency.report || 'Emergency incident reported at this location'}
                    </p>
                  </div>
                  
                  <div style={{ marginBottom: '10px' }}>
                    <p style={{ margin: '3px 0', fontSize: '13px' }}>
                      <span style={{ color: '#888' }}>📍 Location:</span> 
                      <span style={{ color: '#fff' }}> {emergency.address?.full || 'Unknown location'}</span>
                    </p>
                    <p style={{ margin: '3px 0', fontSize: '13px' }}>
                      <span style={{ color: '#888' }}>📞 Caller:</span> 
                      <span style={{ color: '#fff' }}> {emergency.caller?.full || 'Anonymous'}</span>
                    </p>
                    <p style={{ margin: '3px 0', fontSize: '13px' }}>
                      <span style={{ color: '#888' }}>⏰ Time:</span> 
                      <span style={{ color: '#fff' }}> {emergency.timestamp}</span>
                    </p>
                    <p style={{ margin: '3px 0', fontSize: '13px' }}>
                      <span style={{ color: '#888' }}>🆔 Call ID:</span> 
                      <span style={{ color: '#fff' }}> #{emergency.id}</span>
                    </p>
                    <p style={{ margin: '3px 0', fontSize: '13px' }}>
                      <span style={{ color: '#888' }}>📊 Status:</span> 
                      <span style={{ 
                        color: emergency.resolved ? '#4CAF50' : '#FF9800', 
                        fontWeight: 'bold' 
                      }}>
                        {emergency.resolved ? 'Resolved' : emergency.assignedVehicleId ? 'Responding' : 'Awaiting Response'}
                      </span>
                    </p>
                  </div>
                  
                  {/* Vehicle-specific requirements */}
                  {emergency.isVehicleSpecific && emergency.vehicleRequirements && (
                    <div style={{ 
                      marginBottom: '10px', 
                      padding: '10px', 
                      backgroundColor: 'rgba(255, 152, 0, 0.1)', 
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 152, 0, 0.3)'
                    }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#FF9800', fontWeight: 'bold' }}>
                        ⚠️ SPECIAL UNIT REQUIRED
                      </p>
                      <p style={{ margin: '0', fontSize: '13px', color: '#fff' }}>
                        Required: {emergency.vehicleRequirements.requiredVehicles.map(v => {
                          const config = VEHICLE_CONFIG[v];
                          return `${getVehicleIcon(v)} ${config?.name || v}`;
                        }).join(', ')}
                      </p>
                      {emergency.vehicleRequirements.optionalVehicles?.length > 0 && (
                        <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#aaa' }}>
                          Optional: {emergency.vehicleRequirements.optionalVehicles.map(v => {
                            const config = VEHICLE_CONFIG[v];
                            return `${getVehicleIcon(v)} ${config?.name || v}`;
                          }).join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                  
                  
                  {/* Show assigned vehicle */}
                  {assignedVehicle && (
                    <div style={{ margin: '10px 0', padding: '8px', backgroundColor: 'rgba(76, 175, 80, 0.1)', borderRadius: '4px', border: '1px solid rgba(76, 175, 80, 0.3)' }}>
                      <p style={{ margin: '0', fontSize: '14px' }}>
                        <strong>Assigned:</strong> {getVehicleIcon(assignedVehicle.type, assignedVehicle.status)} {assignedVehicle.name}
                      </p>
                      {assignedVehicle.status === VEHICLE_STATUS.DISPATCHED && (
                        <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
                          En route...
                        </p>
                      )}
                      {assignedVehicle.status === VEHICLE_STATUS.ON_SCENE && assignedVehicle.arrivedAt && (
                        <div>
                          <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
                            On scene, resolving...
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!emergency.resolved && (
                    <div>
                      {!assignedVehicle ? (
                        <>
                          <h4 style={{ margin: '10px 0 5px 0', fontSize: '14px', color: '#FF9800' }}>Dispatch Vehicle</h4>
                          {availableVehicles.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {availableVehicles.slice(0, 3).map(vehicle => {
                                // Check if this is a vehicle-specific incident
                                let canHandle = true;
                                let isRequired = false;
                                let isOptional = false;
                                
                                if (emergency.isVehicleSpecific && emergency.vehicleRequirements) {
                                  isRequired = emergency.vehicleRequirements.requiredVehicles.includes(vehicle.type);
                                  isOptional = (emergency.vehicleRequirements.optionalVehicles || []).includes(vehicle.type);
                                  canHandle = isRequired || isOptional;
                                } else {
                                  // Use legacy capability checking for non-vehicle-specific incidents
                                  canHandle = canHandleIncident(vehicle.capabilities, emergency.type);
                                }
                                
                                const station = policeStations.find(s => s.id === vehicle.stationId);
                                
                                return (
                                  <button
                                    key={vehicle.id}
                                    onClick={() => dispatchVehicle(vehicle.id, emergency.id)}
                                    disabled={emergency.isVehicleSpecific && !canHandle}
                                    style={{
                                      backgroundColor: isRequired ? '#4CAF50' : (canHandle ? '#2196F3' : '#666'),
                                      color: 'white',
                                      border: 'none',
                                      padding: '6px 10px',
                                      borderRadius: '4px',
                                      cursor: canHandle ? 'pointer' : 'not-allowed',
                                      fontSize: '12px',
                                      textAlign: 'left',
                                      opacity: canHandle ? 1 : 0.6
                                    }}
                                    title={
                                      isRequired ? 'Required vehicle type' : 
                                      isOptional ? 'Optional vehicle type' :
                                      canHandle ? 'Suitable for this incident' : 
                                      'Cannot handle this incident'
                                    }
                                  >
                                    {getVehicleIcon(vehicle.type)} {vehicle.name}
                                    {isRequired && <span style={{ marginLeft: '5px' }}>✓</span>}
                                    <br />
                                    <span style={{ fontSize: '10px', opacity: 0.8 }}>
                                      from {station?.name || 'Unknown'}
                                    </span>
                                  </button>
                                );
                              })}
                              
                              {availableVehicles.length > 3 && (
                                <p style={{ fontSize: '11px', color: '#666', margin: '5px 0 0 0' }}>
                                  +{availableVehicles.length - 3} more vehicles available
                                </p>
                              )}
                            </div>
                          ) : (
                            <p style={{ color: '#f44336', fontSize: '12px', padding: '10px', backgroundColor: 'rgba(244, 67, 54, 0.1)', borderRadius: '4px', border: '1px solid rgba(244, 67, 54, 0.3)' }}>
                              No vehicles available. Purchase vehicles at stations to respond.
                            </p>
                          )}
                          
                          {/* Show missing vehicles for vehicle-specific incidents */}
                          {emergency.isVehicleSpecific && availableVehicles.length > 0 && (
                            (() => {
                              const missingVehicles = getMissingVehicles(emergency, availableVehicles);
                              const hasRequiredVehicles = emergency.vehicleRequirements.requiredVehicles.some(reqType => 
                                availableVehicles.some(v => v.type === reqType)
                              );
                              
                              if (!hasRequiredVehicles && missingVehicles.length > 0) {
                                return (
                                  <div style={{ 
                                    marginTop: '8px',
                                    padding: '8px',
                                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(255, 152, 0, 0.3)'
                                  }}>
                                    <p style={{ margin: 0, fontSize: '11px', color: '#FF9800' }}>
                                      ⚠️ Missing required vehicles: {missingVehicles.map(v => {
                                        const config = VEHICLE_CONFIG[v];
                                        return `${getVehicleIcon(v)} ${config?.name || v}`;
                                      }).join(', ')}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            })()
                          )}
                        </>
                      ) : (
                        <div>
                          <p style={{ color: '#2196F3', fontSize: '12px', marginBottom: '8px' }}>
                            Unit responding...
                          </p>
                          <button 
                            onClick={() => cancelVehicleDispatch(assignedVehicle.id)}
                            style={{
                              backgroundColor: '#FF9800',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              width: '100%'
                            }}
                          >
                            Cancel Dispatch
                          </button>
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <button 
                          onClick={() => resolveEmergency(emergency.id)}
                          style={{
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            flex: 1
                          }}
                        >
                          Manual Resolve (+${Math.floor((emergency.creditReward || 50) / 2)})
                        </button>
                        <button 
                          onClick={() => cancelIncident(emergency.id)}
                          style={{
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            flex: 1
                          }}
                        >
                          Cancel Incident
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {emergency.resolved && (
                    <p style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: '16px', marginTop: '10px' }}>Resolved ✓</p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Control Panel - Updated UI matching the image */}
      <div style={{
        position: 'absolute',
        left: '10px',
        top: '10px',
        bottom: '10px',
        width: '300px',
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(180deg, #2a2a2a 0%, #1f1f1f 100%)',
          padding: '20px',
          borderBottom: '1px solid #333',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-20%',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />
          <h2 style={{ margin: 0, color: 'white', fontSize: '20px', fontWeight: '600', letterSpacing: '0.5px' }}>
            🚔 Emergency Command
          </h2>
          <div style={{ 
            fontSize: '32px', 
            color: '#4CAF50', 
            marginTop: '8px',
            fontWeight: 'bold',
            textShadow: '0 0 20px rgba(76, 175, 80, 0.5)'
          }}>
            ${money.toLocaleString()}
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#888', 
            marginTop: '4px' 
          }}>
            Available Budget
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '10px',
            fontSize: '11px',
            color: '#aaa'
          }}>
            <span>Level {playerLevel}</span>
            <span>Max Incidents: {getMaxConcurrentIncidents(policeStations.length)}</span>
          </div>
        </div>
        
        {/* Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: '#2a2a2a',
          borderBottom: '1px solid #333'
        }}>
          {['Active Incidents', 'Stations', 'Traffic Archive'].map((tab, index) => (
            <div 
              key={tab} 
              onClick={() => setActiveTab(index)}
              style={{
                flex: 1,
                padding: '10px',
                textAlign: 'center',
                color: index === activeTab ? '#4CAF50' : '#888',
                borderBottom: index === activeTab ? '2px solid #4CAF50' : 'none',
                cursor: 'pointer',
                fontSize: '12px',
                transition: 'all 0.3s ease',
                backgroundColor: index === activeTab ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
              }}>
              {tab} {index === 0 && `(${emergencies.filter(e => !e.resolved).length})`}
              {index === 1 && `(${policeStations.length})`}
              {index === 2 && `(${resolvedIncidents.length})`}
            </div>
          ))}
        </div>
        
        {/* Content Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px'
        }}>
          {/* Active Incidents Tab */}
          {activeTab === 0 && emergencies.map(emergency => {
            const assignedVehicle = emergency.assignedVehicleId ? 
              vehicles.find(v => v.id === emergency.assignedVehicleId) : null;
            
            // Determine status color (same logic as map icons)
            let statusColor;
            if (emergency.resolved) {
              statusColor = '#4CAF50'; // Green for completed
            } else if (assignedVehicle && assignedVehicle.status === VEHICLE_STATUS.ON_SCENE) {
              statusColor = '#FF9800'; // Orange for active work
            } else {
              statusColor = '#f44336'; // Red for unattended/dispatched
            }
            
            return (
              <div key={emergency.id} style={{
                backgroundColor: '#2a2a2a',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '8px',
                border: `2px solid ${statusColor}`,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                transition: 'transform 0.2s ease',
                cursor: 'pointer'
              }}
              onClick={() => {
                setOpenPopupId(emergency.id);
                // Don't zoom to incident location - keep camera where it is
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{emergency.icon || '🚨'}</span>
                      <div style={{ 
                        color: emergency.color || '#ff5252', 
                        fontSize: '14px', 
                        fontWeight: 'bold' 
                      }}>
                        {emergency.displayName || emergency.type}
                      </div>
                    </div>
                    <div style={{ color: '#888', fontSize: '11px', marginTop: '4px' }}>
                      📍 {emergency.address?.full || 'Unknown location'}
                    </div>
                    <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>
                      {emergency.timestamp} • ID: #{emergency.id}
                    </div>
                  </div>
                  <span style={{ 
                    fontSize: '10px', 
                    padding: '2px 6px', 
                    borderRadius: '10px',
                    backgroundColor: statusColor,
                    color: 'white',
                    textTransform: 'uppercase',
                    fontWeight: 'bold'
                  }}>
                    {emergency.resolved ? 'COMPLETED' :
                     assignedVehicle && assignedVehicle.status === VEHICLE_STATUS.ON_SCENE ? 'ACTIVE' :
                     emergency.assignedVehicleId ? 'DISPATCHED' : 
                     'URGENT'}
                  </span>
                </div>
                
                {assignedVehicle && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '4px',
                    fontSize: '11px',
                    border: `1px solid ${statusColor}`
                  }}>
                    <div style={{ 
                      color: statusColor, 
                      fontWeight: 'bold', 
                      marginBottom: assignedVehicle.status === VEHICLE_STATUS.ON_SCENE ? '4px' : '0'
                    }}>
                      {getVehicleIcon(assignedVehicle.type)} {assignedVehicle.name} - {assignedVehicle.status}
                    </div>
                    {assignedVehicle.status === VEHICLE_STATUS.ON_SCENE && assignedVehicle.arrivedAt && (
                      <div>
                        <div style={{ fontSize: '10px', color: '#888', marginBottom: '2px' }}>
                          Resolving incident...
                        </div>
                      </div>
                    )}
                    {assignedVehicle.status === VEHICLE_STATUS.DISPATCHED && (
                      <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
                        En route to incident...
                      </div>
                    )}
                  </div>
                )}
                
                {/* Dispatch buttons for unassigned incidents */}
                {!assignedVehicle && !emergency.resolved && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '4px',
                    border: '1px solid #444'
                  }}>
                    <div style={{ 
                      fontSize: '10px', 
                      color: '#888', 
                      marginBottom: '6px',
                      fontWeight: 'bold'
                    }}>
                      DISPATCH UNIT:
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {vehicles
                        .filter(v => v.status === VEHICLE_STATUS.AVAILABLE && canHandleIncident(v.type, emergency.type))
                        .slice(0, 3) // Show max 3 available units
                        .map(vehicle => (
                          <button
                            key={vehicle.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatchVehicle(vehicle.id, emergency.id);
                            }}
                            style={{
                              padding: '6px 12px',
                              fontSize: '11px',
                              backgroundColor: '#4CAF50',
                              color: 'white',
                              border: '1px solid #45a049',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              fontWeight: 'bold',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#45a049';
                              e.target.style.transform = 'translateY(-1px)';
                              e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = '#4CAF50';
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                            }}
                          >
                            <span style={{ fontSize: '12px' }}>{getVehicleIcon(vehicle.type)}</span>
                            <span>Unit {vehicle.id}</span>
                          </button>
                        ))}
                      {vehicles.filter(v => v.status === VEHICLE_STATUS.AVAILABLE && canHandleIncident(v.type, emergency.type)).length === 0 && (
                        <div style={{ fontSize: '10px', color: '#ff5252', fontStyle: 'italic' }}>
                          No available units for this incident type
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
              </div>
            );
          })}
          
          {/* Stations Tab */}
          {activeTab === 1 && (
            <div>
              {policeStations.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#888', 
                  marginTop: '50px',
                  fontSize: '14px' 
                }}>
                  No police stations built yet
                  <br />
                  <span style={{ fontSize: '12px', marginTop: '10px', display: 'block' }}>
                    Click the 🏛️ button to build your first station
                  </span>
                </div>
              ) : (
                policeStations.map(station => {
                  const stationVehicles = vehicles.filter(v => v.stationId === station.id);
                  return (
                    <div key={station.id} style={{
                      backgroundColor: '#2a2a2a',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '8px',
                      border: '1px solid #333',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      transition: 'transform 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setSelectedStation(station);
                      // Scroll map to station location
                      if (mapRef.current) {
                        mapRef.current.flyTo(station.position, 16);
                      }
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '20px' }}>{STATION_LEVELS[station.level || 1].icon}</span>
                            <div style={{ 
                              color: '#4CAF50', 
                              fontSize: '16px', 
                              fontWeight: 'bold' 
                            }}>
                              {station.name}
                            </div>
                            <span style={{ 
                              fontSize: '10px', 
                              padding: '2px 6px', 
                              borderRadius: '10px',
                              backgroundColor: '#4CAF50',
                              color: 'white',
                              fontWeight: 'bold'
                            }}>
                              Level {station.level || 1}
                            </span>
                          </div>
                          <div style={{ color: '#888', fontSize: '11px', marginTop: '4px' }}>
                            📍 Lat: {station.position[0].toFixed(4)}, Lng: {station.position[1].toFixed(4)}
                          </div>
                          <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>
                            🚔 {stationVehicles.length}/{calculateStationCapacity(station).maxVehicles} vehicles • 
                            🅿️ {calculateStationCapacity(station).parkingSpaces} parking • 
                            👥 {station.staff || 6}/{calculateStationCapacity(station).maxStaff} staff
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
          
          {/* Traffic Archive Tab */}
          {activeTab === 2 && (
            <div>
              {resolvedIncidents.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#888', 
                  marginTop: '50px',
                  fontSize: '14px' 
                }}>
                  No resolved incidents yet
                </div>
              ) : (
                resolvedIncidents.slice(-20).reverse().map(incident => (
                  <div key={incident.id} style={{
                    backgroundColor: '#2a2a2a',
                    borderRadius: '6px',
                    padding: '10px',
                    marginBottom: '6px',
                    border: '1px solid #333',
                    opacity: 0.7
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ color: '#4CAF50', fontSize: '13px', fontWeight: 'bold' }}>
                          {incident.type} ✓
                        </div>
                        <div style={{ color: '#888', fontSize: '10px', marginTop: '2px' }}>
                          {incident.timestamp} • Resolved by {incident.resolvedBy}
                        </div>
                      </div>
                      <div style={{ color: '#4CAF50', fontSize: '12px' }}>+${incident.creditReward || 75}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          
          {/* Reports Tab */}
          {activeTab === 2 && (
            <div style={{ padding: '20px' }}>
              <div style={{
                backgroundColor: '#2a2a2a',
                borderRadius: '8px',
                padding: '20px',
                border: '1px solid #333'
              }}>
                <h3 style={{ color: 'white', marginTop: 0, marginBottom: '20px', fontSize: '16px' }}>Performance Report</h3>
                
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ color: '#888', fontSize: '12px', marginBottom: '5px' }}>Response Rate</div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ flex: 1, height: '8px', backgroundColor: '#1a1a1a', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${resolvedIncidents.length > 0 ? Math.min((resolvedIncidents.length / (resolvedIncidents.length + emergencies.filter(e => !e.resolved).length)) * 100, 100) : 0}%`,
                        height: '100%',
                        backgroundColor: '#4CAF50',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    <div style={{ marginLeft: '10px', color: 'white', fontSize: '14px' }}>
                      {resolvedIncidents.length > 0 ? Math.round((resolvedIncidents.length / (resolvedIncidents.length + emergencies.filter(e => !e.resolved).length)) * 100) : 0}%
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
                  <div>
                    <div style={{ color: '#888', fontSize: '12px' }}>Total Incidents</div>
                    <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
                      {resolvedIncidents.length + emergencies.length}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#888', fontSize: '12px' }}>Revenue Earned</div>
                    <div style={{ color: '#4CAF50', fontSize: '20px', fontWeight: 'bold' }}>
                      ${resolvedIncidents.reduce((sum, inc) => sum + (inc.creditReward || 75), 0)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#888', fontSize: '12px' }}>Active Units</div>
                    <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
                      {vehicles.filter(v => v.status !== VEHICLE_STATUS.AVAILABLE).length}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#888', fontSize: '12px' }}>Avg Response Time</div>
                    <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
                      {vehicles.length > 0 ? '45s' : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Stats Bar */}
        <div style={{
          backgroundColor: '#2a2a2a',
          padding: '10px',
          borderTop: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-around',
          fontSize: '12px',
          color: '#888'
        }}>
          <div>
            <div style={{ color: 'white', fontSize: '16px' }}>{policeStations.length}</div>
            <div>Stations</div>
          </div>
          <div>
            <div style={{ color: 'white', fontSize: '16px' }}>{vehicles.length}</div>
            <div>Vehicles</div>
          </div>
          <div>
            <div style={{ color: 'white', fontSize: '16px' }}>{emergencies.filter(e => e.resolved).length}</div>
            <div>Resolved</div>
          </div>
        </div>
      </div>
      
      {/* Action Buttons Container */}
      <div style={{
        position: 'absolute',
        bottom: '100px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 1000
      }}>
        {/* Build Station Button */}
        <button 
          onClick={() => setIsBuildingStation(!isBuildingStation)}
          style={{
            backgroundColor: isBuildingStation ? '#f44336' : '#2a2a2a',
            color: 'white',
            border: '2px solid ' + (isBuildingStation ? '#f44336' : money >= 1000 ? '#4CAF50' : '#666'),
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            fontSize: '24px',
            cursor: money >= 1000 ? 'pointer' : 'not-allowed',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            opacity: money >= 1000 ? 1 : 0.5,
            transform: 'scale(1)'
          }}
          onMouseEnter={(e) => money >= 1000 && (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title={isBuildingStation ? 'Cancel building' : `Build police station ($1000) - ${money >= 1000 ? 'Click map to place' : 'Need more money'}`}
          disabled={money < 1000 && !isBuildingStation}
        >
          {isBuildingStation ? '❌' : '🏛️'}
        </button>
        
        {/* Manual Spawn Button */}
        <button
          onClick={manualSpawnEmergency}
          style={{
            backgroundColor: '#2a2a2a',
            color: 'white',
            border: '2px solid #FF9800',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            fontSize: '20px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            transform: 'scale(1)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title="Spawn test emergency"
        >
          😨
        </button>
      </div>
      
      {/* Build station helper text */}
      {isBuildingStation && (
        <div style={{
          position: 'absolute',
          bottom: '180px',
          right: '90px',
          backgroundColor: 'rgba(26, 26, 26, 0.95)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          border: '1px solid #4CAF50',
          animation: isBuildingStation ? 'pulse 2s infinite' : 'none'
        }}>
          👆 Click on the map to place station
          <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Cost: $1000</div>
        </div>
      )}

      {/* Welcome Message for New Users */}
      {policeStations.length === 0 && !isBuildingStation && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(26, 26, 26, 0.95)',
          color: 'white',
          padding: '30px',
          borderRadius: '12px',
          textAlign: 'center',
          border: '2px solid #4CAF50',
          boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
          zIndex: 1500,
          maxWidth: '400px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏛️</div>
          <h2 style={{ margin: '0 0 15px 0', color: '#4CAF50', fontSize: '24px' }}>Welcome to Emergency Command!</h2>
          <p style={{ margin: '0 0 20px 0', fontSize: '16px', lineHeight: '1.4', color: '#ccc' }}>
            To get started, build your first police station by clicking the building button in the bottom right corner.
          </p>
          <p style={{ margin: '0', fontSize: '14px', color: '#888' }}>
            You have <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>${money.toLocaleString()}</span> to spend • Station cost: $1,000
          </p>
        </div>
      )}

      {/* Station Management Drawer */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        bottom: '10px',
        width: '380px',
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: selectedStation ? 'flex' : 'none',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {selectedStation && (
          <>
            {/* Drawer Header */}
            <div style={{
              background: 'linear-gradient(180deg, #2a2a2a 0%, #1f1f1f 100%)',
              padding: '20px',
              borderBottom: '1px solid #333',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, color: '#4CAF50', fontSize: '18px' }}>
                    {STATION_LEVELS[selectedStation.level || 1].icon} {selectedStation.name}
                  </h3>
                  <span style={{ 
                    backgroundColor: '#4CAF50', 
                    color: 'white', 
                    padding: '3px 8px', 
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    Level {selectedStation.level || 1}
                  </span>
                </div>
                <p style={{ margin: '6px 0 0 0', color: '#888', fontSize: '12px' }}>
                  {STATION_LEVELS[selectedStation.level || 1].description}
                </p>
              </div>
              <button 
                onClick={() => setSelectedStation(null)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#888',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '0',
                  lineHeight: '1'
                }}
              >
                ×
              </button>
            </div>
            
            {/* Drawer Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {(() => {
                const stationVehicles = vehicles.filter(v => v.stationId === selectedStation.id);
                return (
                  <>
                    {/* Station Stats */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr 1fr', 
                      gap: '8px',
                      marginBottom: '20px'
                    }}>
                      <div style={{ 
                        backgroundColor: '#2a2a2a', 
                        padding: '12px', 
                        borderRadius: '6px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '18px', color: '#4CAF50', fontWeight: 'bold' }}>
                          {stationVehicles.length}/{calculateStationCapacity(selectedStation).maxVehicles}
                        </div>
                        <div style={{ fontSize: '10px', color: '#888' }}>Vehicles</div>
                      </div>
                      <div style={{ 
                        backgroundColor: '#2a2a2a', 
                        padding: '12px', 
                        borderRadius: '6px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '18px', color: '#FF9800', fontWeight: 'bold' }}>
                          {calculateStationCapacity(selectedStation).parkingSpaces}
                        </div>
                        <div style={{ fontSize: '10px', color: '#888' }}>Parking</div>
                      </div>
                      <div style={{ 
                        backgroundColor: '#2a2a2a', 
                        padding: '12px', 
                        borderRadius: '6px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '18px', color: '#2196F3', fontWeight: 'bold' }}>
                          {selectedStation.staff || 6}/{calculateStationCapacity(selectedStation).maxStaff}
                        </div>
                        <div style={{ fontSize: '10px', color: '#888' }}>Staff</div>
                      </div>
                    </div>
                    
                    {/* Purchase Vehicles */}
                    {stationVehicles.length < calculateStationCapacity(selectedStation).maxVehicles && (
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#FF9800' }}>Purchase Vehicle</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <button 
                            onClick={() => {
                              purchaseVehicle(selectedStation.id, VEHICLE_TYPES.PATROL_CAR);
                            }}
                            disabled={money < VEHICLE_CONFIG[VEHICLE_TYPES.PATROL_CAR].cost}
                            style={{
                              backgroundColor: money >= VEHICLE_CONFIG[VEHICLE_TYPES.PATROL_CAR].cost ? '#2196F3' : '#666',
                              color: 'white',
                              border: 'none',
                              padding: '10px 12px',
                              borderRadius: '6px',
                              cursor: money >= VEHICLE_CONFIG[VEHICLE_TYPES.PATROL_CAR].cost ? 'pointer' : 'not-allowed',
                              fontSize: '13px',
                              fontWeight: '500'
                            }}
                          >
                            🚔 Patrol Car (${VEHICLE_CONFIG[VEHICLE_TYPES.PATROL_CAR].cost})
                          </button>
                          
                          <button 
                            onClick={() => {
                              purchaseVehicle(selectedStation.id, VEHICLE_TYPES.MOTORCYCLE);
                            }}
                            disabled={money < VEHICLE_CONFIG[VEHICLE_TYPES.MOTORCYCLE].cost}
                            style={{
                              backgroundColor: money >= VEHICLE_CONFIG[VEHICLE_TYPES.MOTORCYCLE].cost ? '#607D8B' : '#666',
                              color: 'white',
                              border: 'none',
                              padding: '10px 12px',
                              borderRadius: '6px',
                              cursor: money >= VEHICLE_CONFIG[VEHICLE_TYPES.MOTORCYCLE].cost ? 'pointer' : 'not-allowed',
                              fontSize: '13px',
                              fontWeight: '500'
                            }}
                          >
                            🏍️ Motorcycle (${VEHICLE_CONFIG[VEHICLE_TYPES.MOTORCYCLE].cost})
                          </button>
                          
                          <button 
                            onClick={() => {
                              purchaseVehicle(selectedStation.id, VEHICLE_TYPES.K9_UNIT);
                            }}
                            disabled={money < VEHICLE_CONFIG[VEHICLE_TYPES.K9_UNIT].cost}
                            style={{
                              backgroundColor: money >= VEHICLE_CONFIG[VEHICLE_TYPES.K9_UNIT].cost ? '#4CAF50' : '#666',
                              color: 'white',
                              border: 'none',
                              padding: '10px 12px',
                              borderRadius: '6px',
                              cursor: money >= VEHICLE_CONFIG[VEHICLE_TYPES.K9_UNIT].cost ? 'pointer' : 'not-allowed',
                              fontSize: '13px',
                              fontWeight: '500'
                            }}
                          >
                            🐕‍🦺 K9 Unit (${VEHICLE_CONFIG[VEHICLE_TYPES.K9_UNIT].cost})
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Vehicle List */}
                    {stationVehicles.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#FF9800' }}>Fleet Status</h4>
                        <div style={{ 
                          backgroundColor: '#2a2a2a', 
                          borderRadius: '6px',
                          overflow: 'hidden'
                        }}>
                          {stationVehicles.map((vehicle, index) => (
                            <div key={vehicle.id} style={{ 
                              fontSize: '12px', 
                              padding: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              borderBottom: index < stationVehicles.length - 1 ? '1px solid #333' : 'none'
                            }}>
                              <span style={{ color: 'white' }}>{getVehicleIcon(vehicle.type)} {vehicle.name}</span>
                              <span style={{ 
                                fontSize: '10px',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                backgroundColor: 
                                  vehicle.status === VEHICLE_STATUS.AVAILABLE ? '#4CAF50' :
                                  vehicle.status === VEHICLE_STATUS.DISPATCHED ? '#FF9800' :
                                  vehicle.status === VEHICLE_STATUS.ON_SCENE ? '#f44336' :
                                  vehicle.status === VEHICLE_STATUS.RETURNING ? '#2196F3' : '#888',
                                color: 'white',
                                fontWeight: 'bold'
                              }}>
                                {vehicle.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {stationVehicles.length >= calculateStationCapacity(selectedStation).maxVehicles && (
                      <div style={{ 
                        backgroundColor: 'rgba(244, 67, 54, 0.1)', 
                        border: '1px solid rgba(244, 67, 54, 0.3)',
                        padding: '12px',
                        borderRadius: '6px',
                        textAlign: 'center'
                      }}>
                        <p style={{ color: '#f44336', fontSize: '12px', margin: 0, fontWeight: 'bold' }}>
                          ⚠️ Station at maximum capacity
                        </p>
                        <p style={{ color: '#aaa', fontSize: '11px', margin: '4px 0 0 0' }}>
                          Upgrade station or purchase parking expansion
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </>
        )}
      </div>
      
      <style>{`
        @keyframes pulse {
          0% { border-color: #4CAF50; }
          50% { border-color: #81C784; }
          100% { border-color: #4CAF50; }
        }
        
        .leaflet-popup-content-wrapper {
          background-color: transparent !important;
          padding: 0 !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
        }
        
        .leaflet-popup-content {
          margin: 0 !important;
          padding: 0 !important;
        }
        
        .leaflet-popup-tip {
          background-color: #1a1a1a !important;
          border: 1px solid #333 !important;
        }
        
        .emergency-button-icon {
          background: none !important;
          border: none !important;
        }
        
        .emergency-button-icon > div:hover {
          transform: scale(1.1);
        }
        
        .custom-div-icon {
          background: none !important;
          border: none !important;
          pointer-events: auto !important;
        }
        
        .leaflet-marker-shadow {
          display: none !important;
        }
        
        .leaflet-div-icon {
          background: none !important;
          border: none !important;
        }
        
        .leaflet-marker-icon {
          background: none !important;
          border: none !important;
        }
        
        .leaflet-marker-pane img {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

export default MapComponent;