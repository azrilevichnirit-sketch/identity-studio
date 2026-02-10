import { useState, useRef, useEffect } from 'react';
import { Move, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { getAnchorPosition } from '@/lib/jsonDataLoader';
import { getToolImage } from '@/lib/assetUtils';
import type { AnchorRef, Mission } from '@/types/identity';

// Import all possible branching backgrounds
import storageV2 from '@/assets/backgrounds/studio_in_storage_v2.webp';
import whiteWalls from '@/assets/backgrounds/gallery_main_stylized_white_v1.webp';
import galleryStylized from '@/assets/backgrounds/gallery_main_stylized.webp';
import exteriorPark from '@/assets/backgrounds/studio_exterior_park_stylized_v3.webp';

const BG_MAP: Record<string, string> = {
  'studio_in_storage_bg': storageV2,
  'gallery_main_stylized_white_v1': whiteWalls,
  'gallery_main_stylized': galleryStylized,
  'studio_exterior_bg': exteriorPark,
};

interface BranchingCalibrationEditorProps {
  mission: Mission;
  bgKeyA: string;
  bgKeyB: string;
  onBackgroundChange?: (bgUrl: string, bgKey: string) => void;
}

interface ToolPosition {
  x: number;
  y: number;
  scale: number;
  flipX: boolean;
}

export function BranchingCalibrationEditor({ mission, bgKeyA, bgKeyB, onBackgroundChange }: BranchingCalibrationEditorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedTool, setSelectedTool] = useState<'a' | 'b'>('a');

  const isTie = mission.mission_id.includes('_tie_');
  const missionNum = mission.mission_id.replace('studio_', '').replace('tie_', '').padStart(2, '0');
  const prefix = isTie ? 'tie' : 'm';

  const [positions, setPositions] = useState<{ a: ToolPosition; b: ToolPosition }>(() => {
    const getInitialPos = (key: 'a' | 'b'): ToolPosition => {
      const bgKey = key === 'a' ? bgKeyA : bgKeyB;
      const anchorRef = `${prefix}_${missionNum}_tool_${key}` as AnchorRef;
      const pos = getAnchorPosition(bgKey, anchorRef);
      return {
        x: pos?.x ?? 50,
        y: pos?.y ?? 75,
        scale: pos?.scale ?? 1,
        flipX: pos?.flipX ?? false,
      };
    };
    return { a: getInitialPos('a'), b: getInitialPos('b') };
  });

  const isDragging = useRef(false);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const dragStartToolPos = useRef<{ x: number; y: number } | null>(null);

  // Switch background when tool selection changes
  useEffect(() => {
    const bgKey = selectedTool === 'a' ? bgKeyA : bgKeyB;
    const bgUrl = BG_MAP[bgKey];
    if (bgUrl) onBackgroundChange?.(bgUrl, bgKey);
  }, [selectedTool, bgKeyA, bgKeyB, onBackgroundChange]);

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
    const dxPct = (dx / window.innerWidth) * 100;
    const dyPct = (dy / window.innerHeight) * 100;
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

  const copyToClipboard = () => {
    const entries = [
      {
        background_asset_key: bgKeyA,
        anchor_ref: `${prefix}_${missionNum}_tool_a`,
        x_pct: Math.round(positions.a.x * 10) / 1000,
        y_pct: Math.round(positions.a.y * 10) / 1000,
        scale: positions.a.scale,
        z_layer: "front",
        ...(positions.a.flipX && { flipX: true }),
      },
      {
        background_asset_key: bgKeyB,
        anchor_ref: `${prefix}_${missionNum}_tool_b`,
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

  const bgLabelA = bgKeyA.replace('studio_', '').replace('gallery_main_', '').replace(/_/g, ' ');
  const bgLabelB = bgKeyB.replace('studio_', '').replace('gallery_main_', '').replace(/_/g, ' ');

  return (
    <>
      {/* Draggable tool */}
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
        <div className={`absolute w-20 h-20 rounded-full border-4 border-dashed transition-all
          left-1/2 -translate-x-1/2 top-full -translate-y-1/2
          ${selectedTool === 'a' ? 'border-yellow-400 bg-yellow-400/20' : 'border-blue-400 bg-blue-400/20'}`}
        />
        {currentToolImage && (
          <img
            src={currentToolImage}
            alt={`Tool ${selectedTool.toUpperCase()}`}
            className="w-24 h-24 object-contain pointer-events-none"
            style={{
              transform: `scale(${currentPosition.scale}) ${currentPosition.flipX ? 'scaleX(-1)' : ''}`,
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
            {mission.mission_id} Cal
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isOpen && (
          <div className="p-3 space-y-3 border-t border-border">
            {/* Tool selector with bg labels */}
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTool('a')}
                className={`flex-1 py-2 px-2 rounded text-[10px] font-medium transition-all ${
                  selectedTool === 'a' ? 'bg-yellow-500 text-black' : 'bg-muted hover:bg-accent'
                }`}
              >
                A ({bgLabelA})
              </button>
              <button
                onClick={() => setSelectedTool('b')}
                className={`flex-1 py-2 px-2 rounded text-[10px] font-medium transition-all ${
                  selectedTool === 'b' ? 'bg-blue-500 text-white' : 'bg-muted hover:bg-accent'
                }`}
              >
                B ({bgLabelB})
              </button>
            </div>

            <div className="text-muted-foreground text-[10px] break-all">
              <strong>BG:</strong> {selectedTool === 'a' ? bgKeyA : bgKeyB}
            </div>

            {/* Scale & Flip */}
            <div className={`space-y-1 p-2 rounded border ${
              selectedTool === 'a' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-blue-500/10 border-blue-500/30'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Scale:</span>
                <button onClick={() => adjustScale(-0.1)} className="px-2 py-1 bg-muted rounded hover:bg-accent">-</button>
                <span>{currentPosition.scale.toFixed(1)}</span>
                <button onClick={() => adjustScale(0.1)} className="px-2 py-1 bg-muted rounded hover:bg-accent">+</button>
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

            <button
              onClick={copyToClipboard}
              className="w-full flex items-center justify-center gap-1 px-2 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              <Copy className="w-3 h-3" />
              Copy Both JSON
            </button>
          </div>
        )}
      </div>
    </>
  );
}
