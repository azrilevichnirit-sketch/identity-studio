import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import type { Mission, HollandCode, AvatarGender, PickRecord, MissionOption, AnchorRef } from '@/types/identity';
import { getToolImage, getBackgroundForMission, getAvatarImage, getBackgroundKey } from '@/lib/assetUtils';
import { getAnchorPosition } from '@/lib/jsonDataLoader';
import { SpeechBubble } from './SpeechBubble';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info, Hand } from 'lucide-react';
import { UndoConfirmPopover } from './UndoConfirmDialog';

interface VisualPlayScreenProps {
  mission: Mission;
  currentIndex: number;
  totalMissions: number;
  isTieBreaker: boolean;
  canUndo: boolean;
  avatarGender: AvatarGender;
  placedProps: PickRecord[];
  onSelect: (missionId: string, key: 'a' | 'b', hollandCode: HollandCode, option?: MissionOption) => void;
  onUndo: () => void;
}

export function VisualPlayScreen({
  mission,
  currentIndex,
  totalMissions,
  isTieBreaker,
  canUndo,
  avatarGender,
  placedProps,
  onSelect,
  onUndo,
}: VisualPlayScreenProps) {
  const [showUndoDialog, setShowUndoDialog] = useState(false);
  const [draggingTool, setDraggingTool] = useState<'a' | 'b' | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [justPlaced, setJustPlaced] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  
  const progress = ((currentIndex) / totalMissions) * 100;
  const optionA = mission.options.find((o) => o.key === 'a')!;
  const optionB = mission.options.find((o) => o.key === 'b')!;

  const currentBg = useMemo(() => getBackgroundForMission(mission), [mission]);
  const currentBgKey = useMemo(() => getBackgroundKey(mission), [mission]);
  const avatarImage = getAvatarImage(avatarGender, 'idle');
  const toolAImage = getToolImage(optionA.asset);
  const toolBImage = getToolImage(optionB.asset);

  const taskText = mission.task_heb || `MISSING: task_heb`;

  // Get target anchor for currently selected tool
  const getTargetAnchor = useCallback((variant: 'a' | 'b') => {
    const option = variant === 'a' ? optionA : optionB;
    const anchorRef = option.anchor_ref as AnchorRef;
    return getAnchorPosition(currentBgKey, anchorRef);
  }, [optionA, optionB, currentBgKey]);

  const handleUndoConfirm = () => {
    onUndo();
    setShowUndoDialog(false);
  };

  // Drag handlers
  const handleDragStart = useCallback((variant: 'a' | 'b', e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDraggingTool(variant);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragPosition({ x: clientX, y: clientY });
  }, []);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!draggingTool) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragPosition({ x: clientX, y: clientY });
  }, [draggingTool]);

  const handleDragEnd = useCallback((e: MouseEvent | TouchEvent) => {
    if (!draggingTool || !stageRef.current) {
      setDraggingTool(null);
      setDragPosition(null);
      return;
    }

    const clientX = 'touches' in e ? e.changedTouches?.[0]?.clientX : e.clientX;
    const clientY = 'touches' in e ? e.changedTouches?.[0]?.clientY : e.clientY;
    
    const rect = stageRef.current.getBoundingClientRect();
    const relY = ((clientY - rect.top) / rect.height) * 100;
    
    if (relY < 75 && relY > 0) {
      const option = draggingTool === 'a' ? optionA : optionB;
      // Trigger snap feedback
      setJustPlaced(`${mission.mission_id}-${draggingTool}`);
      setTimeout(() => setJustPlaced(null), 300);
      
      onSelect(mission.mission_id, draggingTool, option.holland_code as HollandCode, option);
    }
    
    setDraggingTool(null);
    setDragPosition(null);
  }, [draggingTool, mission.mission_id, optionA, optionB, onSelect]);

  useEffect(() => {
    if (draggingTool) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [draggingTool, handleDragMove, handleDragEnd]);

  const persistedProps = useMemo(() => {
    return placedProps.filter(p => p.persist === 'keep');
  }, [placedProps]);

  const targetPosition = useMemo(() => {
    if (draggingTool) {
      return getTargetAnchor(draggingTool);
    }
    return null;
  }, [draggingTool, getTargetAnchor]);

  return (
    <div ref={stageRef} className="absolute inset-0 overflow-hidden">
      {/* Background layer with crossfade */}
      <div 
        className="absolute inset-0 animate-bg-crossfade"
        key={currentBg}
        style={{ 
          backgroundImage: `url(${currentBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat',
          filter: 'saturate(1.18) contrast(1.08)',
        }}
      />

      {/* Bottom gradient overlay */}
      <div 
        className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 100%)',
        }}
      />

      {/* Target zone indicator - shows when dragging */}
      {draggingTool && targetPosition && (
        <div 
          className="absolute pointer-events-none z-15"
          style={{
            left: `${targetPosition.x}%`,
            top: `${targetPosition.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Pulsing glow ring */}
          <div 
            className="w-20 h-20 md:w-28 md:h-28 rounded-full animate-pulse"
            style={{
              border: '2px solid hsl(170 80% 50% / 0.8)',
              boxShadow: '0 0 20px hsl(170 80% 50% / 0.4), inset 0 0 15px hsl(170 80% 50% / 0.1)',
              background: 'radial-gradient(circle, hsl(170 80% 50% / 0.15) 0%, transparent 70%)',
            }}
          />
          {/* Downward arrow */}
          <svg 
            className="absolute left-1/2 -top-10 -translate-x-1/2 animate-bounce"
            width="28" height="28" viewBox="0 0 24 24" 
            fill="none" stroke="hsl(170, 80%, 50%)" strokeWidth="2.5"
          >
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      )}

      {/* Placed props layer */}
      {persistedProps.map((prop, idx) => {
        const toolImg = getToolImage(prop.missionId.replace('studio_', 'studio_') + '_' + prop.key);
        const anchorPos = prop.anchorRef 
          ? getAnchorPosition(currentBgKey, prop.anchorRef as AnchorRef)
          : null;
        
        if (!toolImg || !anchorPos) return null;
        
        const isJustPlaced = justPlaced === `${prop.missionId}-${prop.key}`;
        
        return (
          <div
            key={`${prop.missionId}-${idx}`}
            className={`absolute pointer-events-none ${isJustPlaced ? 'animate-snap-pop' : 'animate-snap-place'}`}
            style={{
              left: `${anchorPos.x + (prop.offsetX || 0) / 10}%`,
              top: `${anchorPos.y + (prop.offsetY || 0) / 10}%`,
              transform: `translate(-50%, -50%) scale(${(prop.scale || 1) * anchorPos.scale})`,
              zIndex: anchorPos.z_layer === 'back' ? 5 : anchorPos.z_layer === 'mid' ? 10 : 15,
            }}
          >
            <img 
              src={toolImg}
              alt=""
              className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-lg"
            />
          </div>
        );
      })}

      {/* Back/Undo popover - top right */}
      <div className="absolute top-3 right-3 md:top-4 md:right-4 z-30">
        <UndoConfirmPopover
          open={showUndoDialog}
          onOpenChange={setShowUndoDialog}
          onConfirm={handleUndoConfirm}
          disabled={!canUndo}
        />
      </div>

      {/* Avatar - anchored bottom-right */}
      {avatarImage && (
        <div 
          className="absolute z-20 animate-fade-in"
          style={{
            right: '24px',
            bottom: '160px',
            height: '220px',
            filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.5))',
          }}
        >
          <img 
            src={avatarImage} 
            alt="Guide avatar"
            className="h-full w-auto object-contain animate-subtle-float"
          />
        </div>
      )}

      {/* Speech bubble - near avatar on right */}
      <div 
        className="absolute z-15 animate-pop-in"
        style={{
          right: '180px',
          bottom: '200px',
          maxWidth: '380px',
        }}
      >
        <SpeechBubble tailDirection="right">
          <p className="font-medium text-base md:text-lg">{taskText}</p>
        </SpeechBubble>
      </div>

      {/* Compact glass tool tray - centered, not full width */}
      <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 z-25">
        <div 
          className="rounded-2xl px-5 py-4 md:px-8 md:py-5"
          style={{
            background: 'rgba(20, 25, 35, 0.55)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* Progress tank with counter */}
          <div className="flex items-center justify-center gap-3 mb-3">
            {/* Capsule tank */}
            <div 
              className="relative h-4 md:h-5 rounded-full overflow-hidden"
              style={{
                width: '140px',
                background: 'rgba(0,0,0,0.4)',
                border: '2px solid rgba(255,255,255,0.15)',
                boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.3)',
              }}
            >
              <div 
                className="h-full rounded-full transition-all ease-out relative overflow-hidden"
                style={{ 
                  width: `${progress}%`,
                  transitionDuration: '350ms',
                  background: 'linear-gradient(90deg, hsl(170 70% 42%) 0%, hsl(170 75% 52%) 100%)',
                }}
              >
                {/* Animated shine */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 45%, rgba(255,255,255,0.35) 55%, transparent 100%)',
                    animation: 'shine 2.5s ease-in-out infinite',
                  }}
                />
              </div>
            </div>
            {/* Counter text */}
            <span 
              className="text-xs md:text-sm font-medium"
              style={{ 
                color: 'rgba(255,255,255,0.75)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {currentIndex + 1}/{totalMissions}
            </span>
          </div>

          {/* Tool tiles */}
          <div className="flex gap-4 md:gap-6 justify-center items-center">
            <DraggableToolTile
              image={toolAImage}
              tooltip={optionA.tooltip_heb || `MISSING: option_a_tooltip_heb`}
              onClick={() => onSelect(mission.mission_id, 'a', optionA.holland_code as HollandCode, optionA)}
              onDragStart={(e) => handleDragStart('a', e)}
              variant="a"
              isDragging={draggingTool === 'a'}
            />
            <DraggableToolTile
              image={toolBImage}
              tooltip={optionB.tooltip_heb || `MISSING: option_b_tooltip_heb`}
              onClick={() => onSelect(mission.mission_id, 'b', optionB.holland_code as HollandCode, optionB)}
              onDragStart={(e) => handleDragStart('b', e)}
              variant="b"
              isDragging={draggingTool === 'b'}
            />
          </div>
        </div>
      </div>

      {/* Dragging ghost with hand indicator */}
      {draggingTool && dragPosition && (
        <div 
          className="fixed pointer-events-none z-50"
          style={{
            left: dragPosition.x,
            top: dragPosition.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <img 
            src={draggingTool === 'a' ? toolAImage : toolBImage}
            alt=""
            className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-2xl opacity-90"
          />
          {/* Hand icon */}
          <div 
            className="absolute -bottom-2 -right-2 animate-hand-move"
            style={{ color: 'hsl(220 20% 20%)' }}
          >
            <Hand className="w-7 h-7 md:w-8 md:h-8 drop-shadow-md" />
          </div>
        </div>
      )}

    </div>
  );
}

interface DraggableToolTileProps {
  image: string | undefined;
  tooltip: string;
  onClick: () => void;
  onDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
  variant: 'a' | 'b';
  isDragging: boolean;
}

function DraggableToolTile({ image, tooltip, onClick, onDragStart, variant, isDragging }: DraggableToolTileProps) {
  return (
    <div className={`relative ${isDragging ? 'opacity-40' : ''}`}>
      {/* Tool tile button - draggable */}
      <button
        onClick={onClick}
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        className="group relative overflow-hidden transition-all duration-200 hover:scale-105 active:scale-90 cursor-grab active:cursor-grabbing rounded-xl"
        style={{
          width: '80px',
          height: '80px',
          background: 'rgba(255, 252, 245, 0.94)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }}
      >
        {/* Tool image centered */}
        <div className="absolute inset-0 flex items-center justify-center p-2">
          {image ? (
            <img 
              src={image} 
              alt="Tool option"
              className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-110"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/30 rounded-lg">
              <span className="text-2xl">{variant === 'a' ? '🔧' : '🎨'}</span>
            </div>
          )}
        </div>
        
        {/* Hover glow */}
        <div 
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{
            boxShadow: '0 0 16px hsl(170 80% 45% / 0.35)',
          }}
        />
      </button>

      {/* Info icon - BOTTOM-LEFT corner */}
      <Popover>
        <PopoverTrigger asChild>
          <button 
            className="absolute -bottom-1 -left-1 z-10 w-6 h-6 md:w-7 md:h-7 rounded-full bg-slate-700/90 flex items-center justify-center shadow-md transition-transform hover:scale-110 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <Info className="w-3.5 h-3.5 md:w-4 md:h-4 text-white/90" />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          side="bottom" 
          align="start"
          sideOffset={8}
          className="w-48 md:w-56 text-sm text-center p-3 bg-slate-800/95 text-white border-slate-600/50 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
          style={{
            fontFamily: "'Heebo', sans-serif",
            direction: 'rtl',
          }}
        >
          {tooltip}
        </PopoverContent>
      </Popover>
    </div>
  );
}
