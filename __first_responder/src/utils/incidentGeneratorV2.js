// Enhanced incident generator with progression system
import { INCIDENT_TYPES, INCIDENT_CONFIGS, getAvailableIncidents, getIncidentPriorityChance } from '../config/incidents';
import { getRandomIncidentReport } from '../config/incidentReports';
import { getCallerInfo } from '../config/fakeNames';
import { generateVehicleIncident } from '../config/vehicleIncidents';

// Generate a unique incident ID
let incidentCounter = Date.now();
export const generateIncidentId = () => {
  return `INC-${incidentCounter++}-${Math.random().toString(36).substring(2, 9)}`;
};

// Get real address from coordinates using OpenStreetMap Nominatim
export const getAddressFromCoordinates = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'PoliceCommandCenter/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Geocoding failed');
    }
    
    const data = await response.json();
    
    if (data && data.address) {
      const addr = data.address;
      const streetNumber = addr.house_number || Math.floor(Math.random() * 999) + 1;
      const streetName = addr.road || addr.street || addr.suburb || 'Main Street';
      const city = addr.city || addr.town || addr.village || addr.municipality || 'Oromocto';
      const state = addr.state || 'New Brunswick';
      
      return {
        full: `${streetNumber} ${streetName}, ${city}, ${state}`,
        street: streetName,
        number: streetNumber,
        city: city,
        state: state,
        raw: addr
      };
    }
  } catch (error) {
    console.error('Error getting address:', error);
  }
  
  // Fallback if API fails
  const streetNames = ['Main Street', 'Elm Street', 'Oak Avenue', 'Maple Road', 'Pine Boulevard', 
                       'Cedar Lane', 'Park Drive', 'Church Street', 'First Avenue', 'Second Avenue'];
  const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
  const streetNumber = Math.floor(Math.random() * 999) + 1;
  
  return {
    full: `${streetNumber} ${streetName}, Oromocto, NB`,
    street: streetName,
    number: streetNumber,
    city: 'Oromocto',
    state: 'New Brunswick'
  };
};

// Choose incident type based on player level and priority
export const chooseIncidentType = (playerLevel) => {
  const availableIncidents = getAvailableIncidents(playerLevel);
  const priorityChances = getIncidentPriorityChance(playerLevel);
  
  // Roll for priority
  const roll = Math.random();
  let chosenPriority;
  
  if (roll < priorityChances.low) {
    chosenPriority = 'low';
  } else if (roll < priorityChances.low + priorityChances.medium) {
    chosenPriority = 'medium';
  } else if (roll < priorityChances.low + priorityChances.medium + priorityChances.high) {
    chosenPriority = 'high';
  } else {
    chosenPriority = 'critical';
  }
  
  // Filter available incidents by chosen priority
  const priorityIncidents = availableIncidents.filter(type => {
    const config = INCIDENT_CONFIGS[type];
    return config && config.priority === chosenPriority;
  });
  
  // If no incidents of chosen priority, fallback to any available
  if (priorityIncidents.length === 0) {
    return availableIncidents[Math.floor(Math.random() * availableIncidents.length)];
  }
  
  return priorityIncidents[Math.floor(Math.random() * priorityIncidents.length)];
};

