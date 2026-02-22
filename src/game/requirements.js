import { DEFAULT_DEPARTMENT_ID } from './departments'

export const normalizeRequirementSet = ({
  requiredUnits,
  requiredUnitType,
  requiredDepartment,
}) => {
  const normalizedUnits = Math.max(1, Number(requiredUnits) || 1)
  const normalizedType =
    requiredUnitType && requiredUnitType !== 'any' ? requiredUnitType : null
  const normalizedDepartment =
    requiredDepartment && requiredDepartment !== 'any'
      ? requiredDepartment
      : DEFAULT_DEPARTMENT_ID

  return {
    requiredUnits: normalizedUnits,
    requiredUnitType: normalizedType,
    requiredDepartment: normalizedDepartment,
  }
}
