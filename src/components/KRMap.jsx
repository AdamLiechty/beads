import React from 'react';
import './KRMap.css';

const KRMap = ({ height, width, grid, x, y }) => {
  const renderCell = (cellValue, rowIndex, colIndex) => {
    const isKangarooRat = rowIndex === y && colIndex === x;
    
    let cellContent = '';
    let cellClass = 'kr-map-cell';
    
    if (isKangarooRat) {
      cellContent = '🐀';
      cellClass += ' kangaroo-rat';
    } else if (cellValue === 'C') {
      cellContent = '🌵';
      cellClass += ' cactus';
    } else if (cellValue === 'B') {
      cellContent = '🌿';
      cellClass += ' bush';
    } else if (cellValue === 'R') {
      cellContent = '🐍';
      cellClass += ' rattlesnake';
    } else if (typeof cellValue === 'number') {
      cellContent = cellValue;
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
      <h3>Kangaroo Rat Map</h3>
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
      <div className="kr-map-legend">
        <div className="legend-item">
          <span className="legend-symbol">🐀</span>
          <span>Kangaroo Rat</span>
        </div>
        <div className="legend-item">
          <span className="legend-symbol">🌵</span>
          <span>Cactus</span>
        </div>
        <div className="legend-item">
          <span className="legend-symbol">🌿</span>
          <span>Bush</span>
        </div>
        <div className="legend-item">
          <span className="legend-symbol">🐍</span>
          <span>Rattlesnake</span>
        </div>
        <div className="legend-item">
          <span className="legend-symbol">1-9</span>
          <span>Seeds</span>
        </div>
      </div>
    </div>
  );
};

export default KRMap;
