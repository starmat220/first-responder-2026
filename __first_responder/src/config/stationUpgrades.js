// Police Station Upgrade System Configuration

export const STATION_LEVELS = {
  1: {
    name: 'Small Station',
    maxVehicles: 3,
    maxStaff: 6,
    parkingSpaces: 3,
    upgradeCost: 2500,
    description: 'Basic police station with limited facilities',
    features: ['Basic dispatch', 'Small parking lot', 'Holding cell'],
    icon: '🏢'
  },
  2: {
    name: 'Medium Station',
    maxVehicles: 5,
    maxStaff: 12,
    parkingSpaces: 5,
    upgradeCost: 5000,
    description: 'Expanded station with better facilities',
    features: ['Improved dispatch', 'Medium parking lot', '2 Holding cells', 'Break room'],
    icon: '🏢'
  },
  3: {
    name: 'Large Station',
    maxVehicles: 8,
    maxStaff: 20,
    parkingSpaces: 8,
    upgradeCost: 10000,
    description: 'Full-service police station',
    features: ['Advanced dispatch', 'Large parking lot', 'Detention area', 'Training room', 'Armory'],
    icon: '🏛️'
  },
  4: {
    name: 'Regional HQ',
    maxVehicles: 12,
    maxStaff: 35,
    parkingSpaces: 12,
    upgradeCost: 20000,
    description: 'Regional headquarters with specialized units',
    features: ['Command center', 'Multi-level parking', 'SWAT ready room', 'K9 facilities', 'Helipad'],
    icon: '🏛️'
  },
  5: {
    name: 'Metro Command Center',
    maxVehicles: 20,
    maxStaff: 60,
    parkingSpaces: 20,
    upgradeCost: null, // Max level
    description: 'State-of-the-art law enforcement facility',
    features: ['Crisis management center', 'Underground parking', 'Multiple specialized units', 'Emergency operations', 'Drone command'],
    icon: '🏛️'
  }
};

// Individual upgrade options for stations
export const STATION_UPGRADES = {
  PARKING_EXPANSION: {
    id: 'parking_expansion',
    name: 'Parking Expansion',
    description: 'Add 2 additional parking spaces',
    cost: 1500,
    effect: { parkingSpaces: 2 },
    maxPurchases: 3,
    requirements: { minLevel: 2 },
    icon: '🅿️'
  },
  QUICK_RESPONSE_BAY: {
    id: 'quick_response_bay',
    name: 'Quick Response Bay',
    description: 'Vehicles deploy 25% faster',
    cost: 3000,
    effect: { deploySpeed: 0.25 },
    maxPurchases: 1,
    requirements: { minLevel: 2 },
    icon: '⚡'
  },
  TRAINING_FACILITY: {
    id: 'training_facility',
    name: 'Training Facility',
    description: 'Units gain experience 50% faster',
    cost: 4000,
    effect: { experienceBonus: 0.5 },
    maxPurchases: 1,
    requirements: { minLevel: 3 },
    icon: '🎓'
  },
  DISPATCH_COMPUTER: {
    id: 'dispatch_computer',
    name: 'Advanced Dispatch',
    description: 'See incident details before arrival',
    cost: 2000,
    effect: { advancedDispatch: true },
    maxPurchases: 1,
    requirements: { minLevel: 2 },
    icon: '💻'
  },
  MAINTENANCE_GARAGE: {
    id: 'maintenance_garage',
    name: 'Maintenance Garage',
    description: 'Vehicles auto-repair after missions',
    cost: 3500,
    effect: { autoRepair: true },
    maxPurchases: 1,
    requirements: { minLevel: 3 },
    icon: '🔧'
  },
  FUEL_DEPOT: {
    id: 'fuel_depot',
    name: 'Fuel Depot',
    description: 'Reduced operating costs by 20%',
    cost: 2500,
    effect: { operatingCostReduction: 0.2 },
    maxPurchases: 1,
    requirements: { minLevel: 2 },
    icon: '⛽'
  },
  HOLDING_CELLS: {
    id: 'holding_cells',
    name: 'Extra Holding Cells',
    description: 'Process arrests 30% faster',
    cost: 3000,
    effect: { arrestProcessing: 0.3 },
    maxPurchases: 2,
    requirements: { minLevel: 2 },
    icon: '🔒'
  },
  HELIPAD: {
    id: 'helipad',
    name: 'Helipad',
    description: 'Enables helicopter unit purchases',
    cost: 15000,
    effect: { enableHelicopter: true },
    maxPurchases: 1,
    requirements: { minLevel: 4 },
    icon: '🚁'
  },
  K9_KENNEL: {
    id: 'k9_kennel',
    name: 'K9 Kennel',
    description: 'K9 units perform 40% better',
    cost: 4000,
    effect: { k9Bonus: 0.4 },
    maxPurchases: 1,
    requirements: { minLevel: 2 },
    icon: '🐕'
  },
  EMERGENCY_GENERATOR: {
    id: 'emergency_generator',
    name: 'Emergency Generator',
    description: 'Station operates during disasters',
    cost: 5000,
    effect: { disasterResilience: true },
    maxPurchases: 1,
    requirements: { minLevel: 3 },
    icon: '🔌'
  }
};

