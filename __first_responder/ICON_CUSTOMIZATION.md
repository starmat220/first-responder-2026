# 🎨 Easy Icon Customization Guide

This guide shows you how to easily update and customize incident icons in your emergency response game.

## 🚀 Quick Start - Change Icons in 3 Steps

### Step 1: Open the Icon Manager
Edit `src/iconManager.js`

### Step 2: Add Your Custom Icons
```javascript
export const CUSTOM_ICON_PATHS = {
  [INCIDENT_TYPES.TRAFFIC_ACCIDENT]: "/images/icons/car-crash.png",
  [INCIDENT_TYPES.THEFT]: "/images/icons/theft.png", 
  [INCIDENT_TYPES.BOMB_THREAT]: "/images/icons/bomb.png",
  // Add more here...
};
```

### Step 3: Load Your Icons
In your app startup, call:
```javascript
import { loadCustomIcons } from './iconManager';
loadCustomIcons(); // This applies all your custom icons!
```

## 🎭 Icon Methods Available

### 1. Single Icon Update
```javascript
import { updateIncidentIcon, INCIDENT_TYPES } from './incidentConfig';
updateIncidentIcon(INCIDENT_TYPES.TRAFFIC_ACCIDENT, "🚙");
```

### 2. Bulk Icon Updates
```javascript
import { bulkUpdateIcons, INCIDENT_TYPES } from './iconManager';
bulkUpdateIcons({
  [INCIDENT_TYPES.THEFT]: "👝",
  [INCIDENT_TYPES.BURGLARY]: "🏠", 
  [INCIDENT_TYPES.ASSAULT]: "👊"
});
```

### 3. Apply Preset Themes
```javascript
import { applyIconPreset } from './iconManager';
applyIconPreset("POLICE_STYLE"); // Realistic police icons
applyIconPreset("SIMPLE_DOTS");  // Colored dots
```

### 4. Get Icon for Display
```javascript
import { getIncidentIcon, getIncidentDisplay } from './incidentConfig';

// Get just the icon
const icon = getIncidentIcon("Traffic Accident"); // Returns: "🚗"

// Get icon + name formatted
const display = getIncidentDisplay("Traffic Accident"); 
// Returns: { icon: "🚗", name: "Traffic Accident", displayText: "🚗 Traffic Accident" }
```

## 📁 Icon Types Supported

### Emojis (Default)
```javascript
updateIncidentIcon(INCIDENT_TYPES.THEFT, "👝");
```

### Image Files
```javascript
updateIncidentIcon(INCIDENT_TYPES.THEFT, "/images/theft-icon.png");
```

### Any String
```javascript
updateIncidentIcon(INCIDENT_TYPES.THEFT, "THEFT"); // Just text
```

## 🎨 Creating Custom Presets

Add your own preset themes:

```javascript
export const QUICK_ICON_PRESETS = {
  MY_CUSTOM_THEME: {
    [INCIDENT_TYPES.TRAFFIC_ACCIDENT]: "/images/my-car.png",
    [INCIDENT_TYPES.THEFT]: "/images/my-theft.png",
    [INCIDENT_TYPES.BOMB_THREAT]: "/images/my-bomb.png",
  }
};
```

Then apply it:
```javascript
applyIconPreset("MY_CUSTOM_THEME");
```

## 📊 All Available Incident Types

The system includes **75+ incident types** across categories:

- **Basic Incidents**: Public Disturbance, Theft, Vandalism, etc.
- **Traffic Incidents**: Accidents, DUI, Reckless Driving, etc.
- **Advanced Incidents**: Drug Investigation, Missing Person, etc.
- **Aviation Incidents**: Search & Rescue, Medical Evacuation, etc.
- **SWAT Incidents**: Armed Suspect, Hostage Situation, etc.
- **Forensic Incidents**: Homicide, Crime Scene Processing, etc.
- **Crisis Incidents**: Suicide Threat, Mental Health Crisis, etc.
- **Bomb Squad Incidents**: Bomb Threat, Hazardous Materials, etc.

## 💡 Pro Tips

1. **Consistent Sizing**: Keep icons similar sizes (emojis work great!)
2. **Color Coding**: Use colors to indicate severity levels
3. **Batch Updates**: Use `bulkUpdateIcons()` for efficiency
4. **Test Icons**: Use `getAllIncidentDisplays()` to see all your icons
5. **Backup**: Keep your custom icon configuration in version control

## 🔄 Updating Icons During Development

You can update icons on-the-fly in your browser console:

```javascript
// In browser console
import { updateIncidentIcon, INCIDENT_TYPES } from './incidentConfig';
updateIncidentIcon(INCIDENT_TYPES.TRAFFIC_ACCIDENT, "🚙");
```

## 📝 Icon File Organization

Recommended folder structure for custom icons:
```
public/
  images/
    icons/
      basic/
        theft.png
        vandalism.png
      traffic/
        accident.png
        pursuit.png
      swat/
        armed-suspect.png
        hostage.png
```

Then reference them as:
```javascript
[INCIDENT_TYPES.THEFT]: "/images/icons/basic/theft.png"
```

Happy customizing! 🎉