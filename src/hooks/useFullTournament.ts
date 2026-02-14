// Full Tournament Resolution Hook
// Implements winner-stays tournament for resolving Rank 1, 2, and 3
// Supports 2+ candidates at any rank level
import { useState, useCallback, useMemo, useRef } from 'react';
import type { HollandCode, CountsFinal, Mission, MissionOption } from '@/types/identity';
import studioTieV6Data from '@/data/studio_tie_v6.json';

export interface TieMissionV6 {
  world: string;
  phase: string;
  pair_codes: string;
  pair_sequence: number;
  quest_id: string;
  task_heb: string;
  option_a_code: HollandCode;
  option_a_asset: string;
  option_a_tooltip_heb: string;
  option_b_code: HollandCode;
  option_b_asset: string;
  option_b_tooltip_heb: string;
  bg_override?: string;
  next_bg_override_a?: string;
  next_bg_override_b?: string;
}

export interface TournamentComparison {
  rank: 1 | 2 | 3;
  pairCodes: string;
  winner: HollandCode;
  loser: HollandCode;
  missionId: string;
  timestamp: number;
}

export interface FullTournamentState {
  phase: 'idle' | 'rank1' | 'rank2' | 'rank3' | 'complete' | 'error';
  rank1Code: HollandCode | null;
  rank2Code: HollandCode | null;
  rank3Code: HollandCode | null;
  candidateSet: HollandCode[];
  currentMission: Mission | null;
  tieTrace: TournamentComparison[];
  errorType?: 'missing_pair_missions';
  errorDetails?: string;
  // Track codes eliminated by Step 2.5 (for Rank 3 assignment)
  eliminatedByStep25?: HollandCode[];
}

// Default deterministic order for fallback: r > i > a > s > e > c
const DEFAULT_ORDER: HollandCode[] = ['r', 'i', 'a', 's', 'e', 'c'];

// Hex circle order for distance calculation (clockwise: R-I-A-S-E-C)
const HEX_ORDER: HollandCode[] = ['r', 'i', 'a', 's', 'e', 'c'];

// Opposite pairs on the hexagon (distance 3)
const OPPOSITE_PAIRS: [HollandCode, HollandCode][] = [
  ['r', 's'],
  ['i', 'e'],
  ['a', 'c'],
];

// Adjacent pairs on the Holland hexagon for Step 2.5 resolution
const ADJACENT_PAIRS: Record<HollandCode, [HollandCode, HollandCode]> = {
  r: ['i', 'c'],
  i: ['r', 'a'],
  a: ['i', 's'],
  s: ['a', 'e'],
  e: ['s', 'c'],
  c: ['e', 'r'],
};

/**
 * Step 2.5: Try to narrow candidates using adjacent Holland code sums.
 * CRITICAL: Only runs for 3+ candidates. For exactly 2, always returns them
 * unchanged so a tie-breaker mission is shown.
 */
function tryResolveByAdjacentSum(
  candidates: HollandCode[],
  countsFinal: CountsFinal
): { winner: HollandCode } | { narrowedCandidates: HollandCode[] } {
  if (candidates.length < 2) {
    return { winner: candidates[0] };
  }

  // GUARD: Never decide between exactly 2 — always force a mission
  if (candidates.length === 2) {
    console.log('[Tournament] Step 2.5 skipped: exactly 2 candidates, forcing mission');
    return { narrowedCandidates: candidates };
  }

  // 3+ candidates: calculate adjacent sums, then always narrow to top 2
  const adjacentSums = candidates.map(code => {
    const [adj1, adj2] = ADJACENT_PAIRS[code];
    const sum = countsFinal[adj1] + countsFinal[adj2];
    return { code, sum };
  });

  console.log('[Tournament] Step 2.5 - Adjacent sums:', adjacentSums);

  // Sort by sum descending, then default order (R>I>A>S>E>C) as tiebreaker
  adjacentSums.sort((a, b) => {
    if (b.sum !== a.sum) return b.sum - a.sum;
    return DEFAULT_ORDER.indexOf(a.code) - DEFAULT_ORDER.indexOf(b.code);
  });

  // Always return top 2 — never resolve to a single winner
  const narrowed = [adjacentSums[0].code, adjacentSums[1].code];
  console.log(`[Tournament] Step 2.5 narrowed to: ${narrowed.join(',')} (from ${candidates.length} candidates)`);
  return { narrowedCandidates: narrowed };
}

