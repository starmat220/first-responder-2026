import L from 'leaflet';
import { STATION_LEVELS } from '../config/stationUpgrades';
import { VEHICLE_STATUS } from '../vehicleConfig';

// Create police station icon based on level
export const createPoliceStationIcon = (level = 1) => {
  const size = level <= 2 ? 30 : level <= 4 ? 35 : 40;
  const icon = STATION_LEVELS[level]?.icon || '🏢';
  
  return L.divIcon({
    html: `<div style="font-size: ${size}px; text-align: center; margin-top: -10px; cursor: pointer; pointer-events: auto;">${icon}</div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size],
    popupAnchor: [0, -size],
    className: 'custom-div-icon'
  });
};

// Create emergency icon with timer bar
export const createEmergencyIcon = (emergency, assignedVehicle) => {
  const now = Date.now();
  
  // Show work progress when vehicle is on scene and incident is not resolved
  const showWorkProgress = assignedVehicle && assignedVehicle.status === VEHICLE_STATUS.ON_SCENE && assignedVehicle.arrivedAt && !emergency.resolved;
  let workProgress = 0;
  let remainingTime = 0;
  if (showWorkProgress) {
    const workElapsed = now - assignedVehicle.arrivedAt;
    const workDuration = emergency.responseTime || 3000;
    workProgress = Math.min((workElapsed / workDuration) * 100, 100);
    remainingTime = Math.max(0, workDuration - workElapsed);
  }
  
  // New color scheme: Red -> Orange -> Green
  let priorityColor;
  let backgroundColor = '#2a2a2a';
  if (emergency.resolved) {
    // Recently resolved - show green only
    priorityColor = '#4CAF50'; // Green for completed
    backgroundColor = '#1b5e20'; // Dark green background
  } else if (assignedVehicle && assignedVehicle.status === VEHICLE_STATUS.ON_SCENE) {
    // Vehicle is working on incident - use orange
    priorityColor = '#FF9800'; // Orange for active work
  } else if (assignedVehicle && (assignedVehicle.status === VEHICLE_STATUS.DISPATCHED || assignedVehicle.status === VEHICLE_STATUS.RETURNING)) {
    // Vehicle is assigned but not yet on scene or returning - use blue
    priorityColor = '#2196F3'; // Blue for assigned/dispatched
  } else {
    // No vehicle assigned - use red (urgent attention needed)
    priorityColor = '#f44336'; // Red for unattended
  }
  
  return L.divIcon({
    html: `
      <div style="
        position: relative;
        background-color: ${backgroundColor};
        border: 3px solid ${priorityColor};
        border-radius: 50%;
        width: 50px;
        height: 50px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        cursor: pointer;
        transition: all 0.3s ease;
        pointer-events: none;
        ${emergency.resolved ? 'opacity: 0.9;' : ''}
      ">
        <div style="font-size: 24px; position: relative; z-index: 2;">
          ${emergency.icon || '🚨'}
          ${assignedVehicle && !emergency.resolved ? `
            <div style="
              position: absolute;
              top: -8px;
              right: -8px;
              background-color: ${priorityColor};
              color: white;
              border-radius: 50%;
              width: 18px;
              height: 18px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-weight: bold;
              border: 2px solid white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">
              ${assignedVehicle.id}
            </div>
          ` : ''}
        </div>
        ${showWorkProgress ? `
          <div style="
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 44px;
            text-align: center;
            pointer-events: none;
          ">
            <div style="
              width: 44px;
              height: 5px;
              backgroundColor: rgba(0, 0, 0, 0.3);
              borderRadius: 3px;
              overflow: hidden;
              marginBottom: 2px;
              border: 1px solid rgba(255, 255, 255, 0.3);
            ">
              <div style="
                width: ${workProgress}%;
                height: 100%;
                background: linear-gradient(90deg, #FF9800 0%, #FF6B00 100%);
                transition: width 0.3s linear;
                borderRadius: 2px;
              "></div>
            </div>
            <div style="
              fontSize: 11px;
              fontWeight: bold;
              color: white;
              backgroundColor: rgba(0, 0, 0, 0.8);
              padding: 2px 5px;
              borderRadius: 3px;
              minWidth: 25px;
              display: inline-block;
              border: 1px solid #FF9800;
            ">
              ${Math.ceil(remainingTime / 1000)}s
            </div>
          </div>
        ` : ''}
      </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -25],
    className: 'emergency-marker'
  });
};

