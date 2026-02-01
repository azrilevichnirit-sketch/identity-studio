import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { X, Bug, Wrench } from 'lucide-react';
import type { GameState, CountsFinal, HollandCode } from '@/types/identity';

interface DebugPanelProps {
  state: GameState;
  countsFinal: CountsFinal;
  leaders: HollandCode[];
  historyLength: number;
  onToolEditModeChange?: (enabled: boolean) => void;
}

export function DebugPanel({ state, countsFinal, leaders, historyLength, onToolEditModeChange }: DebugPanelProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [toolEditMode, setToolEditMode] = useState(false);

  // Default collapsed on mobile
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

  return (
    <div className="fixed bottom-4 right-4 z-40 flex gap-2">
      {/* Tool Edit Mode button */}
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

      {/* Toggle button */}
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
          {/* Close button inside panel */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-2 right-2 p-1 rounded hover:bg-muted transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 pr-6">
            <div><strong>phase:</strong> {state.phase}</div>
            <div><strong>dimension:</strong> {state.dimension || 'null'}</div>
            <div><strong>avatarGender:</strong> {state.avatarGender || 'null'}</div>
            <div><strong>mainIndex:</strong> {state.mainIndex}</div>
            <div><strong>mission:</strong> {state.mainIndex + 1}/{12}</div>
            <div><strong>historyLength:</strong> {historyLength}</div>
            <div><strong>undoEvents:</strong> {state.undoEvents.length}</div>
            <div><strong>tieChoiceMade:</strong> {String(state.tieChoiceMade)}</div>
            <div className="col-span-2">
              <strong>countsFinal:</strong>{' '}
              {(Object.keys(countsFinal) as HollandCode[])
                .map((k) => `${k}:${countsFinal[k]}`)
                .join(' ')}
            </div>
            <div className="col-span-2">
              <strong>leaders:</strong> {leaders.join(', ') || 'none'}
            </div>
            <div className="col-span-2">
              <strong>tieMission:</strong> {state.tieMissionUsed?.mission_id || 'none'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}