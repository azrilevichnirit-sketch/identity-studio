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

export function ToolCalibrationEditor({ mission, currentBgKey, onNextMission }: ToolCalibrationEditorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedTool, setSelectedTool] = useState<'a' | 'b' | null>(null);
  
  // Single position per tool - same for drag target AND final placement
  const [positions, setPositions] = useState<{ a: ToolPosition; b: ToolPosition }>(() => {
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
    setPositions({ a: getInitialPos('a'), b: getInitialPos('b') });
    setSelectedTool(null);
  }, [mission.mission_id, currentBgKey]);

  const optionA = mission.options.find(o => o.key === 'a');
  const optionB = mission.options.find(o => o.key === 'b');
  const toolAImage = optionA ? getToolImage(optionA.asset) : null;
  const toolBImage = optionB ? getToolImage(optionB.asset) : null;

  const handlePointerDown = (tool: 'a' | 'b', e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedTool(tool);
    isDragging.current = true;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartToolPos.current = { x: positions[tool].x, y: positions[tool].y };
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
    setPositions(prev => ({
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
    setPositions(prev => ({
      ...prev,
      [tool]: {
        ...prev[tool],
        scale: Math.max(0.1, Math.round((prev[tool].scale + delta) * 10) / 10),
      },
    }));
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
    const missionNum = mission.mission_id.replace('studio_', '').padStart(2, '0');
    const entries = [
      {
        background_asset_key: currentBgKey,
        anchor_ref: `m${missionNum}_tool_a`,
        x_pct: Math.round(positions.a.x * 10) / 1000,
        y_pct: Math.round(positions.a.y * 10) / 1000,
        scale: positions.a.scale,
        z_layer: "front",
        ...(positions.a.flipX && { flipX: true }),
      },
      {
        background_asset_key: currentBgKey,
        anchor_ref: `m${missionNum}_tool_b`,
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

  return (
    <>
      {/* Tool A - shows both drag zone circle AND tool image */}
      <div
        className={`absolute cursor-move touch-none ${selectedTool === 'a' ? 'z-[110]' : 'z-[100]'}`}
        style={{
          left: `${positions.a.x}%`,
          top: `${positions.a.y}%`,
          transform: 'translate(-50%, -50%)',
        }}
        onPointerDown={(e) => handlePointerDown('a', e)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Drop zone indicator */}
        <div className={`absolute inset-0 w-24 h-24 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2
          rounded-full border-4 border-dashed transition-all
          ${selectedTool === 'a' ? 'border-yellow-400 bg-yellow-400/20' : 'border-yellow-500/40 bg-yellow-500/10'}`}
        />
        {/* Tool image */}
        {toolAImage && (
          <img 
            src={toolAImage} 
            alt="Tool A" 
            className="w-20 h-20 object-contain pointer-events-none relative"
            style={{
              transform: `scale(${positions.a.scale}) ${positions.a.flipX ? 'scaleX(-1)' : ''}`,
            }}
          />
        )}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap">
          A: {positions.a.x.toFixed(1)}%, {positions.a.y.toFixed(1)}%
        </div>
      </div>
      
      {/* Tool B - shows both drag zone circle AND tool image */}
      <div
        className={`absolute cursor-move touch-none ${selectedTool === 'b' ? 'z-[110]' : 'z-[100]'}`}
        style={{
          left: `${positions.b.x}%`,
          top: `${positions.b.y}%`,
          transform: 'translate(-50%, -50%)',
        }}
        onPointerDown={(e) => handlePointerDown('b', e)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Drop zone indicator */}
        <div className={`absolute inset-0 w-24 h-24 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2
          rounded-full border-4 border-dashed transition-all
          ${selectedTool === 'b' ? 'border-blue-400 bg-blue-400/20' : 'border-blue-500/40 bg-blue-500/10'}`}
        />
        {/* Tool image */}
        {toolBImage && (
          <img 
            src={toolBImage} 
            alt="Tool B" 
            className="w-20 h-20 object-contain pointer-events-none relative"
            style={{
              transform: `scale(${positions.b.scale}) ${positions.b.flipX ? 'scaleX(-1)' : ''}`,
            }}
          />
        )}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap">
          B: {positions.b.x.toFixed(1)}%, {positions.b.y.toFixed(1)}%
        </div>
      </div>

      {/* Control panel */}
      <div className="fixed top-4 left-4 z-[200] bg-card border border-border rounded-lg shadow-xl text-xs max-w-[200px]">
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
