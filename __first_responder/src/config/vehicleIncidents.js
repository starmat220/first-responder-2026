// Vehicle-Specific Incident Configuration
// These incidents require specific vehicle types to handle properly

export const VEHICLE_SPECIFIC_INCIDENTS = {
  // K9 Unit Required
  DRUG_SEARCH: {
    id: 'drug_search',
    displayName: 'Drug Search Warrant',
    icon: '💊',
    color: '#FF9800',
    priority: 'medium',
    requiredVehicles: ['k9_unit'],
    optionalVehicles: ['patrol_car'],
    minUnits: 2,
    description: 'K9 unit required for drug detection',
    reports: [
      "Search warrant executed at residence. K9 unit needed to locate hidden narcotics.",
      "Traffic stop revealed suspicious packages. K9 needed for probable cause search.",
      "School locker search requested. K9 unit required for drug detection sweep."
    ],
    creditReward: 600,
    responseTime: [90000, 120000],
    minLevel: 20
  },
  
  SUSPECT_TRACKING: {
    id: 'suspect_tracking',
    displayName: 'Suspect Tracking',
    icon: '🐕',
    color: '#f44336',
    priority: 'high',
    requiredVehicles: ['k9_unit'],
    optionalVehicles: ['patrol_car'],
    minUnits: 2,
    description: 'K9 tracking suspect who fled on foot',
    reports: [
      "Suspect fled on foot into wooded area. K9 unit needed for tracking.",
      "Robbery suspect ditched vehicle and ran. K9 requested for scent tracking.",
      "Missing person last seen in area. K9 unit needed for search operation."
    ],
    creditReward: 800,
    responseTime: [60000, 90000],
    minLevel: 25
  },
  
  // SWAT Required
  HOSTAGE_SITUATION: {
    id: 'hostage_situation',
    displayName: 'Hostage Situation',
    icon: '🎯',
    color: '#f44336',
    priority: 'critical',
    requiredVehicles: ['swat_vehicle'],
    optionalVehicles: ['patrol_car', 'negotiator'],
    minUnits: 4,
    description: 'SWAT team required for hostage rescue',
    reports: [
      "Armed suspect holding hostages at bank. SWAT team and negotiator needed immediately.",
      "Domestic incident escalated to hostage situation. SWAT response required.",
      "Workplace shooting, employees trapped inside. Full SWAT response needed."
    ],
    creditReward: 2000,
    responseTime: [180000, 300000],
    minLevel: 40
  },
  
  HIGH_RISK_WARRANT: {
    id: 'high_risk_warrant',
    displayName: 'High Risk Warrant',
    icon: '⚡',
    color: '#f44336',
    priority: 'high',
    requiredVehicles: ['swat_vehicle'],
    optionalVehicles: ['patrol_car', 'k9_unit'],
    minUnits: 3,
    description: 'SWAT needed for dangerous suspect',
    reports: [
      "Warrant service for armed and dangerous suspect. SWAT team required.",
      "Gang member with violent history. High-risk warrant service needed.",
      "Suspected arms dealer barricaded in residence. SWAT response required."
    ],
    creditReward: 1500,
    responseTime: [120000, 180000],
    minLevel: 35
  },
  
  // Motorcycle Required
  TRAFFIC_ESCORT: {
    id: 'traffic_escort',
    displayName: 'VIP Escort',
    icon: '🏍️',
    color: '#2196F3',
    priority: 'medium',
    requiredVehicles: ['motorcycle'],
    optionalVehicles: ['patrol_car'],
    minUnits: 2,
    description: 'Motorcycle escort for VIP convoy',
    reports: [
      "Dignitary requires police escort through city. Motorcycle units needed.",
      "Emergency organ transport to hospital. Motorcycle escort requested.",
      "Presidential motorcade arriving. Multiple motorcycle units required."
    ],
    creditReward: 400,
    responseTime: [60000, 120000],
    minLevel: 15
  },
  
  PURSUIT_MOTORCYCLE: {
    id: 'pursuit_motorcycle',
    displayName: 'Motorcycle Pursuit',
    icon: '🏍️',
    color: '#f44336',
    priority: 'high',
    requiredVehicles: ['motorcycle'],
    optionalVehicles: ['patrol_car'],
    minUnits: 2,
    description: 'Suspect on motorcycle fleeing',
    reports: [
      "Sport bike fleeing at high speed, weaving through traffic. Motorcycle units needed.",
      "Dirt bike gang causing havoc downtown. Motorcycle pursuit units required.",
      "Stolen motorcycle spotted, rider refusing to stop. Pursuit authorized."
    ],
    creditReward: 900,
    responseTime: [45000, 90000],
    minLevel: 20
  },
  
  // Riot Vehicle Required
  RIOT_CONTROL: {
    id: 'riot_control',
    displayName: 'Riot Control',
    icon: '🛡️',
    color: '#f44336',
    priority: 'critical',
    requiredVehicles: ['riot_vehicle'],
    optionalVehicles: ['patrol_car', 'swat_vehicle'],
    minUnits: 6,
    description: 'Riot squad needed for crowd control',
    reports: [
      "Large protest turning violent. Riot control units needed immediately.",
      "Sports celebration getting out of hand. Riot squad requested.",
      "Prison riot in progress. All riot units respond code 3."
    ],
    creditReward: 2500,
    responseTime: [180000, 360000],
    minLevel: 50
  },
  
  // Helicopter Required
  AERIAL_PURSUIT: {
    id: 'aerial_pursuit',
    displayName: 'Aerial Pursuit',
    icon: '🚁',
    color: '#f44336',
    priority: 'high',
    requiredVehicles: ['helicopter'],
    optionalVehicles: ['patrol_car', 'motorcycle'],
    minUnits: 3,
    description: 'Air support needed for pursuit',
    reports: [
      "High-speed chase entering multiple jurisdictions. Air support requested.",
      "Suspects fleeing through residential areas. Helicopter needed for tracking.",
      "Armed robbery suspects splitting up. Air unit needed for coordination."
    ],
    creditReward: 1200,
    responseTime: [60000, 120000],
    minLevel: 45
  },
  
  SEARCH_AND_RESCUE_AIR: {
    id: 'search_rescue_air',
    displayName: 'Air Search & Rescue',
    icon: '🚁',
    color: '#FF9800',
    priority: 'high',
    requiredVehicles: ['helicopter'],
    optionalVehicles: ['patrol_car', 'k9_unit'],
    minUnits: 4,
    description: 'Helicopter needed for search operation',
    reports: [
      "Hiker missing in mountainous area. Air search unit required.",
      "Child wandered into forest. Helicopter with thermal imaging needed.",
      "Elderly person with dementia missing. Aerial search requested."
    ],
    creditReward: 1000,
    responseTime: [120000, 240000],
    minLevel: 40
  },
  
  // Detective Required
  CRIME_SCENE_INVESTIGATION: {
    id: 'crime_scene',
    displayName: 'Crime Scene Investigation',
    icon: '🔍',
    color: '#FF9800',
    priority: 'medium',
    requiredVehicles: ['detective_car'],
    optionalVehicles: ['patrol_car'],
    minUnits: 2,
    description: 'Detectives needed for investigation',
    reports: [
      "Suspicious death discovered. Detective unit needed for investigation.",
      "Complex fraud case requires detective expertise.",
      "Serial burglary pattern identified. Detective unit requested."
    ],
    creditReward: 700,
    responseTime: [120000, 180000],
    minLevel: 30
  },
  
  // Traffic Unit Required
  MAJOR_ACCIDENT_RECONSTRUCTION: {
    id: 'accident_reconstruction',
    displayName: 'Fatal Accident Investigation',
    icon: '🚨',
    color: '#f44336',
    priority: 'high',
    requiredVehicles: ['traffic_unit'],
    optionalVehicles: ['patrol_car'],
    minUnits: 3,
    description: 'Traffic unit needed for reconstruction',
    reports: [
      "Fatal multi-vehicle collision. Traffic reconstruction team needed.",
      "Hit and run with fatality. Specialized traffic investigators required.",
      "Commercial vehicle accident with hazmat. Traffic unit expertise needed."
    ],
    creditReward: 1100,
    responseTime: [120000, 240000],
    minLevel: 35
  },
  
  DUI_CHECKPOINT: {
    id: 'dui_checkpoint',
    displayName: 'DUI Checkpoint',
    icon: '🍺',
    color: '#FF9800',
    priority: 'medium',
    requiredVehicles: ['traffic_unit'],
    optionalVehicles: ['patrol_car', 'k9_unit'],
    minUnits: 4,
    description: 'Traffic unit setting up DUI checkpoint',
    reports: [
      "Holiday weekend DUI checkpoint authorized. Traffic units needed.",
      "Bar district checkpoint operation. Multiple traffic units required.",
      "Graduation night safety checkpoint. Traffic and K9 units requested."
    ],
    creditReward: 600,
    responseTime: [180000, 300000],
    minLevel: 25
  }
};

