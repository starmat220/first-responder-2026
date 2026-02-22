import { useEffect, useRef } from 'react';
import { generateIncident, getIncidentSpawnRate, getMaxConcurrentIncidents } from '../utils/incidentGeneratorV2';
import { getRandomMapPoint } from '../utils/mapHelpers';
import { VEHICLE_STATUS } from '../vehicleConfig';

export const useIncidentSpawning = (
  policeStations, 
  playerLevel, 
  defaultCenter, 
  emergencies, 
  vehicles, 
  setEmergencies, 
  setNextEmergencyId
) => {
  const emergenciesRef = useRef([]);
  const vehiclesRef = useRef([]);
  
  // Keep refs updated
  emergenciesRef.current = emergencies;
  vehiclesRef.current = vehicles;

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
  }, [policeStations, playerLevel, defaultCenter, setEmergencies, setNextEmergencyId]);
};