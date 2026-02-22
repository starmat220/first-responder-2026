// Police vehicle types and configurations

export const VEHICLE_TYPES = {
  PATROL_CAR: 'patrol_car',
  K9_UNIT: 'k9_unit',
  TRAFFIC_UNIT: 'traffic_unit',
  SWAT_VEHICLE: 'swat_vehicle',
  DETECTIVE_CAR: 'detective_car',
  MOTORCYCLE: 'motorcycle'
};

export const VEHICLE_CONFIG = {
  [VEHICLE_TYPES.PATROL_CAR]: {
    name: 'Patrol Car',
    cost: 500,
    icon: '🚔',
    color: '#2196F3',
    capabilities: ['general', 'traffic', 'theft'],
    maxCrew: 2,
    speed: 1.0, // Base speed multiplier
    description: 'Standard police patrol vehicle for general calls'
  },
  [VEHICLE_TYPES.K9_UNIT]: {
    name: 'K9 Unit',
    cost: 800,
    icon: '🐕‍🦺',
    color: '#4CAF50',
    capabilities: ['general', 'drug', 'search'],
    maxCrew: 2,
    speed: 0.9,
    description: 'Police dog unit for searches and drug detection'
  },
  [VEHICLE_TYPES.TRAFFIC_UNIT]: {
    name: 'Traffic Unit',
    cost: 600,
    icon: '🚨',
    color: '#FF9800',
    capabilities: ['traffic', 'accident'],
    maxCrew: 1,
    speed: 1.1,
    description: 'Specialized traffic enforcement vehicle'
  },
  [VEHICLE_TYPES.SWAT_VEHICLE]: {
    name: 'SWAT Vehicle',
    cost: 2000,
    icon: '🛡️',
    color: '#212121',
    capabilities: ['swat', 'high_risk'],
    maxCrew: 6,
    speed: 0.8,
    description: 'Armored vehicle for high-risk operations'
  },
  [VEHICLE_TYPES.DETECTIVE_CAR]: {
    name: 'Detective Car',
    cost: 700,
    icon: '🔍',
    color: '#795548',
    capabilities: ['investigation', 'general'],
    maxCrew: 2,
    speed: 1.0,
    description: 'Unmarked vehicle for investigations'
  },
  [VEHICLE_TYPES.MOTORCYCLE]: {
    name: 'Police Motorcycle',
    cost: 300,
    icon: '🏍️',
    color: '#607D8B',
    capabilities: ['traffic', 'pursuit'],
    maxCrew: 1,
    speed: 1.3,
    description: 'Fast response motorcycle unit'
  }
};

export const INCIDENT_REQUIREMENTS = {
  'Theft': {
    minVehicles: 1,
    preferredCapabilities: ['general'],
    urgency: 'medium'
  },
  'Disturbance': {
    minVehicles: 1,
    preferredCapabilities: ['general'],
    urgency: 'medium'
  },
  'Traffic Violation': {
    minVehicles: 1,
    preferredCapabilities: ['traffic'],
    urgency: 'low'
  },
  'Vandalism': {
    minVehicles: 1,
    preferredCapabilities: ['general'],
    urgency: 'low'
  },
  'Noise Complaint': {
    minVehicles: 1,
    preferredCapabilities: ['general'],
    urgency: 'low'
  },
  'Car Accident': {
    minVehicles: 2,
    preferredCapabilities: ['traffic', 'general'],
    urgency: 'high'
  },
  'Drug Activity': {
    minVehicles: 2,
    preferredCapabilities: ['drug', 'general'],
    urgency: 'high'
  },
  'Armed Robbery': {
    minVehicles: 3,
    preferredCapabilities: ['swat', 'general'],
    urgency: 'critical'
  }
};

export const VEHICLE_STATUS = {
  AVAILABLE: 'available',
  DISPATCHED: 'dispatched',
  ON_SCENE: 'on_scene',
  RETURNING: 'returning',
  MAINTENANCE: 'maintenance'
};

export const getVehicleIcon = (vehicleType, status = VEHICLE_STATUS.AVAILABLE) => {
  const config = VEHICLE_CONFIG[vehicleType];
  if (!config) return '🚔';
  
  // Just return the base icon without status indicators
  return config.icon;
};

export const calculateResponseTime = (distance, vehicleType) => {
  const config = VEHICLE_CONFIG[vehicleType];
  const baseTime = distance * 5; // 5 seconds per km base
  return Math.round(baseTime / (config?.speed || 1.0));
};

export const canHandleIncident = (vehicleCapabilities, incidentType) => {
  const requirements = INCIDENT_REQUIREMENTS[incidentType];
  if (!requirements) return true;
  
  return requirements.preferredCapabilities.some(cap => 
    vehicleCapabilities.includes(cap)
  );
};