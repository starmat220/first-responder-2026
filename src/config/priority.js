const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const PRIORITY_CONFIG = {
  1: {
    label: 'P1',
    responseTargetSeconds: 110,
    reward: 220,
    missPenalty: -85,
    trustPenalty: -5,
  },
  2: {
    label: 'P2',
    responseTargetSeconds: 180,
    reward: 160,
    missPenalty: -55,
    trustPenalty: -3,
  },
  3: {
    label: 'P3',
    responseTargetSeconds: 240,
    reward: 100,
    missPenalty: -35,
    trustPenalty: -2,
  },
}

export const getPriorityConfig = (priority) => PRIORITY_CONFIG[priority] || PRIORITY_CONFIG[2]

const normalizeWeights = (weights) => {
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0)
  return Object.fromEntries(
    Object.entries(weights).map(([key, value]) => [key, value / total])
  )
}

export const pickPriority = (date = new Date(), trust = 60) => {
  const hour = date.getHours()
  let weights = { 1: 0.2, 2: 0.5, 3: 0.3 }

  if (hour >= 20 || hour < 6) {
    weights = { 1: weights[1] + 0.05, 2: weights[2] + 0.05, 3: weights[3] - 0.1 }
  }

  if (trust < 40) {
    weights = { 1: weights[1] + 0.05, 2: weights[2] + 0.05, 3: weights[3] - 0.1 }
  } else if (trust > 75) {
    weights = { 1: weights[1] - 0.05, 2: weights[2], 3: weights[3] + 0.05 }
  }

  const normalized = normalizeWeights({
    1: clamp(weights[1], 0.05, 0.9),
    2: clamp(weights[2], 0.05, 0.9),
    3: clamp(weights[3], 0.05, 0.9),
  })

  const roll = Math.random()
  if (roll < normalized[1]) return 1
  if (roll < normalized[1] + normalized[2]) return 2
  return 3
}
