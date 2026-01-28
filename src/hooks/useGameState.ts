import { useState, useCallback, useMemo } from 'react';
import type { GameState, Phase, AvatarGender, Dimension, HollandCode, PickRecord, UndoEvent, Mission, LeadFormData, CountsFinal } from '@/types/identity';
import missionsMain from '@/data/missions_studio_main.json';
import missionsTie from '@/data/missions_studio_tie.json';

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

  const mainMissions = missionsMain as Mission[];
  const tieMissions = missionsTie as Mission[];

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

  const selectOption = useCallback((missionId: string, key: 'a' | 'b', hollandCode: HollandCode) => {
    setState((prev) => {
      const pick: PickRecord = { missionId, key, hollandCode };
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
    
    const pairKey1 = `${tiedCodes[0]}_${tiedCodes[1]}`;
    const pairKey2 = `${tiedCodes[1]}_${tiedCodes[0]}`;
    
    const mission = tieMissions.find(
      (m) => m.pair_key === pairKey1 || m.pair_key === pairKey2
    );
    
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
