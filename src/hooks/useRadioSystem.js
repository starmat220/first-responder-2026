import { useEffect, useRef } from 'react'
import { DEPT_CHATTER, GENERAL_CHATTER } from '../game/radioChatter'
import { VEHICLE_STATUS } from '../game/constants'

export const useRadioSystem = ({ 
  stations, 
  vehicles, 
  addRadioLog, 
  getDepartmentShortLabel, 
  formatSeconds 
}) => {
  const vehiclesRef = useRef(vehicles)
  const stationsRef = useRef(stations)
  const addRadioLogRef = useRef(addRadioLog)
  const getDepartmentShortLabelRef = useRef(getDepartmentShortLabel)
  const formatSecondsRef = useRef(formatSeconds)

  useEffect(() => {
    vehiclesRef.current = vehicles
  }, [vehicles])

  useEffect(() => {
    stationsRef.current = stations
  }, [stations])

  useEffect(() => {
    addRadioLogRef.current = addRadioLog
  }, [addRadioLog])

  useEffect(() => {
    getDepartmentShortLabelRef.current = getDepartmentShortLabel
  }, [getDepartmentShortLabel])

  useEffect(() => {
    formatSecondsRef.current = formatSeconds
  }, [formatSeconds])

  // General Background Chatter Loop
  useEffect(() => {
    if (!stations?.length) return
    const scheduleNext = () => {
      const delay = 20000 + Math.random() * 25000
      timerId = setTimeout(() => {
        const pool = [...GENERAL_CHATTER]
        const chatter = pool[Math.floor(Math.random() * pool.length)]
        addRadioLogRef.current?.(chatter.message, 'default', chatter.channel, chatter.code)
        scheduleNext()
      }, delay)
    }
    let timerId = null
    scheduleNext()
    return () => clearTimeout(timerId)
  }, [stations?.length])

  // Department-Specific Background Chatter (FD / EMS / TOW / PD)
  useEffect(() => {
    if (!stations?.length) return
    const scheduleNext = () => {
      const delay = 22000 + Math.random() * 28000
      timerId = setTimeout(() => {
        const stationList = stationsRef.current || []
        const availableDepartments = Array.from(
          new Set(stationList.map((station) => station?.department || 'police'))
        ).filter((departmentId) => Array.isArray(DEPT_CHATTER[departmentId]) && DEPT_CHATTER[departmentId].length)

        if (availableDepartments.length > 0) {
          const departmentId =
            availableDepartments[Math.floor(Math.random() * availableDepartments.length)]
          const pool = DEPT_CHATTER[departmentId] || []
          const chatter = pool[Math.floor(Math.random() * pool.length)]
          if (chatter) {
            addRadioLogRef.current?.(chatter.message, 'default', chatter.channel, chatter.code)
          }
        }
        scheduleNext()
      }, delay)
    }
    let timerId = null
    scheduleNext()
    return () => clearTimeout(timerId)
  }, [stations?.length])

  // Active Unit Status Checks Loop
  useEffect(() => {
    if (!stations?.length || !vehicles?.length) return
    const scheduleNext = () => {
      const delay = 30000 + Math.random() * 30000
      timerId = setTimeout(() => {
        const activeUnits = (vehiclesRef.current || []).filter(
          (v) => v.status === VEHICLE_STATUS.enroute || v.status === VEHICLE_STATUS.on_scene
        )
        if (activeUnits.length > 0) {
          const v = activeUnits[Math.floor(Math.random() * activeUnits.length)]
          const dept = getDepartmentShortLabelRef.current(v.department)
          if (v.status === VEHICLE_STATUS.enroute) {
            addRadioLogRef.current?.(
              `Unit ${v.name} continuing to the location. ETA ${formatSecondsRef.current(v.etaSeconds)}`,
              'default',
              dept,
              '10-76',
              v.id
            )
          } else {
            addRadioLogRef.current?.(
              `Unit ${v.name} status check. Still active on scene.`,
              'default',
              dept,
              '10-23',
              v.id
            )
          }
        }
        scheduleNext()
      }, delay)
    }
    let timerId = null
    scheduleNext()
    return () => clearTimeout(timerId)
  }, [stations?.length, vehicles?.length])
}
