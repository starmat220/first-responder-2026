import { DEPARTMENTS } from './departments'

const MISSION_CONFIG = {
  [DEPARTMENTS.police.id]: { target: 5, reward: 350, trustBonus: 2 },
  [DEPARTMENTS.fire.id]: { target: 4, reward: 400, trustBonus: 2 },
  [DEPARTMENTS.ems.id]: { target: 4, reward: 380, trustBonus: 2 },
  [DEPARTMENTS.tow.id]: { target: 4, reward: 320, trustBonus: 1 },
}

export const getMissionDayKey = (date = new Date()) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const createDailyGoals = (dayKey = getMissionDayKey()) =>
  Object.entries(MISSION_CONFIG).map(([departmentId, config]) => ({
    id: `goal-${departmentId}-${dayKey}`,
    dayKey,
    departmentId,
    title: `${DEPARTMENTS[departmentId]?.label || 'Department'} daily quota`,
    target: config.target,
    progress: 0,
    reward: config.reward,
    trustBonus: config.trustBonus,
    completed: false,
    claimed: false,
  }))

export const applyGoalProgress = ({ goals, departmentId, amount = 1 }) => {
  const newlyCompletedGoalIds = []
  const nextGoals = goals.map((goal) => {
    if (goal.departmentId !== departmentId) return goal
    if (goal.claimed || goal.completed) return goal
    const progress = Math.min(goal.target, (goal.progress || 0) + amount)
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
