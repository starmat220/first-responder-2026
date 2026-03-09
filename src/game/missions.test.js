import { describe, expect, it } from 'vitest'
import {
  applyGoalProgress,
  createDailyGoals,
  normalizeDailyGoals,
} from './missions'
import { DEPARTMENTS } from './departments'

describe('missions contracts', () => {
  it('creates department quotas plus contract goals', () => {
    const goals = createDailyGoals('2026-03-02', 2)
    expect(goals.some((goal) => goal.kind === 'department_quota')).toBe(true)
    expect(goals.some((goal) => goal.kind === 'contract_rapid_response')).toBe(true)
    expect(goals.some((goal) => goal.kind === 'contract_budget_performance')).toBe(true)
  })

  it('tracks contract progress from resolution telemetry events', () => {
    const goals = createDailyGoals('2026-03-02')
    const result = applyGoalProgress({
      goals,
      departmentId: DEPARTMENTS.police.id,
      amount: 1,
      event: {
        reward: 400,
        grade: 'excellent',
        stage: 2,
        responseSeconds: 50,
        responseTargetSeconds: 90,
      },
    })

    const rapidGoal = result.goals.find((goal) => goal.kind === 'contract_rapid_response')
    const qualityGoal = result.goals.find((goal) => goal.kind === 'contract_quality_assurance')
    const stageGoal = result.goals.find((goal) => goal.kind === 'contract_multistage_closure')
    const revenueGoal = result.goals.find((goal) => goal.kind === 'contract_budget_performance')

    expect(rapidGoal.progress).toBe(1)
    expect(qualityGoal.progress).toBe(1)
    expect(stageGoal.progress).toBe(1)
    expect(revenueGoal.progress).toBe(400)
  })

  it('normalizes legacy goals while preserving progress', () => {
    const legacyGoals = [
      {
        departmentId: DEPARTMENTS.police.id,
        progress: 3,
        target: 5,
        completed: false,
        claimed: false,
      },
    ]

    const normalized = normalizeDailyGoals(legacyGoals, '2026-03-02', 0)
    const policeGoal = normalized.find(
      (goal) =>
        goal.kind === 'department_quota' && goal.departmentId === DEPARTMENTS.police.id
    )
    expect(policeGoal.progress).toBe(3)
    expect(policeGoal.target).toBe(5)
  })
})
