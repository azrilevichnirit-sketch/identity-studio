import React, { useState, useRef, useCallback } from 'react';
import { RotateCw, ZoomIn, ZoomOut, FlipHorizontal, RotateCcw } from 'lucide-react';

interface DraggableItem {
  id: string;
  label: string;
  left: number; // percentage
  top: number;  // percentage
  height: string;
  imageSrc?: string;
  type: 'npc' | 'tool' | 'avatar' | 'bubble';
  // For bubble type
  content?: React.ReactNode;
  width?: string;
}

interface TransformState {
  left: number;
  top: number;
  scale: number;
  rotation: number;
  flipX: boolean;
}

interface BubbleItem {
  id: string;
  label: string;
  left: number;
  top: number;
  height: string;
  width?: string;
  content?: React.ReactNode;
}

interface DraggableNpcEditorProps {
  isEnabled: boolean;
  npcs: Omit<DraggableItem, 'type'>[];
  tools?: Omit<DraggableItem, 'type'>[];
  avatar?: Omit<DraggableItem, 'type'>;
  bubble?: BubbleItem;
  onPositionChange?: (id: string, left: number, top: number) => void;
}

export const DraggableNpcEditor: React.FC<DraggableNpcEditorProps> = ({
  isEnabled,
  npcs,
  tools = [],
  avatar,
  bubble,
  onPositionChange,
}) => {
  const [transforms, setTransforms] = useState<Record<string, TransformState>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showNpcs, setShowNpcs] = useState(true);
  const [showTools, setShowTools] = useState(true);
  const [showAvatar, setShowAvatar] = useState(true);
  const [showBubble, setShowBubble] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const allItems: DraggableItem[] = [
    ...(bubble ? [{ ...bubble, type: 'bubble' as const, imageSrc: undefined }] : []),
    ...(avatar ? [{ ...avatar, type: 'avatar' as const }] : []),
    ...npcs.map(n => ({ ...n, type: 'npc' as const })),
    ...tools.map(t => ({ ...t, type: 'tool' as const })),
  ];

  const getTransform = (id: string, original: { left: number; top: number }): TransformState => {
    return transforms[id] || { 
      left: original.left, 
      top: original.top, 
      scale: 1, 
      rotation: 0,
      flipX: false,
    };
  };

  const updateTransform = (id: string, updates: Partial<TransformState>) => {
    setTransforms(prev => ({
      ...prev,
      [id]: { ...getTransform(id, { left: 50, top: 50 }), ...prev[id], ...updates }
    }));
  };

  const resetAllTransforms = () => {
    setTransforms({});
    setSelectedId(null);
  };

  const resetItemTransform = (id: string, original: { left: number; top: number }) => {
    setTransforms(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handlePointerDown = useCallback((e: React.PointerEvent, id: string) => {
    if (!isEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDraggingId(id);
    setSelectedId(id);
  }, [isEnabled]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingId || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const left = ((e.clientX - rect.left) / rect.width) * 100;
    const top = ((e.clientY - rect.top) / rect.height) * 100;
    
    updateTransform(draggingId, {
      left: Math.max(0, Math.min(100, left)),
      top: Math.max(0, Math.min(100, top)),
    });
    
    onPositionChange?.(draggingId, left, top);
  }, [draggingId, onPositionChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    setDraggingId(null);
  }, []);

  const handleScale = (id: string, delta: number) => {
    const current = transforms[id]?.scale || 1;
    const newScale = Math.max(0.1, Math.min(5, current + delta));
    updateTransform(id, { scale: newScale });
  };

  const handleRotate = (id: string, delta: number) => {
    const current = transforms[id]?.rotation || 0;
    updateTransform(id, { rotation: (current + delta) % 360 });
  };

  const handleFlip = (id: string) => {
    const current = transforms[id]?.flipX || false;
    updateTransform(id, { flipX: !current });
  };

  const copyTransform = (item: DraggableItem) => {
    const t = getTransform(item.id, { left: item.left, top: item.top });
    const json = JSON.stringify({ 
      id: item.id, 
      type: item.type,
      left: `${t.left.toFixed(1)}%`, 
      top: `${t.top.toFixed(1)}%`,
      scale: t.scale.toFixed(2),
      rotation: `${t.rotation}deg`,
      flipX: t.flipX,
    }, null, 2);
    navigator.clipboard.writeText(json);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAllTransforms = () => {
    const allTransforms = allItems
      .filter(item => 
        (item.type === 'npc' && showNpcs) || 
        (item.type === 'tool' && showTools) ||
        (item.type === 'avatar' && showAvatar) ||
        (item.type === 'bubble' && showBubble)
      )
      .map(item => {
        const t = getTransform(item.id, { left: item.left, top: item.top });
        return { 
          id: item.id, 
          type: item.type,
          label: item.label, 
          left: `${t.left.toFixed(1)}%`, 
          top: `${t.top.toFixed(1)}%`,
          scale: t.scale.toFixed(2),
          rotation: `${t.rotation}deg`,
          flipX: t.flipX,
        };
      });
    navigator.clipboard.writeText(JSON.stringify(allTransforms, null, 2));
    setCopiedId('all');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isEnabled) return null;

  const visibleItems = allItems.filter(item => 
    (item.type === 'npc' && showNpcs) || 
    (item.type === 'tool' && showTools) ||
    (item.type === 'avatar' && showAvatar) ||
    (item.type === 'bubble' && showBubble)
  );

  const selectedItem = visibleItems.find(i => i.id === selectedId);

  type ItemType = 'npc' | 'tool' | 'avatar' | 'bubble';

  const getItemColor = (type: ItemType) => {
    switch (type) {
      case 'bubble': return { border: 'border-orange-500', bg: 'bg-orange-500', text: 'text-orange-400' };
      case 'avatar': return { border: 'border-yellow-500', bg: 'bg-yellow-500', text: 'text-yellow-400' };
      case 'npc': return { border: 'border-green-500', bg: 'bg-green-500', text: 'text-green-400' };
      case 'tool': return { border: 'border-purple-500', bg: 'bg-purple-500', text: 'text-purple-400' };
    }
  };

  const getItemIcon = (type: ItemType) => {
    switch (type) {
      case 'bubble': return '💬';
      case 'avatar': return '🧑';
      case 'npc': return '👤';
      case 'tool': return '🔧';
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[9999] touch-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={() => setSelectedId(null)}
    >
      {/* Control Panel */}
      <div className="absolute top-4 left-4 bg-black/90 text-white p-3 rounded-lg text-xs font-mono max-w-sm z-[10000] max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-yellow-400">🎯 Position Editor</span>
          <div className="flex gap-1">
            <button
              onClick={resetAllTransforms}
              className="px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-[10px] flex items-center gap-1"
              title="Reset All"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
            <button
              onClick={copyAllTransforms}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-[10px]"
            >
              {copiedId === 'all' ? '✓ Copied!' : 'Copy All'}
            </button>
          </div>
        </div>
        
        {/* Toggle filters - separated */}
        <div className="flex flex-wrap gap-2 mb-2">
          <button
            onClick={() => setShowBubble(!showBubble)}
            className={`px-2 py-1 rounded text-[10px] ${showBubble ? 'bg-orange-600' : 'bg-gray-700'}`}
          >
            💬 Bubble {showBubble ? '✓' : '○'}
          </button>
          <button
            onClick={() => setShowAvatar(!showAvatar)}
            className={`px-2 py-1 rounded text-[10px] ${showAvatar ? 'bg-yellow-600' : 'bg-gray-700'}`}
          >
            🧑 Avatar {showAvatar ? '✓' : '○'}
          </button>
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
        
        <div className="text-gray-400 text-[10px] mb-2">לחצי על אלמנט לעריכה מתקדמת</div>
        
        {/* Selected item controls */}
        {selectedItem && (
          <div className="bg-yellow-900/50 border border-yellow-500 rounded p-2 mb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-yellow-300">{getItemIcon(selectedItem.type)} {selectedItem.label}</div>
              <button
                onClick={() => resetItemTransform(selectedItem.id, { left: selectedItem.left, top: selectedItem.top })}
                className="px-2 py-0.5 bg-red-700 hover:bg-red-600 rounded text-[9px] flex items-center gap-1"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Reset
              </button>
            </div>
            
            {/* Transform controls */}
            <div className="grid grid-cols-2 gap-2">
              {/* Scale */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-400">Scale:</span>
                <button
                  onClick={() => handleScale(selectedItem.id, -0.1)}
                  className="p-1 bg-gray-700 hover:bg-gray-600 rounded"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <span className="text-[10px] w-8 text-center">
                  {(transforms[selectedItem.id]?.scale || 1).toFixed(1)}
                </span>
                <button
                  onClick={() => handleScale(selectedItem.id, 0.1)}
                  className="p-1 bg-gray-700 hover:bg-gray-600 rounded"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
              </div>
              
              {/* Rotation */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-400">Rotate:</span>
                <button
                  onClick={() => handleRotate(selectedItem.id, -15)}
                  className="p-1 bg-gray-700 hover:bg-gray-600 rounded"
                >
                  <RotateCw className="w-3 h-3 -scale-x-100" />
                </button>
                <span className="text-[10px] w-8 text-center">
                  {transforms[selectedItem.id]?.rotation || 0}°
                </span>
                <button
                  onClick={() => handleRotate(selectedItem.id, 15)}
                  className="p-1 bg-gray-700 hover:bg-gray-600 rounded"
                >
                  <RotateCw className="w-3 h-3" />
                </button>
              </div>
              
              {/* Flip */}
              <div className="flex items-center gap-1 col-span-2">
                <button
                  onClick={() => handleFlip(selectedItem.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] ${
                    transforms[selectedItem.id]?.flipX ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <FlipHorizontal className="w-3 h-3" />
                  <span>Flip X {transforms[selectedItem.id]?.flipX ? '✓' : ''}</span>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Items list - grouped by type */}
        {showBubble && bubble && (
          <div className="mb-2">
            <div className="text-orange-400 text-[10px] font-bold mb-1 border-b border-orange-600 pb-1">💬 Speech Bubble</div>
            {visibleItems.filter(i => i.type === 'bubble').map(item => {
              const t = getTransform(item.id, { left: item.left, top: item.top });
              const isSelected = selectedId === item.id;
              return (
                <div 
                  key={item.id} 
                  className={`flex items-center justify-between py-1 cursor-pointer hover:bg-gray-800/50 ${isSelected ? 'bg-yellow-900/30' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); }}
                >
                  <span className="text-orange-400">{item.label}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-gray-500">
                      {t.left.toFixed(0)}%,{t.top.toFixed(0)}% s:{t.scale.toFixed(1)} r:{t.rotation}°
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyTransform(item); }}
                      className="px-1 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-[10px]"
                    >
                      {copiedId === item.id ? '✓' : '📋'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {showAvatar && avatar && (
          <div className="mb-2">
            <div className="text-yellow-400 text-[10px] font-bold mb-1 border-b border-yellow-600 pb-1">🧑 Avatar</div>
            {visibleItems.filter(i => i.type === 'avatar').map(item => {
              const t = getTransform(item.id, { left: item.left, top: item.top });
              const isSelected = selectedId === item.id;
              return (
                <div 
                  key={item.id} 
                  className={`flex items-center justify-between py-1 cursor-pointer hover:bg-gray-800/50 ${isSelected ? 'bg-yellow-900/30' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); }}
                >
                  <span className="text-yellow-400">{item.label}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-gray-500">
                      {t.left.toFixed(0)}%,{t.top.toFixed(0)}% s:{t.scale.toFixed(1)} r:{t.rotation}°
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyTransform(item); }}
                      className="px-1 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-[10px]"
                    >
                      {copiedId === item.id ? '✓' : '📋'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {showNpcs && npcs.length > 0 && (
          <div className="mb-2">
            <div className="text-green-400 text-[10px] font-bold mb-1 border-b border-green-600 pb-1">👤 NPCs</div>
            {visibleItems.filter(i => i.type === 'npc').map(item => {
              const t = getTransform(item.id, { left: item.left, top: item.top });
              const isSelected = selectedId === item.id;
              return (
                <div 
                  key={item.id} 
                  className={`flex items-center justify-between py-1 cursor-pointer hover:bg-gray-800/50 ${isSelected ? 'bg-yellow-900/30' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); }}
                >
                  <span className="text-green-400">{item.label}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-gray-500">
                      {t.left.toFixed(0)}%,{t.top.toFixed(0)}% s:{t.scale.toFixed(1)} r:{t.rotation}°
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyTransform(item); }}
                      className="px-1 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-[10px]"
                    >
                      {copiedId === item.id ? '✓' : '📋'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {showTools && tools.length > 0 && (
          <div className="mb-2">
            <div className="text-purple-400 text-[10px] font-bold mb-1 border-b border-purple-600 pb-1">🔧 Tools</div>
            {visibleItems.filter(i => i.type === 'tool').map(item => {
              const t = getTransform(item.id, { left: item.left, top: item.top });
              const isSelected = selectedId === item.id;
              return (
                <div 
                  key={item.id} 
                  className={`flex items-center justify-between py-1 cursor-pointer hover:bg-gray-800/50 ${isSelected ? 'bg-yellow-900/30' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); }}
                >
                  <span className="text-purple-400">{item.label}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-gray-500">
                      {t.left.toFixed(0)}%,{t.top.toFixed(0)}% s:{t.scale.toFixed(1)} r:{t.rotation}°
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyTransform(item); }}
                      className="px-1 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-[10px]"
                    >
                      {copiedId === item.id ? '✓' : '📋'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Draggable items */}
      {visibleItems.map(item => {
        const t = getTransform(item.id, { left: item.left, top: item.top });
        const isDragging = draggingId === item.id;
        const isSelected = selectedId === item.id;
        const colors = getItemColor(item.type);
        
        // Special rendering for bubble type
        if (item.type === 'bubble') {
          return (
            <div
              key={item.id}
              className={`absolute cursor-grab active:cursor-grabbing ${isDragging ? 'ring-2 ring-yellow-400' : ''} ${isSelected ? 'ring-2 ring-white' : ''}`}
              style={{
                left: `${t.left}%`,
                top: `${t.top}%`,
                transform: `translate(-50%, -50%) scale(${t.scale}) rotate(${t.rotation}deg) ${t.flipX ? 'scaleX(-1)' : ''}`,
                transformOrigin: 'center center',
                zIndex: isDragging || isSelected ? 10001 : 10000,
                width: item.width || 'auto',
                maxWidth: '400px',
              }}
              onPointerDown={(e) => handlePointerDown(e, item.id)}
              onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); }}
            >
              <div className={`relative border-2 ${colors.border} rounded-lg bg-[#FFFDF8] p-3`}>
                <div 
                  className="text-[12px] text-[#1a1a1a] font-sans"
                  style={{ direction: 'rtl', textAlign: 'right' }}
                >
                  {item.content || 'Speech Bubble Preview'}
                </div>
              </div>
              {/* Label */}
              <div 
                className={`absolute -top-6 left-1/2 -translate-x-1/2 ${colors.bg} text-white px-2 py-0.5 rounded text-[10px] whitespace-nowrap`}
                style={{ transform: `translateX(-50%) rotate(${-t.rotation}deg) ${t.flipX ? 'scaleX(-1)' : ''}` }}
              >
                {getItemIcon(item.type)} {item.label}
              </div>
              {/* Position indicator */}
              <div 
                className="absolute -bottom-4 left-1/2 bg-yellow-500 text-black px-1 py-0.5 rounded text-[9px] font-mono whitespace-nowrap"
                style={{ transform: `translateX(-50%) rotate(${-t.rotation}deg) ${t.flipX ? 'scaleX(-1)' : ''}` }}
              >
                {t.left.toFixed(0)}%, {t.top.toFixed(0)}% | s:{t.scale.toFixed(1)}
              </div>
            </div>
          );
        }
        
        return (
          <div
            key={item.id}
            className={`absolute cursor-grab active:cursor-grabbing ${isDragging ? 'ring-2 ring-yellow-400' : ''} ${isSelected ? 'ring-2 ring-white' : ''}`}
            style={{
              left: `${t.left}%`,
              top: `${t.top}%`,
              transform: `translate(-50%, -100%) scale(${t.scale}) rotate(${t.rotation}deg) ${t.flipX ? 'scaleX(-1)' : ''}`,
              transformOrigin: 'bottom center',
              zIndex: isDragging || isSelected ? 10001 : 10000,
            }}
            onPointerDown={(e) => handlePointerDown(e, item.id)}
            onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); }}
          >
            <div className={`relative border-2 ${colors.border} rounded-lg p-1 bg-black/30`}>
              <img
                src={item.imageSrc}
                alt={item.label}
                style={{ height: item.height, maxHeight: item.type === 'avatar' ? '250px' : '150px' }}
                className={`pointer-events-none ${isDragging ? 'opacity-80' : ''}`}
                draggable={false}
              />
            </div>
            {/* Label */}
            <div 
              className={`absolute -top-6 left-1/2 -translate-x-1/2 ${colors.bg} text-white px-2 py-0.5 rounded text-[10px] whitespace-nowrap`}
              style={{ transform: `translateX(-50%) rotate(${-t.rotation}deg) ${t.flipX ? 'scaleX(-1)' : ''}` }}
            >
              {getItemIcon(item.type)} {item.label}
            </div>
            {/* Position indicator */}
            <div 
              className="absolute -bottom-4 left-1/2 bg-yellow-500 text-black px-1 py-0.5 rounded text-[9px] font-mono whitespace-nowrap"
              style={{ transform: `translateX(-50%) rotate(${-t.rotation}deg) ${t.flipX ? 'scaleX(-1)' : ''}` }}
            >
              {t.left.toFixed(0)}%, {t.top.toFixed(0)}% | s:{t.scale.toFixed(1)}
            </div>
          </div>
        );
      })}
    </div>
  );
};