/**
 * Resolve Rank 3 mathematically (no mission ever).
 * Uses adjacent sum, then default order R>I>A>S>E>C as fallback.
 */
function resolveRank3ByAdjacentSum(
  candidates: HollandCode[],
  countsFinal: CountsFinal
): HollandCode {
  if (candidates.length === 1) return candidates[0];

  const adjacentSums = candidates.map(code => {
    const [adj1, adj2] = ADJACENT_PAIRS[code];
    const sum = countsFinal[adj1] + countsFinal[adj2];
    return { code, sum };
  });

  console.log('[Tournament] Rank 3 adjacent sums:', adjacentSums);

  const maxSum = Math.max(...adjacentSums.map(x => x.sum));
  const winners = adjacentSums.filter(x => x.sum === maxSum);

  if (winners.length === 1) {
    console.log(`[Tournament] Rank 3 resolved by adjacent sum: ${winners[0].code}`);
    return winners[0].code;
  }

  // Still tied — use default order R>I>A>S>E>C
  const byDefault = winners.sort(
    (a, b) => DEFAULT_ORDER.indexOf(a.code) - DEFAULT_ORDER.indexOf(b.code)
  );
  console.log(`[Tournament] Rank 3 resolved by default order: ${byDefault[0].code}`);
  return byDefault[0].code;
}

// Get the tie-breaker missions from v6 JSON
const tieMissionsV6 = studioTieV6Data as TieMissionV6[];

function getCircularDistance(a: HollandCode, b: HollandCode): number {
  const idxA = HEX_ORDER.indexOf(a);
  const idxB = HEX_ORDER.indexOf(b);
  const rawDist = Math.abs(idxA - idxB);
  return Math.min(rawDist, 6 - rawDist);
}

function normalizePairCodes(a: HollandCode, b: HollandCode): string {
  const sorted = [a.toLowerCase(), b.toLowerCase()].sort();
  return sorted.join('');
}

function getAllPairsByPriority(candidates: HollandCode[]): [HollandCode, HollandCode][] {
  if (candidates.length < 2) return [];

  const pairs: { pair: [HollandCode, HollandCode]; distance: number; isOpposite: boolean; priority: number }[] = [];

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i];
      const b = candidates[j];
      const distance = getCircularDistance(a, b);
      const isOpposite = OPPOSITE_PAIRS.some(
        ([x, y]) => (x === a && y === b) || (x === b && y === a)
      );
      const priority = isOpposite ? 1000 + distance : distance;
      pairs.push({ pair: [a, b], distance, isOpposite, priority });
    }
  }

  pairs.sort((x, y) => {
    if (y.priority !== x.priority) return y.priority - x.priority;
    const xMin = Math.min(DEFAULT_ORDER.indexOf(x.pair[0]), DEFAULT_ORDER.indexOf(x.pair[1]));
    const yMin = Math.min(DEFAULT_ORDER.indexOf(y.pair[0]), DEFAULT_ORDER.indexOf(y.pair[1]));
    return xMin - yMin;
  });

  return pairs.map(p => p.pair);
}

function findMissionByPairCodes(pairCodes: string): TieMissionV6 | null {
  return tieMissionsV6.find(m => m.pair_codes === pairCodes) || null;
}

function findAvailableMission(candidates: HollandCode[]): { mission: TieMissionV6; pairCodes: string } | null {
  const prioritizedPairs = getAllPairsByPriority(candidates);

  for (const pair of prioritizedPairs) {
    const pairCodes = normalizePairCodes(pair[0], pair[1]);
    const mission = findMissionByPairCodes(pairCodes);
    if (mission) {
      console.log(`[Tournament] Found mission for pair ${pairCodes}:`, mission.quest_id);
      return { mission, pairCodes };
    }
  }

  return null;
}

