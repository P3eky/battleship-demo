import { useState } from 'react';
import BoardCell from './components/BoardCell.jsx';
import './App.css';

const GRID_SIZE = 10;

// The 5 ships and their matching art paths in public/ships/
const SHIPS = [
  { id: 'carrier', name: 'Carrier', short: 'C', length: 5, image: '/ships/carrier.png' },
  { id: 'battleship', name: 'Battleship', short: 'B', length: 4, image: '/ships/battleship.png' },
  { id: 'cruiser', name: 'Cruiser', short: 'R', length: 3, image: '/ships/cruiser.png' },
  { id: 'submarine', name: 'Submarine', short: 'S', length: 3, image: '/ships/submarine.png' },
  { id: 'destroyer', name: 'Destroyer', short: 'D', length: 2, image: '/ships/destroyer.png' },
];

const TOTAL_SHIP_CELLS = 17; // 5 + 4 + 3 + 3 + 2

// Helper to check if a ship fits on the 10x10 board without overlapping another ship
function canPlaceShip(placedShips, ship, row, col, horizontal) {
  for (let i = 0; i < ship.length; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;

    // Out of bounds check
    if (r >= GRID_SIZE || c >= GRID_SIZE) return false;

    // Overlap check against already placed ships
    const overlaps = placedShips.some((placed) =>
      placed.cells.some((cell) => cell.r === r && cell.c === c)
    );
    if (overlaps) return false;
  }
  return true;
}

// Helper to build a placed ship object with its occupied grid coordinates
function createPlacedShip(ship, row, col, horizontal) {
  const cells = [];
  for (let i = 0; i < ship.length; i++) {
    cells.push({
      r: horizontal ? row : row + i,
      c: horizontal ? col + i : col,
      partIndex: i,
    });
  }
  return { ...ship, horizontal, cells };
}

