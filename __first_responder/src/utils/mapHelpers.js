// Get a random point on the visible map near stations
export const getRandomMapPoint = (policeStations, defaultCenter) => {
  // If we have stations, generate incidents near them
  if (policeStations.length > 0) {
    // Pick a random station
    const station = policeStations[Math.floor(Math.random() * policeStations.length)];
    const [baseLat, baseLng] = station.position;
    
    // Generate within ~2km radius (0.018 degrees ≈ 2km)
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * 0.018;
    
    const lat = baseLat + distance * Math.cos(angle);
    const lng = baseLng + distance * Math.sin(angle);
    
    return [lat, lng];
  }
  
  // Fallback: generate around default center
  const [baseLat, baseLng] = defaultCenter;
  const offsetLat = (Math.random() - 0.5) * 0.02;
  const offsetLng = (Math.random() - 0.5) * 0.02;
  
  return [baseLat + offsetLat, baseLng + offsetLng];
};