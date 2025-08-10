import React, { useState, useEffect } from 'react';
import './KRMap.css';

const KRMap = ({ height, width, grid, x, y, beadSequence, onScoreUpdate }) => {
  const [kangarooRatPos, setKangarooRatPos] = useState({ x, y });
  const [score, setScore] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationType, setAnimationType] = useState(null);
  const [currentGrid, setCurrentGrid] = useState(grid);

  // Reset position when props change
  useEffect(() => {
    setKangarooRatPos({ x, y });
    setScore(0);
    setCurrentGrid(grid);
  }, [x, y, grid]);

  // Process bead sequence when it changes
  useEffect(() => {
    if (beadSequence && beadSequence.length > 0) {
      processBeadSequence(beadSequence);
    }
  }, [beadSequence]);

  const processBeadSequence = async (sequence) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
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
    
    setIsAnimating(false);
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
};

export default KRMap;
