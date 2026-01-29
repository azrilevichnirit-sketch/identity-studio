import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import type { Mission, HollandCode, AvatarGender, PickRecord, MissionOption, AnchorRef } from '@/types/identity';
import { getToolImage, getBackgroundForMission, getAvatarImage, getBackgroundKey } from '@/lib/assetUtils';
import { getAnchorPosition } from '@/lib/jsonDataLoader';
import { SpeechBubble } from './SpeechBubble';
import { Info, Hand, X } from 'lucide-react';
import { UndoConfirmPopover } from './UndoConfirmDialog';
import { ProgressTank } from './ProgressTank';
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
  const [activeTooltip, setActiveTooltip] = useState<'a' | 'b' | null>(null);
  const [hasDroppedOnce, setHasDroppedOnce] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  
  // Options from mission
  const optionA = mission.options.find((o) => o.key === 'a')!;
  const optionB = mission.options.find((o) => o.key === 'b')!;

  // Get the previous pick's nextBgOverride to determine current background
  const previousBgOverride = useMemo(() => {
    // Find the pick for the previous mission
    const prevPicks = placedProps.slice(0, -1); // All picks except current
    if (prevPicks.length > 0) {
      const lastPick = prevPicks[prevPicks.length - 1];
      return lastPick.nextBgOverride;
    }
    return undefined;
  }, [placedProps]);

  const currentBg = useMemo(() => getBackgroundForMission(mission, previousBgOverride), [mission, previousBgOverride]);
  const currentBgKey = useMemo(() => getBackgroundKey(mission, previousBgOverride), [mission, previousBgOverride]);
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
      // Mark first drop complete
      if (!hasDroppedOnce) {
        setHasDroppedOnce(true);
      }
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
    <div ref={stageRef} className="absolute inset-0 w-full h-full overflow-hidden">
      {/* Background layer - always fills viewport */}
      <div 
        className="absolute inset-0 w-full h-full animate-bg-crossfade"
        key={currentBg}
        style={{ 
          backgroundImage: `url(${currentBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
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
        // Use assetName from pick record if available, fallback to constructed name
        const assetName = prop.assetName || `${prop.missionId.replace('studio_', 'studio_')}_${prop.key}`;
        const toolImg = getToolImage(assetName);
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
              left: `${anchorPos.x + (prop.offsetX || 0)}%`,
              top: `${anchorPos.y + (prop.offsetY || 0)}%`,
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

      {/* Avatar - anchored bottom-right, matching Welcome screen */}
      {avatarImage && (
        <div 
          className="absolute z-20 animate-fade-in"
          style={{
            right: '60px',
            bottom: '30px',
            height: '340px',
            filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.6))',
          }}
        >
          <img 
            src={avatarImage} 
            alt="Guide avatar"
            className="h-full w-auto object-contain animate-subtle-float"
          />
        </div>
      )}

      {/* Speech bubble - positioned to the left so avatar can overlap edge */}
      <div 
        className="absolute z-15 animate-pop-in"
        style={{
          right: '280px',
          bottom: '100px',
          maxWidth: '400px',
        }}
      >
        <SpeechBubble tailDirection="right">
          <p className="font-medium text-base md:text-lg pr-4">{taskText}</p>
        </SpeechBubble>
      </div>

      {/* Compact floating tool panel - lower-left */}
      <div className="absolute bottom-6 md:bottom-8 left-6 md:left-8 z-25">
        <div 
          className="rounded-2xl px-5 py-4 md:px-6 md:py-5"
          style={{
            background: 'rgba(20, 25, 35, 0.65)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* Progress tank with bubbles */}
          <div className="flex justify-center mb-3">
            <ProgressTank current={currentIndex + 1} total={totalMissions} />
          </div>

          {/* Tool tiles with drag hint */}
          <div className="flex gap-4 md:gap-5 justify-center items-center relative">
            <DraggableToolTile
              image={toolAImage}
              onClick={() => onSelect(mission.mission_id, 'a', optionA.holland_code as HollandCode, optionA)}
              onDragStart={(e) => handleDragStart('a', e)}
              onInfoClick={() => setActiveTooltip(activeTooltip === 'a' ? null : 'a')}
              variant="a"
              isDragging={draggingTool === 'a'}
              isInfoActive={activeTooltip === 'a'}
            />
            <DraggableToolTile
              image={toolBImage}
              onClick={() => onSelect(mission.mission_id, 'b', optionB.holland_code as HollandCode, optionB)}
              onDragStart={(e) => handleDragStart('b', e)}
              onInfoClick={() => setActiveTooltip(activeTooltip === 'b' ? null : 'b')}
              variant="b"
              isDragging={draggingTool === 'b'}
              isInfoActive={activeTooltip === 'b'}
            />
            
            {/* Animated drag hint - shows before first drop, when not dragging */}
            {!hasDroppedOnce && !draggingTool && (
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 pointer-events-none animate-fade-in">
                {/* Animated hand with upward arrow */}
                <div className="flex flex-col items-center animate-drag-hint">
                  {/* Upward arrow */}
                  <svg 
                    width="24" height="24" viewBox="0 0 24 24" 
                    fill="none" 
                    className="mb-1"
                  >
                    <path 
                      d="M12 19V5M5 12l7-7 7 7" 
                      stroke="hsl(170, 80%, 50%)" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                  {/* Hand SVG */}
                  <svg 
                    width="28" height="28" viewBox="0 0 24 24" 
                    fill="none"
                    className="drop-shadow-md"
                  >
                    <path 
                      d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v1M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v6M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" 
                      stroke="hsl(220, 20%, 25%)" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15V6" 
                      stroke="hsl(220, 20%, 25%)" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Tooltip tray - shown below tools when active */}
          {activeTooltip && (
            <div 
              className="mt-3 rounded-xl p-3 relative animate-fade-in"
              style={{
                background: '#FFFCF5',
                boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.08)',
              }}
            >
              {/* Close button */}
              <button
                onClick={() => setActiveTooltip(null)}
                className="absolute top-2 left-2 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"
              >
                <X className="w-3 h-3 text-slate-600" />
              </button>
              
              {/* Tooltip text */}
              <p 
                className="text-sm font-medium pr-2 pl-6"
                style={{
                  color: '#111',
                  direction: 'rtl',
                  textAlign: 'right',
                  fontFamily: "'Assistant', sans-serif",
                  lineHeight: 1.5,
                }}
              >
                {activeTooltip === 'a' 
                  ? (optionA.tooltip_heb || 'MISSING: option_a_tooltip_heb')
                  : (optionB.tooltip_heb || 'MISSING: option_b_tooltip_heb')
                }
              </p>
            </div>
          )}
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
  onClick: () => void;
  onDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
  onInfoClick: () => void;
  variant: 'a' | 'b';
  isDragging: boolean;
  isInfoActive: boolean;
}

function DraggableToolTile({ image, onClick, onDragStart, onInfoClick, variant, isDragging, isInfoActive }: DraggableToolTileProps) {
  return (
    <div className={`relative ${isDragging ? 'opacity-40' : ''}`}>
      {/* Tool tile - minimal framing, no white card */}
      <button
        onClick={onClick}
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        className="group relative overflow-visible transition-all duration-200 hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing"
        style={{
          width: '72px',
          height: '72px',
        }}
      >
        {/* Tool image - transparent PNG with subtle shadow */}
        <div className="absolute inset-0 flex items-center justify-center">
          {image ? (
            <img 
              src={image} 
              alt="Tool option"
              className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
              style={{
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
              }}
              draggable={false}
            />
          ) : (
            <div className="w-14 h-14 flex items-center justify-center bg-white/20 rounded-lg backdrop-blur-sm">
              <span className="text-2xl">{variant === 'a' ? '🔧' : '🎨'}</span>
            </div>
          )}
        </div>
        
        {/* Subtle hover ring */}
        <div 
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{
            boxShadow: '0 0 20px hsl(170 80% 50% / 0.4)',
          }}
        />
      </button>

      {/* Info icon - BOTTOM-LEFT corner */}
      <button 
        className={`absolute bottom-0 left-0 z-10 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 backdrop-blur-sm ${
          isInfoActive 
            ? 'bg-slate-100 ring-2 ring-slate-400' 
            : 'bg-slate-700/90'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onInfoClick();
        }}
      >
        <Info className={`w-3 h-3 md:w-3.5 md:h-3.5 ${isInfoActive ? 'text-slate-700' : 'text-white/90'}`} />
      </button>
    </div>
  );
}
