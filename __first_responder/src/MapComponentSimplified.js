import { MapContainer, TileLayer } from 'react-leaflet';
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

// Import extracted marker components
import VehicleMarkers from './components/VehicleMarkers';
import EmergencyMarkers from './components/EmergencyMarkers';
import StationMarkers from './components/StationMarkers';

// Import custom hooks
import { useVehicleMovement } from './hooks/useVehicleMovement';
import { useIncidentSpawning } from './hooks/useIncidentSpawning';
import { useVehicleReturnRoutes } from './hooks/useVehicleReturnRoutes';

// Fix for default marker icons in webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: null, // Remove shadow to prevent duplicate icons
});

function MapComponentSimplified({ onScoreChange, money, onSpendMoney, gameData, onGameDataUpdate }) {
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
  const [selectedStation, setSelectedStation] = useState(null);
  const [playerLevel, setPlayerLevel] = useState(1);
  const mapRef = useRef(null);
  
  const defaultCenter = useMemo(() => [45.8497, -66.4758], []); // Oromocto, New Brunswick
  
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

  // Use custom hooks for game logic
  useVehicleMovement(vehicles, setVehicles, policeStations, setEmergencies, onScoreChange, setResolvedIncidents);
  useIncidentSpawning(policeStations, playerLevel, defaultCenter, emergencies, vehicles, setEmergencies, setNextEmergencyId);
  useVehicleReturnRoutes(vehicles, policeStations, setVehicles);

  // Game functions
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
        staff: 6,
        maxVehicles: 3,
        createdAt: Date.now()
      };
      
      const updatedStations = [...policeStations, newStation];
      
      setPoliceStations(updatedStations);
      setNextStationId(prev => prev + 1);
      setIsBuildingStation(false);
      onSpendMoney(stationCost);
      
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

  const dispatchVehicle = async (vehicleId, incidentId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    const incident = emergencies.find(e => e.id === incidentId);
    
    if (!vehicle || !incident) return;
    if (vehicle.status !== VEHICLE_STATUS.AVAILABLE) return;
    
    const routeData = await calculateRoute(vehicle.position, incident.position);
    const route = routeData.coordinates;
    const routeDistance = routeData.distance / 1000;
    
    const vehicleConfig = VEHICLE_CONFIG[vehicle.type];
    const baseSpeed = 400;
    const vehicleSpeed = baseSpeed * (vehicleConfig?.speed || 1.0);
    const travelTimeSeconds = Math.max(3, Math.round((routeDistance / vehicleSpeed) * 3600));

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
            responseTime: incident.responseTime || 3000
          }
        : v
    ));

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

  const resolveEmergency = (emergencyId) => {
    const emergency = emergencies.find(e => e.id === emergencyId);
    if (emergency) {
      setEmergencies(prev => prev.map(e => 
        e.id === emergencyId 
          ? { ...e, resolved: true, resolvedAt: Date.now() }
          : e
      ));
      
      setResolvedIncidents(prev => [...prev, {
        ...emergency,
        resolvedAt: Date.now(),
        credits: 50
      }]);
      
      if (onScoreChange) {
        onScoreChange(50);
      }
      
      setTimeout(() => {
        setEmergencies(prev => prev.filter(e => e.id !== emergencyId));
      }, 2000);
    }
  };

  const cancelVehicleDispatch = async (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle || vehicle.status === VEHICLE_STATUS.AVAILABLE) return;
    
    const station = policeStations.find(s => s.id === vehicle.stationId);
    if (!station) return;
    
    const routeData = await calculateRoute(vehicle.currentPosition, station.position);
    
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

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {isBuildingStation && <MapClickHandler onMapClick={buildPoliceStation} isBuilding={isBuildingStation} />}
        
        <StationMarkers 
          policeStations={policeStations}
          vehicles={vehicles}
          onStationClick={setSelectedStation}
        />
        
        <VehicleMarkers 
          vehicles={vehicles}
          emergencies={emergencies}
          onCancelVehicleDispatch={cancelVehicleDispatch}
        />
        
        <EmergencyMarkers 
          emergencies={emergencies}
          vehicles={vehicles}
          policeStations={policeStations}
          openPopupId={openPopupId}
          onDispatchVehicle={dispatchVehicle}
          onCancelIncident={cancelIncident}
          onResolveEmergency={resolveEmergency}
        />
      </MapContainer>
      
      {/* Build Station Button */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        zIndex: 1000
      }}>
        <button
          onClick={() => setIsBuildingStation(!isBuildingStation)}
          disabled={money < 1000}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: isBuildingStation ? '#f44336' : '#4CAF50',
            color: 'white',
            border: money >= 1000 ? '3px solid #388E3C' : '3px solid #ccc',
            fontSize: '24px',
            cursor: money >= 1000 ? 'pointer' : 'not-allowed',
            opacity: money >= 1000 ? 1 : 0.6,
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease'
          }}
          title={isBuildingStation ? 'Cancel Building ($1000)' : `Build Station ($1000)`}
        >
          {isBuildingStation ? '❌' : '🏛️'}
        </button>
      </div>
    </div>
  );
}

export default MapComponentSimplified;