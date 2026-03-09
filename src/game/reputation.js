import { DEPARTMENTS } from './departments'
import { clamp } from './utils'

export const TRACKED_REPUTATION_DEPARTMENTS = [
  DEPARTMENTS.police.id,
  DEPARTMENTS.fire.id,
  DEPARTMENTS.ems.id,
  DEPARTMENTS.tow.id,
  DEPARTMENTS.public_works.id,
]

export const DEFAULT_REPUTATION_SCORE = 50

export const createInitialDepartmentReputation = (seed = DEFAULT_REPUTATION_SCORE) =>
  TRACKED_REPUTATION_DEPARTMENTS.reduce((acc, departmentId) => {
    acc[departmentId] = clamp(Number(seed) || DEFAULT_REPUTATION_SCORE, 0, 100)
    return acc
  }, {})

export const normalizeDepartmentReputation = (input) => {
  const baseline = createInitialDepartmentReputation()
  if (!input || typeof input !== 'object') return baseline
  return TRACKED_REPUTATION_DEPARTMENTS.reduce((acc, departmentId) => {
    acc[departmentId] = clamp(
      Number(input[departmentId] ?? baseline[departmentId]) || baseline[departmentId],
      0,
      100
    )
    return acc
  }, {})
}

const RESOLVED_GRADE_DELTAS = {
  excellent: 2,
  good: 1,
  late: -1,
  poor: -2,
}

export const applyDepartmentReputationEvent = ({
  reputation,
  departmentId,
  type,
  grade,
  amount,
}) => {
  if (!TRACKED_REPUTATION_DEPARTMENTS.includes(departmentId)) {
    return normalizeDepartmentReputation(reputation)
  }
  const next = normalizeDepartmentReputation(reputation)
  const normalizedType = String(type || '').toLowerCase()
  let delta = 0

  if (normalizedType === 'resolved') {
    const normalizedGrade = String(grade || '').toLowerCase()
    delta = RESOLVED_GRADE_DELTAS[normalizedGrade] ?? 0
  } else if (normalizedType === 'missed') {
    delta = -3
  } else if (normalizedType === 'manual') {
    delta = Number(amount) || 0
  }

  next[departmentId] = clamp(next[departmentId] + delta, 0, 100)
  return next
}

export const getDepartmentReputationTier = (value) => {
  const score = clamp(Number(value) || 0, 0, 100)
  if (score >= 80) return 'elite'
  if (score >= 65) return 'trusted'
  if (score >= 45) return 'steady'
  if (score >= 30) return 'strained'
  return 'critical'
}

export const getDepartmentReputationLabel = (value) => {
  const tier = getDepartmentReputationTier(value)
  if (tier === 'elite') return 'Elite'
  if (tier === 'trusted') return 'Trusted'
  if (tier === 'steady') return 'Steady'
  if (tier === 'strained') return 'Strained'
  return 'Critical'
}

export const getDepartmentReputationModifiers = (value) => {
  const score = clamp(Number(value) || DEFAULT_REPUTATION_SCORE, 0, 100)
  const centered = (score - DEFAULT_REPUTATION_SCORE) / 50
  return {
    rewardMultiplier: clamp(1 + centered * 0.18, 0.84, 1.18),
    responseTargetMultiplier: clamp(1 - centered * 0.08, 0.92, 1.08),
    missPenaltyMultiplier: clamp(1 - centered * 0.12, 0.82, 1.12),
    dispatchScoreBonus: clamp(centered * 1.3, -1.5, 1.5),
    chainChanceBonus: clamp(centered * 0.08, -0.1, 0.12),
    mutualAidCostMultiplier: clamp(1 - centered * 0.15, 0.82, 1.18),
  }
}
