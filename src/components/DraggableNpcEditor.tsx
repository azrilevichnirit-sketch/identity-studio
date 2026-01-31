import React, { useState, useRef, useCallback } from 'react';

interface DraggableItem {
  id: string;
  label: string;
  left: number; // percentage
  top: number;  // percentage
  height: string;
  imageSrc: string;
  type: 'npc' | 'tool';
}

interface DraggableNpcEditorProps {
  isEnabled: boolean;
  npcs: Omit<DraggableItem, 'type'>[];
  tools?: Omit<DraggableItem, 'type'>[];
  onPositionChange?: (id: string, left: number, top: number) => void;
}

export const DraggableNpcEditor: React.FC<DraggableNpcEditorProps> = ({
  isEnabled,
  npcs,
  tools = [],
  onPositionChange,
}) => {
  const [positions, setPositions] = useState<Record<string, { left: number; top: number }>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showNpcs, setShowNpcs] = useState(true);
  const [showTools, setShowTools] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const allItems: DraggableItem[] = [
    ...npcs.map(n => ({ ...n, type: 'npc' as const })),
    ...tools.map(t => ({ ...t, type: 'tool' as const })),
  ];

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

  const copyPosition = (item: DraggableItem) => {
    const pos = getPosition(item.id, { left: item.left, top: item.top });
    const json = JSON.stringify({ 
      id: item.id, 
      type: item.type,
      left: `${pos.left.toFixed(1)}%`, 
      top: `${pos.top.toFixed(1)}%` 
    }, null, 2);
    navigator.clipboard.writeText(json);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAllPositions = () => {
    const allPositions = allItems
      .filter(item => (item.type === 'npc' && showNpcs) || (item.type === 'tool' && showTools))
      .map(item => {
        const pos = getPosition(item.id, { left: item.left, top: item.top });
        return { 
          id: item.id, 
          type: item.type,
          label: item.label, 
          left: `${pos.left.toFixed(1)}%`, 
          top: `${pos.top.toFixed(1)}%` 
        };
      });
    navigator.clipboard.writeText(JSON.stringify(allPositions, null, 2));
    setCopiedId('all');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isEnabled) return null;

  const visibleItems = allItems.filter(item => 
    (item.type === 'npc' && showNpcs) || (item.type === 'tool' && showTools)
  );

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[9999]"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Position display panel */}
      <div className="absolute top-4 left-4 bg-black/90 text-white p-3 rounded-lg text-xs font-mono max-w-xs z-[10000] max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-yellow-400">🎯 Position Editor</span>
          <button
            onClick={copyAllPositions}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-[10px]"
          >
            {copiedId === 'all' ? '✓ Copied!' : 'Copy All'}
          </button>
        </div>
        
        {/* Toggle filters */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setShowNpcs(!showNpcs)}
            className={`px-2 py-1 rounded text-[10px] ${showNpcs ? 'bg-green-600' : 'bg-gray-700'}`}
          >
            👤 NPCs {showNpcs ? '✓' : '○'}
          </button>
          <button
            onClick={() => setShowTools(!showTools)}
            className={`px-2 py-1 rounded text-[10px] ${showTools ? 'bg-purple-600' : 'bg-gray-700'}`}
          >
            🔧 Tools {showTools ? '✓' : '○'}
          </button>
        </div>
        
        <div className="text-gray-400 text-[10px] mb-2">גררי אלמנט למקום הרצוי</div>
        
        {visibleItems.map(item => {
          const pos = getPosition(item.id, { left: item.left, top: item.top });
          const typeColor = item.type === 'npc' ? 'text-green-400' : 'text-purple-400';
          return (
            <div key={item.id} className="flex items-center justify-between py-1 border-t border-gray-700">
              <span className={typeColor}>{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px]">X:{pos.left.toFixed(1)}% Y:{pos.top.toFixed(1)}%</span>
                <button
                  onClick={() => copyPosition(item)}
                  className="px-1 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-[10px]"
                >
                  {copiedId === item.id ? '✓' : '📋'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Draggable items */}
      {visibleItems.map(item => {
        const pos = getPosition(item.id, { left: item.left, top: item.top });
        const isDragging = draggingId === item.id;
        const borderColor = item.type === 'npc' ? 'border-green-500' : 'border-purple-500';
        const bgColor = item.type === 'npc' ? 'bg-green-500' : 'bg-purple-500';
        
        return (
          <div
            key={item.id}
            className={`absolute cursor-grab active:cursor-grabbing ${isDragging ? 'ring-2 ring-yellow-400' : ''}`}
            style={{
              left: `${pos.left}%`,
              top: `${pos.top}%`,
              transform: 'translate(-50%, -100%)',
              zIndex: isDragging ? 10001 : 10000,
            }}
            onMouseDown={(e) => handleMouseDown(e, item.id)}
          >
            <div className={`relative border-2 ${borderColor} rounded-lg p-1 bg-black/30`}>
              <img
                src={item.imageSrc}
                alt={item.label}
                style={{ height: item.height, maxHeight: '150px' }}
                className={`pointer-events-none ${isDragging ? 'opacity-80 scale-105' : ''}`}
                draggable={false}
              />
            </div>
            {/* Label */}
            <div 
              className={`absolute -top-6 left-1/2 -translate-x-1/2 ${bgColor} text-white px-2 py-0.5 rounded text-[10px] whitespace-nowrap`}
            >
              {item.type === 'npc' ? '👤' : '🔧'} {item.label}
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
