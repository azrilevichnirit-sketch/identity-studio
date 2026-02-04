import { useState } from 'react';
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

  // Format base scores
  const baseScores = (Object.keys(countsFinal) as HollandCode[])
    .map(k => `${HOLLAND_SHORT[k]}:${countsFinal[k]}`)
    .join(' ');

  // Determine current pair from mission
  const currentPair = rank23State.currentMission?.pair_key || 'none';

  // Format candidates
  const formatCandidates = (candidates: HollandCode[]) => 
    candidates.length > 0 ? candidates.map(c => HOLLAND_SHORT[c]).join(',') : 'none';

  // Determine tie status
  const tieRank2 = rank2Candidates.length >= 2;
  const tieRank3 = rank3Candidates.length >= 2;

  // Tournament queue description
  const tournamentQueue = rank23State.candidateSet.length > 0
    ? `${rank23State.candidateSet.map(c => HOLLAND_SHORT[c]).join(' vs ')} (${rank23State.candidateSet.length} left)`
    : 'empty';

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
          className="w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 text-xs font-mono text-slate-200"
          dir="ltr"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700">
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
            <div className="mb-2 p-2 bg-red-900/50 border border-red-500 rounded text-red-200">
              ⚠️ GUARD FAILED: Cannot show results!
              <div className="text-red-300 mt-1">
                {!allRanksValid && '• Missing rank codes'}
                {allRanksValid && !allRanksDifferent && '• Duplicate rank codes'}
              </div>
            </div>
          )}

          {/* Base Scores */}
          <div className="mb-2">
            <span className="text-slate-400">baseScores:</span>
            <div className="text-green-400 pl-2">{baseScores}</div>
          </div>

          {/* Rank 1 */}
          <div className="mb-1">
            <span className="text-slate-400">rank1:</span>
            <span className="text-cyan-400 ml-1">
              candidates=[{formatCandidates(leaders)}] → winner={state.rank1Code ? HOLLAND_SHORT[state.rank1Code] : 'null'}
            </span>
          </div>

          {/* Rank 2 */}
          <div className="mb-1">
            <span className="text-slate-400">rank2:</span>
            <span className="text-cyan-400 ml-1">
              candidates=[{formatCandidates(rank2Candidates)}] → winner={state.rank2Code ? HOLLAND_SHORT[state.rank2Code] : 'null'}
              {!tieRank2 && rank2Candidates.length === 1 && ' (no tie)'}
            </span>
          </div>

          {/* Rank 3 */}
          <div className="mb-2">
            <span className="text-slate-400">rank3:</span>
            <span className="text-cyan-400 ml-1">
              candidates=[{formatCandidates(rank3Candidates)}] → winner={state.rank3Code ? HOLLAND_SHORT[state.rank3Code] : 'null'}
              {!tieRank3 && rank3Candidates.length === 1 && ' (no tie)'}
            </span>
          </div>

          {/* Tie Status */}
          <div className="grid grid-cols-2 gap-x-2 mb-2 pt-2 border-t border-slate-700">
            <div>
              <span className="text-slate-400">tieRank2:</span>
              <span className={`ml-1 ${tieRank2 ? 'text-yellow-400' : 'text-slate-500'}`}>
                {String(tieRank2)}
              </span>
            </div>
            <div>
              <span className="text-slate-400">tieRank3:</span>
              <span className={`ml-1 ${tieRank3 ? 'text-yellow-400' : 'text-slate-500'}`}>
                {String(tieRank3)}
              </span>
            </div>
          </div>

          {/* Phase Info */}
          <div className="mb-1">
            <span className="text-slate-400">startingPhase:</span>
            <span className="text-purple-400 ml-1">{startingPhase || 'null'}</span>
          </div>
          <div className="mb-2">
            <span className="text-slate-400">currentPhase:</span>
            <span className="text-purple-400 ml-1">{currentPhase}</span>
          </div>

          {/* Current Comparison */}
          <div className="pt-2 border-t border-slate-700">
            <div className="mb-1">
              <span className="text-slate-400">currentPair:</span>
              <span className="text-orange-400 ml-1">{currentPair}</span>
            </div>
            <div className="mb-1">
              <span className="text-slate-400">winner:</span>
              <span className="text-green-400 ml-1">
                {lastComparison ? HOLLAND_SHORT[lastComparison.winner] : 'pending'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">tournamentState:</span>
              <span className="text-blue-400 ml-1">{tournamentQueue}</span>
            </div>
          </div>

          {/* Trace */}
          {rank23State.tieTrace.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-700">
              <span className="text-slate-400">tieTrace:</span>
              <div className="pl-2 text-xs text-slate-300">
                {rank23State.tieTrace.map((t, i) => (
                  <div key={i}>
                    {i + 1}. {t.pairCodes}: {HOLLAND_SHORT[t.winner]} &gt; {HOLLAND_SHORT[t.loser]}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final Rankings */}
          <div className="mt-2 pt-2 border-t border-slate-700">
            <span className="text-slate-400">Final Rankings:</span>
            <div className="flex gap-2 mt-1">
              <span className={`px-2 py-1 rounded ${state.rank1Code ? 'bg-amber-600' : 'bg-slate-700'}`}>
                1: {state.rank1Code ? HOLLAND_SHORT[state.rank1Code] : '?'}
              </span>
              <span className={`px-2 py-1 rounded ${state.rank2Code ? 'bg-slate-500' : 'bg-slate-700'}`}>
                2: {state.rank2Code ? HOLLAND_SHORT[state.rank2Code] : '?'}
              </span>
              <span className={`px-2 py-1 rounded ${state.rank3Code ? 'bg-amber-800' : 'bg-slate-700'}`}>
                3: {state.rank3Code ? HOLLAND_SHORT[state.rank3Code] : '?'}
              </span>
            </div>
          </div>

          {/* Validity Check */}
          <div className="mt-2 pt-2 border-t border-slate-700">
            <span className={`font-bold ${canShowResults ? 'text-green-400' : 'text-red-400'}`}>
              {canShowResults ? '✓ Ready for results' : '✗ Not ready - continue tie-break'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
