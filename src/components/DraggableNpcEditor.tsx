import React, { useState, useRef, useCallback } from 'react';

interface NpcPosition {
  id: string;
  label: string;
  left: number; // percentage
  top: number;  // percentage
  height: string;
  imageSrc: string;
}

interface DraggableNpcEditorProps {
  isEnabled: boolean;
  npcs: NpcPosition[];
  onPositionChange?: (id: string, left: number, top: number) => void;
}

export const DraggableNpcEditor: React.FC<DraggableNpcEditorProps> = ({
  isEnabled,
  npcs,
  onPositionChange,
}) => {
  const [positions, setPositions] = useState<Record<string, { left: number; top: number }>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getPosition = (id: string, original: { left: number; top: number }) => {
    return positions[id] || original;
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    if (!isEnabled) return;
    e.preventDefault();
    setDraggingId(id);
  }, [isEnabled]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingId || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const left = ((e.clientX - rect.left) / rect.width) * 100;
    const top = ((e.clientY - rect.top) / rect.height) * 100;
    
    setPositions(prev => ({
      ...prev,
      [draggingId]: {
        left: Math.max(0, Math.min(100, left)),
        top: Math.max(0, Math.min(100, top)),
      }
    }));
    
    onPositionChange?.(draggingId, left, top);
  }, [draggingId, onPositionChange]);

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  const copyPosition = (id: string, pos: { left: number; top: number }) => {
    const json = JSON.stringify({ id, left: `${pos.left.toFixed(1)}%`, top: `${pos.top.toFixed(1)}%` }, null, 2);
    navigator.clipboard.writeText(json);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAllPositions = () => {
    const allPositions = npcs.map(npc => {
      const pos = getPosition(npc.id, { left: npc.left, top: npc.top });
      return { id: npc.id, label: npc.label, left: `${pos.left.toFixed(1)}%`, top: `${pos.top.toFixed(1)}%` };
    });
    navigator.clipboard.writeText(JSON.stringify(allPositions, null, 2));
    setCopiedId('all');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isEnabled) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[9999]"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Position display panel */}
      <div className="absolute top-4 left-4 bg-black/90 text-white p-3 rounded-lg text-xs font-mono max-w-xs z-[10000]">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-yellow-400">🎯 NPC Editor</span>
          <button
            onClick={copyAllPositions}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-[10px]"
          >
            {copiedId === 'all' ? '✓ Copied!' : 'Copy All'}
          </button>
        </div>
        <div className="text-gray-400 text-[10px] mb-2">גררי דמות למקום הרצוי</div>
        {npcs.map(npc => {
          const pos = getPosition(npc.id, { left: npc.left, top: npc.top });
          return (
            <div key={npc.id} className="flex items-center justify-between py-1 border-t border-gray-700">
              <span className="text-green-400">{npc.label}</span>
              <div className="flex items-center gap-2">
                <span>X:{pos.left.toFixed(1)}% Y:{pos.top.toFixed(1)}%</span>
                <button
                  onClick={() => copyPosition(npc.id, pos)}
                  className="px-1 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-[10px]"
                >
                  {copiedId === npc.id ? '✓' : '📋'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Draggable NPCs */}
      {npcs.map(npc => {
        const pos = getPosition(npc.id, { left: npc.left, top: npc.top });
        const isDragging = draggingId === npc.id;
        
        return (
          <div
            key={npc.id}
            className="absolute cursor-grab active:cursor-grabbing"
            style={{
              left: `${pos.left}%`,
              top: `${pos.top}%`,
              transform: 'translate(-50%, -100%)',
              zIndex: isDragging ? 10001 : 10000,
            }}
            onMouseDown={(e) => handleMouseDown(e, npc.id)}
          >
            <img
              src={npc.imageSrc}
              alt={npc.label}
              style={{ height: npc.height }}
              className={`pointer-events-none ${isDragging ? 'opacity-80 scale-105' : ''}`}
              draggable={false}
            />
            {/* Label */}
            <div 
              className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/80 text-white px-2 py-0.5 rounded text-[10px] whitespace-nowrap"
            >
              {npc.label}
            </div>
            {/* Position indicator */}
            <div 
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-1 py-0.5 rounded text-[9px] font-mono whitespace-nowrap"
            >
              {pos.left.toFixed(0)}%, {pos.top.toFixed(0)}%
            </div>
          </div>
        );
      })}
    </div>
  );
};
