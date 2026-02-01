import { useState, useRef, useEffect } from 'react';
import { Move, Copy, ChevronDown, ChevronUp, SkipForward } from 'lucide-react';
import { getAnchorPosition } from '@/lib/jsonDataLoader';
import { getToolImage } from '@/lib/assetUtils';
import type { AnchorRef, Mission } from '@/types/identity';

interface ToolCalibrationEditorProps {
  mission: Mission;
  currentBgKey: string;
  onNextMission?: () => void;
}

interface ToolPosition {
  x: number;
  y: number;
  scale: number;
  flipX: boolean;
}

type CalibrationMode = 'dropzone' | 'placement';

export function ToolCalibrationEditor({ mission, currentBgKey, onNextMission }: ToolCalibrationEditorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [mode, setMode] = useState<CalibrationMode>('dropzone');
  const [selectedTool, setSelectedTool] = useState<'a' | 'b' | null>(null);
  
  // Drop zone positions (where user drags to)
  const [dropZones, setDropZones] = useState<{ a: ToolPosition; b: ToolPosition }>(() => {
    const getInitialPos = (key: 'a' | 'b'): ToolPosition => {
      const anchorRef = `m${mission.mission_id.replace('studio_', '').padStart(2, '0')}_drop_${key}` as AnchorRef;
      const pos = getAnchorPosition(currentBgKey, anchorRef);
      // Fallback to tool anchor if drop anchor doesn't exist
      if (!pos || (pos.x === 50 && pos.y === 60)) {
        const toolRef = `m${mission.mission_id.replace('studio_', '').padStart(2, '0')}_tool_${key}` as AnchorRef;
        const toolPos = getAnchorPosition(currentBgKey, toolRef);
        return {
          x: toolPos?.x ?? 50,
          y: toolPos?.y ?? 70,
          scale: 1,
          flipX: false,
        };
      }
      return {
        x: pos?.x ?? 50,
        y: pos?.y ?? 70,
        scale: 1,
        flipX: false,
      };
    };
    return { a: getInitialPos('a'), b: getInitialPos('b') };
  });
  
  // Placement positions (where tool ends up after drop)
  const [placements, setPlacements] = useState<{ a: ToolPosition; b: ToolPosition }>(() => {
    const getInitialPos = (key: 'a' | 'b'): ToolPosition => {
      const anchorRef = `m${mission.mission_id.replace('studio_', '').padStart(2, '0')}_tool_${key}` as AnchorRef;
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
  
  const isDragging = useRef(false);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const dragStartToolPos = useRef<{ x: number; y: number } | null>(null);

  // Update positions when mission changes
  useEffect(() => {
    const getDropPos = (key: 'a' | 'b'): ToolPosition => {
      const anchorRef = `m${mission.mission_id.replace('studio_', '').padStart(2, '0')}_drop_${key}` as AnchorRef;
      const pos = getAnchorPosition(currentBgKey, anchorRef);
      if (!pos || (pos.x === 50 && pos.y === 60)) {
        const toolRef = `m${mission.mission_id.replace('studio_', '').padStart(2, '0')}_tool_${key}` as AnchorRef;
        const toolPos = getAnchorPosition(currentBgKey, toolRef);
        return {
          x: toolPos?.x ?? 50,
          y: toolPos?.y ?? 70,
          scale: 1,
          flipX: false,
        };
      }
      return { x: pos?.x ?? 50, y: pos?.y ?? 70, scale: 1, flipX: false };
    };
    const getPlacePos = (key: 'a' | 'b'): ToolPosition => {
      const anchorRef = `m${mission.mission_id.replace('studio_', '').padStart(2, '0')}_tool_${key}` as AnchorRef;
      const pos = getAnchorPosition(currentBgKey, anchorRef);
      return {
        x: pos?.x ?? 50,
        y: pos?.y ?? 80,
        scale: pos?.scale ?? 1,
        flipX: pos?.flipX ?? false,
      };
    };
    setDropZones({ a: getDropPos('a'), b: getDropPos('b') });
    setPlacements({ a: getPlacePos('a'), b: getPlacePos('b') });
    setSelectedTool(null);
  }, [mission.mission_id, currentBgKey]);

  const optionA = mission.options.find(o => o.key === 'a');
  const optionB = mission.options.find(o => o.key === 'b');
  const toolAImage = optionA ? getToolImage(optionA.asset) : null;
  const toolBImage = optionB ? getToolImage(optionB.asset) : null;

  const currentPositions = mode === 'dropzone' ? dropZones : placements;
  const setCurrentPositions = mode === 'dropzone' ? setDropZones : setPlacements;

  const handlePointerDown = (tool: 'a' | 'b', e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedTool(tool);
    isDragging.current = true;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartToolPos.current = { x: currentPositions[tool].x, y: currentPositions[tool].y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !selectedTool || !dragStartPos.current || !dragStartToolPos.current) return;
    
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
    
    const tool = selectedTool;
    setCurrentPositions(prev => ({
      ...prev,
      [tool]: {
        ...prev[tool],
        x: Math.max(0, Math.min(100, toolStartX + dxPct)),
        y: Math.max(0, Math.min(100, toolStartY + dyPct)),
      },
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    dragStartPos.current = null;
    dragStartToolPos.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const adjustScale = (tool: 'a' | 'b', delta: number) => {
    setCurrentPositions(prev => ({
      ...prev,
      [tool]: {
        ...prev[tool],
        scale: Math.max(0.1, Math.round((prev[tool].scale + delta) * 10) / 10),
      },
    }));
  };

  const toggleFlip = (tool: 'a' | 'b') => {
    setCurrentPositions(prev => ({
      ...prev,
      [tool]: {
        ...prev[tool],
        flipX: !prev[tool].flipX,
      },
    }));
  };

  const copyToClipboard = () => {
    const missionNum = mission.mission_id.replace('studio_', '').padStart(2, '0');
    
    // If in dropzone mode, export drop anchors
    if (mode === 'dropzone') {
      const entries = [
        {
          background_asset_key: currentBgKey,
          anchor_ref: `m${missionNum}_drop_a`,
          x_pct: Math.round(dropZones.a.x * 10) / 1000,
          y_pct: Math.round(dropZones.a.y * 10) / 1000,
          scale: 1,
          z_layer: "front",
        },
        {
          background_asset_key: currentBgKey,
          anchor_ref: `m${missionNum}_drop_b`,
          x_pct: Math.round(dropZones.b.x * 10) / 1000,
          y_pct: Math.round(dropZones.b.y * 10) / 1000,
          scale: 1,
          z_layer: "front",
        },
      ];
      navigator.clipboard.writeText(JSON.stringify(entries, null, 2));
      alert('Drop zones copied!');
      return;
    }
    
    // Placement mode - export tool anchors
    const entries = [
      {
        background_asset_key: currentBgKey,
        anchor_ref: `m${missionNum}_tool_a`,
        x_pct: Math.round(placements.a.x * 10) / 1000,
        y_pct: Math.round(placements.a.y * 10) / 1000,
        scale: placements.a.scale,
        z_layer: "front",
        ...(placements.a.flipX && { flipX: true }),
      },
      {
        background_asset_key: currentBgKey,
        anchor_ref: `m${missionNum}_tool_b`,
        x_pct: Math.round(placements.b.x * 10) / 1000,
        y_pct: Math.round(placements.b.y * 10) / 1000,
        scale: placements.b.scale,
        z_layer: "front",
        ...(placements.b.flipX && { flipX: true }),
      },
    ];
    
    navigator.clipboard.writeText(JSON.stringify(entries, null, 2));
    alert('Placements copied!');
  };

  return (
    <>
      {/* Drop Zone markers (always visible in dropzone mode) */}
      {mode === 'dropzone' && (
        <>
          <div
            className={`absolute w-16 h-16 rounded-full border-4 border-dashed cursor-move touch-none transition-all
              ${selectedTool === 'a' ? 'border-yellow-400 bg-yellow-400/30' : 'border-yellow-500/50 bg-yellow-500/20'}`}
            style={{
              left: `${dropZones.a.x}%`,
              top: `${dropZones.a.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 100,
            }}
            onPointerDown={(e) => handlePointerDown('a', e)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded">
              Drop A
            </div>
          </div>
          
          <div
            className={`absolute w-16 h-16 rounded-full border-4 border-dashed cursor-move touch-none transition-all
              ${selectedTool === 'b' ? 'border-blue-400 bg-blue-400/30' : 'border-blue-500/50 bg-blue-500/20'}`}
            style={{
              left: `${dropZones.b.x}%`,
              top: `${dropZones.b.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 100,
            }}
            onPointerDown={(e) => handlePointerDown('b', e)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded">
              Drop B
            </div>
          </div>
        </>
      )}

      {/* Tool placement overlays (visible in placement mode) */}
      {mode === 'placement' && (
        <>
          {toolAImage && (
            <div
              className={`absolute cursor-move touch-none transition-shadow ${selectedTool === 'a' ? 'ring-4 ring-yellow-400' : ''}`}
              style={{
                left: `${placements.a.x}%`,
                top: `${placements.a.y}%`,
                transform: `translate(-50%, -50%) scale(${placements.a.scale}) ${placements.a.flipX ? 'scaleX(-1)' : ''}`,
                zIndex: 100,
              }}
              onPointerDown={(e) => handlePointerDown('a', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <img src={toolAImage} alt="Tool A" className="w-20 h-20 object-contain pointer-events-none" />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded">
                A
              </div>
            </div>
          )}
          
          {toolBImage && (
            <div
              className={`absolute cursor-move touch-none transition-shadow ${selectedTool === 'b' ? 'ring-4 ring-blue-400' : ''}`}
              style={{
                left: `${placements.b.x}%`,
                top: `${placements.b.y}%`,
                transform: `translate(-50%, -50%) scale(${placements.b.scale}) ${placements.b.flipX ? 'scaleX(-1)' : ''}`,
                zIndex: 100,
              }}
              onPointerDown={(e) => handlePointerDown('b', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <img src={toolBImage} alt="Tool B" className="w-20 h-20 object-contain pointer-events-none" />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                B
              </div>
            </div>
          )}
        </>
      )}

      {/* Control panel */}
      <div className="fixed top-4 left-4 z-50 bg-card border border-border rounded-lg shadow-xl text-xs max-w-[220px]">
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
            <div className="text-muted-foreground text-[10px]">
              <strong>BG:</strong> {currentBgKey}
            </div>
            
            {/* Mode toggle */}
            <div className="flex gap-1">
              <button
                onClick={() => setMode('dropzone')}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors
                  ${mode === 'dropzone' ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
              >
                🎯 Drop Zone
              </button>
              <button
                onClick={() => setMode('placement')}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors
                  ${mode === 'placement' ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
              >
                📍 Placement
              </button>
            </div>
            
            {/* Tool A controls */}
            <div className="space-y-1 p-2 bg-yellow-500/10 rounded border border-yellow-500/30">
              <div className="font-medium text-yellow-500">Tool A</div>
              <div className="text-muted-foreground">
                X: {currentPositions.a.x.toFixed(1)}% Y: {currentPositions.a.y.toFixed(1)}%
              </div>
              {mode === 'placement' && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Scale:</span>
                    <button onClick={() => adjustScale('a', -0.1)} className="px-2 py-1 bg-muted rounded hover:bg-accent">-</button>
                    <span>{currentPositions.a.scale.toFixed(1)}</span>
                    <button onClick={() => adjustScale('a', 0.1)} className="px-2 py-1 bg-muted rounded hover:bg-accent">+</button>
                  </div>
                  <button
                    onClick={() => toggleFlip('a')}
                    className={`px-2 py-1 rounded text-xs ${currentPositions.a.flipX ? 'bg-yellow-500 text-black' : 'bg-muted'}`}
                  >
                    FlipX: {currentPositions.a.flipX ? 'ON' : 'OFF'}
                  </button>
                </>
              )}
            </div>
            
            {/* Tool B controls */}
            <div className="space-y-1 p-2 bg-blue-500/10 rounded border border-blue-500/30">
              <div className="font-medium text-blue-400">Tool B</div>
              <div className="text-muted-foreground">
                X: {currentPositions.b.x.toFixed(1)}% Y: {currentPositions.b.y.toFixed(1)}%
              </div>
              {mode === 'placement' && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Scale:</span>
                    <button onClick={() => adjustScale('b', -0.1)} className="px-2 py-1 bg-muted rounded hover:bg-accent">-</button>
                    <span>{currentPositions.b.scale.toFixed(1)}</span>
                    <button onClick={() => adjustScale('b', 0.1)} className="px-2 py-1 bg-muted rounded hover:bg-accent">+</button>
                  </div>
                  <button
                    onClick={() => toggleFlip('b')}
                    className={`px-2 py-1 rounded text-xs ${currentPositions.b.flipX ? 'bg-blue-500 text-white' : 'bg-muted'}`}
                  >
                    FlipX: {currentPositions.b.flipX ? 'ON' : 'OFF'}
                  </button>
                </>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-border">
              <button
                onClick={copyToClipboard}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                <Copy className="w-3 h-3" />
                Copy {mode === 'dropzone' ? 'Drops' : 'Place'}
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