function convertToMission(tieMission: TieMissionV6): Mission {
  const optionA: MissionOption = {
    key: 'a',
    holland_code: tieMission.option_a_code,
    asset: tieMission.option_a_asset,
    tooltip_heb: tieMission.option_a_tooltip_heb,
    view: 'in',
    next_bg_override: tieMission.next_bg_override_a,
    placement_mode: 'floor',
    anchor_ref: 'floor',
    offset_x: 0,
    offset_y: 0,
    scale: 1,
    persist: 'temp',
  };

  const optionB: MissionOption = {
    key: 'b',
    holland_code: tieMission.option_b_code,
    asset: tieMission.option_b_asset,
    tooltip_heb: tieMission.option_b_tooltip_heb,
    view: 'in',
    next_bg_override: tieMission.next_bg_override_b,
    placement_mode: 'floor',
    anchor_ref: 'floor',
    offset_x: 0,
    offset_y: 0,
    scale: 1,
    persist: 'temp',
  };

  return {
    world: tieMission.world,
    phase: 'tb',
    mission_id: tieMission.quest_id,
    sequence: 100 + tieMission.pair_sequence,
    view: 'in',
    bg_override: tieMission.bg_override,
    task_heb: tieMission.task_heb,
    pair_key: tieMission.pair_codes,
    options: [optionA, optionB],
  };
}

function findCandidates(
  countsFinal: CountsFinal,
  excludeCodes: HollandCode[]
): HollandCode[] {
  const remaining = DEFAULT_ORDER.filter(code => !excludeCodes.includes(code));
  if (remaining.length === 0) return [];

  const maxScore = Math.max(...remaining.map(code => countsFinal[code]));
  return remaining.filter(code => countsFinal[code] === maxScore);
}

