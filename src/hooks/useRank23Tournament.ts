// Rank 2/3 Tournament Resolution Hook
// Implements winner-stays tournament for resolving ties in Rank 2 and Rank 3
import { useState, useCallback, useMemo } from 'react';
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
}

export interface TournamentComparison {
  pairCodes: string;
  winner: HollandCode;
  loser: HollandCode;
  timestamp: number;
}

export interface Rank23State {
  // Current phase: 'idle' | 'rank2' | 'rank3' | 'complete'
  phase: 'idle' | 'rank2' | 'rank3' | 'complete';
  // Final results
  rank1Code: HollandCode | null;
  rank2Code: HollandCode | null;
  rank3Code: HollandCode | null;
  // Current tournament state
  candidateSet: HollandCode[];
  currentMission: Mission | null;
  // Trace of comparisons made for Rank 2/3 (for telemetry)
  tieTrace: TournamentComparison[];
}

// Default deterministic order for fallback: r > i > a > s > e > c
const DEFAULT_ORDER: HollandCode[] = ['r', 'i', 'a', 's', 'e', 'c'];

// Hex circle order for distance calculation
const HEX_ORDER: HollandCode[] = ['r', 'i', 'a', 's', 'e', 'c'];

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
 * Select the next pair for tournament comparison using max distance rule
 */
function selectNextPair(candidates: HollandCode[]): [HollandCode, HollandCode] | null {
  if (candidates.length < 2) return null;
  
  let bestPair: [HollandCode, HollandCode] | null = null;
  let maxDistance = -1;
  
  // Find all pairs and their distances
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const dist = getCircularDistance(candidates[i], candidates[j]);
      
      if (dist > maxDistance) {
        maxDistance = dist;
        bestPair = [candidates[i], candidates[j]];
      } else if (dist === maxDistance && bestPair) {
        // Tiebreaker: choose pair containing highest priority trait
        const currentBestIdx = Math.min(
          DEFAULT_ORDER.indexOf(bestPair[0]),
          DEFAULT_ORDER.indexOf(bestPair[1])
        );
        const newPairBestIdx = Math.min(
          DEFAULT_ORDER.indexOf(candidates[i]),
          DEFAULT_ORDER.indexOf(candidates[j])
        );
        
        if (newPairBestIdx < currentBestIdx) {
          bestPair = [candidates[i], candidates[j]];
        } else if (newPairBestIdx === currentBestIdx) {
          // Second tiebreaker: compare second trait
          const currentSecondIdx = Math.max(
            DEFAULT_ORDER.indexOf(bestPair[0]),
            DEFAULT_ORDER.indexOf(bestPair[1])
          );
          const newSecondIdx = Math.max(
            DEFAULT_ORDER.indexOf(candidates[i]),
            DEFAULT_ORDER.indexOf(candidates[j])
          );
          if (newSecondIdx < currentSecondIdx) {
            bestPair = [candidates[i], candidates[j]];
          }
        }
      }
    }
  }
  
  return bestPair;
}

/**
 * Look up a mission from the v6 CSV by pair_codes
 */
function findMissionByPairCodes(pairCodes: string): TieMissionV6 | null {
  return tieMissionsV6.find(m => m.pair_codes === pairCodes) || null;
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
    view: 'in', // Default view
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
    view: 'in', // Default view
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
    sequence: 100 + tieMission.pair_sequence, // High sequence for tie-breakers
    view: 'in',
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
  // Get remaining codes and their scores
  const remaining = DEFAULT_ORDER.filter(code => !excludeCodes.includes(code));
  if (remaining.length === 0) return [];
  
  // Find the highest score among remaining
  const maxScore = Math.max(...remaining.map(code => countsFinal[code]));
  
  // Return all codes that share the highest score
  return remaining.filter(code => countsFinal[code] === maxScore);
}

/**
 * Resolve instantly using default order (fallback when CSV row not found)
 */
function resolveByDefaultOrder(candidates: HollandCode[]): HollandCode {
  // Return the candidate highest in default order
  for (const code of DEFAULT_ORDER) {
    if (candidates.includes(code)) {
      return code;
    }
  }
  return candidates[0]; // Should never reach here
}

