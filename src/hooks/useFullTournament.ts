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
  // Current phase: 'idle' | 'rank1' | 'rank2' | 'rank3' | 'complete' | 'error'
  phase: 'idle' | 'rank1' | 'rank2' | 'rank3' | 'complete' | 'error';
  // Final results
  rank1Code: HollandCode | null;
  rank2Code: HollandCode | null;
  rank3Code: HollandCode | null;
  // Current tournament state
  candidateSet: HollandCode[];
  currentMission: Mission | null;
  // Trace of all comparisons made (for telemetry)
  tieTrace: TournamentComparison[];
  // Error info if phase is 'error'
  errorType?: 'missing_pair_missions';
  errorDetails?: string;
}

// Default deterministic order for fallback: r > i > a > s > e > c
const DEFAULT_ORDER: HollandCode[] = ['r', 'i', 'a', 's', 'e', 'c'];

// Hex circle order for distance calculation (clockwise: R-I-A-S-E-C)
const HEX_ORDER: HollandCode[] = ['r', 'i', 'a', 's', 'e', 'c'];

// Opposite pairs on the hexagon (distance 3)
const OPPOSITE_PAIRS: [HollandCode, HollandCode][] = [
  ['r', 's'], // Realistic - Social
  ['i', 'e'], // Investigative - Enterprising
  ['a', 'c'], // Artistic - Conventional
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
 * Step 2.5: Try to resolve tie using adjacent Holland code sums.
 * For each tied candidate, sum the base scores of its two adjacent codes.
 * If one candidate has a higher sum → it wins (no tie-breaker mission needed).
 * If multiple have the same max sum → return only those (narrowed candidates).
 * 
 * @param candidates - The tied Holland codes
 * @param countsFinal - The base scores from 12 main missions (integers 0-4)
 * @returns Object with winner (if resolved) OR narrowedCandidates (if still tied)
 */
function tryResolveByAdjacentSum(
  candidates: HollandCode[],
  countsFinal: CountsFinal
): { winner: HollandCode } | { narrowedCandidates: HollandCode[] } {
  if (candidates.length < 2) {
    return { winner: candidates[0] };
  }
  
  // Calculate adjacent sum for each candidate
  const adjacentSums: { code: HollandCode; sum: number }[] = candidates.map(code => {
    const [adj1, adj2] = ADJACENT_PAIRS[code];
    const sum = countsFinal[adj1] + countsFinal[adj2];
    return { code, sum };
  });
  
  console.log('[Tournament] Step 2.5 - Adjacent sums:', adjacentSums);
  
  // Find the maximum sum
  const maxSum = Math.max(...adjacentSums.map(x => x.sum));
  
  // Find all candidates with the max sum
  const winners = adjacentSums.filter(x => x.sum === maxSum);
  
  if (winners.length === 1) {
    // Single winner - resolved without tie-breaker mission
    console.log(`[Tournament] Step 2.5 resolved: ${winners[0].code} wins with adjacent sum ${maxSum}`);
    return { winner: winners[0].code };
  }
  
  // Still tied - return narrowed candidates
  const narrowed = winners.map(w => w.code);
  console.log(`[Tournament] Step 2.5 still tied: ${narrowed.join(',')} all have sum ${maxSum}`);
  return { narrowedCandidates: narrowed };
}

// Get the tie-breaker missions from v6 JSON
const tieMissionsV6 = studioTieV6Data as TieMissionV6[];

/**
 * Calculate circular distance between two codes on the hex circle
 * Distance can be 1, 2, or 3 (max)
 */
function getCircularDistance(a: HollandCode, b: HollandCode): number {
  const idxA = HEX_ORDER.indexOf(a);
  const idxB = HEX_ORDER.indexOf(b);
  const rawDist = Math.abs(idxA - idxB);
  return Math.min(rawDist, 6 - rawDist);
}

/**
 * Normalize pair codes to alphabetical order (e.g., "ri" -> "ir", "ra" -> "ar")
 */
function normalizePairCodes(a: HollandCode, b: HollandCode): string {
  const sorted = [a.toLowerCase(), b.toLowerCase()].sort();
  return sorted.join('');
}

/**
 * Get all possible pairs from candidates, sorted by priority (opposite first, then max distance)
 */
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
      
      // Priority: opposite pairs first (distance 3), then by distance descending
      const priority = isOpposite ? 1000 + distance : distance;
      
      pairs.push({ pair: [a, b], distance, isOpposite, priority });
    }
  }
  
  // Sort by priority descending, then by DEFAULT_ORDER for determinism
  pairs.sort((x, y) => {
    if (y.priority !== x.priority) return y.priority - x.priority;
    const xMin = Math.min(DEFAULT_ORDER.indexOf(x.pair[0]), DEFAULT_ORDER.indexOf(x.pair[1]));
    const yMin = Math.min(DEFAULT_ORDER.indexOf(y.pair[0]), DEFAULT_ORDER.indexOf(y.pair[1]));
    return xMin - yMin;
  });
  
  return pairs.map(p => p.pair);
}

