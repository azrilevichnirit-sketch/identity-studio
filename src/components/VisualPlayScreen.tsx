import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import type { Mission, HollandCode, AvatarGender, PickRecord, MissionOption, AnchorRef } from '@/types/identity';
import { getToolImage, getBackgroundForMission, getAvatarImage, getBackgroundKey } from '@/lib/assetUtils';
import { getAnchorPosition } from '@/lib/csvParser';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info, ArrowLeft, Hand } from 'lucide-react';
import { UndoConfirmDialog } from './UndoConfirmDialog';

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
  const [showDragIndicator, setShowDragIndicator] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  
  const progress = ((currentIndex) / totalMissions) * 100;
  const optionA = mission.options.find((o) => o.key === 'a')!;
  const optionB = mission.options.find((o) => o.key === 'b')!;

  const currentBg = useMemo(() => getBackgroundForMission(mission), [mission]);
  const currentBgKey = useMemo(() => getBackgroundKey(mission), [mission]);
  const avatarImage = getAvatarImage(avatarGender, 'idle');
  const toolAImage = getToolImage(optionA.asset);
  const toolBImage = getToolImage(optionB.asset);

  // Get target anchor for currently selected tool
  const getTargetAnchor = useCallback((variant: 'a' | 'b') => {
    const option = variant === 'a' ? optionA : optionB;
    const anchorRef = option.anchor_ref as AnchorRef;
    return getAnchorPosition(currentBgKey, anchorRef);
  }, [optionA, optionB, currentBgKey]);

  const handleUndoClick = () => {
    if (canUndo) {
      setShowUndoDialog(true);
    }
  };

  const handleUndoConfirm = () => {
    onUndo();
  };

  // Drag handlers
  const handleDragStart = useCallback((variant: 'a' | 'b', e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDraggingTool(variant);
    setShowDragIndicator(true);
    
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
      setShowDragIndicator(false);
      return;
    }

    const clientX = 'touches' in e ? e.changedTouches?.[0]?.clientX : e.clientX;
    const clientY = 'touches' in e ? e.changedTouches?.[0]?.clientY : e.clientY;
    
    // Get stage bounds
    const rect = stageRef.current.getBoundingClientRect();
    const relY = ((clientY - rect.top) / rect.height) * 100;
    
    // Check if dropped in valid area (above tray, ~top 75% of stage)
    if (relY < 75 && relY > 0) {
      const option = draggingTool === 'a' ? optionA : optionB;
      onSelect(mission.mission_id, draggingTool, option.holland_code as HollandCode, option);
    }
    
    setDraggingTool(null);
    setDragPosition(null);
    setShowDragIndicator(false);
  }, [draggingTool, mission.mission_id, optionA, optionB, onSelect]);

  // Attach global drag listeners
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

  // Get placed props that should persist
  const persistedProps = useMemo(() => {
    return placedProps.filter(p => p.persist === 'keep');
  }, [placedProps]);

  // Target zone position for drag indicator
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

      {/* Bottom gradient overlay to ground UI */}
      <div 
        className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 100%)',
        }}
      />

      {/* Target zone indicator - shows when dragging */}
      {draggingTool && targetPosition && (
        <div 
          className="absolute pointer-events-none z-15 animate-pulse-glow"
          style={{
            left: `${targetPosition.x}%`,
            top: `${targetPosition.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Pulsing circle indicator */}
          <div 
            className="w-24 h-24 rounded-full border-2 border-dashed animate-spin-slow"
            style={{
              borderColor: 'hsl(170 80% 45% / 0.7)',
              background: 'radial-gradient(circle, hsl(170 80% 45% / 0.2) 0%, transparent 70%)',
            }}
          />
          {/* Arrow pointing down */}
          <div 
            className="absolute left-1/2 -top-8 -translate-x-1/2 animate-bounce-subtle"
            style={{ color: 'hsl(170 80% 45%)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4l-8 8h5v8h6v-8h5z" />
            </svg>
          </div>
        </div>
      )}

      {/* Placed props layer - persisted items from previous choices */}
      {persistedProps.map((prop, idx) => {
        const toolImg = getToolImage(prop.missionId.replace('studio_', 'studio_') + '_' + prop.key);
        const anchorPos = prop.anchorRef 
          ? getAnchorPosition(currentBgKey, prop.anchorRef as AnchorRef)
          : null;
        
        if (!toolImg || !anchorPos) return null;
        
        return (
          <div
            key={`${prop.missionId}-${idx}`}
            className="absolute pointer-events-none animate-snap-place"
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
              className="w-20 h-20 object-contain drop-shadow-lg"
            />
          </div>
        );
      })}

      {/* Back arrow button - top right with visible dark arrow */}
      <button
        onClick={handleUndoClick}
        disabled={!canUndo}
        className="absolute top-4 right-4 z-30 w-12 h-12 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-lg transition-all duration-200 hover:bg-white hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ArrowLeft className="w-6 h-6 text-slate-800" style={{ transform: 'scaleX(-1)' }} />
      </button>

      {/* Avatar - anchored bottom-right, larger size */}
      {avatarImage && (
        <div 
          className="absolute z-20 animate-fade-in"
          style={{
            right: '40px',
            bottom: '170px',
            height: '280px',
            filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.5))',
          }}
        >
          <img 
            src={avatarImage} 
            alt="Your avatar"
            className="h-full w-auto object-contain animate-subtle-float"
          />
        </div>
      )}

      {/* Speech bubble - chat bubble with tail pointing to avatar */}
      <div 
        className="absolute z-15 animate-pop-in"
        style={{
          left: '24px',
          right: '280px',
          bottom: '220px',
          maxWidth: '480px',
        }}
      >
        <div 
          className="relative rounded-2xl p-5"
          style={{
            background: 'rgba(255, 252, 245, 0.95)',
            boxShadow: '0 6px 24px rgba(0,0,0,0.2)',
          }}
        >
          {/* Bubble tail pointing toward avatar (right side) */}
          <div 
            className="absolute"
            style={{
              right: '-14px',
              bottom: '24px',
              width: 0,
              height: 0,
              borderTop: '10px solid transparent',
              borderBottom: '10px solid transparent',
              borderLeft: '14px solid rgba(255, 252, 245, 0.95)',
            }}
          />
          
          <p 
            className="text-foreground leading-relaxed font-medium"
            style={{ 
              fontFamily: "'Heebo', sans-serif",
              fontSize: '17px',
              lineHeight: '1.5',
            }}
          >
            {mission.task_heb}
          </p>
        </div>
      </div>

      {/* Tool tray - clean glass panel at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-25">
        <div 
          className="mx-4 mb-4 rounded-2xl px-6 py-4"
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 -2px 20px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
            borderTop: '1px solid rgba(255,255,255,0.25)',
          }}
        >
          {/* Progress capsule - above tools */}
          <div className="flex justify-center mb-3">
            <div 
              className="h-3 rounded-full overflow-hidden"
              style={{
                width: '45%',
                background: 'rgba(0,0,0,0.2)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)',
              }}
            >
              <div 
                className="h-full rounded-full transition-all duration-400 ease-out relative overflow-hidden"
                style={{ 
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, hsl(170 80% 45%) 0%, hsl(170 80% 55%) 100%)',
                }}
              >
                {/* Shine effect */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                    animation: 'shine 2s ease-in-out infinite',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Tool tiles - two options side by side */}
          <div className="flex gap-6 justify-center items-center">
            <DraggableToolTile
              image={toolAImage}
              tooltip={optionA.tooltip_heb}
              onClick={() => onSelect(mission.mission_id, 'a', optionA.holland_code as HollandCode, optionA)}
              onDragStart={(e) => handleDragStart('a', e)}
              variant="a"
              isDragging={draggingTool === 'a'}
            />
            <DraggableToolTile
              image={toolBImage}
              tooltip={optionB.tooltip_heb}
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
            className="w-24 h-24 object-contain drop-shadow-2xl opacity-90"
          />
          {/* Hand indicator */}
          <div 
            className="absolute -bottom-3 -right-3 animate-hand-move"
            style={{ color: 'hsl(220 25% 25%)' }}
          >
            <Hand className="w-8 h-8" />
          </div>
        </div>
      )}

      {/* Undo confirmation dialog */}
      <UndoConfirmDialog
        open={showUndoDialog}
        onOpenChange={setShowUndoDialog}
        onConfirm={handleUndoConfirm}
        disabled={!canUndo}
      />
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
      {/* Info icon with popover */}
      <Popover>
        <PopoverTrigger asChild>
          <button 
            className="absolute -top-1 -right-1 z-10 w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center shadow-md transition-transform hover:scale-110"
            onClick={(e) => e.stopPropagation()}
          >
            <Info className="w-4 h-4 text-white" />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          side="top" 
          className="w-52 text-sm text-center p-3 bg-slate-800 text-white border-slate-600"
          onClick={(e) => e.stopPropagation()}
        >
          {tooltip}
        </PopoverContent>
      </Popover>

      {/* Tool tile button - draggable */}
      <button
        onClick={onClick}
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        className="group relative overflow-hidden transition-all duration-200 hover:scale-105 active:scale-90 cursor-grab active:cursor-grabbing rounded-xl"
        style={{
          width: '100px',
          height: '100px',
          background: 'rgba(255, 252, 245, 0.9)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}
      >
        {/* Tool image centered */}
        <div className="absolute inset-0 flex items-center justify-center p-3">
          {image ? (
            <img 
              src={image} 
              alt="Tool option"
              className="w-4/5 h-4/5 object-contain transition-transform duration-200 group-hover:scale-110"
              draggable={false}
            />
          ) : (
            <div className="w-4/5 h-4/5 flex items-center justify-center bg-muted/30 rounded-lg">
              <span className="text-2xl">{variant === 'a' ? '🔧' : '🎨'}</span>
            </div>
          )}
        </div>
        
        {/* Selection glow on hover */}
        <div 
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{
            boxShadow: '0 0 20px hsl(170 80% 45% / 0.4)',
          }}
        />
      </button>
    </div>
  );
}
