import { useMemo } from 'react';
import type { Mission, HollandCode, AvatarGender, PickRecord } from '@/types/identity';
import { getToolImage, getBackgroundForMission, getAvatarImage } from '@/lib/assetUtils';

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

  // Get recent placed props (last 4 for display)
  const recentProps = useMemo(() => {
    return placedProps.slice(-4).map(pick => ({
      ...pick,
      image: getToolImage(
        mission.world === 'studio' 
          ? `studio_${pick.missionId.replace('studio_', '')}_${pick.key}`
          : pick.missionId
      ),
    }));
  }, [placedProps, mission.world]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background layer */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-background/40" />

      {/* Content layer */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top bar with progress */}
        <div className="p-4 bg-gradient-to-b from-background/80 to-transparent">
          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-xs text-foreground/80 mb-2">
              <span>{isTieBreaker ? '🔄 שובר שוויון' : `משימה ${currentIndex + 1} מתוך ${totalMissions}`}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col items-center justify-between px-4 pb-4">
          {/* Task card */}
          <div className="w-full max-w-md mt-4">
            <div className="bg-card/90 backdrop-blur-md rounded-2xl p-5 shadow-2xl border border-border/50">
              <p className="text-lg font-medium leading-relaxed text-center text-foreground">
                {mission.task_heb}
              </p>
            </div>
          </div>

          {/* Props display area */}
          {recentProps.length > 0 && (
            <div className="flex justify-center gap-2 my-4">
              {recentProps.map((prop, idx) => (
                <div 
                  key={`${prop.missionId}-${idx}`}
                  className="w-14 h-14 rounded-lg overflow-hidden bg-card/60 backdrop-blur-sm border border-border/30 shadow-lg"
                >
                  {prop.image && (
                    <img 
                      src={prop.image} 
                      alt="Collected tool"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Avatar */}
          {avatarImage && (
            <div className="flex-shrink-0 mb-2">
              <img 
                src={avatarImage} 
                alt="Your avatar"
                className="h-48 w-auto object-contain drop-shadow-2xl"
              />
            </div>
          )}

          {/* Tool choice cards */}
          <div className="w-full max-w-md space-y-3">
            <div className="flex gap-3">
              {/* Option A */}
              <button
                onClick={() => onSelect(mission.mission_id, 'a', optionA.holland_code as HollandCode)}
                className="flex-1 group relative overflow-hidden rounded-2xl border-2 border-option-a bg-card/80 backdrop-blur-md transition-all duration-200 hover:scale-[1.02] hover:border-option-a-hover hover:shadow-lg hover:shadow-option-a/20 active:scale-[0.98]"
              >
                <div className="aspect-square p-3">
                  {toolAImage ? (
                    <img 
                      src={toolAImage} 
                      alt={optionA.tooltip_heb}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded-lg">
                      <span className="text-4xl">🔧</span>
                    </div>
                  )}
                </div>
                <div className="px-3 pb-3 text-center">
                  <span className="text-xs font-medium text-option-a">א</span>
                  <p className="text-sm text-foreground/90 mt-1">{optionA.tooltip_heb}</p>
                </div>
              </button>

              {/* Option B */}
              <button
                onClick={() => onSelect(mission.mission_id, 'b', optionB.holland_code as HollandCode)}
                className="flex-1 group relative overflow-hidden rounded-2xl border-2 border-option-b bg-card/80 backdrop-blur-md transition-all duration-200 hover:scale-[1.02] hover:border-option-b-hover hover:shadow-lg hover:shadow-option-b/20 active:scale-[0.98]"
              >
                <div className="aspect-square p-3">
                  {toolBImage ? (
                    <img 
                      src={toolBImage} 
                      alt={optionB.tooltip_heb}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded-lg">
                      <span className="text-4xl">🎨</span>
                    </div>
                  )}
                </div>
                <div className="px-3 pb-3 text-center">
                  <span className="text-xs font-medium text-option-b">ב</span>
                  <p className="text-sm text-foreground/90 mt-1">{optionB.tooltip_heb}</p>
                </div>
              </button>
            </div>

            {/* Undo button */}
            <button
              className="w-full py-3 px-6 rounded-xl text-sm font-medium transition-all duration-200 bg-muted/80 backdrop-blur-sm text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={onUndo}
              disabled={!canUndo}
            >
              ← חזור למשימה הקודמת
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
