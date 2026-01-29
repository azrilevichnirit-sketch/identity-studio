import { useState, useCallback, useMemo } from 'react';
import type { GameState, Phase, AvatarGender, Dimension, HollandCode, PickRecord, UndoEvent, Mission, LeadFormData, CountsFinal, MissionOption } from '@/types/identity';
import { getStudioQuests, getStudioTie } from '@/lib/jsonDataLoader';

const initialState: GameState = {
  phase: 'dimension',
  dimension: null,
  avatarGender: null,
  mainIndex: 0,
  firstPicksByMissionId: {},
  finalPicksByMissionId: {},
  undoEvents: [],
  tieMissionUsed: null,
  tieChoiceMade: false,
  leadForm: null,
};

export function useGameState() {
  const [state, setState] = useState<GameState>(initialState);

  // Load missions from JSON loader
  const mainMissions = useMemo(() => getStudioQuests(), []);
  const tieMissions = useMemo(() => getStudioTie(), []);

  const countsFinal = useMemo<CountsFinal>(() => {
    const counts: CountsFinal = { r: 0, i: 0, a: 0, s: 0, e: 0, c: 0 };
    Object.values(state.finalPicksByMissionId).forEach((pick) => {
      counts[pick.hollandCode]++;
    });
    return counts;
  }, [state.finalPicksByMissionId]);

  const leaders = useMemo(() => {
    const maxCount = Math.max(...Object.values(countsFinal));
    if (maxCount === 0) return [];
    return (Object.keys(countsFinal) as HollandCode[]).filter(
      (code) => countsFinal[code] === maxCount
    );
  }, [countsFinal]);

  const historyLength = useMemo(() => {
    return Object.keys(state.finalPicksByMissionId).length;
  }, [state.finalPicksByMissionId]);

  const setPhase = useCallback((phase: Phase) => {
    setState((prev) => ({ ...prev, phase }));
  }, []);

  const setDimension = useCallback((dimension: Dimension) => {
    setState((prev) => ({ ...prev, dimension }));
  }, []);

  const setAvatarGender = useCallback((avatarGender: AvatarGender) => {
    setState((prev) => ({ ...prev, avatarGender }));
  }, []);

  const selectOption = useCallback((missionId: string, key: 'a' | 'b', hollandCode: HollandCode, option?: MissionOption) => {
    setState((prev) => {
      const pick: PickRecord = { 
        missionId, 
        key, 
        hollandCode,
        // Include asset name for rendering
        assetName: option?.asset,
        // Include next_bg_override for background transitions
        nextBgOverride: option?.next_bg_override,
        // Include placement info from option if provided
        placementMode: option?.placement_mode,
        anchorRef: option?.anchor_ref,
        offsetX: option?.offset_x,
        offsetY: option?.offset_y,
        scale: option?.scale,
        persist: option?.persist,
      };
      const newFirst = { ...prev.firstPicksByMissionId };
      const newFinal = { ...prev.finalPicksByMissionId };

      // Only store first pick if not already recorded
      if (!newFirst[missionId]) {
        newFirst[missionId] = pick;
      }
      newFinal[missionId] = pick;

      // Advance index if in main phase
      let newIndex = prev.mainIndex;
      if (prev.phase === 'main' && prev.mainIndex < mainMissions.length) {
        newIndex = prev.mainIndex + 1;
      }

      // Handle tie phase
      let newTieChoiceMade = prev.tieChoiceMade;
      if (prev.phase === 'tie') {
        newTieChoiceMade = true;
      }

      return {
        ...prev,
        mainIndex: newIndex,
        firstPicksByMissionId: newFirst,
        finalPicksByMissionId: newFinal,
        tieChoiceMade: newTieChoiceMade,
      };
    });
  }, [mainMissions.length]);

  const undo = useCallback(() => {
    setState((prev) => {
      // Can't undo after tie choice is made
      if (prev.tieChoiceMade) return prev;

      // If in tie phase but haven't chosen, go back to mission 12
      if (prev.phase === 'tie' && !prev.tieChoiceMade) {
        const newFinal = { ...prev.finalPicksByMissionId };
        if (prev.tieMissionUsed) {
          delete newFinal[prev.tieMissionUsed.mission_id];
        }
        return {
          ...prev,
          phase: 'main',
          mainIndex: mainMissions.length - 1,
          tieMissionUsed: null,
          finalPicksByMissionId: newFinal,
        };
      }

      // Normal undo in main phase
      if (prev.phase === 'main' && prev.mainIndex > 0) {
        const targetIndex = prev.mainIndex - 1;
        const targetMission = mainMissions[targetIndex];
        const currentPick = prev.finalPicksByMissionId[targetMission.mission_id];
        
        if (!currentPick) return prev;

        // Log the undo event (even if same trait)
        const undoEvent: UndoEvent = {
          missionId: targetMission.mission_id,
          prevTrait: currentPick.hollandCode,
          newTrait: currentPick.hollandCode, // Will be updated when user makes new selection
          timestamp: Date.now(),
        };

        const newFinal = { ...prev.finalPicksByMissionId };
        delete newFinal[targetMission.mission_id];

        return {
          ...prev,
          mainIndex: targetIndex,
          finalPicksByMissionId: newFinal,
          undoEvents: [...prev.undoEvents, undoEvent],
        };
      }

      return prev;
    });
  }, [mainMissions]);

  const findTieMission = useCallback((tiedCodes: HollandCode[]): Mission | null => {
    if (tiedCodes.length !== 2) return null;
    
    // Tie missions use pair_key like "ir", "ar", etc.
    const code1 = tiedCodes[0];
    const code2 = tiedCodes[1];
    
    const mission = tieMissions.find((m) => {
      const pairKey = m.pair_key?.toLowerCase() || '';
      return (
        (pairKey.includes(code1) && pairKey.includes(code2))
      );
    });
    
    return mission || null;
  }, [tieMissions]);

  const checkAndSetTiePhase = useCallback(() => {
    // Two-way tie for 1st place only
    if (leaders.length === 2) {
      const tieMission = findTieMission(leaders);
      if (tieMission) {
        setState((prev) => ({
          ...prev,
          phase: 'tie',
          tieMissionUsed: tieMission,
        }));
        return true;
      }
    }
    return false;
  }, [leaders, findTieMission]);

  const setLeadForm = useCallback((data: LeadFormData) => {
    setState((prev) => ({ ...prev, leadForm: data }));
  }, []);

  const canUndo = useMemo(() => {
    if (state.tieChoiceMade) return false;
    if (state.phase === 'tie') return true; // Can go back to mission 12
    if (state.phase === 'main' && state.mainIndex > 0) return true;
    return false;
  }, [state.phase, state.mainIndex, state.tieChoiceMade]);

  const currentMission = useMemo(() => {
    if (state.phase === 'main' && state.mainIndex < mainMissions.length) {
      return mainMissions[state.mainIndex];
    }
    if (state.phase === 'tie' && state.tieMissionUsed) {
      return state.tieMissionUsed;
    }
    return null;
  }, [state.phase, state.mainIndex, state.tieMissionUsed, mainMissions]);

  const isMainComplete = state.mainIndex >= mainMissions.length;

  return {
    state,
    countsFinal,
    leaders,
    historyLength,
    mainMissions,
    tieMissions,
    currentMission,
    isMainComplete,
    canUndo,
    setPhase,
    setDimension,
    setAvatarGender,
    selectOption,
    undo,
    checkAndSetTiePhase,
    setLeadForm,
  };
}
