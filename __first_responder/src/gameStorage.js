// Game state management using Firebase with localStorage fallback
import gameStateService from './gameStateService';

const GAME_SAVE_KEY = 'policeCommandCenter_saveData';

export const defaultGameState = {
  gameStarted: false,
  money: 2000,
  totalCalls: 0,
  policeStations: [],
  emergencies: [],
  vehicles: [],
  resolvedIncidents: [],
  nextStationId: 1,
  nextEmergencyId: 1,
  nextVehicleId: 1,
  lastSaved: null
};

export const logSaveState = (state) => {
  // Save state logging removed for cleaner console
};

// Debounced save system to prevent Firebase quota issues
let saveTimer = null;
let pendingSave = null;

// Save to both Firebase and localStorage (fallback)
export const saveGameState = async (gameState) => {
  try {
    const saveData = {
      ...gameState,
      lastSaved: new Date().toISOString()
    };

    // Always save to localStorage immediately
    localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(saveData));
    
    // Debounce Firebase saves to prevent quota issues
    pendingSave = saveData;
    
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    
    saveTimer = setTimeout(async () => {
      if (pendingSave) {
        try {
          await gameStateService.saveGameState(pendingSave);
        } catch (error) {
          console.error('Firebase save failed, data preserved in localStorage:', error);
        }
        pendingSave = null;
      }
    }, 5000); // Save to Firebase every 5 seconds max
    
    return true;
  } catch (error) {
    console.error('Failed to save game state:', error);
    return false;
  }
};

// Load from Firebase first, fallback to localStorage
export const loadGameState = async () => {
  try {
    // Wait for authentication
    await gameStateService.initAuth();
    
    // Try Firebase first
    const firebaseData = await gameStateService.loadGameState();
    if (firebaseData) {
      console.log('Loaded from Firebase:', firebaseData);
      return {
        ...defaultGameState,
        ...firebaseData
      };
    }

    // Fallback to localStorage
    const savedData = localStorage.getItem(GAME_SAVE_KEY);
    if (savedData) {
      const gameState = JSON.parse(savedData);
      return {
        ...defaultGameState,
        ...gameState
      };
    }
    return defaultGameState;
  } catch (error) {
    console.error('Failed to load game state:', error);
    
    // Final fallback to localStorage
    try {
      const savedData = localStorage.getItem(GAME_SAVE_KEY);
      if (savedData) {
        return {
          ...defaultGameState,
          ...JSON.parse(savedData)
        };
      }
    } catch (localError) {
      console.error('LocalStorage fallback failed:', localError);
    }
    
    return defaultGameState;
  }
};

export const clearGameState = async () => {
  try {
    // Clear from localStorage
    localStorage.removeItem(GAME_SAVE_KEY);
    
    // Clear from Firebase
    await gameStateService.saveGameState(defaultGameState);
    
    // Game save data cleared
    return true;
  } catch (error) {
    console.error('Failed to clear game state:', error);
    return false;
  }
};

export const hasExistingSave = async () => {
  try {
    // Check Firebase first
    const hasFirebaseSave = await gameStateService.hasExistingSave();
    if (hasFirebaseSave) return true;
    
    // Fallback to localStorage
    return localStorage.getItem(GAME_SAVE_KEY) !== null;
  } catch (error) {
    console.error('Failed to check for existing save:', error);
    // Fallback to localStorage
    return localStorage.getItem(GAME_SAVE_KEY) !== null;
  }
};