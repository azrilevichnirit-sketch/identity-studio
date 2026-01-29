import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import type { Mission, HollandCode, AvatarGender, PickRecord, MissionOption, AnchorRef } from '@/types/identity';
import { getToolImage, getBackgroundForMission, getAvatarImage, getBackgroundKey, getBackgroundByName } from '@/lib/assetUtils';
import { getAnchorPosition } from '@/lib/jsonDataLoader';
import { SpeechBubble } from './SpeechBubble';
import { Info, Hand, X } from 'lucide-react';
import { UndoConfirmPopover } from './UndoConfirmDialog';
import { ProgressTank } from './ProgressTank';
import { DragHint } from './DragHint';
import { useSceneExtras } from '@/hooks/useSceneExtras';

const DRAG_HINT_STORAGE_KEY = 'ie_hasDraggedOnce';

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
  const [hasDraggedOnce, setHasDraggedOnce] = useState(() => {
    return localStorage.getItem(DRAG_HINT_STORAGE_KEY) === 'true';
  });
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

  // Get the target background for a tool option (where it should be placed)
  const getTargetBgForOption = useCallback((option: MissionOption) => {
    // The tool's target background is defined by next_bg_override
    const targetBgKey = option.next_bg_override || currentBgKey;
    const targetBgImage = getBackgroundByName(targetBgKey) || currentBg;
    return { key: targetBgKey, image: targetBgImage };
  }, [currentBgKey, currentBg]);

  // Determine which background to show during drag (preview the target background)
  const dragPreviewBg = useMemo(() => {
    if (!draggingTool) return null;
    const option = draggingTool === 'a' ? optionA : optionB;
    const target = getTargetBgForOption(option);
    // Only switch if different from current
    if (target.key !== currentBgKey) {
      return target;
    }
    return null;
  }, [draggingTool, optionA, optionB, getTargetBgForOption, currentBgKey]);

  // The effective background to display (preview during drag, or current)
  const displayBg = dragPreviewBg?.image || currentBg;
  const displayBgKey = dragPreviewBg?.key || currentBgKey;

  // Get target anchor for currently selected tool - use TARGET background's anchor map
  const getTargetAnchor = useCallback((variant: 'a' | 'b') => {
    const option = variant === 'a' ? optionA : optionB;
    const anchorRef = option.anchor_ref as AnchorRef;
    // Use the target background key for anchor lookup
    const targetBgKey = option.next_bg_override || currentBgKey;
    return getAnchorPosition(targetBgKey, anchorRef);
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
      // Mark first drop complete and persist
      if (!hasDraggedOnce) {
        setHasDraggedOnce(true);
        localStorage.setItem(DRAG_HINT_STORAGE_KEY, 'true');
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

  // Scene extras (NPCs) based on current mission and picks
  const sceneExtras = useSceneExtras(mission.mission_id, currentIndex, placedProps);

  return (
    <div 
      ref={stageRef} 
      className="fixed inset-0 overflow-hidden"
      style={{
        width: '100vw',
        height: '100dvh',
        minHeight: '100vh',
        maxWidth: '100vw',
        overflowX: 'hidden',
      }}
    >
      {/* Background layer - shows drag preview or current bg with smooth crossfade */}
      <div 
        className="absolute inset-0 transition-opacity duration-300"
        style={{ 
          backgroundImage: `url(${displayBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'saturate(1.18) contrast(1.08)',
          zIndex: 0,
        }}
      />

      {/* Bottom gradient overlay */}
      <div 
        className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 100%)',
        }}
      />

      {/* Scene extras layer - NPCs that spawn based on mission rules */}
      {sceneExtras.map((extra) => {
        const anchorPos = getAnchorPosition(displayBgKey, extra.anchorRef);
        if (!anchorPos) return null;
        
        return (
          <div
            key={extra.id}
            className="absolute pointer-events-none animate-fade-in"
            style={{
              left: `${anchorPos.x + extra.offsetX}%`,
              top: `${anchorPos.y + extra.offsetY}%`,
              transform: `translate(-50%, -50%) scale(${extra.scale * anchorPos.scale})`,
              zIndex: extra.zLayer === 'back' ? 3 : extra.zLayer === 'mid' ? 6 : 8,
            }}
          >
            <img 
              src={extra.image}
              alt=""
              className="h-24 md:h-32 w-auto object-contain drop-shadow-lg"
              style={{
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
              }}
            />
          </div>
        );
      })}

      {/* Target zone indicator - shows when dragging, at correct anchor on TARGET background */}
      {draggingTool && targetPosition && (
        <div 
          className="absolute pointer-events-none z-15 animate-fade-in"
          style={{
            left: `${targetPosition.x}%`,
            top: `${targetPosition.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Pulsing glow ring */}
          <div 
            className="w-24 h-24 md:w-32 md:h-32 rounded-full"
            style={{
              border: '3px solid hsl(170 80% 50% / 0.9)',
              boxShadow: '0 0 30px hsl(170 80% 50% / 0.5), inset 0 0 20px hsl(170 80% 50% / 0.15)',
              background: 'radial-gradient(circle, hsl(170 80% 50% / 0.2) 0%, transparent 70%)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          {/* Downward arrow */}
          <svg 
            className="absolute left-1/2 -top-12 -translate-x-1/2 animate-bounce"
            width="32" height="32" viewBox="0 0 24 24" 
            fill="none" stroke="hsl(170, 80%, 50%)" strokeWidth="3"
          >
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      )}

      {/* Placed props layer - use displayBgKey for current view's anchor positions */}
      {persistedProps.map((prop, idx) => {
        // Use assetName from pick record if available, fallback to constructed name
        const assetName = prop.assetName || `${prop.missionId.replace('studio_', 'studio_')}_${prop.key}`;
        const toolImg = getToolImage(assetName);
        // Use displayBgKey to get anchors for the currently shown background
        const anchorPos = prop.anchorRef 
          ? getAnchorPosition(displayBgKey, prop.anchorRef as AnchorRef)
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

      {/* Back/Undo popover - top right with safe-area */}
      <div 
        className="absolute z-30"
        style={{
          top: 'max(env(safe-area-inset-top, 12px), 16px)',
          right: 'max(env(safe-area-inset-right, 12px), 16px)',
        }}
      >
        <UndoConfirmPopover
          open={showUndoDialog}
          onOpenChange={setShowUndoDialog}
          onConfirm={handleUndoConfirm}
          disabled={!canUndo}
        />
      </div>

      {/* Avatar - anchored bottom-right, stable size on mobile */}
      {avatarImage && (
        <div 
          className="absolute z-25 animate-fade-in"
          style={{
            right: '6px',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
            height: 'clamp(280px, 42vh, 410px)',
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

      {/* Speech bubble - positioned above dock, left of avatar on mobile */}
      <div 
        className="absolute z-40 animate-pop-in"
        style={{
          right: 'calc(16px + clamp(220px, 34vh, 320px) * 0.45)',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px + clamp(120px, 18vh, 165px) + 14px)',
          maxWidth: 'min(74vw, 360px)',
          minWidth: '200px',
          maxHeight: '26vh',
        }}
      >
        <SpeechBubble tailDirection="right">
          <div 
            className="overflow-y-auto"
            style={{ maxHeight: 'calc(26vh - 32px)' }}
          >
            <p 
              className="font-medium text-sm md:text-base lg:text-lg pr-4 md:pr-6"
              style={{ lineHeight: 1.5 }}
            >
              {taskText}
            </p>
          </div>
        </SpeechBubble>
      </div>

      {/* Floating tool panel - LEFT side, constrained size, never overlaps bubble */}
      <div 
        className="absolute z-20"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
          left: '16px',
          width: 'clamp(220px, 44vw, 320px)',
          height: 'clamp(120px, 18vh, 165px)',
        }}
      >
        <div 
          className="rounded-2xl px-3 py-2.5 md:px-5 md:py-4 h-full flex flex-col"
          style={{
            background: 'rgba(15, 20, 30, 0.65)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Progress tank */}
          <div className="flex justify-center mb-2">
            <ProgressTank value={(currentIndex + 1) / totalMissions} />
          </div>

          {/* Tool tiles with drag hint - flex-1 to fill remaining space */}
          <div className="flex-1 flex gap-3 md:gap-5 justify-center items-center relative">
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
            
            {/* Animated drag hint - shows before first drop ever, when not dragging */}
            {!hasDraggedOnce && !draggingTool && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <DragHint />
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
                  fontFamily: "'Rubik', sans-serif",
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
      {/* Tool tile - transparent PNG, no white card, responsive sizing */}
      <button
        onClick={onClick}
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        className="group relative overflow-visible transition-all duration-200 hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing"
        style={{
          width: 'clamp(64px, 12vw, 100px)',
          height: 'clamp(64px, 12vw, 100px)',
          minWidth: '64px',
          minHeight: '64px',
        }}
      >
        {/* Tool image - transparent PNG with subtle shadow only */}
        <div className="absolute inset-0 flex items-center justify-center">
          {image ? (
            <img 
              src={image} 
              alt="Tool option"
              className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-108"
              style={{
                filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))',
              }}
              draggable={false}
            />
          ) : (
            <span className="text-3xl">{variant === 'a' ? '🔧' : '🎨'}</span>
          )}
        </div>
        
        {/* Subtle hover glow - no ring, just soft glow */}
        <div 
          className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{
            boxShadow: '0 0 24px hsl(170 80% 50% / 0.35)',
          }}
        />
      </button>

      {/* Info icon - BOTTOM-LEFT corner */}
      <button 
        className={`absolute -bottom-1 -left-1 z-10 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 ${
          isInfoActive 
            ? 'bg-white ring-2 ring-slate-400' 
            : 'bg-slate-800/90'
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
