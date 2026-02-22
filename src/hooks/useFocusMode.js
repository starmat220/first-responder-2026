import { useCallback, useEffect, useMemo, useState } from 'react'

export const useFocusMode = ({
  incidentFilters,
  primaryDepartmentId,
  defaultDepartmentId,
  shortcutKey = 'f',
}) => {
  const [focusMode, setFocusMode] = useState(false)

  const focusDepartmentId = useMemo(() => {
    if (incidentFilters.onlyActiveDepartment) {
      return primaryDepartmentId || defaultDepartmentId
    }
    if (incidentFilters.department && incidentFilters.department !== 'all') {
      return incidentFilters.department
    }
    return primaryDepartmentId || defaultDepartmentId
  }, [
    incidentFilters.department,
    incidentFilters.onlyActiveDepartment,
    primaryDepartmentId,
    defaultDepartmentId,
  ])

  const isFocusEnabled = focusMode && !!focusDepartmentId

  const getFocusFactor = useCallback(
    (departmentId) => {
      if (!isFocusEnabled) return 1
      return (departmentId || defaultDepartmentId) === focusDepartmentId ? 1 : 0.35
    },
    [defaultDepartmentId, focusDepartmentId, isFocusEnabled]
  )

  const resetFocusMode = useCallback(() => {
    setFocusMode(false)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.repeat) return
      const target = event.target
      if (target && target instanceof HTMLElement) {
        const tag = target.tagName
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          target.isContentEditable
        ) {
          return
        }
      }
      if (event.key.toLowerCase() === shortcutKey.toLowerCase()) {
        setFocusMode((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcutKey])

  return {
    focusMode,
    setFocusMode,
    focusDepartmentId,
    isFocusEnabled,
    getFocusFactor,
    resetFocusMode,
  }
}