function App() {
  // Screens: 'welcome', 'setup', 'handoff', 'play', 'gameover'
  const [screen, setScreen] = useState('welcome');
  const [player, setPlayer] = useState(1);
  const [nextScreen, setNextScreen] = useState('setup');

  // Stores the placed ships array for Player 1 and Player 2
  const [fleets, setFleets] = useState({ 1: [], 2: [] });

  // Ship placement controls during setup
  const [selectedShipId, setSelectedShipId] = useState('carrier');
  const [isHorizontal, setIsHorizontal] = useState(true);

  // Stores shots fired by each player: { 'row-col': 'hit' | 'miss' }
  const [shots, setShots] = useState({ 1: {}, 2: {} });

  // Tracks if the active player has fired their shot for this turn
  const [turnMessage, setTurnMessage] = useState('');
  const [hasFired, setHasFired] = useState(false);
  const [winner, setWinner] = useState(null);

  const opponent = player === 1 ? 2 : 1;

  // Place a ship when clicking a cell during Setup
  function handleSetupCellClick(row, col) {
    const myFleet = fleets[player];
    const shipToPlace = SHIPS.find((s) => s.id === selectedShipId);
    if (!shipToPlace) return;

    // Remove this ship first if the player is moving it to a new spot
    const fleetWithoutCurrent = myFleet.filter((s) => s.id !== shipToPlace.id);

    if (!canPlaceShip(fleetWithoutCurrent, shipToPlace, row, col, isHorizontal)) {
      return;
    }

    const newShip = createPlacedShip(shipToPlace, row, col, isHorizontal);
    const updatedFleet = [...fleetWithoutCurrent, newShip];
    setFleets({ ...fleets, [player]: updatedFleet });

    // Automatically select the next unplaced ship for convenience
    const nextUnplaced = SHIPS.find(
      (s) => !updatedFleet.some((placed) => placed.id === s.id)
    );
    if (nextUnplaced) {
      setSelectedShipId(nextUnplaced.id);
    }
  }

  // Randomly place all 5 ships on the board
  function randomizeFleet() {
    const randomFleet = [];

    SHIPS.forEach((ship) => {
      let placed = false;
      while (!placed) {
        const horizontal = Math.random() < 0.5;
        const row = Math.floor(Math.random() * GRID_SIZE);
        const col = Math.floor(Math.random() * GRID_SIZE);

        if (canPlaceShip(randomFleet, ship, row, col, horizontal)) {
          randomFleet.push(createPlacedShip(ship, row, col, horizontal));
          placed = true;
        }
      }
    });

    setFleets({ ...fleets, [player]: randomFleet });
  }

  // Clear the current player's board during setup
  function clearFleet() {
    setFleets({ ...fleets, [player]: [] });
    setSelectedShipId('carrier');
  }

  // Save the player's fleet and go to the handoff screen
  function confirmFleet() {
    if (fleets[player].length < SHIPS.length) return;

    if (player === 1) {
      setPlayer(2);
      setSelectedShipId('carrier');
      setIsHorizontal(true);
      setNextScreen('setup');
      setScreen('handoff');
    } else {
      setPlayer(1);
      setNextScreen('play');
      setScreen('handoff');
    }
  }

  // Fire a torpedo at the opponent's grid during a turn
  function handleFireShot(row, col) {
    const key = `${row}-${col}`;
    const myShots = shots[player];

    // Ignore click if already fired this turn or already shot this square
    if (hasFired || myShots[key]) return;

    const enemyFleet = fleets[opponent];
    const hitShip = enemyFleet.find((ship) =>
      ship.cells.some((cell) => cell.r === row && cell.c === col)
    );

    const newStatus = hitShip ? 'hit' : 'miss';
    const updatedShots = { ...myShots, [key]: newStatus };
    setShots({ ...shots, [player]: updatedShots });
    setHasFired(true);

    if (hitShip) {
      // Check if every cell of this ship has now been hit
      const isSunk = hitShip.cells.every(
        (cell) => updatedShots[`${cell.r}-${cell.c}`] === 'hit'
      );

      // Count total hits to see if all 5 ships (17 cells) are destroyed
      const totalHits = Object.values(updatedShots).filter(
        (val) => val === 'hit'
      ).length;

      if (totalHits === TOTAL_SHIP_CELLS) {
        setWinner(player);
        setScreen('gameover');
        return;
      }

      setTurnMessage(
        isSunk
          ? `DIRECT HIT! You sunk Player ${opponent}'s ${hitShip.name}!`
          : 'DIRECT HIT! Enemy ship damaged!'
      );
    } else {
      setTurnMessage('SPLASH! That shot missed.');
    }
  }

  // End the current turn and show the privacy handoff screen
  function endTurn() {
    setHasFired(false);
    setTurnMessage('');
    setPlayer(opponent);
    setNextScreen('play');
    setScreen('handoff');
  }

  // Reset everything for a brand new match
  function resetGame() {
    setScreen('welcome');
    setPlayer(1);
    setFleets({ 1: [], 2: [] });
    setSelectedShipId('carrier');
    setIsHorizontal(true);
    setShots({ 1: {}, 2: {} });
    setHasFired(false);
    setTurnMessage('');
    setWinner(null);
  }

  // Helper to look up if a ship occupies (row, col) on a specific fleet
  function getShipPartAt(fleet, row, col) {
    for (const ship of fleet) {
      const match = ship.cells.find((cell) => cell.r === row && cell.c === col);
      if (match) {
        return {
          id: ship.id,
          name: ship.name,
          short: ship.short,
          length: ship.length,
          image: ship.image,
          horizontal: ship.horizontal,
          partIndex: match.partIndex,
          cells: ship.cells,
        };
      }
    }
    return null;
  }

  // Helper to render a 10x10 board
  function renderGrid(fleet, shotMap, isAttackBoard, onCellClick, disableClicks) {
    const cells = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const key = `${r}-${c}`;
        const shipPart = getShipPartAt(fleet, r, c);
        const shotStatus = shotMap[key] || null;

        // On the enemy attack board, only reveal a ship's artwork once that entire ship is sunk
        let showShip = !isAttackBoard;
        if (isAttackBoard && shipPart) {
          const isShipSunk = shipPart.cells.every(
            (cell) => shotMap[`${cell.r}-${cell.c}`] === 'hit'
          );
          showShip = isShipSunk;
        }

        cells.push(
          <BoardCell
            key={key}
            shipPart={shipPart}
            showShip={showShip}
            shotStatus={shotStatus}
            onClick={() => onCellClick(r, c)}
            disabled={disableClicks || Boolean(shotStatus)}
          />
        );
      }
    }

    return <div className="board-grid">{cells}</div>;
  }

  // 1. Welcome Screen
  if (screen === 'welcome') {
    return (
      <div className="app">
        <div className="box center-box">
          <h1>Battleship!</h1>
          <p>Two-player pass-and-play naval combat on one device.</p>

          <ol className="rules">
            <li>Each player secretly places 5 ships on their 10x10 ocean grid.</li>
            <li>Take turns firing torpedoes at your opponent's grid.</li>
            <li>Red X means a HIT, white dot means a MISS.</li>
            <li>Sink all 5 of your opponent's ships first to win!</li>
          </ol>

          <button className="btn primary" onClick={() => setScreen('setup')}>
            Start Game
          </button>
        </div>
      </div>
    );
  }

  // 2. Privacy Handoff Screen
  if (screen === 'handoff') {
    return (
      <div className="app">
        <div className="box center-box">
          <h2>Pass the device to Player {player}</h2>
          <p>Make sure Player {opponent} isn't looking at the screen.</p>
          <button className="btn primary" onClick={() => setScreen(nextScreen)}>
            Player {player} Ready
          </button>
        </div>
      </div>
    );
  }

  // 3. Ship Placement Screen
  if (screen === 'setup') {
    const myFleet = fleets[player];
    const allPlaced = myFleet.length === SHIPS.length;

    return (
      <div className="app">
        <div className="top-bar">
          <div>
            <h2>Player {player}: Deploy Your Fleet</h2>
            <p>
              Select a ship, choose Horizontal or Vertical, and tap the grid to
              place it ({myFleet.length}/5 placed).
            </p>
          </div>

          <div className="button-group">
            <button
              className="btn"
              onClick={() => setIsHorizontal(!isHorizontal)}
            >
              Direction: {isHorizontal ? 'Horizontal ➡' : 'Vertical ⬇'}
            </button>
            <button className="btn" onClick={randomizeFleet}>
              Randomize
            </button>
            <button className="btn" onClick={clearFleet}>
              Clear
            </button>
            <button
              className="btn accent"
              disabled={!allPlaced}
              onClick={confirmFleet}
            >
              Confirm Fleet
            </button>
          </div>
        </div>

        {/* Ship Selector Dock */}
        <div className="ship-dock">
          {SHIPS.map((ship) => {
            const isPlaced = myFleet.some((s) => s.id === ship.id);
            const isSelected = selectedShipId === ship.id;

            return (
              <button
                key={ship.id}
                type="button"
                className={`dock-btn ${isSelected ? 'selected' : ''} ${
                  isPlaced ? 'placed' : ''
                }`}
                onClick={() => setSelectedShipId(ship.id)}
              >
                {ship.name} ({ship.length}) {isPlaced ? '✓' : ''}
              </button>
            );
          })}
        </div>

        <div className="single-board-wrap">
          {renderGrid(myFleet, {}, false, handleSetupCellClick, false)}
        </div>
      </div>
    );
  }

  // 4. Main Gameplay Screen
  if (screen === 'play') {
    const myShots = shots[player];
    const enemyShots = shots[opponent];

    return (
      <div className="app">
        <div className="top-bar">
          <div>
            <h2>Player {player}'s Turn</h2>
            <p>
              {hasFired
                ? turnMessage
                : `Tap a square on Player ${opponent}'s waters to fire a torpedo!`}
            </p>
          </div>

          {hasFired && (
            <button className="btn primary" onClick={endTurn}>
              End Turn & Pass Device
            </button>
          )}
        </div>

        <div className="boards-container">
          {/* Enemy Waters (Where active player fires shots) */}
          <div className="board-panel">
            <h3>Enemy Waters (Tap to Fire)</h3>
            {renderGrid(
              fleets[opponent],
              myShots,
              true,
              handleFireShot,
              hasFired
            )}
          </div>

          {/* Active Player's Own Fleet */}
          <div className="board-panel">
            <h3>Your Fleet (Player {opponent}'s Shots)</h3>
            {renderGrid(fleets[player], enemyShots, false, () => {}, true)}
          </div>
        </div>
      </div>
    );
  }

  // 5. Game Over Screen
  return (
    <div className="app">
      <div className="box center-box">
        <h1>Player {winner} Wins!</h1>
        <p>All 5 enemy warships have been sunk!</p>

        <button className="btn primary" onClick={resetGame}>
          Play Again
        </button>
      </div>
    </div>
  );
}

export default App;