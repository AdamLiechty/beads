import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import './KRMap.css';

const KRMap = forwardRef(({ height, width, grid, x, y, beadSequence, onScoreUpdate, onGo }, ref) => {
  const [kangarooRatPos, setKangarooRatPos] = useState({ x, y });
  const [score, setScore] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationType, setAnimationType] = useState(null);
  const [currentGrid, setCurrentGrid] = useState(grid);

  // Only reset position when component first mounts or when x/y coordinates change
  useEffect(() => {
    setKangarooRatPos({ x, y });
  }, [x, y]);

  // Only reset grid when component first mounts or when grid prop changes
  useEffect(() => {
    setCurrentGrid(grid);
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
      switch (bead) {
        case 'R': // Red = Up
          newPos.y = Math.max(0, currentPos.y - 1);
          break;
        case 'Y': // Yellow = Right
          newPos.x = Math.min(width - 1, currentPos.x + 1);
          break;
        case 'G': // Green = Down
          newPos.y = Math.min(height - 1, currentPos.y + 1);
          break;
        case 'B': // Blue = Left
          newPos.x = Math.max(0, currentPos.x - 1);
          break;
        default:
          continue;
      }
      
      // Check what's at the new position
      const targetCell = currentGrid[newPos.y][newPos.x];
      
      if (targetCell === 'C' || targetCell === 'B') {
        // Bump into cactus or bush
        await animateBump(currentPos, newPos);
        // Stay in same position
      } else if (targetCell === 'R') {
        // Hit rattlesnake
        await animateSnakeHit(currentPos, newPos);
        // Return to starting position
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
      } else {
        // Empty space, move normally
        currentPos = newPos;
        setKangarooRatPos(currentPos);
      }
      
      // Small delay between moves
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  const animateBump = async (currentPos, targetPos) => {
    setAnimationType('bump');
    await new Promise(resolve => setTimeout(resolve, 200));
    setAnimationType(null);
  };

  const animateSnakeHit = async (currentPos, targetPos) => {
    setAnimationType('snake');
    await new Promise(resolve => setTimeout(resolve, 300));
    setAnimationType(null);
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
    } else if (cellValue === 'C') {
      cellContent = '🌵';
      cellClass += ` cactus ${animationType === 'bump' ? 'animate-bump' : ''}`;
    } else if (cellValue === 'B') {
      cellContent = '';
      cellClass += ` bush ${animationType === 'bump' ? 'animate-bump' : ''}`;
    } else if (cellValue === 'R') {
      cellContent = '🐍';
      cellClass += ` rattlesnake ${animationType === 'snake' ? 'animate-snake' : ''}`;
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
        <h3>Kangaroo Rat Habitat</h3>
        <div className="kr-map-score">Score: {score}</div>
      </div>
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
  );
});

export default KRMap;
