export const PROGRESSION_HOOKS = [
  {
    id: 'specialization_doctrine',
    title: 'Station Specialization Doctrine',
    detail: 'Enable specialization tracks for each station department.',
    minLevel: 2,
    minResolved: 10,
    unlockReward: 250,
    trustBonus: 1,
  },
  {
    id: 'incident_chain_protocol',
    title: 'Incident Chain Protocol',
    detail: 'Improves follow-up generation and multi-stage operations.',
    minLevel: 3,
    minResolved: 18,
    unlockReward: 300,
    trustBonus: 1,
  },
  {
    id: 'department_reputation',
    title: 'Department Reputation Ledger',
    detail: 'Unlock department-level reputation bonuses and penalties.',
    minLevel: 3,
    minResolved: 20,
    unlockReward: 320,
    trustBonus: 2,
  },
  {
    id: 'live_ops_network',
    title: 'Live Operations Network',
    detail: 'Enables rotating live regional events that affect demand.',
    minLevel: 4,
    minResolved: 24,
    unlockReward: 380,
    trustBonus: 1,
  },
  {
    id: 'mutual_aid_command',
    title: 'Mutual Aid Command Link',
    detail: 'Unlocks reduced cooldown and smarter mutual aid dispatching.',
    minLevel: 5,
    minResolved: 30,
    unlockReward: 420,
    trustBonus: 1,
  },
]

export const normalizeUnlockedProgressionHooks = (input) => {
  const source = input && typeof input === 'object' ? input : {}
  return PROGRESSION_HOOKS.reduce((acc, hook) => {
    acc[hook.id] = Boolean(source[hook.id])
    return acc
  }, {})
}

export const evaluateProgressionHooks = ({
  level = 1,
  resolvedCount = 0,
  unlocked,
}) => {
  const baseline = normalizeUnlockedProgressionHooks(unlocked)
  const currentLevel = Math.max(1, Number(level) || 1)
  const currentResolved = Math.max(0, Number(resolvedCount) || 0)

  const nextUnlocked = { ...baseline }
  const newlyUnlocked = []

  PROGRESSION_HOOKS.forEach((hook) => {
    const qualifies = currentLevel >= hook.minLevel && currentResolved >= hook.minResolved
    if (qualifies && !baseline[hook.id]) {
      nextUnlocked[hook.id] = true
      newlyUnlocked.push(hook)
    }
  })

  const nextMilestone = PROGRESSION_HOOKS.find((hook) => !nextUnlocked[hook.id]) || null

  return {
    unlocked: nextUnlocked,
    newlyUnlocked,
    nextMilestone,
  }
}
