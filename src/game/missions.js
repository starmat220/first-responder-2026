import { DEPARTMENTS } from './departments'

const MISSION_CONFIG = {
  [DEPARTMENTS.police.id]: { target: 5, reward: 350, trustBonus: 2 },
  [DEPARTMENTS.fire.id]: { target: 4, reward: 400, trustBonus: 2 },
  [DEPARTMENTS.ems.id]: { target: 4, reward: 380, trustBonus: 2 },
  [DEPARTMENTS.tow.id]: { target: 4, reward: 320, trustBonus: 1 },
}

const CONTRACT_CONFIG = [
  {
    id: 'rapid-response',
    kind: 'contract_rapid_response',
    title: 'Rapid response contract',
    target: 6,
    reward: 520,
    trustBonus: 3,
  },
  {
    id: 'quality-assurance',
    kind: 'contract_quality_assurance',
    title: 'Quality assurance contract',
    target: 5,
    reward: 480,
    trustBonus: 2,
  },
  {
    id: 'multi-stage-closure',
    kind: 'contract_multistage_closure',
    title: 'Multi-stage closure contract',
    target: 3,
    reward: 640,
    trustBonus: 3,
  },
  {
    id: 'budget-performance',
    kind: 'contract_budget_performance',
    title: 'Budget performance contract',
    target: 2200,
    reward: 700,
    trustBonus: 2,
  },
]

export const getMissionDayKey = (date = new Date()) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const createDailyGoals = (dayKey = getMissionDayKey(), streakDays = 0) => {
  const safeStreak = Math.max(0, Number(streakDays) || 0)
  const quotaGoals = Object.entries(MISSION_CONFIG).map(([departmentId, config]) => ({
    id: `goal-${departmentId}-${dayKey}`,
    dayKey,
    departmentId,
    kind: 'department_quota',
    category: 'quota',
    title: `${DEPARTMENTS[departmentId]?.label || 'Department'} daily quota`,
    target: config.target + Math.floor(safeStreak / 6),
    progress: 0,
    reward: config.reward + safeStreak * 20,
    trustBonus: config.trustBonus,
    completed: false,
    claimed: false,
  }))

  const contractGoals = CONTRACT_CONFIG.map((contract) => ({
    id: `goal-${contract.id}-${dayKey}`,
    dayKey,
    departmentId: null,
    kind: contract.kind,
    category: 'contract',
    title: contract.title,
    target:
      contract.kind === 'contract_budget_performance'
        ? contract.target + safeStreak * 100
        : contract.target + Math.floor(safeStreak / 5),
    progress: 0,
    reward: contract.reward + safeStreak * 25,
    trustBonus: contract.trustBonus,
    completed: false,
    claimed: false,
  }))

  return [...quotaGoals, ...contractGoals]
}

export const normalizeDailyGoals = (
  goals,
  dayKey = getMissionDayKey(),
  streakDays = 0
) => {
  const templateGoals = createDailyGoals(dayKey, streakDays)
  if (!Array.isArray(goals) || goals.length === 0) return templateGoals

  return templateGoals.map((template) => {
    const source =
      goals.find(
        (goal) =>
          goal?.kind === template.kind &&
          (goal.dayKey === dayKey || !goal.dayKey)
      ) ||
      (template.departmentId
        ? goals.find((goal) => goal?.departmentId === template.departmentId)
        : null) ||
      goals.find((goal) => goal?.id === template.id)

    if (!source) return template

    const progress = Math.max(0, Number(source.progress) || 0)
    const target = Math.max(1, Number(source.target) || template.target)
    const completed = source.completed != null ? Boolean(source.completed) : progress >= target

    return {
      ...template,
      target,
      progress: Math.min(progress, target),
      completed,
      claimed: Boolean(source.claimed),
    }
  })
}

export const applyGoalProgress = ({ goals, departmentId, amount = 1, event = null }) => {
  const newlyCompletedGoalIds = []
  const safeAmount = Math.max(0, Number(amount) || 0)
  const safeReward = Math.max(0, Number(event?.reward) || 0)
  const safeStage = Math.max(1, Number(event?.stage) || 1)
  const resolvedOnTime =
    Number.isFinite(event?.responseSeconds) &&
    Number.isFinite(event?.responseTargetSeconds) &&
    event.responseSeconds <= event.responseTargetSeconds
  const strongGrade = ['good', 'excellent'].includes(String(event?.grade || '').toLowerCase())

  const nextGoals = goals.map((goal) => {
    if (goal.claimed || goal.completed) return goal

    let delta = 0
    if (goal.kind === 'department_quota') {
      if (goal.departmentId !== departmentId) return goal
      delta = safeAmount
    } else if (goal.kind === 'contract_rapid_response') {
      delta = resolvedOnTime ? safeAmount : 0
    } else if (goal.kind === 'contract_quality_assurance') {
      delta = strongGrade ? safeAmount : 0
    } else if (goal.kind === 'contract_multistage_closure') {
      delta = safeStage > 1 ? safeAmount : 0
    } else if (goal.kind === 'contract_budget_performance') {
      delta = safeReward
    }

    if (delta <= 0) return goal

    const progress = Math.min(goal.target, (goal.progress || 0) + delta)
    const completed = progress >= goal.target
    if (completed) {
      newlyCompletedGoalIds.push(goal.id)
    }
    return {
      ...goal,
      progress,
      completed,
      claimed: goal.claimed,
    }
  })
  return { goals: nextGoals, newlyCompletedGoalIds }
}
