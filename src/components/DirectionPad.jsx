import React from 'react';
import './DirectionPad.css';

const DirectionPad = () => {
  return (
    <div className="direction-pad">
      <div className="start-dot">
        <div className="dot black"></div>
        <span>Start</span>
      </div>
      <div className="arrow-grid">
        <div className="arrow-row">
          <div className="arrow-cell"></div>
          <div className="arrow-cell">
            <div className="arrow up" title="Red">▲</div>
            <span>Red</span>
          </div>
          <div className="arrow-cell"></div>
        </div>
        <div className="arrow-row">
          <div className="arrow-cell">
            <div className="arrow left" title="Blue">◀</div>
            <span>Blue</span>
          </div>
          <div className="arrow-cell center-cell"></div>
          <div className="arrow-cell">
            <div className="arrow right" title="Yellow">▶</div>
            <span>Yellow</span>
          </div>
        </div>
        <div className="arrow-row">
          <div className="arrow-cell"></div>
          <div className="arrow-cell">
            <div className="arrow down" title="Green">▼</div>
            <span>Green</span>
          </div>
          <div className="arrow-cell"></div>
        </div>
      </div>
      <div className="end-dot">
        <div className="dot white"></div>
        <span>End</span>
      </div>
    </div>
  );
};

export default DirectionPad;
