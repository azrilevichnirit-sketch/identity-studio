import { useState } from 'react';
import type { GameState, CountsFinal, HollandCode } from '@/types/identity';

interface DebugPanelProps {
  state: GameState;
  countsFinal: CountsFinal;
  leaders: HollandCode[];
  historyLength: number;
}

export function DebugPanel({ state, countsFinal, leaders, historyLength }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-2 bg-card border-t border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {isOpen ? '▼ סגור דיבאג' : '▲ פתח דיבאג'}
      </button>
      
      {isOpen && (
        <div className="debug-panel" dir="ltr">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 max-w-md">
            <div><strong>phase:</strong> {state.phase}</div>
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
