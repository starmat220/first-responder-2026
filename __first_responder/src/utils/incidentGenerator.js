import { INCIDENT_SCENARIOS, SCENARIO_VARIABLES } from '../config/scenarios';
import { generateCallerName, isAnonymousCaller } from '../config/callerNames';
import { INCIDENT_ICONS } from '../config/icons';

// Generate a street address from coordinates using OpenStreetMap Nominatim
export const getAddressFromCoordinates = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    const data = await response.json();
    
    if (data && data.address) {
      const addr = data.address;
      const streetNumber = addr.house_number || Math.floor(Math.random() * 999) + 1;
      const streetName = addr.road || addr.street || 'Main Street';
      const city = addr.city || addr.town || addr.village || 'Unknown City';
      
      return {
        full: `${streetNumber} ${streetName}, ${city}`,
        street: streetName,
        number: streetNumber,
        city: city
      };
    }
  } catch (error) {
    console.error('Error getting address:', error);
  }
  
  // Fallback if API fails
  const streetNames = ['Main Street', 'Elm Street', 'Oak Avenue', 'Maple Road', 'Pine Boulevard'];
  const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
  const streetNumber = Math.floor(Math.random() * 999) + 1;
  
  return {
    full: `${streetNumber} ${streetName}`,
    street: streetName,
    number: streetNumber,
    city: 'Emergency Location'
  };
};

// Generate a simple street address without API
const generateStreetAddress = () => {
  const streetNames = ['Main Street', 'Elm Street', 'Oak Avenue', 'Maple Road', 'Pine Boulevard', 
                       'Cedar Lane', 'Park Drive', 'Church Street', 'First Avenue', 'Second Avenue'];
  const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
  const streetNumber = Math.floor(Math.random() * 999) + 1;
  
  return {
    full: `${streetNumber} ${streetName}`,
    street: streetName,
    number: streetNumber
  };
};

// Generate intersection
const generateIntersection = () => {
  const streetNames = ['Main Street', 'Elm Street', 'Oak Avenue', 'Maple Road', 'Pine Boulevard', 
                       'Cedar Lane', 'Park Drive', 'Church Street', 'First Avenue', 'Second Avenue'];
  const street1 = streetNames[Math.floor(Math.random() * streetNames.length)];
  let street2 = streetNames[Math.floor(Math.random() * streetNames.length)];
  while (street2 === street1) {
    street2 = streetNames[Math.floor(Math.random() * streetNames.length)];
  }
  return `${street1} & ${street2}`;
};

// Helper to replace template variables in reports
const fillTemplate = (template, incidentType) => {
  let filled = template;
  
  // Replace all template variables
  Object.keys(SCENARIO_VARIABLES).forEach(key => {
    const regex = new RegExp(`{${key}}`, 'g');
    if (filled.includes(`{${key}}`)) {
      const values = SCENARIO_VARIABLES[key];
      const value = values[Math.floor(Math.random() * values.length)];
      filled = filled.replace(regex, value);
    }
  });
  
  // Replace street/address
  if (filled.includes('{street}')) {
    const useIntersection = incidentType === 'VEHICLE_ACCIDENT' && Math.random() < 0.7;
    const location = useIntersection ? generateIntersection() : generateStreetAddress().full;
    filled = filled.replace(/{street}/g, location);
  }
  
  // Replace apartment number
  if (filled.includes('{number}')) {
    const aptNumber = Math.floor(Math.random() * 20) + 1;
    filled = filled.replace(/{number}/g, aptNumber);
  }
  
  return filled;
};

// Generate a complete incident with all details
export const generateIncident = (type) => {
  const scenarios = INCIDENT_SCENARIOS[type];
  if (!scenarios || scenarios.length === 0) {
    // Fallback for incident types without scenarios yet
    return generateBasicIncident(type);
  }
  
  // Select random scenario
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  
  // Generate caller info
  const caller = isAnonymousCaller() ? { full: 'Anonymous', first: 'Anonymous', last: '', gender: 'unknown' } : generateCallerName();
  
  // Generate location
  const location = type === 'VEHICLE_ACCIDENT' && Math.random() < 0.7 
    ? generateIntersection() 
    : generateStreetAddress();
    
  // Fill in the report template
  const report = fillTemplate(scenario.report, type);
  
  // Get icon info
  const iconInfo = INCIDENT_ICONS[type] || INCIDENT_ICONS.DISTURBANCE;
  
  return {
    type: type,
    scenario: scenario,
    caller: caller,
    location: typeof location === 'string' ? location : location.full,
    address: location,
    report: report,
    priority: scenario.priority || 'medium',
    responseTime: scenario.responseTime || 60000,
    icon: iconInfo.emoji,
    color: iconInfo.color || '#FF5252',
    callTime: new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  };
};

// Fallback basic incident generator
const generateBasicIncident = (type) => {
  const location = generateStreetAddress();
  const caller = isAnonymousCaller() ? { full: 'Anonymous' } : generateCallerName();
  const iconInfo = INCIDENT_ICONS[type] || INCIDENT_ICONS.DISTURBANCE;
  
  return {
    type: type,
    caller: caller,
    location: location.full,
    address: location,
    report: `${type.replace(/_/g, ' ').toLowerCase()} reported at ${location.full}.`,
    priority: 'medium',
    responseTime: 60000,
    icon: iconInfo.emoji,
    color: iconInfo.color || '#FF5252',
    callTime: new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  };
};

// Get incident type display name
export const getIncidentDisplayName = (type) => {
  const names = {
    VEHICLE_ACCIDENT: 'Vehicle Accident',
    THEFT: 'Theft',
    BURGLARY: 'Burglary',
    ASSAULT: 'Assault',
    VANDALISM: 'Vandalism',
    TRAFFIC_VIOLATION: 'Traffic Violation',
    HIT_AND_RUN: 'Hit and Run',
    DUI: 'DUI',
    DISTURBANCE: 'Disturbance',
    NOISE_COMPLAINT: 'Noise Complaint',
    DOMESTIC_DISPUTE: 'Domestic Dispute',
    FIRE: 'Fire',
    MEDICAL_EMERGENCY: 'Medical Emergency',
    MISSING_PERSON: 'Missing Person'
  };
  
  return names[type] || type.replace(/_/g, ' ');
};