// Calculate total station capacity
export const calculateStationCapacity = (station) => {
  const baseLevel = STATION_LEVELS[station.level || 1];
  let capacity = {
    maxVehicles: baseLevel.maxVehicles,
    maxStaff: baseLevel.maxStaff,
    parkingSpaces: baseLevel.parkingSpaces,
    features: [...baseLevel.features]
  };
  
  // Apply upgrades
  if (station.upgrades) {
    Object.entries(station.upgrades).forEach(([upgradeId, purchaseCount]) => {
      const upgrade = STATION_UPGRADES[upgradeId];
      if (upgrade && purchaseCount > 0) {
        if (upgrade.effect.parkingSpaces) {
          capacity.parkingSpaces += upgrade.effect.parkingSpaces * purchaseCount;
          capacity.maxVehicles += upgrade.effect.parkingSpaces * purchaseCount;
        }
        if (upgrade.effect.enableHelicopter) {
          capacity.features.push('Helicopter support');
        }
      }
    });
  }
  
  return capacity;
};

// Get available upgrades for a station
export const getAvailableUpgrades = (station) => {
  const stationLevel = station.level || 1;
  const purchasedUpgrades = station.upgrades || {};
  
  return Object.entries(STATION_UPGRADES).filter(([id, upgrade]) => {
    // Check level requirement
    if (stationLevel < upgrade.requirements.minLevel) return false;
    
    // Check if max purchases reached
    const purchased = purchasedUpgrades[id] || 0;
    if (purchased >= upgrade.maxPurchases) return false;
    
    return true;
  }).map(([id, upgrade]) => ({
    ...upgrade,
    purchasedCount: purchasedUpgrades[id] || 0
  }));
};

// Calculate upgrade effects for a station
export const getStationEffects = (station) => {
  const effects = {
    deploySpeed: 1,
    experienceBonus: 1,
    advancedDispatch: false,
    autoRepair: false,
    operatingCostReduction: 0,
    arrestProcessing: 1,
    enableHelicopter: false,
    k9Bonus: 1,
    disasterResilience: false
  };
  
  if (station.upgrades) {
    Object.entries(station.upgrades).forEach(([upgradeId, purchaseCount]) => {
      const upgrade = STATION_UPGRADES[upgradeId];
      if (upgrade && purchaseCount > 0) {
        Object.entries(upgrade.effect).forEach(([key, value]) => {
          if (typeof value === 'boolean') {
            effects[key] = value;
          } else if (typeof value === 'number') {
            if (key === 'operatingCostReduction') {
              effects[key] += value * purchaseCount;
            } else {
              effects[key] += value * purchaseCount;
            }
          }
        });
      }
    });
  }
  
  return effects;
};