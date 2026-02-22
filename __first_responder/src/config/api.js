// API Configuration
export const API_CONFIG = {
  // Default server URL for the application
  SERVER_URL: process.env.REACT_APP_SERVER_URL || 'http://172.26.151.146:3000/',
  
  // External APIs
  OSRM_URL: 'https://router.project-osrm.org',
  MAPBOX_URL: 'https://api.mapbox.com',
  MAPBOX_TOKEN: process.env.REACT_APP_MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN',
  NOMINATIM_URL: 'https://nominatim.openstreetmap.org'
};

// Helper function to get full API endpoint
export const getApiEndpoint = (path) => {
  const baseUrl = API_CONFIG.SERVER_URL.endsWith('/') 
    ? API_CONFIG.SERVER_URL.slice(0, -1) 
    : API_CONFIG.SERVER_URL;
  return `${baseUrl}${path}`;
};