const hashString = (value) => {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export const createTickSnapshot = ({
  simSpeed = 1,
  stations = [],
  vehicles = [],
  incidents = [],
  prisons = [],
  goals = [],
}) => {
  const normalized = {
    simSpeed: Number(simSpeed) || 1,
    stations: [...stations]
      .map((station) => ({
        id: station.id,
        department: station.department,
        level: station.level || 1,
        personnelAssigned: station.personnelAssigned || 0,
        personnelCapacity: station.personnelCapacity || 0,
      }))
      .sort((a, b) => a.id - b.id),
    vehicles: [...vehicles]
      .map((vehicle) => ({
        id: vehicle.id,
        department: vehicle.department,
        unitType: vehicle.unitType,
        status: vehicle.status,
        homeStationId: vehicle.homeStationId,
        assignedIncidentId: vehicle.assignedIncidentId || null,
      }))
      .sort((a, b) => a.id - b.id),
    incidents: [...incidents]
      .map((incident) => ({
        id: incident.id,
        department: incident.requiredDepartment,
        status: incident.status,
        priority: incident.priority,
        requiredUnits: incident.requiredUnits || 1,
      }))
      .sort((a, b) => a.id - b.id),
    prisons: [...prisons]
      .map((prison) => ({
        id: prison.id,
        count: prison.count || 0,
        capacity: prison.capacity || 0,
      }))
      .sort((a, b) => a.id - b.id),
    goals: [...goals]
      .map((goal) => ({
        id: goal.id,
        departmentId: goal.departmentId,
        progress: goal.progress || 0,
        target: goal.target || 0,
        claimed: Boolean(goal.claimed),
      }))
      .sort((a, b) => String(a.id).localeCompare(String(b.id))),
  }
  const payload = JSON.stringify(normalized)
  return {
    ...normalized,
    digest: hashString(payload),
  }
}