// Check if player has required vehicles for an incident
export const canHandleVehicleIncident = (incident, availableVehicles) => {
  const incidentConfig = VEHICLE_SPECIFIC_INCIDENTS[incident.vehicleType];
  if (!incidentConfig) return true; // Not a vehicle-specific incident
  
  // Check if we have ALL required vehicle types
  const vehicleTypes = availableVehicles.map(v => v.type);
  const hasAllRequired = incidentConfig.requiredVehicles.every(reqType => 
    vehicleTypes.includes(reqType)
  );
  
  if (!hasAllRequired) return false;
  
  // Check if we have minimum units
  const requiredCount = incidentConfig.minUnits || 1;
  const eligibleVehicles = availableVehicles.filter(v => 
    incidentConfig.requiredVehicles.includes(v.type) ||
    (incidentConfig.optionalVehicles || []).includes(v.type)
  );
  
  return eligibleVehicles.length >= requiredCount;
};

// Get missing vehicles for an incident
export const getMissingVehicles = (incident, availableVehicles) => {
  const incidentConfig = VEHICLE_SPECIFIC_INCIDENTS[incident.vehicleType];
  if (!incidentConfig) return [];
  
  const vehicleTypes = availableVehicles.map(v => v.type);
  return incidentConfig.requiredVehicles.filter(reqType => 
    !vehicleTypes.includes(reqType)
  );
};

