// Incident scenarios with detailed reports
export const INCIDENT_SCENARIOS = {
  VEHICLE_ACCIDENT: [
    {
      severity: 'minor',
      report: "Two vehicle collision at {street}. Driver of {color1} {vehicle1} failed to yield at intersection, striking {color2} {vehicle2}. Minor damage, no injuries reported. Both drivers exchanged information.",
      responseTime: 45000,
      priority: 'medium'
    },
    {
      severity: 'major',
      report: "Multi-vehicle accident on {street}. {color1} {vehicle1} ran red light at high speed, causing chain reaction involving 3 vehicles. Multiple injuries reported, ambulance requested. Traffic blocked in all directions.",
      responseTime: 90000,
      priority: 'high'
    },
    {
      severity: 'hit_and_run',
      report: "Hit and run incident at {street}. Witness reports {color1} {vehicle1} struck parked vehicle and fled scene heading {direction}. Significant damage to victim's vehicle. Partial plate: {plate}",
      responseTime: 120000,
      priority: 'high'
    }
  ],
  
  THEFT: [
    {
      severity: 'shoplifting',
      // eslint-disable-next-line no-template-curly-in-string
      report: "Shoplifting at {business} on {street}. Suspect described as {suspect_description} took {item} valued at ${value}. Last seen heading {direction} on foot.",
      responseTime: 60000,
      priority: 'low'
    },
    {
      severity: 'vehicle',
      report: "Vehicle theft reported at {street}. Owner reports {color1} {vehicle1} stolen from driveway. Vehicle was locked, no broken glass found. Occurred between {time1} and {time2}.",
      responseTime: 90000,
      priority: 'high'
    },
    {
      severity: 'burglary',
      report: "Residential burglary at {street}. Homeowner returned to find rear door forced open. Missing items include {items}. Neighbors report seeing {suspect_description} in area earlier.",
      responseTime: 120000,
      priority: 'high'
    }
  ],
  
  DISTURBANCE: [
    {
      severity: 'verbal',
      report: "Verbal altercation at {street}. Two individuals arguing loudly outside {business}. No physical contact observed. Crowd beginning to gather.",
      responseTime: 45000,
      priority: 'medium'
    },
    {
      severity: 'physical',
      report: "Physical fight in progress at {street}. Multiple individuals involved outside {business}. Witnesses report bottles being thrown. Several bystanders recording on phones.",
      responseTime: 60000,
      priority: 'high'
    },
    {
      severity: 'domestic',
      report: "Domestic disturbance at {street}. Neighbors report loud arguing and sounds of breaking items from apartment {number}. Female voice heard screaming. History of calls to this address.",
      responseTime: 90000,
      priority: 'high'
    }
  ],
  
  FIRE: [
    {
      severity: 'small',
      report: "Small fire reported at {street}. Resident reports kitchen fire, attempting to extinguish. Smoke visible from street. All occupants evacuated safely.",
      responseTime: 120000,
      priority: 'high'
    },
    {
      severity: 'structure',
      report: "Structure fire at {street}. Heavy smoke and flames visible from second floor of {building_type}. Multiple residents evacuating. Possible entrapment reported.",
      responseTime: 180000,
      priority: 'critical'
    }
  ],
  
  MEDICAL_EMERGENCY: [
    {
      severity: 'minor',
      report: "Medical assist requested at {street}. Elderly {gender} fell, conscious and alert but unable to stand. No obvious injuries, requesting evaluation.",
      responseTime: 60000,
      priority: 'medium'
    },
    {
      severity: 'serious',
      report: "Cardiac emergency at {street}. {age} year old {gender} experiencing chest pains and difficulty breathing. Conscious but pale and sweating. History of heart conditions.",
      responseTime: 90000,
      priority: 'critical'
    }
  ],
  
  NOISE_COMPLAINT: [
    {
      severity: 'party',
      report: "Loud party at {street}. Music audible from several houses away. Approximately {number} people visible in backyard. Cars blocking driveways.",
      responseTime: 30000,
      priority: 'low'
    },
    {
      severity: 'construction',
      report: "Illegal construction noise at {street}. Contractor operating heavy machinery outside permitted hours. Multiple neighbors affected.",
      responseTime: 45000,
      priority: 'low'
    }
  ]
};

// Template variables that can be randomized
export const SCENARIO_VARIABLES = {
  color1: ['red', 'blue', 'white', 'black', 'silver', 'green', 'gray'],
  color2: ['red', 'blue', 'white', 'black', 'silver', 'green', 'gray'],
  vehicle1: ['sedan', 'SUV', 'pickup truck', 'van', 'motorcycle', 'compact car'],
  vehicle2: ['sedan', 'SUV', 'pickup truck', 'van', 'motorcycle', 'compact car'],
  direction: ['north', 'south', 'east', 'west', 'northbound', 'southbound', 'eastbound', 'westbound'],
  business: ['7-Eleven', 'Tim Hortons', 'Canadian Tire', 'Sobeys', 'Shell Gas Station', 'McDonald\'s'],
  item: ['electronics', 'clothing', 'alcohol', 'tools', 'jewelry'],
  value: [50, 100, 200, 500, 1000, 2000],
  items: ['laptop and jewelry', 'TV and gaming console', 'cash and credit cards', 'tools and equipment'],
  suspect_description: [
    'male, 20s, wearing dark hoodie',
    'female, 30s, blonde hair, blue jacket',
    'male, teens, red baseball cap',
    'male, 40s, beard, plaid shirt',
    'female, 20s, tattoos on arms'
  ],
  building_type: ['residential house', 'apartment building', 'commercial building', 'townhouse'],
  gender: ['male', 'female'],
  age: [25, 35, 45, 55, 65, 75, 85],
  number: [10, 20, 30, 40, 50],
  time1: ['10:00 PM', '11:00 PM', '12:00 AM', '6:00 AM', '7:00 AM'],
  time2: ['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM'],
  plate: ['ABC-1', 'XYZ-9', 'DEF-3', 'GHI-7', 'JKL-5']
};