/**
 * Look up a mission from the v6 JSON by pair_codes
 */
function findMissionByPairCodes(pairCodes: string): TieMissionV6 | null {
  return tieMissionsV6.find(m => m.pair_codes === pairCodes) || null;
}

/**
 * Find a mission for any of the candidate pairs (tries in priority order)
 * Returns the mission and the pair codes used, or null if none found
 */
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

/**
 * Convert TieMissionV6 to Mission format for rendering
 */
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

/**
 * Find candidates for a rank based on scores, excluding already-placed codes
 */
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

  // Use refs to break circular dependencies between callbacks
  const handleRankResolvedRef = useRef<(
    resolvedRank: 1 | 2 | 3,
    winner: HollandCode,
    existingRank1: HollandCode | null,
    existingRank2: HollandCode | null,
    trace: TournamentComparison[]
  ) => void>(() => {});

  const startRankTournamentRef = useRef<(
    rank: 1 | 2 | 3,
    candidates: HollandCode[],
    existingRank1: HollandCode | null,
    existingRank2: HollandCode | null,
    existingTrace: TournamentComparison[]
  ) => void>(() => {});

  /**
   * Set error state when no mission is available for any pair
   */
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
   * Internal function to start a tournament for a specific rank
   */
  const startRankTournament = useCallback((
    rank: 1 | 2 | 3,
    candidates: HollandCode[],
    existingRank1: HollandCode | null,
    existingRank2: HollandCode | null,
    existingTrace: TournamentComparison[]
  ) => {
    console.log(`[Tournament] Starting Rank ${rank} tournament with candidates:`, candidates);
    console.log(`[Tournament] Expected tie-breaker missions for this rank: ${candidates.length - 1}`);
    
    // Find a mission for any valid pair (tries opposite pairs first, then max distance)
    const result = findAvailableMission(candidates);
    
    if (!result) {
      // No mission available for any pair - this is an error
      setMissingMissionError(candidates, rank);
      return;
    }
    
    console.log(`[Tournament] Using mission:`, result.mission.quest_id, 'for pair:', result.pairCodes);
    
    const phaseMap = { 1: 'rank1' as const, 2: 'rank2' as const, 3: 'rank3' as const };
    setState({
      phase: phaseMap[rank],
      rank1Code: existingRank1,
      rank2Code: existingRank2,
      rank3Code: null,
      candidateSet: candidates,
      currentMission: convertToMission(result.mission),
      tieTrace: existingTrace,
    });
  }, [setMissingMissionError]);

  // Update ref
  startRankTournamentRef.current = startRankTournament;

  /**
   * Handle when a rank is fully resolved (winner determined)
   */
  const handleRankResolved = useCallback((
    resolvedRank: 1 | 2 | 3,
    winner: HollandCode,
    existingRank1: HollandCode | null,
    existingRank2: HollandCode | null,
    trace: TournamentComparison[]
  ) => {
    console.log(`[Tournament] Rank ${resolvedRank} resolved with winner:`, winner);
    
    if (resolvedRank === 1) {
      // Rank 1 done, check Rank 2
      const rank2Candidates = findCandidates(countsFinal, [winner]);
      console.log('[Tournament] Rank 2 candidates:', rank2Candidates);
      
      if (rank2Candidates.length <= 1) {
        // Rank 2 auto-resolved (single candidate with highest score)
        const rank2 = rank2Candidates[0];
        if (!rank2) {
          console.error('[Tournament] No candidates for Rank 2');
          return;
        }
        console.log('[Tournament] Rank 2 auto-resolved:', rank2);
        
        // Check Rank 3
        const rank3Candidates = findCandidates(countsFinal, [winner, rank2]);
        console.log('[Tournament] Rank 3 candidates:', rank3Candidates);
        
        if (rank3Candidates.length <= 1) {
          // All resolved
          const rank3 = rank3Candidates[0];
          if (!rank3) {
            console.error('[Tournament] No candidates for Rank 3');
            return;
          }
          console.log('[Tournament] All ranks resolved:', winner, rank2, rank3);
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
          // Step 2.5: Try adjacent sum resolution for Rank 3
          const step25Result = tryResolveByAdjacentSum(rank3Candidates, countsFinal);
          if ('winner' in step25Result) {
            console.log('[Tournament] Rank 3 resolved by Step 2.5:', step25Result.winner);
            setState({
              phase: 'complete',
              rank1Code: winner,
              rank2Code: rank2,
              rank3Code: step25Result.winner,
              candidateSet: [],
              currentMission: null,
              tieTrace: trace,
            });
          } else {
            // Need Rank 3 tournament with narrowed candidates
            startRankTournamentRef.current(3, step25Result.narrowedCandidates, winner, rank2, trace);
          }
        }
      } else {
        // Step 2.5: Try adjacent sum resolution for Rank 2
        const step25Result = tryResolveByAdjacentSum(rank2Candidates, countsFinal);
        if ('winner' in step25Result) {
          console.log('[Tournament] Rank 2 resolved by Step 2.5:', step25Result.winner);
          // Check Rank 3
          const rank3Candidates = findCandidates(countsFinal, [winner, step25Result.winner]);
          if (rank3Candidates.length <= 1) {
            const rank3 = rank3Candidates[0];
            if (!rank3) {
              console.error('[Tournament] No candidates for Rank 3');
              return;
            }
            setState({
              phase: 'complete',
              rank1Code: winner,
              rank2Code: step25Result.winner,
              rank3Code: rank3,
              candidateSet: [],
              currentMission: null,
              tieTrace: trace,
            });
          } else {
            // Step 2.5 for Rank 3
            const step25Rank3 = tryResolveByAdjacentSum(rank3Candidates, countsFinal);
            if ('winner' in step25Rank3) {
              setState({
                phase: 'complete',
                rank1Code: winner,
                rank2Code: step25Result.winner,
                rank3Code: step25Rank3.winner,
                candidateSet: [],
                currentMission: null,
                tieTrace: trace,
              });
            } else {
              startRankTournamentRef.current(3, step25Rank3.narrowedCandidates, winner, step25Result.winner, trace);
            }
          }
        } else {
          // Need Rank 2 tournament with narrowed candidates
          startRankTournamentRef.current(2, step25Result.narrowedCandidates, winner, null, trace);
        }
      }
    } else if (resolvedRank === 2) {
      // Rank 2 done, check Rank 3
      const rank3Candidates = findCandidates(countsFinal, [existingRank1!, winner]);
      console.log('[Tournament] Rank 3 candidates:', rank3Candidates);
      
      if (rank3Candidates.length <= 1) {
        // Rank 3 auto-resolved
        const rank3 = rank3Candidates[0];
        if (!rank3) {
          console.error('[Tournament] No candidates for Rank 3');
          return;
        }
        console.log('[Tournament] All ranks resolved:', existingRank1, winner, rank3);
        setState({
          phase: 'complete',
          rank1Code: existingRank1,
          rank2Code: winner,
          rank3Code: rank3,
          candidateSet: [],
          currentMission: null,
          tieTrace: trace,
        });
      } else {
        // Step 2.5: Try adjacent sum resolution for Rank 3
        const step25Result = tryResolveByAdjacentSum(rank3Candidates, countsFinal);
        if ('winner' in step25Result) {
          console.log('[Tournament] Rank 3 resolved by Step 2.5:', step25Result.winner);
          setState({
            phase: 'complete',
            rank1Code: existingRank1,
            rank2Code: winner,
            rank3Code: step25Result.winner,
            candidateSet: [],
            currentMission: null,
            tieTrace: trace,
          });
        } else {
          // Need Rank 3 tournament with narrowed candidates
          startRankTournamentRef.current(3, step25Result.narrowedCandidates, existingRank1, winner, trace);
        }
      }
    } else {
      // Rank 3 done - all complete
      console.log('[Tournament] All ranks resolved:', existingRank1, existingRank2, winner);
      setState({
        phase: 'complete',
        rank1Code: existingRank1,
        rank2Code: existingRank2,
        rank3Code: winner,
        candidateSet: [],
        currentMission: null,
        tieTrace: trace,
      });
    }
  }, [countsFinal]);

  // Update ref
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
      // Single candidate for Rank 1, move to checking Rank 2
      const rank1 = rank1Candidates[0];
      handleRankResolvedRef.current(1, rank1, null, null, []);
      return;
    }
    
    // Step 2.5: Try adjacent sum resolution for Rank 1
    const step25Result = tryResolveByAdjacentSum(rank1Candidates, countsFinal);
    if ('winner' in step25Result) {
      console.log('[Tournament] Rank 1 resolved by Step 2.5:', step25Result.winner);
      handleRankResolvedRef.current(1, step25Result.winner, null, null, []);
      return;
    }
    
    // Multiple candidates - start Rank 1 tournament with narrowed candidates
    startRankTournamentRef.current(1, step25Result.narrowedCandidates, null, null, []);
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
        // Step 2.5: Try adjacent sum resolution for Rank 3
        const step25Result = tryResolveByAdjacentSum(rank3Candidates, countsFinal);
        if ('winner' in step25Result) {
          console.log('[Tournament] Rank 3 resolved by Step 2.5:', step25Result.winner);
          setState({
            phase: 'complete',
            rank1Code: rank1,
            rank2Code: rank2,
            rank3Code: step25Result.winner,
            candidateSet: [],
            currentMission: null,
            tieTrace: [],
          });
        } else {
          startRankTournamentRef.current(3, step25Result.narrowedCandidates, rank1, rank2, []);
        }
      }
    } else {
      // Step 2.5: Try adjacent sum resolution for Rank 2
      const step25Result = tryResolveByAdjacentSum(rank2Candidates, countsFinal);
      if ('winner' in step25Result) {
        console.log('[Tournament] Rank 2 resolved by Step 2.5:', step25Result.winner);
        // Now check Rank 3
        const rank3Candidates = findCandidates(countsFinal, [rank1, step25Result.winner]);
        if (rank3Candidates.length <= 1) {
          const rank3 = rank3Candidates[0];
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
          // Step 2.5 for Rank 3
          const step25Rank3 = tryResolveByAdjacentSum(rank3Candidates, countsFinal);
          if ('winner' in step25Rank3) {
            setState({
              phase: 'complete',
              rank1Code: rank1,
              rank2Code: step25Result.winner,
              rank3Code: step25Rank3.winner,
              candidateSet: [],
              currentMission: null,
              tieTrace: [],
            });
          } else {
            startRankTournamentRef.current(3, step25Rank3.narrowedCandidates, rank1, step25Result.winner, []);
          }
        }
      } else {
        startRankTournamentRef.current(2, step25Result.narrowedCandidates, rank1, null, []);
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
    
    const currentRank = state.phase === 'rank1' ? 1 : state.phase === 'rank2' ? 2 : 3;
    
    const comparison: TournamentComparison = {
      rank: currentRank,
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
      const winner = newCandidates[0];
      handleRankResolvedRef.current(currentRank, winner, state.rank1Code, state.rank2Code, newTrace);
      return;
    }
    
    // Continue tournament - find next mission
    const result = findAvailableMission(newCandidates);
    
    if (!result) {
      // No mission available - error
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
      
      if (rank2Candidates.length === 1) {
        const rank3Candidates = findCandidates(countsFinal, [leaders[0], rank2Candidates[0]]);
        return {
          needsRank1: false,
          needsRank2: false,
          needsRank3: rank3Candidates.length >= 2,
        };
      }
      
      return {
        needsRank1: false,
        needsRank2,
        needsRank3: false, // Will be determined after Rank 2
      };
    }
    
    return {
      needsRank1,
      needsRank2: false, // Will be determined after Rank 1
      needsRank3: false,
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
    if (rank3Candidates.length !== 1) return null;
    
    return {
      rank1Code: rank1,
      rank2Code: rank2,
      rank3Code: rank3Candidates[0],
    };
  }, [countsFinal]);

  /**
   * Get current rank being resolved for display purposes
   */
  const currentRankBeingResolved = useMemo(() => {
    switch (state.phase) {
      case 'rank1': return 1;
      case 'rank2': return 2;
      case 'rank3': return 3;
      default: return null;
    }
  }, [state.phase]);

  /**
   * Get candidates for debug panel display
   */
  const getCandidatesForDebug = useCallback((finalRank1: HollandCode | null): {
    rank1Candidates: HollandCode[];
    rank2Candidates: HollandCode[];
    rank3Candidates: HollandCode[];
  } => {
    // For Rank 1, we need the leaders (passed from outside)
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
    isActive: state.phase === 'rank1' || state.phase === 'rank2' || state.phase === 'rank3',
    currentMission: state.currentMission,
    currentRankBeingResolved,
  };
}