// Create vehicle icon with progress animation
export const createVehicleIcon = (vehicle, route, nextWaypointIndex) => {
  // Calculate rotation based on the next segment
  let rotation = 0;
  if (route && nextWaypointIndex > 0 && nextWaypointIndex < route.length) {
    const currentPoint = route[nextWaypointIndex - 1];
    const nextPoint = route[nextWaypointIndex];
    
    const deltaLat = nextPoint[0] - currentPoint[0];
    const deltaLng = nextPoint[1] - currentPoint[1];
    
    rotation = Math.atan2(deltaLng, deltaLat) * (180 / Math.PI);
  }
  
  // Determine vehicle color based on status
  let vehicleColor = '#4CAF50'; // Green for available
  let showProgress = false;
  let progress = 0;
  
  if (vehicle.status === VEHICLE_STATUS.DISPATCHED) {
    vehicleColor = '#2196F3'; // Blue for dispatched
    if (vehicle.dispatchTime && vehicle.estimatedArrival) {
      const now = Date.now();
      const totalTime = vehicle.estimatedArrival - vehicle.dispatchTime;
      const elapsed = now - vehicle.dispatchTime;
      progress = Math.min((elapsed / totalTime) * 100, 100);
      showProgress = true;
    }
  } else if (vehicle.status === VEHICLE_STATUS.ON_SCENE) {
    vehicleColor = '#FF9800'; // Orange for on scene
    if (vehicle.arrivedAt) {
      const now = Date.now();
      const workDuration = 3000; // 3 seconds work time
      const workElapsed = now - vehicle.arrivedAt;
      progress = Math.min((workElapsed / workDuration) * 100, 100);
      showProgress = true;
    }
  } else if (vehicle.status === VEHICLE_STATUS.RETURNING) {
    vehicleColor = '#9C27B0'; // Purple for returning
    // Show that vehicle is returning home
    showProgress = true;
    if (vehicle.departureTime && vehicle.routeDistance) {
      const now = Date.now();
      const elapsed = now - vehicle.departureTime;
      const estimatedDuration = (vehicle.routeDistance / 60) * 3600 * 1000; // distance/speed * seconds * milliseconds
      progress = Math.min((elapsed / estimatedDuration) * 100, 100);
    }
  }
  
  return L.divIcon({
    html: `
      <div style="
        position: relative;
        transform: rotate(${rotation}deg);
        transition: transform 0.3s ease;
        cursor: pointer;
        pointer-events: auto;
      ">
        <div style="
          font-size: 24px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
          color: ${vehicleColor};
        ">${vehicle.icon}</div>
        ${showProgress ? `
          <div style="
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 36px;
            display: flex;
            flexDirection: column;
            alignItems: center;
            gap: 2px;
          ">
            <div style="
              width: 36px;
              height: 4px;
              background-color: rgba(0, 0, 0, 0.4);
              border: 1px solid rgba(255, 255, 255, 0.3);
              borderRadius: 3px;
              overflow: hidden;
            ">
              <div style="
                width: ${progress}%;
                height: 100%;
                background-color: ${vehicleColor};
                transition: width 0.5s linear;
              "></div>
            </div>
            ${vehicle.status === VEHICLE_STATUS.RETURNING ? `
              <div style="
                fontSize: 9px;
                fontWeight: bold;
                color: white;
                backgroundColor: #9C27B0;
                padding: 1px 4px;
                borderRadius: 3px;
                whiteSpace: nowrap;
              ">
                🏠 HOME
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
    className: 'vehicle-icon'
  });
};