// Generate vehicle-specific incident
export const generateVehicleIncident = (position, playerLevel, availableVehicleTypes) => {
  // Filter incidents by level and available vehicles
  const eligibleIncidents = Object.entries(VEHICLE_SPECIFIC_INCIDENTS)
    .filter(([_, config]) => {
      // Check level requirement
      if (playerLevel < config.minLevel) return false;
      
      // Check if player has at least one required vehicle type
      return config.requiredVehicles.some(reqType => 
        availableVehicleTypes.includes(reqType)
      );
    });
  
  if (eligibleIncidents.length === 0) return null;
  
  // Random selection weighted by priority
  const weights = {
    'low': 1,
    'medium': 2,
    'high': 3,
    'critical': 4
  };
  
  const weightedIncidents = eligibleIncidents.flatMap(([id, config]) => 
    Array(weights[config.priority] || 1).fill([id, config])
  );
  
  const [selectedId, selectedConfig] = weightedIncidents[
    Math.floor(Math.random() * weightedIncidents.length)
  ];
  
  // Generate report
  const report = selectedConfig.reports[
    Math.floor(Math.random() * selectedConfig.reports.length)
  ];
  
  return {
    vehicleType: selectedId,
    vehicleRequirements: selectedConfig,
    displayName: selectedConfig.displayName,
    icon: selectedConfig.icon,
    color: selectedConfig.color,
    priority: selectedConfig.priority,
    report: report,
    creditReward: selectedConfig.creditReward,
    responseTime: selectedConfig.responseTime[0] + 
      Math.random() * (selectedConfig.responseTime[1] - selectedConfig.responseTime[0]),
    minLevel: selectedConfig.minLevel
  };
};