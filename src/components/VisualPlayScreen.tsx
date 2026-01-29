import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import type { Mission, HollandCode, AvatarGender, PickRecord, MissionOption } from '@/types/identity';
import { getToolImage, getBackgroundForMission, getAvatarImage, preloadBackground } from '@/lib/assetUtils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info } from 'lucide-react';
import { UndoConfirmDialog } from './UndoConfirmDialog';

// Import UI assets
import bubbleRightAsset from '@/assets/ui/ui_bubble_right_1600x900.webp';
import toolSlotAsset from '@/assets/ui/ui_tool_slot_700x700.webp';
import backArrowAsset from '@/assets/ui/ui_back_arrow_256.webp';

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

// Drop zone anchor positions (percentages of stage)
const ANCHOR_POSITIONS: Record<string, { x: number; y: number }> = {
  wall_back: { x: 50, y: 30 },
  wall_left: { x: 15, y: 45 },
  wall_right: { x: 85, y: 45 },
  floor: { x: 50, y: 75 },
  center: { x: 50, y: 55 },
  ceiling: { x: 50, y: 15 },
  avatar_hand: { x: 82, y: 55 }, // Near avatar
  table_center: { x: 45, y: 65 },
};

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
  const [previousBg, setPreviousBg] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  
  const progress = ((currentIndex) / totalMissions) * 100;
  const optionA = mission.options.find((o) => o.key === 'a')!;
  const optionB = mission.options.find((o) => o.key === 'b')!;

  const currentBg = useMemo(() => getBackgroundForMission(mission), [mission]);
  const avatarImage = getAvatarImage(avatarGender, 'idle');
  const toolAImage = getToolImage(optionA.asset);
  const toolBImage = getToolImage(optionB.asset);

  // Track previous background for crossfade
  useEffect(() => {
    if (previousBg !== currentBg) {
      setPreviousBg(currentBg);
    }
  }, [currentBg, previousBg]);

  // Preload next mission's background if available
  useEffect(() => {
    if (mission.options) {
      // Preload possible next backgrounds
      mission.options.forEach(opt => {
        // We don't have next_bg_override in current structure, but could add
      });
    }
  }, [mission]);

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
    
    // Get stage bounds
    const rect = stageRef.current.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * 100;
    const relY = ((clientY - rect.top) / rect.height) * 100;
    
    // Check if dropped in valid area (above tray, ~top 80% of stage)
    if (relY < 80 && relY > 0 && relX > 0 && relX < 100) {
      const option = draggingTool === 'a' ? optionA : optionB;
      onSelect(mission.mission_id, draggingTool, option.holland_code as HollandCode, option);
    }
    
    setDraggingTool(null);
    setDragPosition(null);
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
          background: 'linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 100%)',
        }}
      />

      {/* Placed props layer - persisted items from previous choices */}
      {persistedProps.map((prop, idx) => {
        const toolImg = getToolImage(prop.missionId.replace('studio_', 'studio_') + '_' + prop.key);
        const anchor = prop.anchorRef ? ANCHOR_POSITIONS[prop.anchorRef] : ANCHOR_POSITIONS.floor;
        
        if (!toolImg) return null;
        
        return (
          <div
            key={`${prop.missionId}-${idx}`}
            className="absolute pointer-events-none animate-snap-place"
            style={{
              left: `${anchor.x + (prop.offsetX || 0) / 10}%`,
              top: `${anchor.y + (prop.offsetY || 0) / 10}%`,
              transform: `translate(-50%, -50%) scale(${prop.scale || 1})`,
              zIndex: 10 + idx,
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

      {/* Progress bar - minimal top overlay */}
      <div className="absolute top-4 left-6 right-20 z-30">
        <div className="max-w-[200px]">
          <div className="h-2 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm shadow-inner">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Back arrow button - top right */}
      <button
        onClick={handleUndoClick}
        disabled={!canUndo}
        className="absolute top-4 right-4 z-30 w-12 h-12 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-lg transition-all duration-200 hover:bg-white hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <img 
          src={backArrowAsset} 
          alt="חזור" 
          className="w-7 h-7 object-contain"
        />
      </button>

      {/* Avatar - anchored bottom-right, above tray, 28-35% of stage height */}
      {avatarImage && (
        <div 
          className="absolute z-20 animate-fade-in"
          style={{
            right: '32px',
            bottom: '160px',
            height: '240px', // ~33% of 720px stage height
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

      {/* Speech bubble - left of avatar with mission text */}
      <div 
        className="absolute z-15 animate-pop-in"
        style={{
          left: '24px',
          right: '220px',
          bottom: '190px',
          maxWidth: '550px',
        }}
      >
        <div 
          className="relative"
          style={{
            backgroundImage: `url(${bubbleRightAsset})`,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            padding: '24px 40px 24px 28px',
          }}
        >
          <p className="text-lg font-medium leading-relaxed text-foreground">
            {mission.task_heb}
          </p>
        </div>
      </div>

      {/* Tool tray - light semi-transparent panel at bottom (20-24% of stage = ~144-173px) */}
      <div className="absolute bottom-0 left-0 right-0 z-25">
        <div 
          className="mx-3 mb-3 rounded-2xl px-6 py-4"
          style={{
            background: 'rgba(255, 252, 245, 0.75)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.1)',
            height: '140px',
          }}
        >
          {/* Tool tiles - two options side by side */}
          <div className="flex gap-6 justify-center items-center h-full">
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

      {/* Dragging ghost */}
      {draggingTool && dragPosition && (
        <div 
          className="fixed pointer-events-none z-50 animate-drag-pulse"
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
  const accentColor = variant === 'a' ? 'bg-option-a' : 'bg-option-b';

  return (
    <div className={`relative ${isDragging ? 'opacity-40' : ''}`}>
      {/* Info icon with popover */}
      <Popover>
        <PopoverTrigger asChild>
          <button 
            className={`absolute -top-1 -right-1 z-10 w-7 h-7 rounded-full ${accentColor} flex items-center justify-center shadow-md transition-transform hover:scale-110`}
            onClick={(e) => e.stopPropagation()}
          >
            <Info className="w-4 h-4 text-primary-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          side="top" 
          className="w-52 text-sm text-center p-3 bg-white/95 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {tooltip}
        </PopoverContent>
      </Popover>

      {/* Tool tile button with slot frame - draggable */}
      <button
        onClick={onClick}
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        className="group relative overflow-hidden transition-all duration-200 hover:scale-105 active:scale-90 cursor-grab active:cursor-grabbing"
        style={{
          width: '100px',
          height: '100px',
        }}
      >
        {/* Slot frame background */}
        <img 
          src={toolSlotAsset}
          alt=""
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
        
        {/* Tool image centered inside slot */}
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
            boxShadow: variant === 'a' 
              ? '0 0 20px hsl(var(--option-a) / 0.5)' 
              : '0 0 20px hsl(var(--option-b) / 0.5)',
          }}
        />
      </button>
    </div>
  );
}
