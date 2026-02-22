// Legacy incident descriptions - kept for backward compatibility
// New incidents use the comprehensive system in incidents.js and incidentReports.js
export const INCIDENT_DESCRIPTIONS = {
  // LOW PRIORITY - Minor issues, non-urgent
  low: {
    NOISE_COMPLAINT: [
      "Neighbors report loud music coming from the residence. Started about 30 minutes ago.",
      "Resident complaining about barking dog next door. Has been going on for an hour.",
      "Construction noise complaint during evening hours. Workers appear to still be on site.",
      "Loud party reported at the address. Multiple cars parked on the street.",
      "TV or stereo too loud, elderly neighbor unable to sleep."
    ],
    VANDALISM: [
      "Graffiti discovered on garage door this morning. Paint appears fresh.",
      "Mailbox knocked over sometime last night. No witnesses.",
      "Someone egged the front of the house. Happened within the last hour.",
      "Trash cans tipped over and contents scattered. Kids were seen in the area.",
      "Car antenna broken off. Owner just discovered the damage."
    ],
    TRAFFIC_VIOLATION: [
      "Vehicle parked in no-parking zone for over 2 hours.",
      "Car blocking driveway, owner cannot leave for work.",
      "Expired registration tags spotted on vehicle.",
      "Commercial truck parked in residential area overnight.",
      "Vehicle partially blocking sidewalk, pedestrians having to walk around."
    ],
    THEFT: [
      "Bicycle stolen from front yard. Was not locked.",
      "Package theft from porch. Delivery was 2 hours ago.",
      "Garden tools missing from unlocked shed.",
      "Newspaper theft reported. Third time this week.",
      "Lawn ornament stolen overnight. Value approximately $50."
    ]
  },
  
  // MEDIUM PRIORITY - Property crimes, minor injuries, disputes
  medium: {
    BURGLARY: [
      "Homeowner returned to find back door forced open. Appears unoccupied now.",
      "Suspicious person seen trying door handles on multiple houses.",
      "Garage break-in discovered. Power tools reported missing.",
      "Business alarm triggered, owner en route to check.",
      "Neighbor reports seeing flashlights inside vacant house."
    ],
    DISTURBANCE: [
      "Verbal argument between neighbors escalating. No weapons seen.",
      "Group of teenagers causing disturbance at park. Refusing to leave.",
      "Customer refusing to leave business after closing time.",
      "Homeless individual aggressive with passersby. No violence yet.",
      "Road rage incident, drivers yelling at each other."
    ],
    VEHICLE_ACCIDENT: [
      "Two-vehicle fender bender, blocking one lane. No apparent injuries.",
      "Car vs. parked vehicle. Driver waiting at scene.",
      "Minor collision in parking lot. Both parties exchanging information.",
      "Vehicle backed into pole. Minor damage, driver uninjured.",
      "Sideswipe accident, both vehicles driveable."
    ],
    DOMESTIC_DISPUTE: [
      "Verbal argument between roommates about rent. Getting heated.",
      "Ex-partner at door refusing to leave. No violence reported.",
      "Custody exchange dispute. Both parents on scene.",
      "Family argument over property. Multiple family members involved.",
      "Couple arguing loudly, neighbors concerned but no violence heard."
    ]
  },
  
  // HIGH PRIORITY - Violence, serious crimes, immediate danger
  high: {
    ASSAULT: [
      "Fight in progress outside bar. Multiple individuals involved.",
      "Victim reports being punched by known suspect. Suspect still on scene.",
      "Road rage escalated to physical altercation. Both parties fighting.",
      "Domestic violence reported. Victim has visible injuries.",
      "Group assault on single victim. Suspects fled on foot."
    ],
    DUI: [
      "Vehicle swerving across lanes on highway. Multiple callers reporting.",
      "Driver crashed into mailbox, appears intoxicated. Still in vehicle.",
      "Bar patron extremely intoxicated, trying to get car keys.",
      "Wrong-way driver reported on main road. Speed approximately 40mph.",
      "Vehicle stopped in middle of intersection. Driver appears unconscious."
    ],
    BURGLARY: [
      "Burglary in progress. Caller hiding in bedroom closet.",
      "Silent alarm triggered at jewelry store. Multiple suspects seen inside.",
      "Home invasion reported. Suspects still inside with residents.",
      "Bank alarm activated. Employees evacuated, suspects possibly inside.",
      "Multiple masked individuals breaking into electronics store."
    ],
    VEHICLE_ACCIDENT: [
      "Multi-vehicle collision on highway. Injuries reported, lanes blocked.",
      "Motorcycle vs. car accident. Rider down and unresponsive.",
      "Vehicle rolled over. Occupants trapped inside.",
      "Head-on collision reported. Multiple casualties likely.",
      "School bus accident. Children on board, extent of injuries unknown."
    ],
    ASSAULT: [
      "Shooting reported. Victim down, suspect fled in vehicle.",
      "Stabbing incident at residence. Victim bleeding heavily.",
      "Armed robbery in progress at convenience store.",
      "Multiple shots fired. Several callers reporting.",
      "Officer needs assistance. Suspect fighting with officer."
    ]
  }
};

// Function to get random incident description based on type and priority
export const getIncidentDescription = (type, priority = 'medium') => {
  const priorityDescriptions = INCIDENT_DESCRIPTIONS[priority];
  if (!priorityDescriptions || !priorityDescriptions[type]) {
    // Fallback generic descriptions
    const generic = {
      low: "Minor incident reported at location. Non-urgent response requested.",
      medium: "Incident requiring police response. No immediate danger reported.",
      high: "Urgent situation requiring immediate response. Multiple units requested."
    };
    return generic[priority] || "Police response requested at location.";
  }
  
  const descriptions = priorityDescriptions[type];
  return descriptions[Math.floor(Math.random() * descriptions.length)];
};

// Enhanced incident types with icons and colors by priority
export const INCIDENT_CONFIG = {
  // Low Priority
  NOISE_COMPLAINT: { icon: '🔊', color: '#4CAF50', defaultPriority: 'low' },
  VANDALISM: { icon: '🎨', color: '#4CAF50', defaultPriority: 'low' },
  TRAFFIC_VIOLATION: { icon: '🚗', color: '#4CAF50', defaultPriority: 'low' },
  
  // Medium Priority
  THEFT: { icon: '💰', color: '#FF9800', defaultPriority: 'medium' },
  BURGLARY: { icon: '🏠', color: '#FF9800', defaultPriority: 'medium' },
  DISTURBANCE: { icon: '😤', color: '#FF9800', defaultPriority: 'medium' },
  DOMESTIC_DISPUTE: { icon: '🏘️', color: '#FF9800', defaultPriority: 'medium' },
  
  // High Priority
  ASSAULT: { icon: '👊', color: '#f44336', defaultPriority: 'high' },
  DUI: { icon: '🍺', color: '#f44336', defaultPriority: 'high' },
  VEHICLE_ACCIDENT: { icon: '💥', color: '#f44336', defaultPriority: 'high' }
};

// Get incident types by priority
export const getIncidentTypesByPriority = (priority) => {
  return Object.entries(INCIDENT_CONFIG)
    .filter(([_, config]) => config.defaultPriority === priority)
    .map(([type, _]) => type);
};