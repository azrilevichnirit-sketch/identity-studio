import { useState, useRef, useEffect } from 'react';
import { Move, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { getAnchorPosition } from '@/lib/jsonDataLoader';
import type { AnchorRef } from '@/types/identity';

interface VisitorDef {
  id: string;
  img: string;
  label: string;
}

interface VisitorPosition {
  x: number;
  y: number;
  scale: number;
  flipX: boolean;
  zLayer: 'back' | 'mid' | 'front';
}

interface Props {
  bgKey: string;
  visitors: VisitorDef[];
  title: string;
  panelClassName?: string;
}

function initPositions(visitors: VisitorDef[], bgKey: string): VisitorPosition[] {
  return visitors.map(v => {
    const pos = getAnchorPosition(bgKey, v.id as AnchorRef);
    return {
      x: pos?.x ?? 50,
      y: pos?.y ?? 70,
      scale: pos?.scale ?? 1,
      flipX: pos?.flipX ?? false,
      zLayer: (pos?.z_layer as 'back' | 'mid' | 'front') ?? 'front',
    };
  });
}

function zIndexForLayer(zLayer: 'back' | 'mid' | 'front'): number {
  if (zLayer === 'back') return 6;
  if (zLayer === 'mid') return 10;
  return 14;
}

export function VisitorCalibrationEditor({ bgKey, visitors, title, panelClassName }: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const [positions, setPositions] = useState<VisitorPosition[]>(() => initPositions(visitors, bgKey));

  // Sync positions when visitors list changes
  useEffect(() => {
    setPositions(prev => {
      if (prev.length === visitors.length) return prev;
      return initPositions(visitors, bgKey);
    });
    if (selectedIdx >= visitors.length) setSelectedIdx(0);
  }, [visitors.length, bgKey]);

  const isDragging = useRef(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  const current = positions[selectedIdx] || { x: 50, y: 70, scale: 1, flipX: false, zLayer: 'front' as const };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragStartPos.current = { x: current.x, y: current.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !dragStart.current || !dragStartPos.current) return;
    // Use game-stage container dimensions for accurate percentage conversion
    const stage = document.querySelector('.game-stage');
    const rect = stage?.getBoundingClientRect();
    const stageW = rect?.width || window.innerWidth;
    const stageH = rect?.height || window.innerHeight;
    const dx = ((e.clientX - dragStart.current.x) / stageW) * 100;
    const dy = ((e.clientY - dragStart.current.y) / stageH) * 100;
    const startX = dragStartPos.current.x;
    const startY = dragStartPos.current.y;
    setPositions(prev => {
      const next = [...prev];
      next[selectedIdx] = {
        ...next[selectedIdx],
        x: Math.max(0, Math.min(100, startX + dx)),
        y: Math.max(0, Math.min(100, startY + dy)),
      };
      return next;
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    dragStart.current = null;
    dragStartPos.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const adjustScale = (delta: number) => {
    setPositions(prev => {
      const next = [...prev];
      next[selectedIdx] = { ...next[selectedIdx], scale: Math.max(0.1, Math.round((next[selectedIdx].scale + delta) * 10) / 10) };
      return next;
    });
  };

  const toggleFlip = () => {
    setPositions(prev => {
      const next = [...prev];
      next[selectedIdx] = { ...next[selectedIdx], flipX: !next[selectedIdx].flipX };
      return next;
    });
  };

  const setZLayer = (zLayer: 'back' | 'mid' | 'front') => {
    setPositions(prev => {
      const next = [...prev];
      next[selectedIdx] = { ...next[selectedIdx], zLayer };
      return next;
    });
  };

  const copyToClipboard = () => {
    const entries = visitors.map((v, i) => {
      const pos = positions[i] || { x: 50, y: 70, scale: 1, flipX: false, zLayer: 'front' as const };
      return {
        background_asset_key: bgKey,
        anchor_ref: v.id,
        x_pct: Math.round(pos.x * 10) / 1000,
        y_pct: Math.round(pos.y * 10) / 1000,
        scale: pos.scale,
        z_layer: pos.zLayer,
        ...(pos.flipX && { flipX: true }),
      };
    });
    navigator.clipboard.writeText(JSON.stringify(entries, null, 2));
    alert('Copied visitors JSON!');
  };

  return (
    <>
      {/* Render all visitors */}
      {positions.map((pos, i) => {
        const visitor = visitors[i];
        if (!visitor) return null;

        const baseZ = zIndexForLayer(pos.zLayer);
        return (
        <div
          key={visitor.id}
          className={`absolute ${i === selectedIdx ? 'cursor-move touch-none' : 'pointer-events-none'}`}
          style={{
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            transform: 'translate(-50%, -100%)',
            zIndex: i === selectedIdx ? baseZ + 1 : baseZ,
          }}
          onPointerDown={i === selectedIdx ? handlePointerDown : undefined}
          onPointerMove={i === selectedIdx ? handlePointerMove : undefined}
          onPointerUp={i === selectedIdx ? handlePointerUp : undefined}
        >
          {i === selectedIdx && (
            <div className="absolute w-16 h-16 rounded-full border-4 border-dashed border-green-400 bg-green-400/20 left-1/2 -translate-x-1/2 top-full -translate-y-1/2" />
          )}
          <img
            src={visitor.img}
            alt=""
            className="w-32 h-32 object-contain pointer-events-none"
            style={{
              filter: `drop-shadow(0 6px 12px rgba(0,0,0,0.4))`,
              opacity: i !== selectedIdx ? 0.5 : 1,
              transform: `scale(${pos.scale})${pos.flipX ? ' scaleX(-1)' : ''}`,
            }}
          />
          <div className={`absolute -top-6 left-1/2 -translate-x-1/2 ${i === selectedIdx ? 'bg-green-500 text-black' : 'bg-muted text-muted-foreground'} text-[9px] font-bold px-2 py-0.5 rounded whitespace-nowrap`}>
            {visitor.label}: {pos.x.toFixed(1)}%, {pos.y.toFixed(1)}%
          </div>
        </div>
      );
      })}

      {/* Control panel */}
      <div className={`fixed z-[200] bg-card border border-border rounded-lg shadow-xl text-xs max-w-[220px] ${panelClassName ?? 'top-4 right-4'}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 font-medium text-foreground hover:bg-accent"
        >
          <span className="flex items-center gap-2">
            <Move className="w-4 h-4" />
            {title}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isOpen && (
          <div className="p-3 space-y-3 border-t border-border">
            <div className="flex flex-col gap-1">
              {visitors.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedIdx(i)}
                  className={`py-1.5 px-2 rounded text-[10px] font-medium transition-all text-right ${
                    i === selectedIdx ? 'bg-green-500 text-black' : 'bg-muted hover:bg-accent'
                  }`}
                >
                  {v.label} ({(positions[i]?.x ?? 50).toFixed(1)}%, {(positions[i]?.y ?? 70).toFixed(1)}%)
                </button>
              ))}
            </div>

            <div className="space-y-1 p-2 rounded border bg-green-500/10 border-green-500/30">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Scale:</span>
                <button onClick={() => adjustScale(-0.1)} className="px-2 py-1 bg-muted rounded hover:bg-accent">-</button>
                <span>{current.scale.toFixed(1)}</span>
                <button onClick={() => adjustScale(0.1)} className="px-2 py-1 bg-muted rounded hover:bg-accent">+</button>
              </div>
              <button
                onClick={toggleFlip}
                className={`px-2 py-1 rounded text-xs ${current.flipX ? 'bg-green-500 text-black' : 'bg-muted'}`}
              >
                FlipX: {current.flipX ? 'ON' : 'OFF'}
              </button>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-xs">Layer:</span>
                <button
                  onClick={() => setZLayer('back')}
                  className={`px-2 py-1 rounded text-[10px] ${current.zLayer === 'back' ? 'bg-green-500 text-black' : 'bg-muted'}`}
                >
                  Back
                </button>
                <button
                  onClick={() => setZLayer('mid')}
                  className={`px-2 py-1 rounded text-[10px] ${current.zLayer === 'mid' ? 'bg-green-500 text-black' : 'bg-muted'}`}
                >
                  Mid
                </button>
                <button
                  onClick={() => setZLayer('front')}
                  className={`px-2 py-1 rounded text-[10px] ${current.zLayer === 'front' ? 'bg-green-500 text-black' : 'bg-muted'}`}
                >
                  Front
                </button>
              </div>
            </div>

            <button
              onClick={copyToClipboard}
              className="w-full flex items-center justify-center gap-1 px-2 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              <Copy className="w-3 h-3" />
              Copy All Visitors JSON
            </button>
          </div>
        )}
      </div>
    </>
  );
}
