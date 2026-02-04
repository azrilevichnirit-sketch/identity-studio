import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameState } from '@/hooks/useGameState';
import { useTelemetry } from '@/hooks/useTelemetry';
import { useRank23Tournament } from '@/hooks/useRank23Tournament';
import { GameStage } from '@/components/GameStage';
import { DimensionSelect } from '@/components/DimensionSelect';
import { ComingSoon } from '@/components/ComingSoon';
import { AvatarSelect } from '@/components/AvatarSelect';
import { IntroScreen } from '@/components/IntroScreen';
import { VisualPlayScreen } from '@/components/VisualPlayScreen';
import { LeadForm } from '@/components/LeadForm';
import { ProcessingScreen } from '@/components/ProcessingScreen';
import { SummaryScreen } from '@/components/SummaryScreen';
import { DebugPanel } from '@/components/DebugPanel';
import { TieBreakDebugPanel } from '@/components/TieBreakDebugPanel';
import type { Dimension, HollandCode, MissionOption, LeadFormData, AnalysisResponse } from '@/types/identity';

const Index = () => {
  const [toolEditMode, setToolEditMode] = useState(false);
  
  // Debug mode: always show for now (set to false to hide)
  const showDebug = true;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null);
  const pendingLeadFormRef = useRef<LeadFormData | null>(null);
  
  const {
    state,
    countsFinal,
    leaders,
    historyLength,
    mainMissions,
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
    jumpToMission,
    setRank1Code,
    setRank2Code,
    setRank3Code,
    setRank23TieTrace,
  } = useGameState();

  // Rank 2/3 tournament hook
  const rank23Tournament = useRank23Tournament(countsFinal, state.rank1Code);

  const {
    trackRunStarted,
    trackAvatarSelected,
    trackMissionShown,
    trackMissionPicked,
    trackUndo,
    sendGameplayPayload,
    sendCompletionPayload,
  } = useTelemetry();

  // Track run start on mount
  useEffect(() => {
    trackRunStarted();
  }, [trackRunStarted]);

  // Track mission shown when currentMission changes
  const lastTrackedMissionRef = useRef<string | null>(null);
  useEffect(() => {
    // Track main/tie missions
    if (currentMission && currentMission.mission_id !== lastTrackedMissionRef.current) {
      lastTrackedMissionRef.current = currentMission.mission_id;
      const isTie = state.phase === 'tie';
      trackMissionShown(currentMission.mission_id, isTie);
    }
    // Track Rank 2/3 tournament missions
    if (rank23Tournament.currentMission && rank23Tournament.currentMission.mission_id !== lastTrackedMissionRef.current) {
      lastTrackedMissionRef.current = rank23Tournament.currentMission.mission_id;
      trackMissionShown(rank23Tournament.currentMission.mission_id, true);
    }
  }, [currentMission, rank23Tournament.currentMission, state.phase, trackMissionShown]);

  // Handle phase transitions after main missions complete
  useEffect(() => {
    if (state.phase === 'main' && isMainComplete) {
      // Check for two-way tie for Rank 1
      const hasTie = checkAndSetTiePhase();
      if (!hasTie) {
        // No Rank 1 tie - determine Rank 1 from leaders and check for Rank 2/3 ties
        const rank1 = leaders[0];
        setRank1Code(rank1);
        
        // Check if Rank 2/3 needs tournament using the new function with rank1 parameter
        const startingPhase = rank23Tournament.getStartingPhase(rank1);
        if (startingPhase) {
          rank23Tournament.startTournament(rank1);
          // Set the correct phase based on where the tournament starts
          setPhase(startingPhase === 'rank2' ? 'tie2' : 'tie3');
        } else {
          // No tournament needed - auto-resolve and go to lead form
          const autoResolved = rank23Tournament.getAutoResolvedRankings(rank1);
          if (autoResolved) {
            setRank2Code(autoResolved.rank2Code);
            setRank3Code(autoResolved.rank3Code);
          }
          
          // Send gameplay payload
          const tieState = {
            triggered: state.tieMissionUsed !== null,
            missionId: state.tieMissionUsed?.mission_id || null,
            choiceMade: state.tieChoiceMade,
            locked: state.tieChoiceMade,
          };
          sendGameplayPayload(
            state.avatarGender,
            state.firstPicksByMissionId,
            state.finalPicksByMissionId,
            state.undoEvents,
            tieState,
            countsFinal,
            leaders,
          );
          setPhase('lead');
        }
      }
    }
  }, [state.phase, isMainComplete, checkAndSetTiePhase, setPhase, sendGameplayPayload, state.avatarGender, state.firstPicksByMissionId, state.finalPicksByMissionId, state.undoEvents, state.tieMissionUsed, state.tieChoiceMade, countsFinal, leaders, rank23Tournament, setRank1Code, setRank2Code, setRank3Code]);

  // Handle Rank 1 tie choice completion - then check for Rank 2/3 ties
  useEffect(() => {
    if (state.phase === 'tie' && state.tieChoiceMade) {
      // Rank 1 tie is resolved - determine the winner
      // The winner is the leader after the tie-breaker choice
      const rank1 = leaders[0];
      setRank1Code(rank1);
      
      // Check if Rank 2/3 needs tournament using the new function with rank1 parameter
      const startingPhase = rank23Tournament.getStartingPhase(rank1);
      if (startingPhase) {
        rank23Tournament.startTournament(rank1);
        // Set the correct phase based on where the tournament starts
        setPhase(startingPhase === 'rank2' ? 'tie2' : 'tie3');
      } else {
        // No tournament needed - auto-resolve and go to lead form
        const autoResolved = rank23Tournament.getAutoResolvedRankings(rank1);
        if (autoResolved) {
          setRank2Code(autoResolved.rank2Code);
          setRank3Code(autoResolved.rank3Code);
        }
        
        // Send gameplay payload after tie is resolved
        const tieState = {
          triggered: state.tieMissionUsed !== null,
          missionId: state.tieMissionUsed?.mission_id || null,
          choiceMade: state.tieChoiceMade,
          locked: state.tieChoiceMade,
        };
        sendGameplayPayload(
          state.avatarGender,
          state.firstPicksByMissionId,
          state.finalPicksByMissionId,
          state.undoEvents,
          tieState,
          countsFinal,
          leaders,
        );
        setPhase('lead');
      }
    }
  }, [state.phase, state.tieChoiceMade, setPhase, sendGameplayPayload, state.avatarGender, state.firstPicksByMissionId, state.finalPicksByMissionId, state.undoEvents, state.tieMissionUsed, countsFinal, leaders, rank23Tournament, setRank1Code, setRank2Code, setRank3Code]);

  // Handle Rank 2/3 tournament completion
  useEffect(() => {
    if (rank23Tournament.isComplete && (state.phase === 'tie2' || state.phase === 'tie3')) {
      // Store final rankings
      if (rank23Tournament.state.rank2Code) {
        setRank2Code(rank23Tournament.state.rank2Code);
      }
      if (rank23Tournament.state.rank3Code) {
        setRank3Code(rank23Tournament.state.rank3Code);
      }
      setRank23TieTrace(rank23Tournament.state.tieTrace);
      
      // Send gameplay payload
      const tieState = {
        triggered: state.tieMissionUsed !== null,
        missionId: state.tieMissionUsed?.mission_id || null,
        choiceMade: state.tieChoiceMade,
        locked: true,
      };
      sendGameplayPayload(
        state.avatarGender,
        state.firstPicksByMissionId,
        state.finalPicksByMissionId,
        state.undoEvents,
        tieState,
        countsFinal,
        leaders,
      );
      setPhase('lead');
    }
  }, [rank23Tournament.isComplete, rank23Tournament.state, state.phase, setRank2Code, setRank3Code, setRank23TieTrace, sendGameplayPayload, state.avatarGender, state.firstPicksByMissionId, state.finalPicksByMissionId, state.undoEvents, state.tieMissionUsed, state.tieChoiceMade, countsFinal, leaders, setPhase]);

  // Update phase when tournament moves from rank2 to rank3
  useEffect(() => {
    if (state.phase === 'tie2' && rank23Tournament.state.phase === 'rank3') {
      setPhase('tie3');
    }
  }, [state.phase, rank23Tournament.state.phase, setPhase]);

  const handleDimensionSelect = (dimension: Dimension) => {
    setDimension(dimension);
    if (dimension === 'surprise' || dimension === 'farm') {
      setPhase('coming-soon');
    } else {
      setPhase('avatar');
    }
  };

  const handleBackToDimension = () => {
    setDimension(null);
    setPhase('dimension');
  };

  const handleAvatarSelect = (gender: 'female' | 'male') => {
    setAvatarGender(gender);
    trackAvatarSelected();
    setPhase('intro');
  };

  const handleStart = () => {
    setPhase('main');
  };

  const handleLeadSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);
    pendingLeadFormRef.current = data;
    setLeadForm(data);
    
    // Move to processing screen immediately
    setPhase('processing');
    setIsSubmitting(false);

    // Prepare tie state for the payload
    const tieState = {
      triggered: state.tieMissionUsed !== null,
      missionId: state.tieMissionUsed?.mission_id || null,
      choiceMade: state.tieChoiceMade,
      locked: state.tieChoiceMade,
    };

    // Calculate rank2 and rank3 candidates for tie_flags
    const DEFAULT_ORDER: HollandCode[] = ['r', 'i', 'a', 's', 'e', 'c'];
    const findCandidatesLocal = (excludeCodes: HollandCode[]): HollandCode[] => {
      const remaining = DEFAULT_ORDER.filter(code => !excludeCodes.includes(code));
      if (remaining.length === 0) return [];
      const maxScore = Math.max(...remaining.map(code => countsFinal[code]));
      return remaining.filter(code => countsFinal[code] === maxScore);
    };
    
    const rank2Candidates = state.rank1Code ? findCandidatesLocal([state.rank1Code]) : [];
    const rank3Candidates = (state.rank1Code && state.rank2Code) 
      ? findCandidatesLocal([state.rank1Code, state.rank2Code]) 
      : [];

    // Send completion payload and wait for analysis response
    const result = await sendCompletionPayload(
      data,
      state.avatarGender,
      countsFinal,
      leaders,
      state.firstPicksByMissionId,
      state.finalPicksByMissionId,
      state.undoEvents,
      tieState,
      // Include Rank 2/3 results
      state.rank1Code,
      state.rank2Code,
      state.rank3Code,
      state.rank23TieTrace,
      // NEW: Include candidates for tie_flags
      rank2Candidates,
      rank3Candidates,
    );

    // Store analysis data and move to summary
    setAnalysisData(result.analysis);
    setPhase('summary');
  };

  // Wrapper for selectOption that includes telemetry
  const handleSelect = (missionId: string, key: 'a' | 'b', hollandCode: HollandCode, option?: MissionOption) => {
    const isTie = state.phase === 'tie';
    trackMissionPicked(missionId, key, isTie);
    selectOption(missionId, key, hollandCode, option);
  };

  // Handler for Rank 2/3 tournament choices
  const handleRank23Select = (missionId: string, key: 'a' | 'b', hollandCode: HollandCode) => {
    trackMissionPicked(missionId, key, true);
    rank23Tournament.processChoice(key);
  };

  // Wrapper for undo that includes telemetry
  const handleUndo = () => {
    if (currentMission) {
      trackUndo(currentMission.mission_id);
    }
    undo();
  };

  // Convert finalPicksByMissionId to array for placed props display
  const placedProps = useMemo(() => {
    return Object.values(state.finalPicksByMissionId);
  }, [state.finalPicksByMissionId]);

  // Determine which mission to show for Rank 2/3 phases
  const rank23Mission = rank23Tournament.currentMission;
  const rank23MissionNumber = state.phase === 'tie2' 
    ? (rank23Tournament.currentRankBeingResolved === 2 ? 14 : 15)
    : (rank23Tournament.currentRankBeingResolved === 3 ? 15 : 14);

  return (
    <>
      <GameStage>
        {state.phase === 'dimension' && (
          <DimensionSelect onSelect={handleDimensionSelect} />
        )}

        {state.phase === 'coming-soon' && (
          <ComingSoon onBack={handleBackToDimension} />
        )}

        {state.phase === 'avatar' && (
          <AvatarSelect onSelect={handleAvatarSelect} />
        )}

        {state.phase === 'intro' && (
          <IntroScreen avatarGender={state.avatarGender} onStart={handleStart} />
        )}

        {state.phase === 'main' && currentMission && (
          <VisualPlayScreen
            mission={currentMission}
            currentIndex={state.mainIndex}
            totalMissions={mainMissions.length}
            isTieBreaker={false}
            canUndo={canUndo}
            avatarGender={state.avatarGender}
            placedProps={placedProps}
            onSelect={handleSelect}
            onUndo={handleUndo}
            toolEditMode={toolEditMode}
            onEditorNextMission={() => {
              const optionA = currentMission.options.find(o => o.key === 'a');
              if (optionA) {
                handleSelect(currentMission.mission_id, 'a', optionA.holland_code, optionA);
              }
            }}
          />
        )}

        {state.phase === 'tie' && currentMission && (
          <VisualPlayScreen
            mission={currentMission}
            currentIndex={mainMissions.length}
            totalMissions={mainMissions.length + 1}
            isTieBreaker={true}
            canUndo={canUndo}
            avatarGender={state.avatarGender}
            placedProps={placedProps}
            onSelect={handleSelect}
            onUndo={handleUndo}
            toolEditMode={toolEditMode}
            onEditorNextMission={() => {
              const optionA = currentMission.options.find(o => o.key === 'a');
              if (optionA) {
                handleSelect(currentMission.mission_id, 'a', optionA.holland_code, optionA);
              }
            }}
          />
        )}

        {/* Rank 2/3 Tournament Phases */}
        {(state.phase === 'tie2' || state.phase === 'tie3') && rank23Mission && (
          <VisualPlayScreen
            mission={rank23Mission}
            currentIndex={rank23MissionNumber - 1}
            totalMissions={mainMissions.length + 3} // 12 main + tie1 + tie2 + tie3
            isTieBreaker={true}
            canUndo={false} // No undo during Rank 2/3 tournament
            avatarGender={state.avatarGender}
            placedProps={placedProps}
            onSelect={handleRank23Select}
            onUndo={() => {}} // Disabled
            toolEditMode={toolEditMode}
            onEditorNextMission={() => {
              const optionA = rank23Mission.options.find(o => o.key === 'a');
              if (optionA) {
                handleRank23Select(rank23Mission.mission_id, 'a', optionA.holland_code);
              }
            }}
          />
        )}

        {state.phase === 'lead' && (
          <LeadForm onSubmit={handleLeadSubmit} isSubmitting={isSubmitting} />
        )}

        {state.phase === 'processing' && (
          <ProcessingScreen />
        )}

        {state.phase === 'summary' && (
          <SummaryScreen
            state={state}
            countsFinal={countsFinal}
            leaders={leaders}
            analysis={analysisData}
          />
        )}
      </GameStage>

      {showDebug && (
        <>
          <DebugPanel
            state={state}
            countsFinal={countsFinal}
            leaders={leaders}
            historyLength={historyLength}
            onToolEditModeChange={setToolEditMode}
            onJumpToMission={jumpToMission}
            totalMissions={mainMissions.length}
          />
          <TieBreakDebugPanel
            state={state}
            countsFinal={countsFinal}
            leaders={leaders}
            rank23State={rank23Tournament.state}
            startingPhase={state.rank1Code ? rank23Tournament.getStartingPhase(state.rank1Code) : null}
            currentPhase={state.phase}
            rank2Candidates={rank23Tournament.getCandidatesForDebug(state.rank1Code).rank2Candidates}
            rank3Candidates={rank23Tournament.getCandidatesForDebug(state.rank1Code).rank3Candidates}
            lastComparison={rank23Tournament.state.tieTrace[rank23Tournament.state.tieTrace.length - 1]}
          />
        </>
      )}
    </>
  );
};

export default Index;
