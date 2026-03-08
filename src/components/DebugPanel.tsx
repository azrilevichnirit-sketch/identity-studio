import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { X, Bug, Wrench } from 'lucide-react';
import type { GameState, CountsFinal, HollandCode, Mission } from '@/types/identity';

interface DebugPanelProps {
  state: GameState;
  countsFinal: CountsFinal;
  leaders: HollandCode[];
  historyLength: number;
  currentMission?: Mission | null;
  onToolEditModeChange?: (enabled: boolean) => void;
  onJumpToMission?: (missionIndex: number) => void;
  onJumpToTieMission?: (tieIndex: number) => void;
  totalMissions?: number;
  totalTieMissions?: number;
}

export function DebugPanel({ state, countsFinal, leaders, historyLength, currentMission, onToolEditModeChange, onJumpToMission, onJumpToTieMission, totalMissions = 12, totalTieMissions = 15 }: DebugPanelProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [toolEditMode, setToolEditMode] = useState(false);

  useEffect(() => {
    if (isMobile !== undefined) {
      setIsOpen(!isMobile);
    }
  }, [isMobile]);

  const toggleToolEditMode = () => {
    const newValue = !toolEditMode;
    setToolEditMode(newValue);
    onToolEditModeChange?.(newValue);
  };

  const optionA = currentMission?.options.find(o => o.key === 'a');
  const optionB = currentMission?.options.find(o => o.key === 'b');

  return (
    <div className="fixed bottom-4 right-4 z-40 flex gap-2">
      <button
        onClick={toggleToolEditMode}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors shadow-lg ${
          toolEditMode 
            ? 'bg-yellow-500 border-yellow-600 text-black hover:bg-yellow-400' 
            : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent'
        }`}
      >
        <Wrench className="w-3.5 h-3.5" />
        <span>{toolEditMode ? '🔧 כלים' : 'Tool Edit'}</span>
      </button>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shadow-lg"
      >
        {isOpen ? (
          <>
            <X className="w-3.5 h-3.5" />
            <span>סגור</span>
          </>
        ) : (
          <>
            <Bug className="w-3.5 h-3.5" />
            <span>Debug</span>
          </>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute bottom-10 right-0 w-72 bg-card border border-border rounded-lg shadow-xl p-3 text-xs" dir="ltr">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-2 right-2 p-1 rounded hover:bg-muted transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          
          {/* Mission Jump Buttons */}
          {onJumpToMission && (
            <div className="mb-3 pb-2 border-b border-border">
              <div className="text-muted-foreground mb-1.5 font-medium">קפיצה למשימה:</div>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: totalMissions }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => onJumpToMission(i)}
                    className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                      state.mainIndex === i && state.phase === 'main'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-accent text-foreground'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tie-Breaker Mission Jump Buttons */}
          {onJumpToTieMission && (
            <div className="mb-3 pb-2 border-b border-border">
              <div className="text-muted-foreground mb-1.5 font-medium">קפיצה לשובר שוויון:</div>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: totalTieMissions }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => onJumpToTieMission(i)}
                    className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                      state.phase === 'tie' && state.tieMissionUsed?.mission_id === `studio_tie_${String(i + 1).padStart(2, '0')}`
                        ? 'bg-orange-500 text-white'
                        : 'bg-muted hover:bg-accent text-foreground'
                    }`}
                  >
                    T{i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Current Mission Tools */}
          {currentMission && (
            <div className="mb-3 pb-2 border-b border-border">
              <div className="text-muted-foreground mb-1.5 font-medium">
                משימה {currentMission.sequence} — כלים:
              </div>
              <div className="grid grid-cols-2 gap-2">
                {optionA && (
                  <div className="bg-muted rounded px-2 py-1.5">
                    <div className="font-bold text-foreground">A: {optionA.tooltip_heb}</div>
                    <div className="text-muted-foreground">קוד: <span className="font-mono font-bold text-foreground">{optionA.holland_code.toUpperCase()}</span></div>
                  </div>
                )}
                {optionB && (
                  <div className="bg-muted rounded px-2 py-1.5">
                    <div className="font-bold text-foreground">B: {optionB.tooltip_heb}</div>
                    <div className="text-muted-foreground">קוד: <span className="font-mono font-bold text-foreground">{optionB.holland_code.toUpperCase()}</span></div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 pr-6">
            <div><strong>phase:</strong> {state.phase}</div>
            <div><strong>mainIndex:</strong> {state.mainIndex}</div>
            <div><strong>mission:</strong> {state.mainIndex + 1}/{totalMissions}</div>
            <div><strong>history:</strong> {historyLength}</div>
            <div className="col-span-2">
              <strong>counts:</strong>{' '}
              {(Object.keys(countsFinal) as HollandCode[])
                .map((k) => `${k}:${countsFinal[k]}`)
                .join(' ')}
            </div>
            <div className="col-span-2">
              <strong>leaders:</strong> {leaders.join(', ') || 'none'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
