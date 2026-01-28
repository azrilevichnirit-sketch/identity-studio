import { useMemo, useState } from 'react';
import type { Mission, HollandCode, AvatarGender, PickRecord } from '@/types/identity';
import { getToolImage, getBackgroundForMission, getAvatarImage } from '@/lib/assetUtils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info } from 'lucide-react';

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
  const progress = ((currentIndex) / totalMissions) * 100;
  const optionA = mission.options.find((o) => o.key === 'a')!;
  const optionB = mission.options.find((o) => o.key === 'b')!;

  const backgroundImage = useMemo(() => getBackgroundForMission(mission), [mission]);
  const avatarImage = getAvatarImage(avatarGender, 'idle');
  const toolAImage = getToolImage(optionA.asset);
  const toolBImage = getToolImage(optionB.asset);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background layer - full bleed, crop biased to show floor */}
      <div 
        className="absolute inset-0"
        style={{ 
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 80%',
          backgroundRepeat: 'no-repeat',
          filter: 'saturate(1.15) contrast(1.08)',
        }}
      />

      {/* Progress bar - minimal top overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 p-3">
        <div className="max-w-xs mx-auto">
          <div className="h-2 bg-background/40 rounded-full overflow-hidden backdrop-blur-sm shadow-inner">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content layer */}
      <div className="relative z-10 min-h-screen flex flex-col justify-end pb-4 px-3">
        
        {/* Avatar + Speech Bubble area */}
        <div className="flex items-end gap-2 mb-4">
          {/* Avatar - bottom-left anchored, scaled up */}
          {avatarImage && (
            <div className="flex-shrink-0 relative">
              <img 
                src={avatarImage} 
                alt="Your avatar"
                className="h-40 sm:h-52 w-auto object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)]"
              />
            </div>
          )}
          
          {/* Speech bubble with tail pointing to avatar */}
          <div className="relative flex-1 max-w-sm mb-8">
            {/* Bubble tail */}
            <div 
              className="absolute -left-3 bottom-4 w-0 h-0"
              style={{
                borderTop: '12px solid transparent',
                borderBottom: '12px solid transparent',
                borderRight: '16px solid hsl(var(--card))',
                filter: 'drop-shadow(-2px 0 2px rgba(0,0,0,0.1))',
              }}
            />
            {/* Bubble content */}
            <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-border/30">
              <p className="text-base sm:text-lg font-medium leading-relaxed text-foreground">
                {mission.task_heb}
              </p>
            </div>
          </div>
        </div>

        {/* Tool tray area */}
        <div className="w-full max-w-md mx-auto space-y-3">
          {/* Tool tiles - two options side by side */}
          <div className="flex gap-4 justify-center">
            {/* Option A */}
            <ToolTile
              image={toolAImage}
              tooltip={optionA.tooltip_heb}
              onClick={() => onSelect(mission.mission_id, 'a', optionA.holland_code as HollandCode)}
              variant="a"
            />

            {/* Option B */}
            <ToolTile
              image={toolBImage}
              tooltip={optionB.tooltip_heb}
              onClick={() => onSelect(mission.mission_id, 'b', optionB.holland_code as HollandCode)}
              variant="b"
            />
          </div>

          {/* Undo button */}
          <button
            className="w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 bg-muted/70 backdrop-blur-sm text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={onUndo}
            disabled={!canUndo}
          >
            ← חזור
          </button>
        </div>
      </div>
    </div>
  );
}

interface ToolTileProps {
  image: string | undefined;
  tooltip: string;
  onClick: () => void;
  variant: 'a' | 'b';
}

function ToolTile({ image, tooltip, onClick, variant }: ToolTileProps) {
  const borderColor = variant === 'a' ? 'border-option-a' : 'border-option-b';
  const hoverShadow = variant === 'a' ? 'hover:shadow-option-a/30' : 'hover:shadow-option-b/30';
  const glowColor = variant === 'a' ? 'bg-option-a' : 'bg-option-b';

  return (
    <div className="relative">
      {/* Info icon with popover */}
      <Popover>
        <PopoverTrigger asChild>
          <button 
            className={`absolute -top-1 -right-1 z-10 w-6 h-6 rounded-full ${glowColor} flex items-center justify-center shadow-md transition-transform hover:scale-110`}
            onClick={(e) => e.stopPropagation()}
          >
            <Info className="w-3.5 h-3.5 text-primary-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          side="top" 
          className="w-48 text-sm text-center p-3"
          onClick={(e) => e.stopPropagation()}
        >
          {tooltip}
        </PopoverContent>
      </Popover>

      {/* Tool tile button */}
      <button
        onClick={onClick}
        className={`w-28 h-28 sm:w-32 sm:h-32 group relative overflow-hidden rounded-2xl border-3 ${borderColor} bg-card/85 backdrop-blur-sm transition-all duration-200 hover:scale-105 ${hoverShadow} hover:shadow-xl active:scale-95`}
      >
        <div className="w-full h-full p-2 flex items-center justify-center">
          {image ? (
            <img 
              src={image} 
              alt="Tool option"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded-lg">
              <span className="text-4xl">{variant === 'a' ? '🔧' : '🎨'}</span>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}