// Calculate route between two points using OSRM or fallback
export const calculateRoute = async (start, end) => {
  try {
    // Try OSRM routing service first
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`,
      { signal: AbortSignal.timeout(5000) } // 5 second timeout
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // Convert GeoJSON coordinates to Leaflet format [lat, lng]
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        
        // Return enhanced route data
        return {
          coordinates,
          distance: route.distance, // in meters
          duration: route.duration  // in seconds
        };
      }
    }
  } catch (error) {
    console.log('OSRM routing failed, using direct route:', error.message);
  }
  
  // Fallback: Create intermediate points for smoother movement
  const latDiff = end[0] - start[0];
  const lngDiff = end[1] - start[1];
  const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  const numPoints = Math.max(5, Math.floor(distance * 1000)); // More points for longer distances
  
  const route = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    route.push([
      start[0] + latDiff * t,
      start[1] + lngDiff * t
    ]);
  }
  
  // Calculate approximate distance for fallback route
  const haversineDistance = calculateRouteDistance([start, end]);
  
  return {
    coordinates: route,
    distance: haversineDistance * 1000, // Convert to meters
    duration: haversineDistance * 60 // Rough estimate: 60 seconds per km
  };
};

// Calculate the distance of a route using Haversine formula
export const calculateRouteDistance = (route) => {
  let totalDistance = 0;
  
  // Haversine formula to calculate distance between two points
  const haversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  
  // Sum up distances between consecutive points
  for (let i = 0; i < route.length - 1; i++) {
    totalDistance += haversine(
      route[i][0], route[i][1],
      route[i + 1][0], route[i + 1][1]
    );
  }
  
  return totalDistance; // in kilometers
};