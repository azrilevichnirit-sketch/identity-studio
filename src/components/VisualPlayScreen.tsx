import { useMemo, useState } from 'react';
import type { Mission, HollandCode, AvatarGender, PickRecord } from '@/types/identity';
import { getToolImage, getBackgroundForMission, getAvatarImage } from '@/lib/assetUtils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info } from 'lucide-react';
import { LandscapeEnforcer } from './LandscapeEnforcer';
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
  onSelect: (missionId: string, key: 'a' | 'b', hollandCode: HollandCode) => void;
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
  
  const progress = ((currentIndex) / totalMissions) * 100;
  const optionA = mission.options.find((o) => o.key === 'a')!;
  const optionB = mission.options.find((o) => o.key === 'b')!;

  const backgroundImage = useMemo(() => getBackgroundForMission(mission), [mission]);
  const avatarImage = getAvatarImage(avatarGender, 'idle');
  const toolAImage = getToolImage(optionA.asset);
  const toolBImage = getToolImage(optionB.asset);

  const handleUndoClick = () => {
    if (canUndo) {
      setShowUndoDialog(true);
    }
  };

  const handleUndoConfirm = () => {
    onUndo();
  };

  return (
    <LandscapeEnforcer>
      <div className="relative w-full h-screen overflow-hidden">
        {/* Background layer - full bleed with floor visible */}
        <div 
          className="absolute inset-0"
          style={{ 
            backgroundImage: `url(${backgroundImage})`,
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

        {/* Progress bar - minimal top overlay */}
        <div className="absolute top-3 left-4 right-16 z-30">
          <div className="max-w-xs">
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
          className="absolute top-3 right-3 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-lg transition-all duration-200 hover:bg-white hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <img 
            src={backArrowAsset} 
            alt="חזור" 
            className="w-6 h-6 object-contain"
          />
        </button>

        {/* Avatar - anchored bottom-right, above tray */}
        {avatarImage && (
          <div 
            className="absolute z-20"
            style={{
              right: '24px',
              bottom: '140px',
              height: 'clamp(180px, 28vh, 340px)',
              filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))',
            }}
          >
            <img 
              src={avatarImage} 
              alt="Your avatar"
              className="h-full w-auto object-contain"
            />
          </div>
        )}

        {/* Speech bubble - left of avatar, with bubble asset background */}
        <div 
          className="absolute z-15"
          style={{
            left: '16px',
            right: '180px',
            bottom: '180px',
          }}
        >
          <div 
            className="relative max-w-md"
            style={{
              backgroundImage: `url(${bubbleRightAsset})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              padding: 'clamp(16px, 4vw, 32px) clamp(20px, 5vw, 40px)',
              paddingRight: 'clamp(28px, 6vw, 48px)', // Extra padding for tail area
            }}
          >
            <p className="text-base sm:text-lg font-medium leading-relaxed text-foreground">
              {mission.task_heb}
            </p>
          </div>
        </div>

        {/* Tool tray - light semi-transparent panel at bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-25">
          <div 
            className="mx-2 mb-2 rounded-2xl px-4 py-3"
            style={{
              background: 'rgba(255, 252, 245, 0.7)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 -2px 20px rgba(0,0,0,0.08)',
            }}
          >
            {/* Tool tiles - two options side by side */}
            <div className="flex gap-4 justify-center">
              <ToolTile
                image={toolAImage}
                tooltip={optionA.tooltip_heb}
                onClick={() => onSelect(mission.mission_id, 'a', optionA.holland_code as HollandCode)}
                variant="a"
              />
              <ToolTile
                image={toolBImage}
                tooltip={optionB.tooltip_heb}
                onClick={() => onSelect(mission.mission_id, 'b', optionB.holland_code as HollandCode)}
                variant="b"
              />
            </div>
          </div>
        </div>

        {/* Undo confirmation dialog */}
        <UndoConfirmDialog
          open={showUndoDialog}
          onOpenChange={setShowUndoDialog}
          onConfirm={handleUndoConfirm}
          disabled={!canUndo}
        />
      </div>
    </LandscapeEnforcer>
  );
}

interface ToolTileProps {
  image: string | undefined;
  tooltip: string;
  onClick: () => void;
  variant: 'a' | 'b';
}

function ToolTile({ image, tooltip, onClick, variant }: ToolTileProps) {
  const accentColor = variant === 'a' ? 'bg-option-a' : 'bg-option-b';

  return (
    <div className="relative">
      {/* Info icon with popover */}
      <Popover>
        <PopoverTrigger asChild>
          <button 
            className={`absolute -top-1 -right-1 z-10 w-6 h-6 rounded-full ${accentColor} flex items-center justify-center shadow-md transition-transform hover:scale-110`}
            onClick={(e) => e.stopPropagation()}
          >
            <Info className="w-3.5 h-3.5 text-primary-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          side="top" 
          className="w-48 text-sm text-center p-3 bg-white/95 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {tooltip}
        </PopoverContent>
      </Popover>

      {/* Tool tile button with slot frame */}
      <button
        onClick={onClick}
        className="group relative overflow-hidden transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          width: 'clamp(88px, 16vh, 140px)',
          height: 'clamp(88px, 16vh, 140px)',
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
              className="w-4/5 h-4/5 object-contain"
            />
          ) : (
            <div className="w-4/5 h-4/5 flex items-center justify-center bg-muted/30 rounded-lg">
              <span className="text-2xl">{variant === 'a' ? '🔧' : '🎨'}</span>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
