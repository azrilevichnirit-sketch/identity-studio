import { useState, useMemo } from 'react';
import { X, Bug } from 'lucide-react';
import type { GameState, CountsFinal, HollandCode } from '@/types/identity';
import type { Rank23State, TournamentComparison } from '@/hooks/useRank23Tournament';

interface TieBreakDebugPanelProps {
  state: GameState;
  countsFinal: CountsFinal;
  leaders: HollandCode[];
  rank23State: Rank23State;
  startingPhase: 'rank2' | 'rank3' | null;
  currentPhase: string;
  rank2Candidates: HollandCode[];
  rank3Candidates: HollandCode[];
  lastComparison?: TournamentComparison;
}

const HOLLAND_SHORT: Record<HollandCode, string> = {
  r: 'R',
  i: 'I',
  a: 'A',
  s: 'S',
  e: 'E',
  c: 'C',
};

export function TieBreakDebugPanel({
  state,
  countsFinal,
  leaders,
  rank23State,
  startingPhase,
  currentPhase,
  rank2Candidates,
  rank3Candidates,
  lastComparison,
}: TieBreakDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Hard guard: check if all ranks are valid and different
  const allRanksValid = !!(state.rank1Code && state.rank2Code && state.rank3Code);
  const allRanksDifferent = allRanksValid && 
    state.rank1Code !== state.rank2Code &&
    state.rank1Code !== state.rank3Code &&
    state.rank2Code !== state.rank3Code;
  const canShowResults = allRanksValid && allRanksDifferent;

  // Calculate resolved scores (base + bonus from tie-breaker)
  const resolvedScores = useMemo(() => {
    const resolved: CountsFinal = { ...countsFinal };
    
    // Add bonus based on final rankings
    // Rank 1 gets +0.3, Rank 2 gets +0.2, Rank 3 gets +0.1
    if (state.rank1Code) resolved[state.rank1Code] += 0.3;
    if (state.rank2Code) resolved[state.rank2Code] += 0.2;
    if (state.rank3Code) resolved[state.rank3Code] += 0.1;
    
    return resolved;
  }, [countsFinal, state.rank1Code, state.rank2Code, state.rank3Code]);

  // Format candidates
  const formatCandidates = (candidates: HollandCode[]) => 
    candidates.length > 0 ? candidates.map(c => HOLLAND_SHORT[c]).join(', ') : '—';

  // Determine tie status
  const tieRank1 = leaders.length >= 2;
  const tieRank2 = rank2Candidates.length >= 2;
  const tieRank3 = rank3Candidates.length >= 2;

  return (
    <div className="fixed top-4 left-4 z-50 flex flex-col gap-2">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-lg ${
          !canShowResults && currentPhase === 'summary'
            ? 'bg-red-500 border-red-600 text-white animate-pulse'
            : 'bg-amber-100 border border-amber-300 text-amber-900 hover:bg-amber-200'
        }`}
      >
        <Bug className="w-3.5 h-3.5" />
        <span>Tie Debug</span>
      </button>

      {isOpen && (
        <div 
          className="w-96 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 text-xs font-mono text-slate-200"
          dir="ltr"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700">
            <span className="font-bold text-amber-400">Tie-Break Debug</span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded hover:bg-slate-700 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Hard Guard Warning */}
          {!canShowResults && currentPhase === 'summary' && (
            <div className="mb-3 p-2 bg-red-900/50 border border-red-500 rounded text-red-200">
              ⚠️ GUARD FAILED: Cannot show results!
              <div className="text-red-300 mt-1">
                {!allRanksValid && '• Missing rank codes'}
                {allRanksValid && !allRanksDifferent && '• Duplicate rank codes'}
              </div>
            </div>
          )}

          {/* BASE SCORES */}
          <div className="mb-3 p-2 bg-slate-800 rounded">
            <div className="text-slate-400 mb-1">[BASE SCORES] <span className="text-slate-500">(0–4, לא משתנה)</span></div>
            <div className="text-green-400 flex flex-wrap gap-x-3">
              {(Object.keys(countsFinal) as HollandCode[]).map(code => (
                <span key={code}>{HOLLAND_SHORT[code]}={countsFinal[code]}</span>
              ))}
            </div>
          </div>

          {/* TIES */}
          <div className="mb-3 p-2 bg-slate-800 rounded">
            <div className="text-slate-400 mb-1">[TIES]</div>
            <div className="space-y-0.5">
              <div>
                <span className="text-slate-500">Rank1 candidates: </span>
                <span className={tieRank1 ? 'text-yellow-400' : 'text-cyan-400'}>
                  {formatCandidates(leaders)} {tieRank1 && `(${leaders.length})`}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Rank2 candidates: </span>
                <span className={tieRank2 ? 'text-yellow-400' : 'text-cyan-400'}>
                  {formatCandidates(rank2Candidates)} {tieRank2 && `(${rank2Candidates.length})`}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Rank3 candidates: </span>
                <span className={tieRank3 ? 'text-yellow-400' : 'text-cyan-400'}>
                  {formatCandidates(rank3Candidates)} {tieRank3 && `(${rank3Candidates.length})`}
                </span>
              </div>
            </div>
          </div>

          {/* FINAL RANKING */}
          <div className="mb-3 p-2 bg-slate-800 rounded">
            <div className="text-slate-400 mb-1">[FINAL RANKING] <span className="text-slate-500">(אחרי שובר שיוויון)</span></div>
            <div className="flex gap-4">
              <span className={`px-2 py-1 rounded ${state.rank1Code ? 'bg-amber-500 text-black font-bold' : 'bg-slate-700 text-slate-400'}`}>
                #1={state.rank1Code ? HOLLAND_SHORT[state.rank1Code] : '?'}
              </span>
              <span className={`px-2 py-1 rounded ${state.rank2Code ? 'bg-slate-400 text-black font-bold' : 'bg-slate-700 text-slate-400'}`}>
                #2={state.rank2Code ? HOLLAND_SHORT[state.rank2Code] : '?'}
              </span>
              <span className={`px-2 py-1 rounded ${state.rank3Code ? 'bg-amber-700 text-white font-bold' : 'bg-slate-700 text-slate-400'}`}>
                #3={state.rank3Code ? HOLLAND_SHORT[state.rank3Code] : '?'}
              </span>
            </div>
          </div>

          {/* RESOLVED SCORES */}
          <div className="mb-3 p-2 bg-slate-800 rounded">
            <div className="text-slate-400 mb-1">[RESOLVED SCORES] <span className="text-slate-500">(פנימי: base + bonus)</span></div>
            <div className="text-purple-400 flex flex-wrap gap-x-3">
              {(Object.keys(resolvedScores) as HollandCode[]).map(code => (
                <span key={code}>
                  {HOLLAND_SHORT[code]}={resolvedScores[code].toFixed(1)}
                </span>
              ))}
            </div>
          </div>

          {/* TIE TRACE */}
          {rank23State.tieTrace.length > 0 && (
            <div className="mb-3 p-2 bg-slate-800 rounded">
              <div className="text-slate-400 mb-1">[TIE TRACE]</div>
              <div className="text-orange-400 space-y-0.5">
                {rank23State.tieTrace.map((t, i) => (
                  <div key={i}>
                    {i + 1}. {t.pairCodes}: {HOLLAND_SHORT[t.winner]} &gt; {HOLLAND_SHORT[t.loser]}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUMMARY LINE */}
          <div className="pt-2 border-t border-slate-700">
            <div className="text-slate-300 mb-1">
              <span className="text-slate-500">Top 3: </span>
              <span className="text-cyan-400">
                {state.rank1Code ? HOLLAND_SHORT[state.rank1Code] : '?'} &gt; {state.rank2Code ? HOLLAND_SHORT[state.rank2Code] : '?'} &gt; {state.rank3Code ? HOLLAND_SHORT[state.rank3Code] : '?'}
              </span>
            </div>
            <div className="text-slate-300 mb-1">
              <span className="text-slate-500">Base: </span>
              <span className="text-green-400">
                {state.rank1Code && `${HOLLAND_SHORT[state.rank1Code]}=${countsFinal[state.rank1Code]}`}
                {state.rank2Code && `, ${HOLLAND_SHORT[state.rank2Code]}=${countsFinal[state.rank2Code]}`}
                {state.rank3Code && `, ${HOLLAND_SHORT[state.rank3Code]}=${countsFinal[state.rank3Code]}`}
              </span>
            </div>
            <div className="text-slate-300 mb-2">
              <span className="text-slate-500">Resolved: </span>
              <span className="text-purple-400">
                {state.rank1Code && `${HOLLAND_SHORT[state.rank1Code]}=${resolvedScores[state.rank1Code].toFixed(1)}`}
                {state.rank2Code && `, ${HOLLAND_SHORT[state.rank2Code]}=${resolvedScores[state.rank2Code].toFixed(1)}`}
                {state.rank3Code && `, ${HOLLAND_SHORT[state.rank3Code]}=${resolvedScores[state.rank3Code].toFixed(1)}`}
              </span>
            </div>
            <div className="text-slate-300">
              <span className="text-slate-500">Ties: </span>
              <span>R1={tieRank1 ? 'yes' : 'no'} ({leaders.length}) | R2={tieRank2 ? 'yes' : 'no'} ({rank2Candidates.length}) | R3={tieRank3 ? 'yes' : 'no'} ({rank3Candidates.length})</span>
            </div>
          </div>

          {/* Validity Check */}
          <div className="mt-2 pt-2 border-t border-slate-700">
            <span className={`font-bold ${canShowResults ? 'text-green-400' : 'text-red-400'}`}>
              {canShowResults ? '✓ Ready for results' : '✗ Not ready - continue tie-break'}
            </span>
          </div>

          {/* Phase Info (collapsible detail) */}
          <details className="mt-2 pt-2 border-t border-slate-700">
            <summary className="text-slate-500 cursor-pointer hover:text-slate-300">Phase details...</summary>
            <div className="mt-2 space-y-1 text-slate-400">
              <div>startingPhase: <span className="text-purple-400">{startingPhase || 'null'}</span></div>
              <div>currentPhase: <span className="text-purple-400">{currentPhase}</span></div>
              <div>currentPair: <span className="text-orange-400">{rank23State.currentMission?.pair_key || 'none'}</span></div>
              <div>lastWinner: <span className="text-green-400">{lastComparison ? HOLLAND_SHORT[lastComparison.winner] : 'pending'}</span></div>
              <div>queue: <span className="text-blue-400">
                {rank23State.candidateSet.length > 0
                  ? `${rank23State.candidateSet.map(c => HOLLAND_SHORT[c]).join(' vs ')} (${rank23State.candidateSet.length})`
                  : 'empty'}
              </span></div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
