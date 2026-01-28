import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import type { GameState, CountsFinal, HollandCode } from '@/types/identity';

interface DebugPanelProps {
  state: GameState;
  countsFinal: CountsFinal;
  leaders: HollandCode[];
  historyLength: number;
}

export function DebugPanel({ state, countsFinal, leaders, historyLength }: DebugPanelProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  // Default collapsed on mobile
  useEffect(() => {
    if (isMobile !== undefined) {
      setIsOpen(!isMobile);
    }
  }, [isMobile]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shadow-lg"
      >
        {isOpen ? '✕ Close' : '🐛 Debug'}
      </button>
      
      {isOpen && (
        <div className="absolute bottom-10 right-0 w-72 bg-card border border-border rounded-lg shadow-xl p-3 text-xs" dir="ltr">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <div><strong>phase:</strong> {state.phase}</div>
            <div><strong>dimension:</strong> {state.dimension || 'null'}</div>
            <div><strong>avatarGender:</strong> {state.avatarGender || 'null'}</div>
            <div><strong>mainIndex:</strong> {state.mainIndex}</div>
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