// Generate a complete incident
export const generateIncident = async (position, playerLevel = 1, availableVehicleTypes = []) => {
  // 30% chance for vehicle-specific incident if player has special vehicles and is high enough level
  if (playerLevel >= 15 && availableVehicleTypes.length > 0 && Math.random() < 0.3) {
    const vehicleIncident = generateVehicleIncident(position, playerLevel, availableVehicleTypes);
    if (vehicleIncident) {
      // Get address asynchronously
      const addressPromise = getAddressFromCoordinates(position[0], position[1]);
      
      // Generate caller info
      const caller = getCallerInfo();
      
      const incident = {
        id: generateIncidentId(),
        type: vehicleIncident.vehicleType,
        vehicleType: vehicleIncident.vehicleType,
        vehicleRequirements: vehicleIncident.vehicleRequirements,
        displayName: vehicleIncident.displayName,
        position: position,
        resolved: false,
        timestamp: new Date().toLocaleTimeString(),
        createdAt: Date.now(),
        expiresAt: Date.now() + (300000 + Math.random() * 300000), // 5-10 minutes
        responseTime: vehicleIncident.responseTime,
        priority: vehicleIncident.priority,
        caller: caller,
        address: {
          full: 'Getting location...',
          street: '',
          number: '',
          city: '',
          state: ''
        },
        report: vehicleIncident.report,
        icon: vehicleIncident.icon,
        color: vehicleIncident.color,
        creditReward: vehicleIncident.creditReward,
        requiredUnits: vehicleIncident.vehicleRequirements.minUnits,
        unitTypes: vehicleIncident.vehicleRequirements.requiredVehicles,
        additionalUnits: vehicleIncident.vehicleRequirements.optionalVehicles || [],
        minLevel: vehicleIncident.minLevel,
        isVehicleSpecific: true
      };
      
      // Update address when ready
      addressPromise.then(address => {
        incident.address = address;
        incident.report = incident.report.replace(/{address}/g, address.full);
      });
      
      return incident;
    }
  }
  
  // Regular incident generation
  const incidentType = chooseIncidentType(playerLevel);
  const config = INCIDENT_CONFIGS[incidentType];
  
  if (!config) {
    console.error('Invalid incident type:', incidentType);
    return null;
  }
  
  // Get address asynchronously
  const addressPromise = getAddressFromCoordinates(position[0], position[1]);
  
  // Generate caller info
  const caller = getCallerInfo();
  
  // Get random report
  const report = getRandomIncidentReport(incidentType);
  
  // Calculate response time (random between min and max)
  const [minTime, maxTime] = config.responseTime;
  const responseTime = minTime + Math.random() * (maxTime - minTime);
  
  // Generate base incident
  const incident = {
    id: generateIncidentId(),
    type: incidentType,
    displayName: config.displayName,
    position: position,
    resolved: false,
    timestamp: new Date().toLocaleTimeString(),
    createdAt: Date.now(),
    expiresAt: Date.now() + (300000 + Math.random() * 300000), // 5-10 minutes
    responseTime: responseTime,
    priority: config.priority,
    caller: caller,
    address: {
      full: 'Getting location...',
      street: '',
      number: '',
      city: '',
      state: ''
    },
    report: report,
    icon: config.icon,
    color: config.color,
    creditReward: config.creditReward,
    requiredUnits: config.requiredUnits,
    unitTypes: config.unitTypes,
    additionalUnits: config.additionalUnits || [],
    minLevel: config.minLevel
  };
  
  // Update address when ready
  addressPromise.then(address => {
    incident.address = address;
    // Update report with actual address if needed
    incident.report = incident.report.replace(/{address}/g, address.full);
  });
  
  return incident;
};

// Calculate incident spawn rate based on player progression
export const getIncidentSpawnRate = (playerLevel, stationCount) => {
  // Base spawn rate: 15-30 seconds
  const baseMin = 15000;
  const baseMax = 30000;
  
  // Increase spawn rate with level (more incidents at higher levels)
  const levelMultiplier = Math.max(0.5, 1 - (playerLevel / 200)); // Reduces to 50% at level 100
  
  // More stations = more incidents
  const stationMultiplier = Math.max(0.7, 1 - (stationCount * 0.02)); // Each station reduces by 2%, min 70%
  
  return {
    min: baseMin * levelMultiplier * stationMultiplier,
    max: baseMax * levelMultiplier * stationMultiplier
  };
};

// Calculate maximum concurrent incidents (Mission Chief style)
export const getMaxConcurrentIncidents = (stationCount) => {
  // Mission Chief formula: highest station count + 1
  return stationCount + 1;
};

// Check if player can handle incident
export const canPlayerHandleIncident = (incident, availableUnits) => {
  const requiredTypes = incident.unitTypes;
  const requiredCount = incident.requiredUnits;
  
  // Count available units by type
  const unitCounts = {};
  availableUnits.forEach(unit => {
    const type = unit.type;
    unitCounts[type] = (unitCounts[type] || 0) + 1;
  });
  
  // Check if we have enough of the required types
  let totalAvailable = 0;
  requiredTypes.forEach(type => {
    totalAvailable += unitCounts[type] || 0;
  });
  
  return totalAvailable >= requiredCount;
};

// Get incident difficulty rating (for UI display)
export const getIncidentDifficulty = (incident) => {
  const config = INCIDENT_CONFIGS[incident.type];
  if (!config) return 1;
  
  // Calculate based on units required and level requirement
  const unitScore = config.requiredUnits * 10;
  const levelScore = config.minLevel;
  const priorityScore = {
    'low': 0,
    'medium': 20,
    'high': 40,
    'critical': 60
  }[config.priority] || 0;
  
  const totalScore = unitScore + levelScore + priorityScore;
  
  // Convert to 1-5 star rating
  if (totalScore < 30) return 1;
  if (totalScore < 60) return 2;
  if (totalScore < 90) return 3;
  if (totalScore < 120) return 4;
  return 5;
};