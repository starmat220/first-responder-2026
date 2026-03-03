import { SKILL_TYPES } from './constants'

const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth',
  'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen',
  'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra',
  'Alex', 'Jordan', 'Casey', 'Taylor', 'Jamie', 'Morgan', 'Riley', 'Sam', 'Dakota', 'Reese'
]

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
]

export const generateCrewMember = (departmentId) => {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]

  // Base skills (1-10)
  const skills = {
    driving: Math.floor(Math.random() * 4) + 1,
    [SKILL_TYPES.tactics]: Math.floor(Math.random() * 4) + 1,
    [SKILL_TYPES.suppression]: Math.floor(Math.random() * 4) + 1,
    [SKILL_TYPES.medical]: Math.floor(Math.random() * 4) + 1,
    [SKILL_TYPES.recovery]: Math.floor(Math.random() * 4) + 1,
  }

  // Department bonuses
  if (departmentId === 'police') {
    skills[SKILL_TYPES.tactics] += 2
    skills.driving += 1
  } else if (departmentId === 'fire') {
    skills[SKILL_TYPES.suppression] += 2
    skills[SKILL_TYPES.recovery] += 1
  } else if (departmentId === 'ems') {
    skills[SKILL_TYPES.medical] += 3
  } else if (departmentId === 'tow') {
    skills[SKILL_TYPES.recovery] += 3
    skills.driving += 1
  } else if (departmentId === 'public_works') {
    skills[SKILL_TYPES.recovery] += 2
    skills[SKILL_TYPES.suppression] += 1
  }

  Object.keys(skills).forEach((key) => {
    if (skills[key] > 10) skills[key] = 10
  })

  const traitPools = {
    police: ['veteran', 'investigator', 'steady_hands'],
    fire: ['fireproof', 'resilient', 'composed'],
    ems: ['triage_specialist', 'composed', 'steady_hands'],
    tow: ['precision_driver', 'resilient', 'steady_hands'],
    public_works: ['logistics_mind', 'resilient', 'steady_hands'],
  }
  const pool = traitPools[departmentId] || ['resilient', 'steady_hands']
  const trait = pool[Math.floor(Math.random() * pool.length)]

  const certByDepartment = {
    police: 'pursuit_ops',
    fire: 'rescue_ops',
    ems: 'trauma_care',
    tow: 'heavy_recovery',
    public_works: 'infrastructure_ops',
  }
  const certifications = [certByDepartment[departmentId] || 'field_ops']

  return {
    id: `crew-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    name: `${firstName} ${lastName}`,
    department: departmentId,
    skills,
    // Keep legacy field name so older UI code still renders.
    stats: skills,
    role: 'Probationary',
    level: 1,
    xp: 0,
    trait,
    certifications,
    stress: 0,
    status: 'available',
    assignedVehicleId: null,
    fatigue: 0,
    shiftRemaining: 100,
  }
}