export function useRank23Tournament(countsFinal: CountsFinal, rank1Code: HollandCode | null) {
  const [state, setState] = useState<Rank23State>({
    phase: 'idle',
    rank1Code: null,
    rank2Code: null,
    rank3Code: null,
    candidateSet: [],
    currentMission: null,
    tieTrace: [],
  });

  /**
   * Initialize the tournament after Rank 1 is resolved
   */
  const startTournament = useCallback((finalRank1: HollandCode) => {
    console.log('[Rank23] startTournament called with rank1:', finalRank1);
    console.log('[Rank23] countsFinal:', countsFinal);
    
    // Find candidates for Rank 2
    const candidates = findCandidates(countsFinal, [finalRank1]);
    console.log('[Rank23] Rank 2 candidates:', candidates);
    
    if (candidates.length === 0) {
      // Should not happen with valid data
      console.error('No candidates for Rank 2');
      return;
    }
    
    if (candidates.length === 1) {
      // Single candidate, auto-resolve Rank 2 and move to Rank 3
      const rank2 = candidates[0];
      console.log('[Rank23] Rank 2 auto-resolved (single candidate):', rank2);
      
      const rank3Candidates = findCandidates(countsFinal, [finalRank1, rank2]);
      console.log('[Rank23] Rank 3 candidates:', rank3Candidates);
      
      if (rank3Candidates.length <= 1) {
        // Rank 3 also resolved
        const rank3 = rank3Candidates[0] || resolveByDefaultOrder(
          DEFAULT_ORDER.filter(c => c !== finalRank1 && c !== rank2)
        );
        console.log('[Rank23] Rank 3 auto-resolved:', rank3);
        setState({
          phase: 'complete',
          rank1Code: finalRank1,
          rank2Code: rank2,
          rank3Code: rank3,
          candidateSet: [],
          currentMission: null,
          tieTrace: [],
        });
        return;
      }
      
      console.log('[Rank23] Rank 3 needs tournament with', rank3Candidates.length, 'candidates');
      
      // Need tournament for Rank 3
      const pair = selectNextPair(rank3Candidates);
      if (!pair) {
        // Fallback
        const rank3 = resolveByDefaultOrder(rank3Candidates);
        setState({
          phase: 'complete',
          rank1Code: finalRank1,
          rank2Code: rank2,
          rank3Code: rank3,
          candidateSet: [],
          currentMission: null,
          tieTrace: [],
        });
        return;
      }
      
      const pairCodes = normalizePairCodes(pair[0], pair[1]);
      const tieMission = findMissionByPairCodes(pairCodes);
      
      if (!tieMission) {
        // CSV row not found, resolve by default order
        const rank3 = resolveByDefaultOrder(rank3Candidates);
        setState({
          phase: 'complete',
          rank1Code: finalRank1,
          rank2Code: rank2,
          rank3Code: rank3,
          candidateSet: [],
          currentMission: null,
          tieTrace: [],
        });
        return;
      }
      
      setState({
        phase: 'rank3',
        rank1Code: finalRank1,
        rank2Code: rank2,
        rank3Code: null,
        candidateSet: rank3Candidates,
        currentMission: convertToMission(tieMission),
        tieTrace: [],
      });
      return;
    }
    
    // Multiple candidates for Rank 2 - need tournament
    const pair = selectNextPair(candidates);
    if (!pair) {
      // Fallback
      const rank2 = resolveByDefaultOrder(candidates);
      startRank3Resolution(finalRank1, rank2, []);
      return;
    }
    
    const pairCodes = normalizePairCodes(pair[0], pair[1]);
    const tieMission = findMissionByPairCodes(pairCodes);
    
    if (!tieMission) {
      // CSV row not found, resolve by default order
      const rank2 = resolveByDefaultOrder(candidates);
      startRank3Resolution(finalRank1, rank2, []);
      return;
    }
    
    setState({
      phase: 'rank2',
      rank1Code: finalRank1,
      rank2Code: null,
      rank3Code: null,
      candidateSet: candidates,
      currentMission: convertToMission(tieMission),
      tieTrace: [],
    });
  }, [countsFinal]);

  /**
   * Internal helper to start Rank 3 resolution
   */
  const startRank3Resolution = useCallback((rank1: HollandCode, rank2: HollandCode, existingTrace: TournamentComparison[]) => {
    const candidates = findCandidates(countsFinal, [rank1, rank2]);
    
    if (candidates.length <= 1) {
      // Rank 3 resolved
      const rank3 = candidates[0] || resolveByDefaultOrder(
        DEFAULT_ORDER.filter(c => c !== rank1 && c !== rank2)
      );
      setState({
        phase: 'complete',
        rank1Code: rank1,
        rank2Code: rank2,
        rank3Code: rank3,
        candidateSet: [],
        currentMission: null,
        tieTrace: existingTrace,
      });
      return;
    }
    
    // Multiple candidates - need tournament
    const pair = selectNextPair(candidates);
    if (!pair) {
      const rank3 = resolveByDefaultOrder(candidates);
      setState({
        phase: 'complete',
        rank1Code: rank1,
        rank2Code: rank2,
        rank3Code: rank3,
        candidateSet: [],
        currentMission: null,
        tieTrace: existingTrace,
      });
      return;
    }
    
    const pairCodes = normalizePairCodes(pair[0], pair[1]);
    const tieMission = findMissionByPairCodes(pairCodes);
    
    if (!tieMission) {
      const rank3 = resolveByDefaultOrder(candidates);
      setState({
        phase: 'complete',
        rank1Code: rank1,
        rank2Code: rank2,
        rank3Code: rank3,
        candidateSet: [],
        currentMission: null,
        tieTrace: existingTrace,
      });
      return;
    }
    
    setState({
      phase: 'rank3',
      rank1Code: rank1,
      rank2Code: rank2,
      rank3Code: null,
      candidateSet: candidates,
      currentMission: convertToMission(tieMission),
      tieTrace: existingTrace,
    });
  }, [countsFinal]);

  /**
   * Process a user choice in the current tournament round
   */
  const processChoice = useCallback((chosenKey: 'a' | 'b') => {
    if (!state.currentMission || state.phase === 'idle' || state.phase === 'complete') {
      return;
    }
    
    const mission = state.currentMission;
    const optionA = mission.options.find(o => o.key === 'a');
    const optionB = mission.options.find(o => o.key === 'b');
    
    if (!optionA || !optionB) return;
    
    const winnerCode = chosenKey === 'a' ? optionA.holland_code : optionB.holland_code;
    const loserCode = chosenKey === 'a' ? optionB.holland_code : optionA.holland_code;
    
    // Record comparison
    const comparison: TournamentComparison = {
      pairCodes: mission.pair_key || '',
      winner: winnerCode,
      loser: loserCode,
      timestamp: Date.now(),
    };
    
    const newTrace = [...state.tieTrace, comparison];
    
    // Remove loser from candidate set
    const newCandidates = state.candidateSet.filter(c => c !== loserCode);
    
    if (newCandidates.length === 1) {
      // Tournament for this rank is complete
      const winner = newCandidates[0];
      
      if (state.phase === 'rank2') {
        // Move to Rank 3
        startRank3Resolution(state.rank1Code!, winner, newTrace);
      } else {
        // Rank 3 complete
        setState({
          phase: 'complete',
          rank1Code: state.rank1Code,
          rank2Code: state.rank2Code,
          rank3Code: winner,
          candidateSet: [],
          currentMission: null,
          tieTrace: newTrace,
        });
      }
      return;
    }
    
    // Continue tournament - select next pair
    const pair = selectNextPair(newCandidates);
    if (!pair) {
      // Fallback
      const winner = resolveByDefaultOrder(newCandidates);
      if (state.phase === 'rank2') {
        startRank3Resolution(state.rank1Code!, winner, newTrace);
      } else {
        setState({
          phase: 'complete',
          rank1Code: state.rank1Code,
          rank2Code: state.rank2Code,
          rank3Code: winner,
          candidateSet: [],
          currentMission: null,
          tieTrace: newTrace,
        });
      }
      return;
    }
    
    const pairCodes = normalizePairCodes(pair[0], pair[1]);
    const tieMission = findMissionByPairCodes(pairCodes);
    
    if (!tieMission) {
      // Fallback
      const winner = resolveByDefaultOrder(newCandidates);
      if (state.phase === 'rank2') {
        startRank3Resolution(state.rank1Code!, winner, newTrace);
      } else {
        setState({
          phase: 'complete',
          rank1Code: state.rank1Code,
          rank2Code: state.rank2Code,
          rank3Code: winner,
          candidateSet: [],
          currentMission: null,
          tieTrace: newTrace,
        });
      }
      return;
    }
    
    setState(prev => ({
      ...prev,
      candidateSet: newCandidates,
      currentMission: convertToMission(tieMission),
      tieTrace: newTrace,
    }));
  }, [state, startRank3Resolution]);

  /**
   * Check if tournament needs to run (Rank 2 or 3 has ties)
   * Note: This uses the prop rank1Code which may be stale - use checkNeedsTournament for accurate check
   */
  const needsTournament = useMemo(() => {
    if (!rank1Code) return false;
    
    const rank2Candidates = findCandidates(countsFinal, [rank1Code]);
    if (rank2Candidates.length >= 2) return true;
    
    if (rank2Candidates.length === 1) {
      const rank3Candidates = findCandidates(countsFinal, [rank1Code, rank2Candidates[0]]);
      return rank3Candidates.length >= 2;
    }
    
    return false;
  }, [countsFinal, rank1Code]);

  /**
   * Check if tournament needs to run with a specific rank1 code
   * Use this when rank1 is just determined but not yet in state
   */
  const checkNeedsTournament = useCallback((finalRank1: HollandCode): boolean => {
    console.log('[Rank23] checkNeedsTournament called with rank1:', finalRank1);
    
    const rank2Candidates = findCandidates(countsFinal, [finalRank1]);
    console.log('[Rank23] Rank 2 candidates for check:', rank2Candidates);
    
    if (rank2Candidates.length >= 2) {
      console.log('[Rank23] Tournament needed: Rank 2 has', rank2Candidates.length, 'candidates');
      return true;
    }
    
    if (rank2Candidates.length === 1) {
      const rank3Candidates = findCandidates(countsFinal, [finalRank1, rank2Candidates[0]]);
      console.log('[Rank23] Rank 3 candidates for check:', rank3Candidates);
      if (rank3Candidates.length >= 2) {
        console.log('[Rank23] Tournament needed: Rank 3 has', rank3Candidates.length, 'candidates');
        return true;
      }
    }
    
    console.log('[Rank23] No tournament needed');
    return false;
  }, [countsFinal]);

  /**
   * Get final rankings without tournament (when no ties exist)
   */
  const getAutoResolvedRankings = useCallback((finalRank1: HollandCode): {
    rank2Code: HollandCode;
    rank3Code: HollandCode;
  } | null => {
    const rank2Candidates = findCandidates(countsFinal, [finalRank1]);
    if (rank2Candidates.length !== 1) return null;
    
    const rank2 = rank2Candidates[0];
    const rank3Candidates = findCandidates(countsFinal, [finalRank1, rank2]);
    if (rank3Candidates.length !== 1) return null;
    
    return {
      rank2Code: rank2,
      rank3Code: rank3Candidates[0],
    };
  }, [countsFinal]);

  return {
    state,
    startTournament,
    processChoice,
    needsTournament,
    checkNeedsTournament,
    getAutoResolvedRankings,
    isComplete: state.phase === 'complete',
    isActive: state.phase === 'rank2' || state.phase === 'rank3',
    currentMission: state.currentMission,
    currentRankBeingResolved: state.phase === 'rank2' ? 2 : state.phase === 'rank3' ? 3 : null,
  };
}
