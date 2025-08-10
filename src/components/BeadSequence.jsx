import React, { useEffect, useRef } from 'react';
import './BeadSequence.css';

const BeadSequence = ({ beadSequence, currentBeadIndex, isAnimating }) => {
  const beadListRef = useRef(null);
  
  // Auto-scroll to keep current bead in view
  useEffect(() => {
    if (currentBeadIndex >= 0 && beadListRef.current) {
      const currentBeadElement = beadListRef.current.children[currentBeadIndex];
      if (currentBeadElement) {
        currentBeadElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }
    }
  }, [currentBeadIndex]);
  
  if (!beadSequence || beadSequence.length === 0) {
    return null;
  }

  const getBeadColor = (bead) => {
    switch (bead.toUpperCase()) {
      case 'R': return '#FF0000'; // Red
      case 'Y': return '#FFFF00'; // Yellow
      case 'G': return '#00FF00'; // Green
      case 'B': return '#0000FF'; // Blue
      case 'K': return '#000000'; // Black
      case 'W': return '#FFFFFF'; // White
      default: return '#808080'; // Gray for unknown
    }
  };

  const getDirectionArrow = (bead) => {
    switch (bead.toUpperCase()) {
      case 'R': return '▶'; // Right arrow
      case 'Y': return '▼'; // Down arrow
      case 'G': return '◀'; // Left arrow
      case 'B': return '▲'; // Up arrow
      case 'K':
      case 'W':
      default: return ''; // No arrow for black/white beads
    }
  };

  const isCurrentBead = (index) => {
    return isAnimating && index === currentBeadIndex;
  };

  return (
    <div className="bead-sequence">
      <h4>Bead Sequence</h4>
      <div className="bead-list" ref={beadListRef}>
        {beadSequence.split('').map((bead, index) => (
          <div
            key={index}
            className={`bead-circle ${isCurrentBead(index) ? 'current-bead' : ''}`}
            style={{
              backgroundColor: getBeadColor(bead),
              border: bead.toUpperCase() === 'W' ? '2px solid #ccc' : 'none'
            }}
            title={`${bead.toUpperCase()} - ${index + 1}`}
          >
                      {getDirectionArrow(bead) && (
            <span className="direction-arrow">{getDirectionArrow(bead)}</span>
          )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BeadSequence;
