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
          filter: 'saturate(1.2) contrast(1.1) brightness(1.05)',
        }}
      />

      {/* Progress bar - minimal top overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 p-3">
        <div className="max-w-xs mx-auto">
          <div className="h-2 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm shadow-inner">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Avatar - anchored bottom-right, never overlaps tray */}
      {avatarImage && (
        <div 
          className="absolute z-10 drop-shadow-[0_10px_20px_rgba(0,0,0,0.35)]"
          style={{
            right: '24px',
            bottom: '96px',
          }}
        >
          <img 
            src={avatarImage} 
            alt="Your avatar"
            className="h-64 sm:h-80 w-auto object-contain"
          />
        </div>
      )}

      {/* Speech bubble - positioned above tray, tail points toward avatar (right side) */}
      <div 
        className="absolute z-15"
        style={{
          left: '16px',
          right: '140px',
          bottom: '180px',
        }}
      >
        <div className="relative max-w-xs">
          {/* Bubble content */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/50">
            <p className="text-base sm:text-lg font-medium leading-relaxed text-foreground">
              {mission.task_heb}
            </p>
          </div>
          {/* Bubble tail - pointing right toward avatar */}
          <div 
            className="absolute -right-3 bottom-4 w-0 h-0"
            style={{
              borderTop: '10px solid transparent',
              borderBottom: '10px solid transparent',
              borderLeft: '14px solid rgba(255,255,255,0.9)',
            }}
          />
        </div>
      </div>

      {/* Tool tray - light semi-transparent panel at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div 
          className="mx-2 mb-2 rounded-2xl px-4 py-3"
          style={{
            background: 'rgba(255, 252, 245, 0.7)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 -2px 20px rgba(0,0,0,0.08)',
          }}
        >
          {/* Tool tiles - two options side by side */}
          <div className="flex gap-4 justify-center mb-2">
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

          {/* Undo button */}
          <button
            className="w-full py-2 px-4 rounded-xl text-sm font-medium transition-all duration-200 bg-white/60 text-muted-foreground hover:bg-white/80 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
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
  const accentColor = variant === 'a' ? 'bg-option-a' : 'bg-option-b';
  const borderAccent = variant === 'a' ? 'border-option-a/40' : 'border-option-b/40';

  return (
    <div className="relative">
      {/* Info icon with popover */}
      <Popover>
        <PopoverTrigger asChild>
          <button 
            className={`absolute -top-1 -right-1 z-10 w-6 h-6 rounded-full ${accentColor} flex items-center justify-center shadow-sm transition-transform hover:scale-110`}
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

      {/* Tool tile button - light background with subtle shadow */}
      <button
        onClick={onClick}
        className={`w-24 h-24 sm:w-28 sm:h-28 group relative overflow-hidden rounded-xl border-2 ${borderAccent} transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95`}
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <div className="w-full h-full p-2 flex items-center justify-center">
          {image ? (
            <img 
              src={image} 
              alt="Tool option"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/30 rounded-lg">
              <span className="text-3xl">{variant === 'a' ? '🔧' : '🎨'}</span>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}