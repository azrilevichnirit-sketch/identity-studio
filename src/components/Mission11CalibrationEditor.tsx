import { useState, useRef, useEffect } from 'react';
import { Move, Copy, ChevronDown, ChevronUp, RotateCw } from 'lucide-react';
import { getAnchorPosition } from '@/lib/jsonDataLoader';
import { getToolImage } from '@/lib/assetUtils';
import type { AnchorRef, Mission } from '@/types/identity';

// Import backgrounds for calibration
// Tool A = Exterior park, Tool B = Main gallery (finished studio)
import studioExteriorBg from '@/assets/backgrounds/studio_exterior_park_stylized_v3.webp';
import galleryMainStylized from '@/assets/backgrounds/gallery_main_stylized.webp';
interface Mission11CalibrationEditorProps {
  mission: Mission;
  onBackgroundChange?: (bgUrl: string, bgKey: string) => void;
}

interface ToolPosition {
  x: number;
  y: number;
  scale: number;
  flipX: boolean;
  rotation: number;
}

export function Mission11CalibrationEditor({ mission, onBackgroundChange }: Mission11CalibrationEditorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedTool, setSelectedTool] = useState<'a' | 'b'>('a');
  
  // Tool A = Exterior park, Tool B = Main gallery (finished studio)
  const bgKeyA = 'studio_exterior_bg';
  const bgKeyB = 'gallery_main_stylized';
  
  const [positions, setPositions] = useState<{ a: ToolPosition; b: ToolPosition }>(() => {
    const getInitialPos = (key: 'a' | 'b'): ToolPosition => {
      const bgKey = key === 'a' ? bgKeyA : bgKeyB;
      const anchorRef = `m11_tool_${key}` as AnchorRef;
      const pos = getAnchorPosition(bgKey, anchorRef);
      return {
        x: pos?.x ?? 50,
        y: pos?.y ?? 75,
        scale: pos?.scale ?? 1.8,
        flipX: pos?.flipX ?? false,
        rotation: (pos as any)?.rotation ?? 0,
      };
    };
    return { a: getInitialPos('a'), b: getInitialPos('b') };
  });
  
  const isDragging = useRef(false);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const dragStartToolPos = useRef<{ x: number; y: number } | null>(null);

  // Update background when selected tool changes
  useEffect(() => {
    if (selectedTool === 'a') {
      onBackgroundChange?.(studioExteriorBg, bgKeyA);
    } else {
      onBackgroundChange?.(galleryMainStylized, bgKeyB);
    }
  }, [selectedTool, onBackgroundChange]);

  const optionA = mission.options.find(o => o.key === 'a');
  const optionB = mission.options.find(o => o.key === 'b');
  const toolAImage = optionA ? getToolImage(optionA.asset) : null;
  const toolBImage = optionB ? getToolImage(optionB.asset) : null;
  
  const currentToolImage = selectedTool === 'a' ? toolAImage : toolBImage;
  const currentPosition = positions[selectedTool];

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartToolPos.current = { x: currentPosition.x, y: currentPosition.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !dragStartPos.current || !dragStartToolPos.current) return;
    
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dxPct = (dx / vw) * 100;
    const dyPct = (dy / vh) * 100;
    
    setPositions(prev => ({
      ...prev,
      [selectedTool]: {
        ...prev[selectedTool],
        x: Math.max(0, Math.min(100, dragStartToolPos.current!.x + dxPct)),
        y: Math.max(0, Math.min(100, dragStartToolPos.current!.y + dyPct)),
      },
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    dragStartPos.current = null;
    dragStartToolPos.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const adjustScale = (delta: number) => {
    setPositions(prev => ({
      ...prev,
      [selectedTool]: {
        ...prev[selectedTool],
        scale: Math.max(0.1, Math.round((prev[selectedTool].scale + delta) * 10) / 10),
      },
    }));
  };

  const toggleFlip = () => {
    setPositions(prev => ({
      ...prev,
      [selectedTool]: {
        ...prev[selectedTool],
        flipX: !prev[selectedTool].flipX,
      },
    }));
  };

  const adjustRotation = (delta: number) => {
    setPositions(prev => ({
      ...prev,
      [selectedTool]: {
        ...prev[selectedTool],
        rotation: (prev[selectedTool].rotation + delta + 360) % 360,
      },
    }));
  };

  const copyToClipboard = () => {
    const entries = [
      {
        background_asset_key: bgKeyA,
        anchor_ref: 'm11_tool_a',
        x_pct: Math.round(positions.a.x * 10) / 1000,
        y_pct: Math.round(positions.a.y * 10) / 1000,
        scale: positions.a.scale,
        z_layer: "front",
        ...(positions.a.flipX && { flipX: true }),
        ...(positions.a.rotation !== 0 && { rotation: positions.a.rotation }),
      },
      {
        background_asset_key: bgKeyB,
        anchor_ref: 'm11_tool_b',
        x_pct: Math.round(positions.b.x * 10) / 1000,
        y_pct: Math.round(positions.b.y * 10) / 1000,
        scale: positions.b.scale,
        z_layer: "front",
        ...(positions.b.flipX && { flipX: true }),
        ...(positions.b.rotation !== 0 && { rotation: positions.b.rotation }),
      },
    ];
    
    navigator.clipboard.writeText(JSON.stringify(entries, null, 2));
    alert('Copied to clipboard!');
  };

  return (
    <>
      {/* Single draggable tool based on selection */}
      <div
        className="absolute cursor-move touch-none z-[100]"
        style={{
          left: `${currentPosition.x}%`,
          top: `${currentPosition.y}%`,
          transform: 'translate(-50%, -100%)',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Drop zone indicator */}
        <div className={`absolute w-20 h-20 rounded-full border-4 border-dashed transition-all
          left-1/2 -translate-x-1/2 top-full -translate-y-1/2
          ${selectedTool === 'a' ? 'border-yellow-400 bg-yellow-400/20' : 'border-blue-400 bg-blue-400/20'}`}
        />
        {/* Tool image */}
        {currentToolImage && (
          <img 
            src={currentToolImage} 
            alt={`Tool ${selectedTool.toUpperCase()}`}
            className="w-24 h-24 object-contain pointer-events-none"
            style={{
              transform: `scale(${currentPosition.scale}) rotate(${currentPosition.rotation}deg) ${currentPosition.flipX ? 'scaleX(-1)' : ''}`,
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
            }}
          />
        )}
        <div className={`absolute -top-6 left-1/2 -translate-x-1/2 ${selectedTool === 'a' ? 'bg-yellow-500 text-black' : 'bg-blue-500 text-white'} text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap`}>
          {selectedTool.toUpperCase()}: {currentPosition.x.toFixed(1)}%, {currentPosition.y.toFixed(1)}%
        </div>
      </div>

      {/* Control panel */}
      <div className="fixed top-4 left-4 z-[200] bg-card border border-border rounded-lg shadow-xl text-xs max-w-[220px]">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 font-medium text-foreground hover:bg-accent"
        >
          <span className="flex items-center gap-2">
            <Move className="w-4 h-4" />
            M11 Calibration
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {isOpen && (
          <div className="p-3 space-y-3 border-t border-border">
            {/* Tool selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTool('a')}
                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-all ${
                  selectedTool === 'a' 
                    ? 'bg-yellow-500 text-black' 
                    : 'bg-muted hover:bg-accent'
                }`}
              >
                A (Exterior)
              </button>
              <button
                onClick={() => setSelectedTool('b')}
                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-all ${
                  selectedTool === 'b' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-muted hover:bg-accent'
                }`}
              >
                B (Gallery)
              </button>
            </div>
            
            <div className="text-muted-foreground text-[10px]">
              <strong>BG:</strong> {selectedTool === 'a' ? bgKeyA : bgKeyB}
            </div>
            
            {/* Scale & Flip controls */}
            <div className={`space-y-1 p-2 rounded border ${
              selectedTool === 'a' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-blue-500/10 border-blue-500/30'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Scale:</span>
                <button onClick={() => adjustScale(-0.1)} className="px-2 py-1 bg-muted rounded hover:bg-accent">-</button>
                <span>{currentPosition.scale.toFixed(1)}</span>
                <button onClick={() => adjustScale(0.1)} className="px-2 py-1 bg-muted rounded hover:bg-accent">+</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Rotate:</span>
                <button onClick={() => adjustRotation(-15)} className="px-2 py-1 bg-muted rounded hover:bg-accent">
                  <RotateCw className="w-3 h-3 -scale-x-100" />
                </button>
                <span>{currentPosition.rotation}°</span>
                <button onClick={() => adjustRotation(15)} className="px-2 py-1 bg-muted rounded hover:bg-accent">
                  <RotateCw className="w-3 h-3" />
                </button>
              </div>
              <button
                onClick={toggleFlip}
                className={`px-2 py-1 rounded text-xs ${
                  currentPosition.flipX 
                    ? (selectedTool === 'a' ? 'bg-yellow-500 text-black' : 'bg-blue-500 text-white')
                    : 'bg-muted'
                }`}
              >
                FlipX: {currentPosition.flipX ? 'ON' : 'OFF'}
              </button>
            </div>
            
            {/* Copy JSON */}
            <button
              onClick={copyToClipboard}
              className="w-full flex items-center justify-center gap-1 px-2 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              <Copy className="w-3 h-3" />
              Copy Both Tools JSON
            </button>
          </div>
        )}
      </div>
    </>
  );
}
