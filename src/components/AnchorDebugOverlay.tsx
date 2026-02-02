import { useState } from 'react';

interface AnchorDebugOverlayProps {
  anchors: {
    name: string;
    y: number;
    color: string;
  }[];
  isVisible: boolean;
  onToggle: () => void;
}

/**
 * Debug overlay showing horizontal lines at anchor Y positions
 * Helps visualize where drop zones and placements will appear
 */
export function AnchorDebugOverlay({ anchors, isVisible, onToggle }: AnchorDebugOverlayProps) {
  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-28 z-[100] px-2 py-1 text-xs bg-black/70 text-white rounded hover:bg-black/90 hidden lg:block"
      >
        📍 Anchors
      </button>
    );
  }

  return (
    <>
      {/* Anchor lines */}
      {anchors.map((anchor) => (
        <div
          key={anchor.name}
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: `${anchor.y}%`,
            zIndex: 99,
          }}
        >
          <div
            className="w-full h-[2px]"
            style={{ backgroundColor: anchor.color }}
          />
          <span
            className="absolute left-2 -translate-y-full text-xs font-bold px-1 rounded"
            style={{ backgroundColor: anchor.color, color: 'white' }}
          >
            {anchor.name}: {anchor.y}%
          </span>
        </div>
      ))}

      {/* Close button */}
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-28 z-[100] px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 hidden lg:block"
      >
        📍 Close
      </button>
    </>
  );
}
