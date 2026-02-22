import { useState, useEffect, useCallback } from 'react';
import './App.css';
import MapComponent from './MapComponent';
import { loadGameState, saveGameState, clearGameState, hasExistingSave } from './gameStorage';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [money, setMoney] = useState(2000);
  const [totalCalls, setTotalCalls] = useState(0);
  const [gameData, setGameData] = useState(null);
  const [hasExistingGame, setHasExistingGame] = useState(false);

  // Load game state on app start
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        // Check for existing save
        const hasExisting = await hasExistingSave();
        setHasExistingGame(hasExisting);
        
        // Load saved state
        const savedState = await loadGameState();
        
        if (savedState.gameStarted) {
          setGameStarted(savedState.gameStarted);
          setMoney(savedState.money);
          setTotalCalls(savedState.totalCalls);
          setGameData(savedState);
        }
      } catch (error) {
        console.error('Failed to load initial state:', error);
      }
    };
    
    loadInitialState();
  }, []);

  // Auto-save game state with proper dependencies
  useEffect(() => {
    if (!gameStarted || !gameData) return;

    // Debounce save to prevent Firebase quota issues
    const timeoutId = setTimeout(async () => {
      const currentState = {
        gameStarted,
        money,
        totalCalls,
        policeStations: gameData.policeStations || [],
        emergencies: gameData.emergencies || [],
        vehicles: gameData.vehicles || [],
        resolvedIncidents: gameData.resolvedIncidents || [],
        nextStationId: gameData.nextStationId || 1,
        nextEmergencyId: gameData.nextEmergencyId || 1,
        nextVehicleId: gameData.nextVehicleId || 1
      };
      console.log('Saving emergencies:', currentState.emergencies); // Debug log
      await saveGameState(currentState);
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gameStarted,
    money,
    totalCalls,
    gameData?.policeStations,
    gameData?.emergencies,
    gameData?.vehicles,
    gameData?.resolvedIncidents,
    gameData?.nextStationId,
    gameData?.nextEmergencyId,
    gameData?.nextVehicleId
  ]);

  const startGame = () => {
    setGameStarted(true);
    if (!hasExistingGame) {
      setMoney(2000);
      setTotalCalls(0);
    }
  };

  const newGame = async () => {
    await clearGameState();
    setGameStarted(true);
    setMoney(2000);
    setTotalCalls(0);
    setGameData(null);
    setHasExistingGame(false);
  };

  const resetGame = async () => {
    try {
      // Clear game state from storage
      console.log('Resetting game...');
      await clearGameState();
      
      // Reset all state to defaults
      setGameStarted(false);
      setMoney(2000);
      setTotalCalls(0);
      setGameData(null);
      setHasExistingGame(false);
      
      // Reload the page to ensure clean state
      window.location.reload();
    } catch (error) {
      console.error('Failed to reset game:', error);
      // Try to reload anyway
      window.location.reload();
    }
  };

  const handleMoneyEarned = (amount) => {
    setMoney(prevMoney => prevMoney + amount);
    setTotalCalls(prevCalls => prevCalls + 1);
  };

  const handleMoneySpent = (amount) => {
    setMoney(prevMoney => Math.max(0, prevMoney - amount));
  };

  const updateGameData = useCallback((newData) => {
    setGameData(newData);
    // Remove immediate save to prevent infinite loops
    // Data will be saved by the periodic auto-save
  }, []);

  if (!gameStarted) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>🚔 Police Command Center</h1>
          <div style={{ marginBottom: '20px', fontSize: '18px', lineHeight: '1.6' }}>
            <p>Manage police operations in Oromocto, New Brunswick</p>
            <ul style={{ textAlign: 'left', maxWidth: '400px' }}>
              <li>Build police stations ($1000)</li>
              <li>Respond to emergency calls (+$50)</li>
              <li>Purchase vehicles for your stations</li>
              <li>Maintain law and order in the community</li>
            </ul>
          </div>
          
          <div style={{ display: 'flex', gap: '15px', flexDirection: 'column', alignItems: 'center' }}>
            {hasExistingGame ? (
              <>
                <button onClick={startGame} className="start-button">
                  Continue Game
                </button>
                <button onClick={newGame} className="start-button" style={{ backgroundColor: '#f44336' }}>
                  New Game
                </button>
              </>
            ) : (
              <button onClick={startGame} className="start-button">
                Start Command Center
              </button>
            )}
          </div>
          
          {hasExistingGame && (
            <p style={{ fontSize: '14px', color: '#888', marginTop: '15px' }}>
              Saved game detected! Continue your command center or start fresh.
            </p>
          )}
        </header>
      </div>
    );
  }

  return (
    <div className="App" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Game Header */}
      <header style={{
        background: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)',
        color: 'white',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1001,
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        borderBottom: '1px solid #333'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600', letterSpacing: '0.5px' }}>🚔 Oromocto Police Command</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <div style={{ fontSize: '16px', display: 'flex', gap: '30px' }}>
            <div style={{ 
              padding: '8px 16px', 
              backgroundColor: 'rgba(76, 175, 80, 0.1)', 
              borderRadius: '6px',
              border: '1px solid rgba(76, 175, 80, 0.3)'
            }}>
              <span style={{ color: '#888', fontSize: '12px' }}>Budget</span>
              <div style={{ color: '#4CAF50', fontSize: '18px', fontWeight: 'bold' }}>${money.toLocaleString()}</div>
            </div>
            <div style={{ 
              padding: '8px 16px', 
              backgroundColor: 'rgba(255, 152, 0, 0.1)', 
              borderRadius: '6px',
              border: '1px solid rgba(255, 152, 0, 0.3)'
            }}>
              <span style={{ color: '#888', fontSize: '12px' }}>Calls Resolved</span>
              <div style={{ color: '#FF9800', fontSize: '18px', fontWeight: 'bold' }}>{totalCalls}</div>
            </div>
          </div>
          <button 
            onClick={resetGame} 
            className="reset-button"
            style={{
              backgroundColor: '#2a2a2a',
              color: '#f44336',
              border: '2px solid #f44336',
              padding: '8px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.3s ease',
              letterSpacing: '0.5px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f44336';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2a2a2a';
              e.currentTarget.style.color = '#f44336';
            }}
          >
            RESET
          </button>
        </div>
      </header>
      
      {/* Map fills the rest of the screen */}
      <div style={{ flex: 1 }}>
        <MapComponent 
          onScoreChange={handleMoneyEarned} 
          money={money}
          onSpendMoney={handleMoneySpent}
          gameData={gameData}
          onGameDataUpdate={updateGameData}
        />
      </div>
    </div>
  );
}

export default App;