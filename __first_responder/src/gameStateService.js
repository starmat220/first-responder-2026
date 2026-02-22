import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { db, auth } from './firebase';

class GameStateService {
  constructor() {
    this.currentUser = null;
    this.gameStateListener = null;
    this.initAuth();
  }

  // Initialize authentication
  async initAuth() {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          this.currentUser = user;
          // User authenticated
          resolve(user);
        } else {
          // Sign in anonymously if no user
          try {
            const userCredential = await signInAnonymously(auth);
            this.currentUser = userCredential.user;
            // Anonymous user created
            resolve(this.currentUser);
          } catch (error) {
            console.error('Authentication failed:', error);
            resolve(null);
          }
        }
      });
    });
  }

  // Sign in with email and password
  async signInWithEmail(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      this.currentUser = userCredential.user;
      // User signed in
      return { success: true, user: this.currentUser };
    } catch (error) {
      console.error('Sign in failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Register with email and password
  async registerWithEmail(email, password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      this.currentUser = userCredential.user;
      // User registered
      return { success: true, user: this.currentUser };
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user ID for saving
  getUserId() {
    return this.currentUser?.uid || 'anonymous';
  }

  // Save game state to Firebase
  async saveGameState(gameState) {
    if (!this.currentUser) {
      console.warn('No user authenticated, cannot save to Firebase');
      return false;
    }

    try {
      const userId = this.getUserId();
      const gameStateRef = doc(db, 'gameStates', userId);
      
      // Process vehicles to remove nested arrays (routes)
      const processedVehicles = gameState.vehicles ? gameState.vehicles.map(vehicle => {
        const processedVehicle = { ...vehicle };
        
        // Remove or flatten route array which causes Firebase errors
        if (processedVehicle.route) {
          // Save only essential route info, not the full array
          processedVehicle.routeStart = processedVehicle.route[0];
          processedVehicle.routeEnd = processedVehicle.route[processedVehicle.route.length - 1];
          processedVehicle.routeLength = processedVehicle.route.length;
          delete processedVehicle.route; // Remove nested array
        }
        
        return processedVehicle;
      }) : [];
      
      const dataToSave = {
        ...gameState,
        vehicles: processedVehicles, // Use processed vehicles without nested arrays
        lastSaved: serverTimestamp(),
        version: '1.0'
      };
      
      console.log('Saving to Firebase - emergencies:', dataToSave.emergencies?.length);

      await setDoc(gameStateRef, dataToSave);
      return true;
    } catch (error) {
      console.error('Failed to save game state:', error);
      return false;
    }
  }

  // Load game state from Firebase
  async loadGameState() {
    if (!this.currentUser) {
      console.warn('No user authenticated, cannot load from Firebase');
      return null;
    }

    try {
      const userId = this.getUserId();
      const gameStateRef = doc(db, 'gameStates', userId);
      const docSnap = await getDoc(gameStateRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Restore vehicles with basic route info (routes will be recalculated as needed)
        if (data.vehicles) {
          data.vehicles = data.vehicles.map(vehicle => {
            const restoredVehicle = { ...vehicle };
            
            // Clear any route-related data that should be recalculated
            if (restoredVehicle.status === 'DISPATCHED' || restoredVehicle.status === 'RETURNING') {
              restoredVehicle.status = 'AVAILABLE'; // Reset to available on load
              restoredVehicle.route = null;
              restoredVehicle.routeDistance = null;
              restoredVehicle.currentPosition = restoredVehicle.position; // Reset to station
              restoredVehicle.distanceTraveled = null;
              restoredVehicle.assignedIncidentId = null;
            }
            
            return restoredVehicle;
          });
        }
        
        // Restore emergencies, adjusting timers for elapsed time
        if (data.emergencies) {
          const now = Date.now();
          // Handle Firestore timestamp or regular timestamp
          let lastSaveTime = now;
          if (data.lastSaved) {
            if (data.lastSaved._seconds) {
              // Firestore timestamp
              lastSaveTime = data.lastSaved._seconds * 1000;
            } else if (data.lastSaved.seconds) {
              // Alternative Firestore format
              lastSaveTime = data.lastSaved.seconds * 1000;
            } else if (typeof data.lastSaved === 'string') {
              // ISO string
              lastSaveTime = new Date(data.lastSaved).getTime();
            }
          }
          const timeSinceLastSave = now - lastSaveTime;
          
          data.emergencies = data.emergencies.map(emergency => {
            // For active emergencies, adjust timers based on elapsed time
            if (!emergency.resolved && emergency.expiresAt) {
              // Adjust expiration time by time elapsed since last save
              const adjustedExpiresAt = emergency.expiresAt + timeSinceLastSave;
              
              // If still has time left, keep it
              if (adjustedExpiresAt > now) {
                return {
                  ...emergency,
                  expiresAt: adjustedExpiresAt,
                  createdAt: emergency.createdAt + timeSinceLastSave,
                  assignedVehicleId: null, // Reset assignments since vehicles were reset
                  status: 'Reported'
                };
              } else {
                // Emergency expired while offline, mark as resolved
                return {
                  ...emergency,
                  resolved: true,
                  resolvedBy: 'Expired',
                  resolvedAt: adjustedExpiresAt
                };
              }
            }
            return emergency;
          });
        }
        
        return data;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Failed to load game state:', error);
      return null;
    }
  }

  // Listen for real-time game state changes
  subscribeToGameState(callback) {
    if (!this.currentUser) {
      console.warn('No user authenticated, cannot subscribe to changes');
      return null;
    }

    const userId = this.getUserId();
    const gameStateRef = doc(db, 'gameStates', userId);
    
    this.gameStateListener = onSnapshot(gameStateRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        // Real-time game state update received
        callback(data);
      }
    });

    return this.gameStateListener;
  }

  // Stop listening for changes
  unsubscribeFromGameState() {
    if (this.gameStateListener) {
      this.gameStateListener();
      this.gameStateListener = null;
      // Unsubscribed from game state changes
    }
  }

  // Check if user has existing save
  async hasExistingSave() {
    if (!this.currentUser) return false;

    try {
      const userId = this.getUserId();
      const gameStateRef = doc(db, 'gameStates', userId);
      const docSnap = await getDoc(gameStateRef);
      return docSnap.exists();
    } catch (error) {
      console.error('Failed to check for existing save:', error);
      return false;
    }
  }

  // Get current user info
  getCurrentUser() {
    return this.currentUser;
  }

  // Sign out
  async signOut() {
    try {
      await auth.signOut();
      this.currentUser = null;
      this.unsubscribeFromGameState();
      console.log('🔐 User signed out');
      return true;
    } catch (error) {
      console.error('Sign out failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const gameStateService = new GameStateService();
export default gameStateService;