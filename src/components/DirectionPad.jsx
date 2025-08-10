import React from 'react';
import './DirectionPad.css';

const DirectionPad = () => {
  return (
    <div className="direction-pad">
      <div className="start-dot">
        <div className="dot black">
          <span>Start</span>
        </div>
      </div>
      <div className="arrow-grid">
        <div className="arrow-row">
          <div className="arrow-cell"></div>
          <div className="arrow-cell">
            <div className="arrow up" title="Blue">
              <span>Blue</span>
            </div>
          </div>
          <div className="arrow-cell"></div>
        </div>
        <div className="arrow-row">
          <div className="arrow-cell">
            <div className="arrow left" title="Green">
              <span>Green</span>
            </div>
          </div>
          <div className="arrow-cell center-cell"></div>
          <div className="arrow-cell">
            <div className="arrow right" title="Red">
              <span>Red</span>
            </div>
          </div>
        </div>
        <div className="arrow-row">
          <div className="arrow-cell"></div>
          <div className="arrow-cell">
            <div className="arrow down" title="Yellow">
              <span>Yellow</span>
            </div>
          </div>
          <div className="arrow-cell"></div>
        </div>
      </div>
      <div className="end-dot">
        <div className="dot white">
          <span>End</span>
        </div>
      </div>
    </div>
  );
};

export default DirectionPad;
