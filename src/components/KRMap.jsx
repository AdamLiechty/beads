import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import './KRMap.css';
import DirectionPad from './DirectionPad';

// Movement speed constant - higher values = slower movement
const MOVEMENT_SPEED_FACTOR = 4;

const KRMap = forwardRef(({ height, width, grid, x, y, beadSequence, onScoreUpdate, onGo, onGridUpdate }, ref) => {
  const [kangarooRatPos, setKangarooRatPos] = useState({ x, y });
  const [score, setScore] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationType, setAnimationType] = useState(null);
  const [bumpedCell, setBumpedCell] = useState(null);
  const [bumpDirection, setBumpDirection] = useState(null);
  const [boundaryBounce, setBoundaryBounce] = useState(null);
  const [isReturningToStart, setIsReturningToStart] = useState(false);
  const [currentGrid, setCurrentGrid] = useState(grid);

  // Only reset position when component first mounts or when x/y coordinates change
  useEffect(() => {
    setKangarooRatPos({ x, y });
  }, [x, y]);

  // Only reset grid when component first mounts or when grid prop changes
  useEffect(() => {
    setCurrentGrid(grid);
    setBumpedCell(null);
    setBumpDirection(null);
    setBoundaryBounce(null);
    setIsReturningToStart(false);
  }, [grid]);

  // Store onGo callback in ref to avoid dependency issues
  const onGoRef = useRef(onGo);
  onGoRef.current = onGo;

  // Initialize state when component mounts or beadSequence changes
  useEffect(() => {
    if (onGoRef.current) {
      onGoRef.current({ isAnimating: false, canStart: beadSequence && beadSequence.length > 0 });
    }
  }, [beadSequence]);

  // Process bead sequence when it changes
  useEffect(() => {
    // Don't automatically start moving - wait for user to click Go button
  }, [beadSequence]);

  const processBeadSequence = async (sequence) => {
    let currentPos = { ...kangarooRatPos };
    let currentScore = score;
    
    for (let i = 0; i < sequence.length; i++) {
      const bead = sequence[i].toUpperCase();
      
      // Skip black and white beads
      if (bead === 'K' || bead === 'W') continue;
      
      let newPos = { ...currentPos };
      
      // Calculate new position based on bead color
      let direction = '';
      switch (bead) {
        case 'R': // Red = Right
          newPos.x = Math.min(width - 1, currentPos.x + 1);
          direction = 'right';
          break;
        case 'Y': // Yellow = Down
          newPos.y = Math.min(height - 1, currentPos.y + 1);
          direction = 'down';
          break;
        case 'G': // Green = Left
          newPos.x = Math.max(0, currentPos.x - 1);
          direction = 'left';
          break;
        case 'B': // Blue = Up
          newPos.y = Math.max(0, currentPos.y - 1);
          direction = 'up';
          break;
        default:
          continue;
      }
      
      // Check if we hit a boundary (position didn't change)
      const hitBoundary = (newPos.x === currentPos.x && newPos.y === currentPos.y);
      
      // Check what's at the new position
      const targetCell = currentGrid[newPos.y][newPos.x];
      
      if (hitBoundary) {
        // Hit a boundary - animate bounce in the attempted direction
        await animateBoundaryBounce(direction);
        // Stay in same position
      } else if (targetCell === 'C' || targetCell === 'B') {
        // Bump into cactus or bush
        await animateBump(currentPos, newPos, direction);
        // Stay in same position
      } else if (targetCell === 'R') {
        // Hit rattlesnake
        await animateSnakeHit(currentPos, newPos, direction);
        // Position reset is now handled in animateSnakeHit
        currentPos = { x, y };
        setKangarooRatPos(currentPos);
      } else if (typeof targetCell === 'number' && targetCell > 0) {
        // Eat seeds
        currentScore += targetCell;
        setScore(currentScore);
        onScoreUpdate?.(currentScore);
        currentPos = newPos;
        setKangarooRatPos(currentPos);
        // Update the grid to remove the seeds
        const newGrid = [...currentGrid];
        newGrid[newPos.y][newPos.x] = 0;
        setCurrentGrid(newGrid);
        
        // Notify parent component of grid update
        if (onGridUpdate) {
          onGridUpdate(newGrid);
        }
      } else {
        // Empty space, move normally
        currentPos = newPos;
        setKangarooRatPos(currentPos);
      }
      
      // Small delay between moves
      await new Promise(resolve => setTimeout(resolve, 300 * MOVEMENT_SPEED_FACTOR));
    }
  };

  const animateBump = async (currentPos, targetPos, direction) => {
    setBumpedCell(targetPos);
    setBumpDirection(direction);
    setAnimationType('bump');
    await new Promise(resolve => setTimeout(resolve, 300));
    setAnimationType(null);
    setBumpedCell(null);
    setBumpDirection(null);
  };

  const animateSnakeHit = async (currentPos, targetPos, direction) => {
    setAnimationType('snake');
    setBumpedCell(targetPos); // Set the specific snake that was hit
    setBumpDirection(direction); // Set direction for the bounce effect
    
    // Clear bump states immediately
    setBumpedCell(null);
    setBumpDirection(null);
    
    // Keep snake animation for the spin (only the bumped snake)
    await new Promise(resolve => setTimeout(resolve, 1000)); // Total spin duration
    
    // Clear snake animation state and immediately start rat return
    setAnimationType(null);
    setIsReturningToStart(true);
    
    // Animate rat back to starting position with spin
    const startPos = { x, y };
    const steps = 10; // Number of animation steps
    const stepDelay = 50; // Delay between each step
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const currentX = currentPos.x + (startPos.x - currentPos.x) * progress;
      const currentY = currentPos.y + (startPos.y - currentPos.y) * progress;
      
      setKangarooRatPos({ x: Math.round(currentX), y: Math.round(currentY) });
      await new Promise(resolve => setTimeout(resolve, stepDelay));
    }
    
    // Pause at starting position
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second pause
    
    // Clear return state
    setIsReturningToStart(false);
  };

  const animateBoundaryBounce = async (direction) => {
    setBoundaryBounce(direction);
    setAnimationType('boundary-bounce');
    await new Promise(resolve => setTimeout(resolve, 300));
    setAnimationType(null);
    setBoundaryBounce(null);
  };

  // Function to start movement - called from parent component
  const startMovement = async () => {
    if (beadSequence && beadSequence.length > 0 && !isAnimating) {
      // Reset position and score when starting a new movement, but keep grid state
      setKangarooRatPos({ x, y });
      setScore(0);
      // Don't reset the grid - keep eaten seeds eaten
      
      setIsAnimating(true);
      if (onGoRef.current) {
        onGoRef.current({ isAnimating: true, canStart: false });
      }
      await processBeadSequence(beadSequence);
      setIsAnimating(false);
      if (onGoRef.current) {
        onGoRef.current({ isAnimating: false, canStart: true });
      }
    }
  };

  // Function to reset to starting position
  const resetToStart = () => {
    setKangarooRatPos({ x, y });
    setScore(0);
    setCurrentGrid(grid);
    setIsAnimating(false);
    setAnimationType(null);
    setBumpedCell(null);
    setBumpDirection(null);
    setBoundaryBounce(null);
    setIsReturningToStart(false);
    if (onGoRef.current) {
      onGoRef.current({ isAnimating: false, canStart: beadSequence && beadSequence.length > 0 });
    }
  };

  // Function to reset everything including seeds - called when new photo is taken
  const resetEverything = () => {
    setKangarooRatPos({ x, y });
    setScore(0);
    setCurrentGrid(grid);
    setIsAnimating(false);
    setAnimationType(null);
    setBumpedCell(null);
    setBumpDirection(null);
    setBoundaryBounce(null);
    setIsReturningToStart(false);
    if (onGoRef.current) {
      onGoRef.current({ isAnimating: false, canStart: beadSequence && beadSequence.length > 0 });
    }
  };

    // No need for this useEffect - we'll handle state updates directly in the functions

  // Expose functions to parent component via ref
  useImperativeHandle(ref, () => ({
    startMovement,
    resetToStart,
    resetEverything,
    isAnimating
  }));

  const renderCell = (cellValue, rowIndex, colIndex) => {
    const isKangarooRat = rowIndex === kangarooRatPos.y && colIndex === kangarooRatPos.x;
    
    let cellContent = '';
    let cellClass = 'kr-map-cell';
    
    if (isKangarooRat) {
      cellContent = (
        <img 
          src="/kr.png" 
          alt="Kangaroo Rat"
          className={`kangaroo-rat-image ${animationType ? `animate-${animationType}` : ''}`}
        />
      );
      cellClass += ' kangaroo-rat';
      if (boundaryBounce) {
        cellClass += ` boundary-bounce-${boundaryBounce}`;
      } else if (bumpDirection) {
        cellClass += ` bump-bounce-${bumpDirection}`;
      }
      if (isReturningToStart) {
        cellClass += ' animate-snake-spin';
      }
    } else if (cellValue === 'C') {
      cellContent = '';
      const isBumped = bumpedCell && bumpedCell.x === colIndex && bumpedCell.y === rowIndex;
      cellClass += ` cactus ${isBumped ? 'animate-bump' : ''}`;
    } else if (cellValue === 'B') {
      cellContent = '';
      const isBumped = bumpedCell && bumpedCell.x === colIndex && bumpedCell.y === rowIndex;
      cellClass += ` bush ${isBumped ? 'animate-bump' : ''}`;
    } else if (cellValue === 'R') {
      cellContent = '🐍';
      const isBumped = bumpedCell && bumpedCell.x === colIndex && bumpedCell.y === rowIndex;
      cellClass += ` rattlesnake ${isBumped ? 'animate-bump' : ''} ${isBumped && animationType === 'snake' ? 'animate-snake-spin' : ''}`;
    } else if (typeof cellValue === 'number') {
      // Create visual representation of seeds
      if (cellValue === 0) {
        cellContent = '';
      } else {
        // Display the appropriate seed image based on count
        cellContent = (
          <img 
            src={`/s${cellValue}.png`} 
            alt={`${cellValue} seeds`}
            className="seed-image"
          />
        );
      }
      cellClass += ' seeds';
    }
    
    return (
      <div 
        key={`${rowIndex}-${colIndex}`} 
        className={cellClass}
        title={`${rowIndex}, ${colIndex}: ${cellValue}`}
      >
        {cellContent}
      </div>
    );
  };

  return (
    <div className="kr-map-container">
      <div className="kr-map-header">
        <h3>Kangaroo Rat Habitat 🌵🌒</h3>
        <div className="kr-map-score">
          <img src="/s1.png" alt="Seed" className="score-seed-icon" />
          Seeds collected: {score}
        </div>
      </div>
      <div className="kr-map-content">
        <DirectionPad />
        <div 
            className="kr-map-grid"
            style={{
            gridTemplateColumns: `repeat(${width}, 1fr)`,
            gridTemplateRows: `repeat(${height}, 1fr)`
            }}
        >
            {currentGrid.map((row, rowIndex) => 
            row.map((cell, colIndex) => 
                renderCell(cell, rowIndex, colIndex)
            )
            )}
        </div>

      </div>
    </div>
  );
});

export default KRMap;
