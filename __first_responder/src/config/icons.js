// Icon configuration for all units and incidents
// Replace the URLs with your own image paths or base64 encoded images

export const UNIT_ICONS = {
  // Police Units
  PATROL_CAR: {
    emoji: '🚔',
    image: '/assets/units/patrol_car.png', // Replace with your image
    mapIcon: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png'
  },
  MOTORCYCLE: {
    emoji: '🏍️',
    image: '/assets/units/motorcycle.png',
    mapIcon: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png'
  },
  K9_UNIT: {
    emoji: '🐕‍🦺',
    image: '/assets/units/k9_unit.png',
    mapIcon: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png'
  },
  SWAT: {
    emoji: '🚐',
    image: '/assets/units/swat.png',
    mapIcon: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-black.png'
  },
  HELICOPTER: {
    emoji: '🚁',
    image: '/assets/units/helicopter.png',
    mapIcon: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png'
  },
  
  // Fire Units
  FIRE_ENGINE: {
    emoji: '🚒',
    image: '/assets/units/fire_engine.png',
    mapIcon: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png'
  },
  LADDER_TRUCK: {
    emoji: '🚒',
    image: '/assets/units/ladder_truck.png',
    mapIcon: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png'
  },
  
  // Medical Units
  AMBULANCE: {
    emoji: '🚑',
    image: '/assets/units/ambulance.png',
    mapIcon: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png'
  },
  PARAMEDIC: {
    emoji: '🚑',
    image: '/assets/units/paramedic.png',
    mapIcon: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png'
  }
};

export const INCIDENT_ICONS = {
  // Crime
  THEFT: {
    emoji: '🔓',
    image: '/assets/incidents/theft.png',
    color: '#FF5252'
  },
  BURGLARY: {
    emoji: '🏠',
    image: '/assets/incidents/burglary.png',
    color: '#FF5252'
  },
  ASSAULT: {
    emoji: '👊',
    image: '/assets/incidents/assault.png',
    color: '#D32F2F'
  },
  VANDALISM: {
    emoji: '🎨',
    image: '/assets/incidents/vandalism.png',
    color: '#FF9800'
  },
  
  // Traffic
  TRAFFIC_VIOLATION: {
    emoji: '🚗',
    image: '/assets/incidents/traffic_violation.png',
    color: '#FFC107'
  },
  VEHICLE_ACCIDENT: {
    emoji: '💥',
    image: '/assets/incidents/vehicle_accident.png',
    color: '#FF5252'
  },
  HIT_AND_RUN: {
    emoji: '🏃',
    image: '/assets/incidents/hit_and_run.png',
    color: '#D32F2F'
  },
  DUI: {
    emoji: '🍺',
    image: '/assets/incidents/dui.png',
    color: '#D32F2F'
  },
  
  // Public Order
  DISTURBANCE: {
    emoji: '📢',
    image: '/assets/incidents/disturbance.png',
    color: '#FF9800'
  },
  NOISE_COMPLAINT: {
    emoji: '🔊',
    image: '/assets/incidents/noise_complaint.png',
    color: '#FFC107'
  },
  DOMESTIC_DISPUTE: {
    emoji: '🏠',
    image: '/assets/incidents/domestic_dispute.png',
    color: '#FF5252'
  },
  
  // Emergency
  FIRE: {
    emoji: '🔥',
    image: '/assets/incidents/fire.png',
    color: '#D32F2F'
  },
  MEDICAL_EMERGENCY: {
    emoji: '🏥',
    image: '/assets/incidents/medical.png',
    color: '#D32F2F'
  },
  MISSING_PERSON: {
    emoji: '🔍',
    image: '/assets/incidents/missing_person.png',
    color: '#FF9800'
  }
};

// Station icons
export const STATION_ICONS = {
  POLICE_STATION: {
    emoji: '🏛️',
    image: '/assets/stations/police_station.png',
    mapIcon: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png'
  },
  FIRE_STATION: {
    emoji: '🚒',
    image: '/assets/stations/fire_station.png',
    mapIcon: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png'
  },
  HOSPITAL: {
    emoji: '🏥',
    image: '/assets/stations/hospital.png',
    mapIcon: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png'
  }
};