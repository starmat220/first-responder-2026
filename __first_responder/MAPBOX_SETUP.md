# Mapbox Setup Instructions

## Getting Your Free Mapbox Token

1. **Visit Mapbox**: Go to [https://account.mapbox.com/](https://account.mapbox.com/)

2. **Create Account**: Sign up for a free account (no credit card required for the free tier)

3. **Get Token**: 
   - After signing in, you'll see your **Default Public Token**
   - Copy this token (starts with `pk.`)

4. **Add Token to App**:
   - Open `src/components/MapboxDisplay.js`
   - Find line 8: `mapboxgl.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN_HERE';`
   - Replace `'YOUR_MAPBOX_ACCESS_TOKEN_HERE'` with your actual token
   - Example: `mapboxgl.accessToken = 'pk.eyJ1Ijoiam9obi1kb2UiLCJhIjoiY2tkaGZrdGZvMDNhYzNvYzNhNnl1YmNtdCJ9.example';`

## Free Tier Limits

- **50,000 map loads** per month (plenty for development and testing)
- All map styles included
- 3D buildings and terrain included

## New Features

### 🗺️ Enhanced Map Styles
- **Standard**: Classic street map
- **Light**: Clean, minimal style  
- **Satellite**: Aerial imagery with labels
- **Dark**: Dark theme for low-light environments
- **Outdoors**: Optimized for outdoor activities

### 🏢 3D Buildings
- Toggle 3D buildings on/off
- Automatic camera tilt for 3D view
- Enhanced depth perception for urban areas

### 🎮 Interactive Controls
- Smooth zoom and pan
- Pitch and bearing controls
- Navigation controls in bottom-right

## Performance

The bundle size has increased due to Mapbox GL JS (~400KB), but you gain:
- Hardware-accelerated rendering
- Smooth animations
- Better performance with large datasets
- Professional-grade mapping features

## Fallback

If you encounter any issues, the original Leaflet-based `MapDisplay.js` is still available as a backup.