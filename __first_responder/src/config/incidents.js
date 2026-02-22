// Comprehensive incident types for Police Command Center
// Organized by complexity and progression level

export const INCIDENT_TYPES = {
  // BASIC INCIDENTS (Early Game - Level 1-5)
  NOISE_COMPLAINT: 'NOISE_COMPLAINT',
  TRAFFIC_VIOLATION: 'TRAFFIC_VIOLATION',
  VANDALISM: 'VANDALISM',
  FOUND_PROPERTY: 'FOUND_PROPERTY',
  MOTORIST_ASSIST: 'MOTORIST_ASSIST',
  PANHANDLER: 'PANHANDLER',
  INFO_REPORT: 'INFO_REPORT',
  
  // STANDARD INCIDENTS (Early-Mid Game - Level 5-15)
  THEFT_UNDER_500: 'THEFT_UNDER_500',
  SHOPLIFTING: 'SHOPLIFTING',
  HARASSMENT: 'HARASSMENT',
  FRAUD: 'FRAUD',
  INTOXICATED_PERSON: 'INTOXICATED_PERSON',
  DISTURBANCE: 'DISTURBANCE',
  CRIMINAL_MISCHIEF: 'CRIMINAL_MISCHIEF',
  SUSPICIOUS_PERSON: 'SUSPICIOUS_PERSON',
  SUSPICIOUS_VEHICLE: 'SUSPICIOUS_VEHICLE',
  PANIC_ALARM: 'PANIC_ALARM',
  
  // INTERMEDIATE INCIDENTS (Mid Game - Level 15-30)
  CHECK_WELFARE: 'CHECK_WELFARE',
  DOMESTIC_INCIDENT: 'DOMESTIC_INCIDENT',
  BURGLARY_RESIDENTIAL: 'BURGLARY_RESIDENTIAL',
  BURGLARY_COMMERCIAL: 'BURGLARY_COMMERCIAL',
  BURGLARY_VEHICLE: 'BURGLARY_VEHICLE',
  THEFT_OVER_500: 'THEFT_OVER_500',
  DUI_DWI: 'DUI_DWI',
  HIT_AND_RUN: 'HIT_AND_RUN',
  MVC_MINOR: 'MVC_MINOR',
  MENTAL_PERSON: 'MENTAL_PERSON',
  MISSING_JUVENILE: 'MISSING_JUVENILE',
  PROSTITUTION: 'PROSTITUTION',
  PRISONER_TRANSPORT: 'PRISONER_TRANSPORT',
  RECOVERED_VEHICLE: 'RECOVERED_VEHICLE',
  
  // ADVANCED INCIDENTS (Mid-Late Game - Level 30-50)
  MVC_MAJOR: 'MVC_MAJOR',
  DANGEROUS_DRUGS: 'DANGEROUS_DRUGS',
  ROBBERY: 'ROBBERY',
  ASSAULT: 'ASSAULT',
  SEXUAL_ASSAULT: 'SEXUAL_ASSAULT',
  MISSING_PERSON: 'MISSING_PERSON',
  MAN_DOWN: 'MAN_DOWN',
  DOA: 'DOA',
  PURSUIT_FOOT: 'PURSUIT_FOOT',
  PURSUIT_VEHICLE: 'PURSUIT_VEHICLE',
  SUICIDE_ATTEMPT: 'SUICIDE_ATTEMPT',
  STABBING: 'STABBING',
  ASSIST_FIRE_EMS: 'ASSIST_FIRE_EMS',
  ASSIST_OTHER_AGENCY: 'ASSIST_OTHER_AGENCY',
  
  // SPECIALIZED INCIDENTS (Late Game - Level 50+)
  SHOTS_FIRED: 'SHOTS_FIRED',
  BOMB_THREAT: 'BOMB_THREAT',
  SEARCH_RESCUE: 'SEARCH_RESCUE',
  SPECIAL_DETAIL: 'SPECIAL_DETAIL',
  MAJOR_DISTURBANCE: 'MAJOR_DISTURBANCE',
  AGGRESSIVE_PASSENGER: 'AGGRESSIVE_PASSENGER',
  PAROLE_VIOLATION: 'PAROLE_VIOLATION',
  DRUG_DEAL: 'DRUG_DEAL',
  
  // CRITICAL INCIDENTS (End Game - Level 75+)
  VIOLENT_PROTEST_SMALL: 'VIOLENT_PROTEST_SMALL',
  VIOLENT_PROTEST_MEDIUM: 'VIOLENT_PROTEST_MEDIUM',
  VIOLENT_PROTEST_LARGE: 'VIOLENT_PROTEST_LARGE',
  ARMED_STANDOFF: 'ARMED_STANDOFF',
  TERRORISM_THREAT: 'TERRORISM_THREAT',
  HIGH_RISE_TAKEOVER: 'HIGH_RISE_TAKEOVER',
  PRISONER_ESCAPE: 'PRISONER_ESCAPE',
  ESCAPED_PRISONER_MANHUNT: 'ESCAPED_PRISONER_MANHUNT',
  HIGH_PROFILE_SECURITY: 'HIGH_PROFILE_SECURITY',
  THREAT_TO_UTILITIES: 'THREAT_TO_UTILITIES'
};

