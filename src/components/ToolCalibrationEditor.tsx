import { useState, useRef, useEffect } from 'react';
import { Move, Copy, ChevronDown, ChevronUp, SkipForward, Box } from 'lucide-react';
import { getAnchorPosition } from '@/lib/jsonDataLoader';
import { getToolImage } from '@/lib/assetUtils';
import type { AnchorRef, Mission } from '@/types/identity';
import type { SpawnedExtra } from '@/hooks/useSceneExtras';

interface ToolCalibrationEditorProps {
  mission: Mission;
  currentBgKey: string;
  onNextMission?: () => void;
  sceneExtras?: SpawnedExtra[];
  onExtraPositionChange?: (extraId: string, x: number, y: number, scale: number) => void;
}

interface ToolPosition {
  x: number;
  y: number;
  scale: number;
  flipX: boolean;
}

export function ToolCalibrationEditor({ mission, currentBgKey, onNextMission, sceneExtras = [], onExtraPositionChange }: ToolCalibrationEditorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedTool, setSelectedTool] = useState<'a' | 'b' | null>(null);
  const [selectedExtra, setSelectedExtra] = useState<string | null>(null);
  
  // Single position per tool - same for drag target AND final placement
  const [positions, setPositions] = useState<{ a: ToolPosition; b: ToolPosition }>(() => {
    const getInitialPos = (key: 'a' | 'b'): ToolPosition => {
      const isTie = mission.mission_id.includes('_tie_');
      const missionNum = mission.mission_id.replace('studio_', '').replace('tie_', '').padStart(2, '0');
      const anchorRef = (isTie ? `tie_${missionNum}_tool_${key}` : `m${missionNum}_tool_${key}`) as AnchorRef;
      const pos = getAnchorPosition(currentBgKey, anchorRef);
      return {
        x: pos?.x ?? 50,
        y: pos?.y ?? 80,
        scale: pos?.scale ?? 1,
        flipX: pos?.flipX ?? false,
      };
    };
    return { a: getInitialPos('a'), b: getInitialPos('b') };
  });

  // Extra positions state
  const [extraPositions, setExtraPositions] = useState<Record<string, ToolPosition>>(() => {
    const initial: Record<string, ToolPosition> = {};
    for (const extra of sceneExtras) {
      initial[extra.id] = {
        x: 50 + extra.offsetX,
        y: 75 + extra.offsetY,
        scale: extra.scale,
        flipX: false,
      };
    }
    return initial;
  });
  
  const isDragging = useRef(false);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const dragStartToolPos = useRef<{ x: number; y: number } | null>(null);

  // Update positions when mission changes
  useEffect(() => {
    const getInitialPos = (key: 'a' | 'b'): ToolPosition => {
      const isTie = mission.mission_id.includes('_tie_');
      const missionNum = mission.mission_id.replace('studio_', '').replace('tie_', '').padStart(2, '0');
      const anchorRef = (isTie ? `tie_${missionNum}_tool_${key}` : `m${missionNum}_tool_${key}`) as AnchorRef;
      const pos = getAnchorPosition(currentBgKey, anchorRef);
      return {
        x: pos?.x ?? 50,
        y: pos?.y ?? 80,
        scale: pos?.scale ?? 1,
        flipX: pos?.flipX ?? false,
      };
    };
    setPositions({ a: getInitialPos('a'), b: getInitialPos('b') });
    setSelectedTool(null);
    setSelectedExtra(null);
  }, [mission.mission_id, currentBgKey]);

  // Update extra positions when sceneExtras change
  useEffect(() => {
    const initial: Record<string, ToolPosition> = {};
    for (const extra of sceneExtras) {
      initial[extra.id] = extraPositions[extra.id] ?? {
        x: 50 + extra.offsetX,
        y: 75 + extra.offsetY,
        scale: extra.scale,
        flipX: false,
      };
    }
    setExtraPositions(initial);
  }, [sceneExtras]);

  const optionA = mission.options.find(o => o.key === 'a');
  const optionB = mission.options.find(o => o.key === 'b');
  const toolAImage = optionA ? getToolImage(optionA.asset) : null;
  const toolBImage = optionB ? getToolImage(optionB.asset) : null;

  const handlePointerDown = (tool: 'a' | 'b', e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedTool(tool);
    setSelectedExtra(null);
    isDragging.current = true;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartToolPos.current = { x: positions[tool].x, y: positions[tool].y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleExtraPointerDown = (extraId: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedExtra(extraId);
    setSelectedTool(null);
    isDragging.current = true;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    const pos = extraPositions[extraId];
    dragStartToolPos.current = { x: pos?.x ?? 50, y: pos?.y ?? 75 };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !dragStartPos.current || !dragStartToolPos.current) return;
    
    const startX = dragStartPos.current.x;
    const startY = dragStartPos.current.y;
    const toolStartX = dragStartToolPos.current.x;
    const toolStartY = dragStartToolPos.current.y;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dxPct = (dx / vw) * 100;
    const dyPct = (dy / vh) * 100;
    
    if (selectedTool) {
      const tool = selectedTool;
      setPositions(prev => ({
        ...prev,
        [tool]: {
          ...prev[tool],
          x: Math.max(0, Math.min(100, toolStartX + dxPct)),
          y: Math.max(0, Math.min(100, toolStartY + dyPct)),
        },
      }));
    } else if (selectedExtra) {
      const newX = Math.max(0, Math.min(100, toolStartX + dxPct));
      const newY = Math.max(0, Math.min(100, toolStartY + dyPct));
      setExtraPositions(prev => ({
        ...prev,
        [selectedExtra]: {
          ...prev[selectedExtra],
          x: newX,
          y: newY,
        },
      }));
      onExtraPositionChange?.(selectedExtra, newX, newY, extraPositions[selectedExtra]?.scale ?? 1);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    dragStartPos.current = null;
    dragStartToolPos.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const adjustScale = (tool: 'a' | 'b', delta: number) => {
    setPositions(prev => ({
      ...prev,
      [tool]: {
        ...prev[tool],
        scale: Math.max(0.1, Math.round((prev[tool].scale + delta) * 10) / 10),
      },
    }));
  };

  const adjustExtraScale = (extraId: string, delta: number) => {
    setExtraPositions(prev => {
      const newScale = Math.max(0.1, Math.round((prev[extraId]?.scale ?? 1 + delta) * 10) / 10);
      onExtraPositionChange?.(extraId, prev[extraId]?.x ?? 50, prev[extraId]?.y ?? 75, newScale);
      return {
        ...prev,
        [extraId]: {
          ...prev[extraId],
          scale: newScale,
        },
      };
    });
  };

  const toggleFlip = (tool: 'a' | 'b') => {
    setPositions(prev => ({
      ...prev,
      [tool]: {
        ...prev[tool],
        flipX: !prev[tool].flipX,
      },
    }));
  };

  const copyToClipboard = () => {
    const isTie = mission.mission_id.includes('_tie_');
    const missionNum = mission.mission_id.replace('studio_', '').replace('tie_', '').padStart(2, '0');
    const prefix = isTie ? 'tie' : 'm';
    const entries = [
      {
        background_asset_key: currentBgKey,
        anchor_ref: `${prefix}${missionNum}_tool_a`,
        x_pct: Math.round(positions.a.x * 10) / 1000,
        y_pct: Math.round(positions.a.y * 10) / 1000,
        scale: positions.a.scale,
        z_layer: "front",
        ...(positions.a.flipX && { flipX: true }),
      },
      {
        background_asset_key: currentBgKey,
        anchor_ref: `${prefix}${missionNum}_tool_b`,
        x_pct: Math.round(positions.b.x * 10) / 1000,
        y_pct: Math.round(positions.b.y * 10) / 1000,
        scale: positions.b.scale,
        z_layer: "front",
        ...(positions.b.flipX && { flipX: true }),
      },
    ];
    
    navigator.clipboard.writeText(JSON.stringify(entries, null, 2));
    alert('Copied to clipboard!');
  };

  const copyExtraToClipboard = () => {
    if (!selectedExtra) return;
    const pos = extraPositions[selectedExtra];
    const entry = {
      anchor_ref: `m${mission.mission_id.replace('studio_', '')}_desk`,
      x_pct: Math.round((pos?.x ?? 50) * 10) / 10 / 100,
      y_pct: Math.round((pos?.y ?? 75) * 10) / 10 / 100,
      scale: pos?.scale ?? 1,
      z_layer: "mid",
    };
    navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
    alert('Extra JSON copied!');
  };

  return (
    <>
      {/* Tool A - anchored at bottom-center like real placement */}
      <div
        className={`absolute cursor-move touch-none ${selectedTool === 'a' ? 'z-[110]' : 'z-[100]'}`}
        style={{
          left: `${positions.a.x}%`,
          top: `${positions.a.y}%`,
          // Same transform as actual game placement: bottom-center anchor
          transform: 'translate(-50%, -100%)',
        }}
        onPointerDown={(e) => handlePointerDown('a', e)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Drop zone indicator - centered on anchor point */}
        <div className={`absolute w-20 h-20 rounded-full border-4 border-dashed transition-all
          left-1/2 -translate-x-1/2 top-full -translate-y-1/2
          ${selectedTool === 'a' ? 'border-yellow-400 bg-yellow-400/20' : 'border-yellow-500/40 bg-yellow-500/10'}`}
        />
        {/* Tool image */}
        {toolAImage && (
          <img 
            src={toolAImage} 
            alt="Tool A" 
            className="w-24 h-24 object-contain pointer-events-none"
            style={{
              transform: `scale(${positions.a.scale}) ${positions.a.flipX ? 'scaleX(-1)' : ''}`,
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
            }}
          />
        )}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap">
          A: {positions.a.x.toFixed(1)}%, {positions.a.y.toFixed(1)}%
        </div>
      </div>
      
      {/* Tool B - anchored at bottom-center like real placement */}
      <div
        className={`absolute cursor-move touch-none ${selectedTool === 'b' ? 'z-[110]' : 'z-[100]'}`}
        style={{
          left: `${positions.b.x}%`,
          top: `${positions.b.y}%`,
          // Same transform as actual game placement: bottom-center anchor
          transform: 'translate(-50%, -100%)',
        }}
        onPointerDown={(e) => handlePointerDown('b', e)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Drop zone indicator - centered on anchor point */}
        <div className={`absolute w-20 h-20 rounded-full border-4 border-dashed transition-all
          left-1/2 -translate-x-1/2 top-full -translate-y-1/2
          ${selectedTool === 'b' ? 'border-blue-400 bg-blue-400/20' : 'border-blue-500/40 bg-blue-500/10'}`}
        />
        {/* Tool image */}
        {toolBImage && (
          <img 
            src={toolBImage} 
            alt="Tool B" 
            className="w-24 h-24 object-contain pointer-events-none"
            style={{
              transform: `scale(${positions.b.scale}) ${positions.b.flipX ? 'scaleX(-1)' : ''}`,
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
            }}
          />
        )}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap">
          B: {positions.b.x.toFixed(1)}%, {positions.b.y.toFixed(1)}%
        </div>
      </div>

      {/* Scene Extras (props like desks) */}
      {sceneExtras.map(extra => {
        const pos = extraPositions[extra.id];
        if (!pos) return null;
        return (
          <div
            key={extra.id}
            className={`absolute cursor-move touch-none ${selectedExtra === extra.id ? 'z-[115]' : 'z-[95]'}`}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -100%)',
            }}
            onPointerDown={(e) => handleExtraPointerDown(extra.id, e)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Extra image */}
            <img 
              src={extra.image} 
              alt="Scene Extra" 
              className="w-32 h-32 object-contain pointer-events-none"
              style={{
                transform: `scale(${pos.scale})`,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
              }}
            />
            <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap ${selectedExtra === extra.id ? 'bg-orange-500' : 'bg-orange-500/60'}`}>
              🪑 {pos.x.toFixed(1)}%, {pos.y.toFixed(1)}%
            </div>
          </div>
        );
      })}

      {/* Control panel */}
      <div className="fixed top-4 left-4 z-[200] bg-card border border-border rounded-lg shadow-xl text-xs max-w-[220px] max-h-[80vh] overflow-y-auto">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 font-medium text-foreground hover:bg-accent"
        >
          <span className="flex items-center gap-2">
            <Move className="w-4 h-4" />
            Calibration
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {isOpen && (
          <div className="p-3 space-y-3 border-t border-border">
            <div className="text-muted-foreground">
              <strong>Mission:</strong> {mission.mission_id}
            </div>
            <div className="text-muted-foreground text-[10px] break-all">
              <strong>BG:</strong> {currentBgKey}
            </div>
            
            {/* Tool A controls */}
            <div className="space-y-1 p-2 bg-yellow-500/10 rounded border border-yellow-500/30">
              <div className="font-medium text-yellow-500">Tool A</div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Scale:</span>
                <button onClick={() => adjustScale('a', -0.1)} className="px-2 py-1 bg-muted rounded hover:bg-accent">-</button>
                <span>{positions.a.scale.toFixed(1)}</span>
                <button onClick={() => adjustScale('a', 0.1)} className="px-2 py-1 bg-muted rounded hover:bg-accent">+</button>
              </div>
              <button
                onClick={() => toggleFlip('a')}
                className={`px-2 py-1 rounded text-xs ${positions.a.flipX ? 'bg-yellow-500 text-black' : 'bg-muted'}`}
              >
                FlipX: {positions.a.flipX ? 'ON' : 'OFF'}
              </button>
            </div>
            
            {/* Tool B controls */}
            <div className="space-y-1 p-2 bg-blue-500/10 rounded border border-blue-500/30">
              <div className="font-medium text-blue-400">Tool B</div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Scale:</span>
                <button onClick={() => adjustScale('b', -0.1)} className="px-2 py-1 bg-muted rounded hover:bg-accent">-</button>
                <span>{positions.b.scale.toFixed(1)}</span>
                <button onClick={() => adjustScale('b', 0.1)} className="px-2 py-1 bg-muted rounded hover:bg-accent">+</button>
              </div>
              <button
                onClick={() => toggleFlip('b')}
                className={`px-2 py-1 rounded text-xs ${positions.b.flipX ? 'bg-blue-500 text-white' : 'bg-muted'}`}
              >
                FlipX: {positions.b.flipX ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Scene Extras controls */}
            {sceneExtras.length > 0 && (
              <div className="space-y-1 p-2 bg-orange-500/10 rounded border border-orange-500/30">
                <div className="font-medium text-orange-400 flex items-center gap-1">
                  <Box className="w-3 h-3" />
                  Scene Props
                </div>
                {sceneExtras.map(extra => {
                  const pos = extraPositions[extra.id];
                  const isSelected = selectedExtra === extra.id;
                  return (
                    <div 
                      key={extra.id} 
                      className={`p-1.5 rounded cursor-pointer transition-colors ${isSelected ? 'bg-orange-500/30 border border-orange-400' : 'hover:bg-orange-500/20'}`}
                      onClick={() => setSelectedExtra(extra.id)}
                    >
                      <div className="text-[10px] text-orange-300 truncate">🪑 {extra.id}</div>
                      {isSelected && pos && (
                        <div className="mt-1 space-y-1">
                          <div className="text-[10px] text-muted-foreground">
                            X: {pos.x.toFixed(1)}% | Y: {pos.y.toFixed(1)}%
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-[10px]">Scale:</span>
                            <button onClick={() => adjustExtraScale(extra.id, -0.1)} className="px-1.5 py-0.5 bg-muted rounded hover:bg-accent text-[10px]">-</button>
                            <span className="text-[10px]">{pos.scale.toFixed(1)}</span>
                            <button onClick={() => adjustExtraScale(extra.id, 0.1)} className="px-1.5 py-0.5 bg-muted rounded hover:bg-accent text-[10px]">+</button>
                          </div>
                          <button
                            onClick={copyExtraToClipboard}
                            className="w-full px-2 py-1 bg-orange-600 text-white rounded text-[10px] hover:bg-orange-500"
                          >
                            Copy Extra JSON
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-border">
              <button
                onClick={copyToClipboard}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                <Copy className="w-3 h-3" />
                Copy JSON
              </button>
              {onNextMission && (
                <button
                  onClick={onNextMission}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-500"
                >
                  <SkipForward className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