export function useFullTournament(countsFinal: CountsFinal) {
  const [state, setState] = useState<FullTournamentState>({
    phase: 'idle',
    rank1Code: null,
    rank2Code: null,
    rank3Code: null,
    candidateSet: [],
    currentMission: null,
    tieTrace: [],
  });

  const handleRankResolvedRef = useRef<(
    resolvedRank: 1 | 2 | 3,
    winner: HollandCode,
    loser: HollandCode | null,
    existingRank1: HollandCode | null,
    existingRank2: HollandCode | null,
    trace: TournamentComparison[],
    eliminatedByStep25?: HollandCode[]
  ) => void>(() => {});

  const startRankTournamentRef = useRef<(
    rank: 1 | 2,
    candidates: HollandCode[],
    existingRank1: HollandCode | null,
    existingRank2: HollandCode | null,
    existingTrace: TournamentComparison[],
    eliminatedByStep25?: HollandCode[]
  ) => void>(() => {});

  const setMissingMissionError = useCallback((candidates: HollandCode[], rank: number) => {
    const pairs = getAllPairsByPriority(candidates).map(p => normalizePairCodes(p[0], p[1]));
    console.error(`[Tournament] CRITICAL: No missions found for any pair among candidates:`, candidates);
    console.error(`[Tournament] Tried pairs:`, pairs);

    setState(prev => ({
      ...prev,
      phase: 'error',
      errorType: 'missing_pair_missions',
      errorDetails: `Rank ${rank} - Candidates: ${candidates.join(',')} - No missions for pairs: ${pairs.join(',')}`,
    }));
  }, []);

  /**
   * Start a tournament mission for Rank 1 or 2 (never Rank 3).
   */
  const startRankTournament = useCallback((
    rank: 1 | 2,
    candidates: HollandCode[],
    existingRank1: HollandCode | null,
    existingRank2: HollandCode | null,
    existingTrace: TournamentComparison[],
    eliminatedByStep25?: HollandCode[]
  ) => {
    console.log(`[Tournament] Starting Rank ${rank} mission with candidates:`, candidates);

    const result = findAvailableMission(candidates);

    if (!result) {
      setMissingMissionError(candidates, rank);
      return;
    }

    console.log(`[Tournament] Using mission:`, result.mission.quest_id, 'for pair:', result.pairCodes);

    const phaseMap = { 1: 'rank1' as const, 2: 'rank2' as const };
    setState({
      phase: phaseMap[rank],
      rank1Code: existingRank1,
      rank2Code: existingRank2,
      rank3Code: null,
      candidateSet: candidates,
      currentMission: convertToMission(result.mission),
      tieTrace: existingTrace,
      eliminatedByStep25,
    });
  }, [setMissingMissionError]);

  startRankTournamentRef.current = startRankTournament;

  /**
   * Handle when a rank mission resolves.
   * Key rule: loser of any mission gets the next rank automatically.
   */
  const handleRankResolved = useCallback((
    resolvedRank: 1 | 2 | 3,
    winner: HollandCode,
    loser: HollandCode | null,
    existingRank1: HollandCode | null,
    existingRank2: HollandCode | null,
    trace: TournamentComparison[],
    eliminatedByStep25?: HollandCode[]
  ) => {
    console.log(`[Tournament] Rank ${resolvedRank} resolved: winner=${winner}, loser=${loser}`);

    if (resolvedRank === 1) {
      // Winner = Rank 1, Loser = Rank 2
      const rank2 = loser!;
      console.log(`[Tournament] Rank 1=${winner}, Rank 2=${rank2} (loser auto-assigned)`);

      // Check if there were codes eliminated by Step 2.5 (3+ tie scenario)
      if (eliminatedByStep25 && eliminatedByStep25.length > 0) {
        // 3+ way tie for Rank 1: eliminated codes become Rank 3 candidates
        const rank3 = resolveRank3ByAdjacentSum(eliminatedByStep25, countsFinal);
        console.log(`[Tournament] Rank 3 from eliminated codes:`, rank3);
        setState({
          phase: 'complete',
          rank1Code: winner,
          rank2Code: rank2,
          rank3Code: rank3,
          candidateSet: [],
          currentMission: null,
          tieTrace: trace,
        });
        return;
      }

      // 2-way tie for Rank 1: now determine Rank 3 (Step 4)
      const rank3Candidates = findCandidates(countsFinal, [winner, rank2]);
      console.log('[Tournament] Rank 3 candidates:', rank3Candidates);

      if (rank3Candidates.length <= 1) {
        const rank3 = rank3Candidates[0];
        if (!rank3) {
          console.error('[Tournament] No candidates for Rank 3');
          return;
        }
        setState({
          phase: 'complete',
          rank1Code: winner,
          rank2Code: rank2,
          rank3Code: rank3,
          candidateSet: [],
          currentMission: null,
          tieTrace: trace,
        });
      } else {
        // Rank 3 tie: resolve mathematically (no mission)
        const rank3 = resolveRank3ByAdjacentSum(rank3Candidates, countsFinal);
        setState({
          phase: 'complete',
          rank1Code: winner,
          rank2Code: rank2,
          rank3Code: rank3,
          candidateSet: [],
          currentMission: null,
          tieTrace: trace,
        });
      }
    } else if (resolvedRank === 2) {
      // Winner = Rank 2, Loser = Rank 3. DONE.
      console.log(`[Tournament] Rank 2=${winner}, Rank 3=${loser} (loser auto-assigned). DONE.`);
      setState({
        phase: 'complete',
        rank1Code: existingRank1,
        rank2Code: winner,
        rank3Code: loser,
        candidateSet: [],
        currentMission: null,
        tieTrace: trace,
      });
    }
  }, [countsFinal]);

  handleRankResolvedRef.current = handleRankResolved;

  /**
   * Initialize tournament starting from Rank 1
   */
  const startTournament = useCallback((rank1Candidates: HollandCode[]) => {
    console.log('[Tournament] startTournament called with rank1 candidates:', rank1Candidates);

    if (rank1Candidates.length === 0) {
      console.error('[Tournament] No candidates for Rank 1');
      return;
    }

    if (rank1Candidates.length === 1) {
      handleRankResolvedRef.current(1, rank1Candidates[0], null, null, null, []);
      return;
    }

    if (rank1Candidates.length === 2) {
      // Exactly 2: go straight to mission (no Step 2.5)
      console.log('[Tournament] Exactly 2 tied for Rank 1, starting mission directly');
      startRankTournamentRef.current(1, rank1Candidates, null, null, []);
      return;
    }

    // 3+ candidates: run Step 2.5 to narrow
    const step25Result = tryResolveByAdjacentSum(rank1Candidates, countsFinal);
    if ('winner' in step25Result) {
      // Step 2.5 resolved to 1 (from 3+). This winner is Rank 1.
      // Need to determine Rank 2 and 3 from remaining
      console.log('[Tournament] Rank 1 resolved by Step 2.5:', step25Result.winner);
      handleRankResolvedRef.current(1, step25Result.winner, null, null, null, []);
      return;
    }

    // Narrowed to 2+ candidates
    const narrowed = step25Result.narrowedCandidates;
    const eliminated = rank1Candidates.filter(c => !narrowed.includes(c));
    console.log('[Tournament] Step 2.5 narrowed to:', narrowed, 'eliminated:', eliminated);

    if (narrowed.length === 2) {
      // Start mission with the 2 survivors. Eliminated codes tracked for Rank 3.
      startRankTournamentRef.current(1, narrowed, null, null, [], eliminated.length > 0 ? eliminated : undefined);
    } else {
      // Still 3+, start mission anyway (tournament will eliminate via rounds)
      startRankTournamentRef.current(1, narrowed, null, null, [], eliminated.length > 0 ? eliminated : undefined);
    }
  }, [countsFinal]);

  /**
   * Start tournament from Rank 2 (when Rank 1 is already known)
   */
  const startFromRank2 = useCallback((rank1: HollandCode) => {
    console.log('[Tournament] startFromRank2 called with rank1:', rank1);

    const rank2Candidates = findCandidates(countsFinal, [rank1]);
    console.log('[Tournament] Rank 2 candidates:', rank2Candidates);

    if (rank2Candidates.length <= 1) {
      // Rank 2 auto-resolved
      const rank2 = rank2Candidates[0];
      if (!rank2) {
        console.error('[Tournament] No candidates for Rank 2');
        return;
      }

      // Check Rank 3
      const rank3Candidates = findCandidates(countsFinal, [rank1, rank2]);

      if (rank3Candidates.length <= 1) {
        const rank3 = rank3Candidates[0];
        if (!rank3) {
          console.error('[Tournament] No candidates for Rank 3');
          return;
        }
        setState({
          phase: 'complete',
          rank1Code: rank1,
          rank2Code: rank2,
          rank3Code: rank3,
          candidateSet: [],
          currentMission: null,
          tieTrace: [],
        });
      } else {
        // Rank 3 tie: resolve mathematically
        const rank3 = resolveRank3ByAdjacentSum(rank3Candidates, countsFinal);
        setState({
          phase: 'complete',
          rank1Code: rank1,
          rank2Code: rank2,
          rank3Code: rank3,
          candidateSet: [],
          currentMission: null,
          tieTrace: [],
        });
      }
    } else {
      // 2+ tied for Rank 2
      if (rank2Candidates.length === 2) {
        // Exactly 2: go straight to mission. Loser = Rank 3. DONE.
        console.log('[Tournament] Exactly 2 tied for Rank 2, starting mission directly');
        startRankTournamentRef.current(2, rank2Candidates, rank1, null, []);
      } else {
        // 3+ tied: Step 2.5 to narrow
        const step25Result = tryResolveByAdjacentSum(rank2Candidates, countsFinal);
        if ('winner' in step25Result) {
          // Rank 2 resolved by Step 2.5 (from 3+)
          console.log('[Tournament] Rank 2 resolved by Step 2.5:', step25Result.winner);
          const rank3Candidates = findCandidates(countsFinal, [rank1, step25Result.winner]);
          const rank3 = rank3Candidates.length <= 1
            ? rank3Candidates[0]
            : resolveRank3ByAdjacentSum(rank3Candidates, countsFinal);
          if (!rank3) {
            console.error('[Tournament] No candidates for Rank 3');
            return;
          }
          setState({
            phase: 'complete',
            rank1Code: rank1,
            rank2Code: step25Result.winner,
            rank3Code: rank3,
            candidateSet: [],
            currentMission: null,
            tieTrace: [],
          });
        } else {
          // Narrowed to 2+, start mission. Loser = Rank 3.
          const narrowed = step25Result.narrowedCandidates;
          startRankTournamentRef.current(2, narrowed, rank1, null, []);
        }
      }
    }
  }, [countsFinal]);

  /**
   * Process a user choice in the current tournament round
   */
  const processChoice = useCallback((chosenKey: 'a' | 'b') => {
    if (!state.currentMission || state.phase === 'idle' || state.phase === 'complete' || state.phase === 'error') {
      return;
    }

    const mission = state.currentMission;
    const optionA = mission.options.find(o => o.key === 'a');
    const optionB = mission.options.find(o => o.key === 'b');

    if (!optionA || !optionB) return;

    const winnerCode = chosenKey === 'a' ? optionA.holland_code : optionB.holland_code;
    const loserCode = chosenKey === 'a' ? optionB.holland_code : optionA.holland_code;

    const currentRank = state.phase === 'rank1' ? 1 : 2;

    const comparison: TournamentComparison = {
      rank: currentRank as 1 | 2,
      pairCodes: mission.pair_key || '',
      winner: winnerCode,
      loser: loserCode,
      missionId: mission.mission_id,
      timestamp: Date.now(),
    };

    const newTrace = [...state.tieTrace, comparison];
    const newCandidates = state.candidateSet.filter(c => c !== loserCode);

    console.log(`[Tournament] Choice made: ${winnerCode} beats ${loserCode}`);
    console.log(`[Tournament] Remaining candidates for Rank ${currentRank}:`, newCandidates);

    if (newCandidates.length === 1) {
      // Tournament for this rank is complete
      // Winner gets this rank, loser gets the next rank
      const winner = newCandidates[0];
      handleRankResolvedRef.current(
        currentRank as 1 | 2,
        winner,
        loserCode,
        state.rank1Code,
        state.rank2Code,
        newTrace,
        state.eliminatedByStep25
      );
      return;
    }

    // Continue tournament (more than 2 candidates still) - find next mission
    const result = findAvailableMission(newCandidates);

    if (!result) {
      setMissingMissionError(newCandidates, currentRank);
      return;
    }

    console.log(`[Tournament] Next mission:`, result.mission.quest_id, 'for pair:', result.pairCodes);

    setState(prev => ({
      ...prev,
      candidateSet: newCandidates,
      currentMission: convertToMission(result.mission),
      tieTrace: newTrace,
    }));
  }, [state, setMissingMissionError]);

  /**
   * Check if any tournament is needed (based on current scores)
   */
  const checkNeedsTournament = useCallback((leaders: HollandCode[]): {
    needsRank1: boolean;
    needsRank2: boolean;
    needsRank3: boolean;
  } => {
    const needsRank1 = leaders.length >= 2;

    if (leaders.length === 1) {
      const rank2Candidates = findCandidates(countsFinal, [leaders[0]]);
      const needsRank2 = rank2Candidates.length >= 2;

      return {
        needsRank1: false,
        needsRank2,
        needsRank3: false, // Rank 3 NEVER needs a mission
      };
    }

    return {
      needsRank1,
      needsRank2: false,
      needsRank3: false, // Rank 3 NEVER needs a mission
    };
  }, [countsFinal]);

  /**
   * Get auto-resolved rankings when no tournament is needed
   */
  const getAutoResolvedRankings = useCallback((rank1: HollandCode): {
    rank1Code: HollandCode;
    rank2Code: HollandCode;
    rank3Code: HollandCode;
  } | null => {
    const rank2Candidates = findCandidates(countsFinal, [rank1]);
    if (rank2Candidates.length !== 1) return null;

    const rank2 = rank2Candidates[0];
    const rank3Candidates = findCandidates(countsFinal, [rank1, rank2]);

    if (rank3Candidates.length === 1) {
      return { rank1Code: rank1, rank2Code: rank2, rank3Code: rank3Candidates[0] };
    }

    // Rank 3 tie: resolve mathematically
    const rank3 = resolveRank3ByAdjacentSum(rank3Candidates, countsFinal);
    return { rank1Code: rank1, rank2Code: rank2, rank3Code: rank3 };
  }, [countsFinal]);

  const currentRankBeingResolved = useMemo(() => {
    switch (state.phase) {
      case 'rank1': return 1;
      case 'rank2': return 2;
      default: return null;
    }
  }, [state.phase]);

  const getCandidatesForDebug = useCallback((finalRank1: HollandCode | null): {
    rank1Candidates: HollandCode[];
    rank2Candidates: HollandCode[];
    rank3Candidates: HollandCode[];
  } => {
    const rank1Candidates: HollandCode[] = [];

    if (!finalRank1) {
      return { rank1Candidates, rank2Candidates: [], rank3Candidates: [] };
    }

    const rank2Candidates = findCandidates(countsFinal, [finalRank1]);

    let rank2ForRank3: HollandCode | null = null;
    if (state.rank2Code) {
      rank2ForRank3 = state.rank2Code;
    } else if (rank2Candidates.length === 1) {
      rank2ForRank3 = rank2Candidates[0];
    }

    const rank3Candidates = rank2ForRank3
      ? findCandidates(countsFinal, [finalRank1, rank2ForRank3])
      : [];

    return { rank1Candidates, rank2Candidates, rank3Candidates };
  }, [countsFinal, state.rank2Code]);

  return {
    state,
    startTournament,
    startFromRank2,
    processChoice,
    checkNeedsTournament,
    getAutoResolvedRankings,
    getCandidatesForDebug,
    isComplete: state.phase === 'complete',
    isError: state.phase === 'error',
    isActive: state.phase === 'rank1' || state.phase === 'rank2',
    currentMission: state.currentMission,
    currentRankBeingResolved,
  };
}