// Incident configurations with all details
export const INCIDENT_CONFIGS = {
  // BASIC INCIDENTS
  [INCIDENT_TYPES.NOISE_COMPLAINT]: {
    displayName: 'Noise Complaint',
    icon: '🔊',
    color: '#4CAF50',
    priority: 'low',
    responseTime: [30000, 60000], // 30-60 seconds
    creditReward: 50,
    requiredUnits: 1,
    unitTypes: ['patrol_car'],
    minLevel: 1
  },
  
  [INCIDENT_TYPES.TRAFFIC_VIOLATION]: {
    displayName: 'Traffic Violation',
    icon: '🚗',
    color: '#4CAF50',
    priority: 'low',
    responseTime: [30000, 60000],
    creditReward: 75,
    requiredUnits: 1,
    unitTypes: ['patrol_car', 'motorcycle'],
    minLevel: 1
  },
  
  [INCIDENT_TYPES.VANDALISM]: {
    displayName: 'Vandalism',
    icon: '🎨',
    color: '#4CAF50',
    priority: 'low',
    responseTime: [45000, 90000],
    creditReward: 100,
    requiredUnits: 1,
    unitTypes: ['patrol_car'],
    minLevel: 1
  },
  
  [INCIDENT_TYPES.FOUND_PROPERTY]: {
    displayName: 'Found Property',
    icon: '📦',
    color: '#4CAF50',
    priority: 'low',
    responseTime: [60000, 120000],
    creditReward: 25,
    requiredUnits: 1,
    unitTypes: ['patrol_car'],
    minLevel: 1
  },
  
  [INCIDENT_TYPES.MOTORIST_ASSIST]: {
    displayName: 'Motorist Assist',
    icon: '🚙',
    color: '#4CAF50',
    priority: 'low',
    responseTime: [30000, 60000],
    creditReward: 50,
    requiredUnits: 1,
    unitTypes: ['patrol_car'],
    minLevel: 1
  },
  
  // STANDARD INCIDENTS
  [INCIDENT_TYPES.THEFT_UNDER_500]: {
    displayName: 'Theft (Under $500)',
    icon: '💵',
    color: '#FF9800',
    priority: 'medium',
    responseTime: [60000, 120000],
    creditReward: 150,
    requiredUnits: 1,
    unitTypes: ['patrol_car'],
    minLevel: 5
  },
  
  [INCIDENT_TYPES.SHOPLIFTING]: {
    displayName: 'Shoplifting',
    icon: '🛒',
    color: '#FF9800',
    priority: 'medium',
    responseTime: [45000, 90000],
    creditReward: 125,
    requiredUnits: 1,
    unitTypes: ['patrol_car'],
    minLevel: 5
  },
  
  [INCIDENT_TYPES.DISTURBANCE]: {
    displayName: 'Disturbance',
    icon: '😤',
    color: '#FF9800',
    priority: 'medium',
    responseTime: [45000, 90000],
    creditReward: 175,
    requiredUnits: 2,
    unitTypes: ['patrol_car'],
    minLevel: 7
  },
  
  [INCIDENT_TYPES.SUSPICIOUS_PERSON]: {
    displayName: 'Suspicious Person',
    icon: '🚶',
    color: '#FF9800',
    priority: 'medium',
    responseTime: [30000, 60000],
    creditReward: 100,
    requiredUnits: 1,
    unitTypes: ['patrol_car'],
    minLevel: 5
  },
  
  // INTERMEDIATE INCIDENTS
  [INCIDENT_TYPES.CHECK_WELFARE]: {
    displayName: 'Check Welfare',
    icon: '🏥',
    color: '#FF9800',
    priority: 'medium',
    responseTime: [60000, 120000],
    creditReward: 200,
    requiredUnits: 2,
    unitTypes: ['patrol_car'],
    additionalUnits: ['ems'],
    minLevel: 15
  },
  
  [INCIDENT_TYPES.DOMESTIC_INCIDENT]: {
    displayName: 'Domestic Incident',
    icon: '🏘️',
    color: '#FF9800',
    priority: 'high',
    responseTime: [45000, 90000],
    creditReward: 250,
    requiredUnits: 2,
    unitTypes: ['patrol_car'],
    minLevel: 15
  },
  
  [INCIDENT_TYPES.BURGLARY_RESIDENTIAL]: {
    displayName: 'Residential Burglary',
    icon: '🏠',
    color: '#FF9800',
    priority: 'medium',
    responseTime: [90000, 180000],
    creditReward: 300,
    requiredUnits: 2,
    unitTypes: ['patrol_car', 'k9_unit'],
    minLevel: 20
  },
  
  [INCIDENT_TYPES.DUI_DWI]: {
    displayName: 'DUI/DWI',
    icon: '🍺',
    color: '#f44336',
    priority: 'high',
    responseTime: [60000, 120000],
    creditReward: 350,
    requiredUnits: 2,
    unitTypes: ['patrol_car', 'k9_unit'],
    minLevel: 20
  },
  
  [INCIDENT_TYPES.HIT_AND_RUN]: {
    displayName: 'Hit and Run',
    icon: '💥',
    color: '#f44336',
    priority: 'high',
    responseTime: [45000, 90000],
    creditReward: 400,
    requiredUnits: 2,
    unitTypes: ['patrol_car', 'motorcycle'],
    additionalUnits: ['ems'],
    minLevel: 25
  },
  
  // ADVANCED INCIDENTS
  [INCIDENT_TYPES.MVC_MAJOR]: {
    displayName: 'Major Vehicle Collision',
    icon: '🚨',
    color: '#f44336',
    priority: 'high',
    responseTime: [60000, 120000],
    creditReward: 500,
    requiredUnits: 3,
    unitTypes: ['patrol_car'],
    additionalUnits: ['fire', 'ems'],
    minLevel: 30
  },
  
  [INCIDENT_TYPES.DANGEROUS_DRUGS]: {
    displayName: 'Dangerous Drugs',
    icon: '💊',
    color: '#f44336',
    priority: 'high',
    responseTime: [90000, 180000],
    creditReward: 600,
    requiredUnits: 3,
    unitTypes: ['patrol_car', 'k9_unit'],
    minLevel: 35
  },
  
  [INCIDENT_TYPES.ROBBERY]: {
    displayName: 'Robbery',
    icon: '🔫',
    color: '#f44336',
    priority: 'high',
    responseTime: [60000, 120000],
    creditReward: 750,
    requiredUnits: 4,
    unitTypes: ['patrol_car', 'swat_vehicle'],
    minLevel: 40
  },
  
  [INCIDENT_TYPES.ASSAULT]: {
    displayName: 'Assault',
    icon: '👊',
    color: '#f44336',
    priority: 'high',
    responseTime: [45000, 90000],
    creditReward: 450,
    requiredUnits: 2,
    unitTypes: ['patrol_car'],
    additionalUnits: ['ems'],
    minLevel: 30
  },
  
  [INCIDENT_TYPES.PURSUIT_VEHICLE]: {
    displayName: 'Vehicle Pursuit',
    icon: '🚔',
    color: '#f44336',
    priority: 'high',
    responseTime: [30000, 60000],
    creditReward: 800,
    requiredUnits: 4,
    unitTypes: ['patrol_car', 'motorcycle'],
    minLevel: 35
  },
  
  // SPECIALIZED INCIDENTS
  [INCIDENT_TYPES.SHOTS_FIRED]: {
    displayName: 'Shots Fired',
    icon: '🔫',
    color: '#f44336',
    priority: 'critical',
    responseTime: [30000, 60000],
    creditReward: 1000,
    requiredUnits: 5,
    unitTypes: ['patrol_car', 'swat_vehicle'],
    additionalUnits: ['ems'],
    minLevel: 50
  },
  
  [INCIDENT_TYPES.BOMB_THREAT]: {
    displayName: 'Bomb Threat',
    icon: '💣',
    color: '#f44336',
    priority: 'critical',
    responseTime: [120000, 240000],
    creditReward: 1500,
    requiredUnits: 6,
    unitTypes: ['patrol_car', 'k9_unit', 'swat_vehicle'],
    additionalUnits: ['fire', 'ems'],
    minLevel: 60
  },
  
  // CRITICAL INCIDENTS
  [INCIDENT_TYPES.VIOLENT_PROTEST_LARGE]: {
    displayName: 'Large Violent Protest',
    icon: '🏴',
    color: '#f44336',
    priority: 'critical',
    responseTime: [180000, 360000],
    creditReward: 2500,
    requiredUnits: 10,
    unitTypes: ['patrol_car', 'swat_vehicle', 'riot_vehicle'],
    additionalUnits: ['ems', 'helicopter'],
    minLevel: 75
  },
  
  [INCIDENT_TYPES.ARMED_STANDOFF]: {
    displayName: 'Armed Standoff',
    icon: '🎯',
    color: '#f44336',
    priority: 'critical',
    responseTime: [300000, 600000],
    creditReward: 2000,
    requiredUnits: 8,
    unitTypes: ['patrol_car', 'swat_vehicle', 'negotiator'],
    additionalUnits: ['ems'],
    minLevel: 70
  },
  
  [INCIDENT_TYPES.TERRORISM_THREAT]: {
    displayName: 'Terrorism Threat',
    icon: '☠️',
    color: '#f44336',
    priority: 'critical',
    responseTime: [240000, 480000],
    creditReward: 3000,
    requiredUnits: 12,
    unitTypes: ['patrol_car', 'swat_vehicle', 'k9_unit', 'riot_vehicle'],
    additionalUnits: ['fire', 'ems', 'helicopter'],
    minLevel: 80
  }
};

// Get incidents available at player level
export const getAvailableIncidents = (playerLevel) => {
  return Object.entries(INCIDENT_CONFIGS)
    .filter(([_, config]) => playerLevel >= config.minLevel)
    .map(([type, _]) => type);
};

// Get incident priority distribution based on level
export const getIncidentPriorityChance = (playerLevel) => {
  if (playerLevel < 10) {
    return { low: 0.7, medium: 0.25, high: 0.05, critical: 0 };
  } else if (playerLevel < 30) {
    return { low: 0.4, medium: 0.4, high: 0.2, critical: 0 };
  } else if (playerLevel < 50) {
    return { low: 0.2, medium: 0.4, high: 0.35, critical: 0.05 };
  } else {
    return { low: 0.1, medium: 0.3, high: 0.45, critical: 0.15 };
  }
};