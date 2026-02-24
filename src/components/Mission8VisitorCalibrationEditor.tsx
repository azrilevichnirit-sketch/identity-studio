import { useState, useRef } from 'react';
import { Move, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { getAnchorPosition } from '@/lib/jsonDataLoader';
import type { AnchorRef } from '@/types/identity';

import visitorM08_01 from '@/assets/avatars/studio_visitor_m08_01.png';
import visitorM08_02 from '@/assets/avatars/studio_visitor_m08_02.png';
import visitorM08_03 from '@/assets/avatars/studio_visitor_m08_03.png';

const VISITORS = [
  { id: 'm08_visitor_01', img: visitorM08_01, label: 'מבקר 1' },
  { id: 'm08_visitor_02', img: visitorM08_02, label: 'מבקרת 2' },
  { id: 'm08_visitor_03', img: visitorM08_03, label: 'מבקרת 3' },
];

interface VisitorPosition {
  x: number;
  y: number;
  scale: number;
  flipX: boolean;
}

interface Props {
  bgKey: string;
}

export function Mission8VisitorCalibrationEditor({ bgKey }: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const [positions, setPositions] = useState<VisitorPosition[]>(() =>
    VISITORS.map(v => {
      const pos = getAnchorPosition(bgKey, v.id as AnchorRef);
      return {
        x: pos?.x ?? 50,
        y: pos?.y ?? 70,
        scale: pos?.scale ?? 1,
        flipX: pos?.flipX ?? false,
      };
    })
  );

  const isDragging = useRef(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  const current = positions[selectedIdx];

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
    const dx = ((e.clientX - dragStart.current.x) / window.innerWidth) * 100;
    const dy = ((e.clientY - dragStart.current.y) / window.innerHeight) * 100;
    setPositions(prev => {
      const next = [...prev];
      next[selectedIdx] = {
        ...next[selectedIdx],
        x: Math.max(0, Math.min(100, dragStartPos.current!.x + dx)),
        y: Math.max(0, Math.min(100, dragStartPos.current!.y + dy)),
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

  const copyToClipboard = () => {
    const entries = VISITORS.map((v, i) => ({
      background_asset_key: bgKey,
      anchor_ref: v.id,
      x_pct: Math.round(positions[i].x * 10) / 1000,
      y_pct: Math.round(positions[i].y * 10) / 1000,
      scale: positions[i].scale,
      z_layer: 'front',
      ...(positions[i].flipX && { flipX: true }),
    }));
    navigator.clipboard.writeText(JSON.stringify(entries, null, 2));
    alert('Copied visitors JSON!');
  };

  return (
    <>
      {/* Render all 3 visitors */}
      {positions.map((pos, i) => (
        <div
          key={VISITORS[i].id}
          className={`absolute ${i === selectedIdx ? 'cursor-move touch-none z-[100]' : 'pointer-events-none z-[99]'}`}
          style={{
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            transform: 'translate(-50%, -100%)',
          }}
          onPointerDown={i === selectedIdx ? handlePointerDown : undefined}
          onPointerMove={i === selectedIdx ? handlePointerMove : undefined}
          onPointerUp={i === selectedIdx ? handlePointerUp : undefined}
        >
          {i === selectedIdx && (
            <div className="absolute w-16 h-16 rounded-full border-4 border-dashed border-green-400 bg-green-400/20 left-1/2 -translate-x-1/2 top-full -translate-y-1/2" />
          )}
          <img
            src={VISITORS[i].img}
            alt=""
            className="h-24 md:h-32 object-contain pointer-events-none"
            style={{
              filter: `drop-shadow(0 6px 12px rgba(0,0,0,0.4)) ${i !== selectedIdx ? 'opacity(0.5)' : ''}`,
              transform: `scale(${pos.scale})${pos.flipX ? ' scaleX(-1)' : ''}`,
            }}
          />
          <div className={`absolute -top-6 left-1/2 -translate-x-1/2 ${i === selectedIdx ? 'bg-green-500 text-black' : 'bg-muted text-muted-foreground'} text-[9px] font-bold px-2 py-0.5 rounded whitespace-nowrap`}>
            {VISITORS[i].label}: {pos.x.toFixed(1)}%, {pos.y.toFixed(1)}%
          </div>
        </div>
      ))}

      {/* Control panel */}
      <div className="fixed top-4 right-4 z-[200] bg-card border border-border rounded-lg shadow-xl text-xs max-w-[220px]">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 font-medium text-foreground hover:bg-accent"
        >
          <span className="flex items-center gap-2">
            <Move className="w-4 h-4" />
            M08 Visitors
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isOpen && (
          <div className="p-3 space-y-3 border-t border-border">
            {/* Visitor selector */}
            <div className="flex flex-col gap-1">
              {VISITORS.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedIdx(i)}
                  className={`py-1.5 px-2 rounded text-[10px] font-medium transition-all text-right ${
                    i === selectedIdx ? 'bg-green-500 text-black' : 'bg-muted hover:bg-accent'
                  }`}
                >
                  {v.label} ({positions[i].x.toFixed(1)}%, {positions[i].y.toFixed(1)}%)
                </button>
              ))}
            </div>

            {/* Scale & Flip */}
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
