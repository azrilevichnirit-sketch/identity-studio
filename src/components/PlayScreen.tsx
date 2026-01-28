import type { Mission, HollandCode } from '@/types/identity';

interface PlayScreenProps {
  mission: Mission;
  currentIndex: number;
  totalMissions: number;
  isTieBreaker: boolean;
  canUndo: boolean;
  onSelect: (missionId: string, key: 'a' | 'b', hollandCode: HollandCode) => void;
  onUndo: () => void;
}

export function PlayScreen({
  mission,
  currentIndex,
  totalMissions,
  isTieBreaker,
  canUndo,
  onSelect,
  onUndo,
}: PlayScreenProps) {
  const progress = ((currentIndex) / totalMissions) * 100;
  const optionA = mission.options.find((o) => o.key === 'a')!;
  const optionB = mission.options.find((o) => o.key === 'b')!;

  return (
    <div className="screen-container">
      <div className="w-full max-w-sm">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>{isTieBreaker ? 'שובר שוויון' : `משימה ${currentIndex + 1} מתוך ${totalMissions}`}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Mission card */}
        <div className="card-surface mb-6">
          {isTieBreaker && (
            <div className="text-xs text-warning font-medium mb-3 text-center">
              🔄 שובר שוויון
            </div>
          )}
          <p className="text-lg font-medium leading-relaxed text-center">
            {mission.task_heb}
          </p>
        </div>

        {/* Options */}
        <div className="flex gap-3 mb-4">
          <button
            className="option-btn-a"
            onClick={() => onSelect(mission.mission_id, 'a', optionA.holland_code as HollandCode)}
          >
            <div className="text-xs opacity-60 mb-1">א</div>
            <div className="text-sm">{optionA.tooltip_heb}</div>
          </button>
          
          <button
            className="option-btn-b"
            onClick={() => onSelect(mission.mission_id, 'b', optionB.holland_code as HollandCode)}
          >
            <div className="text-xs opacity-60 mb-1">ב</div>
            <div className="text-sm">{optionB.tooltip_heb}</div>
          </button>
        </div>

        {/* Undo button */}
        <button
          className="undo-btn w-full"
          onClick={onUndo}
          disabled={!canUndo}
        >
          ביטול ← חזור למשימה הקודמת
        </button>
      </div>
    </div>
  );
}
