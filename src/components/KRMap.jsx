import React from 'react';
import './KRMap.css';

const KRMap = ({ height, width, grid, x, y }) => {
  const renderCell = (cellValue, rowIndex, colIndex) => {
    const isKangarooRat = rowIndex === y && colIndex === x;
    
    let cellContent = '';
    let cellClass = 'kr-map-cell';
    
    if (isKangarooRat) {
      cellContent = (
        <img 
          src="/kr.png" 
          alt="Kangaroo Rat"
          className="kangaroo-rat-image"
        />
      );
      cellClass += ' kangaroo-rat';
    } else if (cellValue === 'C') {
      cellContent = '🌵';
      cellClass += ' cactus';
    } else if (cellValue === 'B') {
      cellContent = '';
      cellClass += ' bush';
    } else if (cellValue === 'R') {
      cellContent = '🐍';
      cellClass += ' rattlesnake';
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
      <h3>Kangaroo Rat Habitat</h3>
      <div 
        className="kr-map-grid"
        style={{
          gridTemplateColumns: `repeat(${width}, 1fr)`,
          gridTemplateRows: `repeat(${height}, 1fr)`
        }}
      >
        {grid.map((row, rowIndex) => 
          row.map((cell, colIndex) => 
            renderCell(cell, rowIndex, colIndex)
          )
        )}
      </div>
    </div>
  );
};

export default KRMap;
