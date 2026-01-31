import { useState } from 'react';

interface GridDebugOverlayProps {
  isVisible: boolean;
  onToggle: () => void;
  rows?: number;
  cols?: number;
}

export function GridDebugOverlay({ 
  isVisible, 
  onToggle,
  rows = 5,
  cols = 5,
}: GridDebugOverlayProps) {
  const cells = [];
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cellNumber = row * cols + col + 1;
      const left = (col / cols) * 100;
      const top = (row / rows) * 100;
      const width = 100 / cols;
      const height = 100 / rows;
      
      cells.push(
        <div
          key={cellNumber}
          className="absolute border border-yellow-400/60 flex items-center justify-center"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            width: `${width}%`,
            height: `${height}%`,
          }}
        >
          <span 
            className="text-yellow-300 font-bold text-lg md:text-2xl drop-shadow-lg"
            style={{
              textShadow: '0 0 8px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.8)',
            }}
          >
            {cellNumber}
          </span>
        </div>
      );
    }
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-32 z-50 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
        style={{
          background: isVisible ? 'hsl(50 90% 50%)' : 'hsl(220 15% 25% / 0.8)',
          color: isVisible ? 'black' : 'white',
          border: '1px solid hsl(50 60% 50% / 0.5)',
        }}
      >
        🔢 Grid
      </button>

      {/* Grid Overlay */}
      {isVisible && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 45 }}
        >
          {cells}
          
          {/* Legend */}
          <div 
            className="absolute top-2 left-2 bg-black/70 text-yellow-300 text-xs px-2 py-1 rounded"
            style={{ zIndex: 46 }}
          >
            Grid: {cols}×{rows} = {cols * rows} cells
          </div>
        </div>
      )}
    </>
  );
}
