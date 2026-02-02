import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface ZLayerItem {
  id: string;
  type: 'tool' | 'npc' | 'avatar';
  label: string;
  zLayer: 'back' | 'mid' | 'front';
  zIndex: number;
  x: number; // percentage
  y: number; // percentage
}

interface ZLayerDebugOverlayProps {
  items: ZLayerItem[];
  isVisible: boolean;
  onToggle: () => void;
}

const LAYER_COLORS = {
  back: '#ef4444',   // red
  mid: '#f59e0b',    // amber
  front: '#22c55e',  // green
};

const LAYER_ZINDEX = {
  back: 6,
  mid: 10,
  front: 14,
};

/**
 * Debug overlay showing z-layer info for each NPC/Tool
 * Helps quickly identify layering issues
 */
export function ZLayerDebugOverlay({ items, isVisible, onToggle }: ZLayerDebugOverlayProps) {
  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 left-4 z-[100] px-2 py-1 text-xs bg-black/70 text-white rounded hover:bg-black/90 hidden lg:flex items-center gap-1"
      >
        <Eye className="w-3 h-3" />
        Z-Layers
      </button>
    );
  }

  return (
    <>
      {/* Floating labels on each item */}
      {items.map((item) => (
        <div
          key={item.id}
          className="absolute pointer-events-none transform -translate-x-1/2"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            zIndex: 999, // Always on top for debugging
          }}
        >
          <div
            className="px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shadow-lg border border-white/30"
            style={{
              backgroundColor: LAYER_COLORS[item.zLayer],
              color: 'white',
            }}
          >
            <div className="flex flex-col items-center leading-tight">
              <span>{item.type === 'npc' ? '👤' : item.type === 'avatar' ? '🧑' : '🔧'} {item.label}</span>
              <span className="opacity-90">
                {item.zLayer.toUpperCase()} (z:{item.zIndex})
              </span>
            </div>
          </div>
        </div>
      ))}

      {/* Legend panel - hidden on mobile */}
      <div className="fixed bottom-12 left-4 z-[100] bg-black/80 text-white p-2 rounded-lg text-xs hidden lg:block">
        <div className="font-bold mb-1">Z-Layer Legend:</div>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: LAYER_COLORS.front }} />
            <span>FRONT (z:14) - רצפה קדמית</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: LAYER_COLORS.mid }} />
            <span>MID (z:10) - NPCs</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: LAYER_COLORS.back }} />
            <span>BACK (z:6) - קיר/תקרה</span>
          </div>
        </div>
      </div>

      {/* Close button - hidden on mobile */}
      <button
        onClick={onToggle}
        className="fixed bottom-4 left-4 z-[100] px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 hidden lg:flex items-center gap-1"
      >
        <EyeOff className="w-3 h-3" />
        סגור
      </button>
    </>
  );
}

export type { ZLayerItem };
export { LAYER_ZINDEX };
