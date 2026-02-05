import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameState } from '@/hooks/useGameState';
import { useTelemetry } from '@/hooks/useTelemetry';
import { useFullTournament } from '@/hooks/useFullTournament';
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
import { toast } from 'sonner';
import type { Dimension, HollandCode, MissionOption, LeadFormData } from '@/types/identity';

const Index = () => {
  const [toolEditMode, setToolEditMode] = useState(false);
  
  // Debug mode: disabled for production
  const showDebug = false;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const resultTextRef = useRef<string | null>(null);
  const pendingLeadFormRef = useRef<LeadFormData | null>(null);
  
  // Keep ref in sync with state for polling
  useEffect(() => {
    resultTextRef.current = resultText;
  }, [resultText]);
  
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

  // Full tournament hook (supports Rank 1, 2, and 3)
  const tournament = useFullTournament(countsFinal);

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
    // Track tournament missions
    if (tournament.currentMission && tournament.currentMission.mission_id !== lastTrackedMissionRef.current) {
      lastTrackedMissionRef.current = tournament.currentMission.mission_id;
      trackMissionShown(tournament.currentMission.mission_id, true);
    }
  }, [currentMission, tournament.currentMission, state.phase, trackMissionShown]);

  // Handle phase transitions after main missions complete
  useEffect(() => {
    if (state.phase === 'main' && isMainComplete) {
      console.log('[Index] Main complete. Leaders:', leaders, 'Count:', leaders.length);
      
      // Check what tournament is needed
      const tournamentNeeds = tournament.checkNeedsTournament(leaders);
      console.log('[Index] Tournament needs:', tournamentNeeds);
      
      if (leaders.length >= 2) {
        // Need Rank 1 tournament (2+ leaders)
        console.log('[Index] Starting Rank 1 tournament with leaders:', leaders);
        tournament.startTournament(leaders);
        setPhase('tie1');
      } else if (leaders.length === 1) {
        // Rank 1 is clear, check Rank 2/3
        const rank1 = leaders[0];
        setRank1Code(rank1);
        
        if (tournamentNeeds.needsRank2 || tournamentNeeds.needsRank3) {
          console.log('[Index] Starting Rank 2/3 tournament with rank1:', rank1);
          tournament.startFromRank2(rank1);
          setPhase(tournamentNeeds.needsRank2 ? 'tie2' : 'tie3');
        } else {
          // No tournament needed - auto-resolve and go to lead form
          const autoResolved = tournament.getAutoResolvedRankings(rank1);
          if (autoResolved) {
            setRank2Code(autoResolved.rank2Code);
            setRank3Code(autoResolved.rank3Code);
          }
          
          sendAutoResolvedPayload(rank1, autoResolved?.rank2Code || null, autoResolved?.rank3Code || null);
          setPhase('lead');
        }
      }
    }
  }, [state.phase, isMainComplete, leaders, tournament, setPhase, setRank1Code, setRank2Code, setRank3Code]);

  // Handle 2-way tie for Rank 1 using legacy tie system (phase: 'tie')
  // This is for backward compatibility with existing 2-way tie missions
  useEffect(() => {
    if (state.phase === 'tie' && state.tieChoiceMade) {
      // Rank 1 tie is resolved via legacy system
      const rank1 = leaders[0];
      setRank1Code(rank1);
      
      // Check if Rank 2/3 needs tournament
      const tournamentNeeds = tournament.checkNeedsTournament([rank1]);
      
      if (tournamentNeeds.needsRank2 || tournamentNeeds.needsRank3) {
        tournament.startFromRank2(rank1);
        setPhase(tournamentNeeds.needsRank2 ? 'tie2' : 'tie3');
      } else {
        // No tournament needed - auto-resolve and go to lead form
        const autoResolved = tournament.getAutoResolvedRankings(rank1);
        if (autoResolved) {
          setRank2Code(autoResolved.rank2Code);
          setRank3Code(autoResolved.rank3Code);
        }
        
        sendAutoResolvedPayload(rank1, autoResolved?.rank2Code || null, autoResolved?.rank3Code || null);
        setPhase('lead');
      }
    }
  }, [state.phase, state.tieChoiceMade, leaders, tournament, setPhase, setRank1Code, setRank2Code, setRank3Code]);

  // Handle tournament completion
  useEffect(() => {
    if (tournament.isComplete && (state.phase === 'tie1' || state.phase === 'tie2' || state.phase === 'tie3')) {
      console.log('[Index] Tournament complete:', tournament.state);
      
      // Store final rankings
      if (tournament.state.rank1Code) {
        setRank1Code(tournament.state.rank1Code);
      }
      if (tournament.state.rank2Code) {
        setRank2Code(tournament.state.rank2Code);
      }
      if (tournament.state.rank3Code) {
        setRank3Code(tournament.state.rank3Code);
      }
      setRank23TieTrace(tournament.state.tieTrace);
      
      // Send gameplay payload
      sendTournamentPayload(
        tournament.state.rank1Code,
        tournament.state.rank2Code,
        tournament.state.rank3Code,
        tournament.state.tieTrace
      );
      setPhase('lead');
    }
  }, [tournament.isComplete, tournament.state, state.phase, setRank1Code, setRank2Code, setRank3Code, setRank23TieTrace, setPhase]);

  // Update phase when tournament moves between ranks
  useEffect(() => {
    if (state.phase === 'tie1' && tournament.state.phase === 'rank2') {
      setPhase('tie2');
    } else if ((state.phase === 'tie1' || state.phase === 'tie2') && tournament.state.phase === 'rank3') {
      setPhase('tie3');
    }
  }, [state.phase, tournament.state.phase, setPhase]);

  // Helper function to send payload when auto-resolved
  const sendAutoResolvedPayload = async (rank1: HollandCode, rank2: HollandCode | null, rank3: HollandCode | null) => {
    const tieState = {
      triggered: state.tieMissionUsed !== null,
      missionId: state.tieMissionUsed?.mission_id || null,
      choiceMade: state.tieChoiceMade,
      locked: state.tieChoiceMade,
    };
    
    const DEFAULT_ORDER: HollandCode[] = ['r', 'i', 'a', 's', 'e', 'c'];
    const findCandidates = (excludeCodes: HollandCode[]): HollandCode[] => {
      const remaining = DEFAULT_ORDER.filter(code => !excludeCodes.includes(code));
      if (remaining.length === 0) return [];
      const maxScore = Math.max(...remaining.map(code => countsFinal[code]));
      return remaining.filter(code => countsFinal[code] === maxScore);
    };
    
    const rank2Candidates = findCandidates([rank1]);
    const rank3Candidates = rank2 ? findCandidates([rank1, rank2]) : [];
    
    const tieFlags = {
      rank1_triggered: leaders.length > 1,
      rank2_triggered: rank2Candidates.length > 1,
      rank2_candidates: rank2Candidates.map(c => c.toLowerCase() as HollandCode),
      rank3_triggered: rank3Candidates.length > 1,
      rank3_candidates: rank3Candidates.map(c => c.toLowerCase() as HollandCode),
    };
    
    const result = await sendGameplayPayload(
      state.avatarGender,
      state.firstPicksByMissionId,
      state.finalPicksByMissionId,
      state.undoEvents,
      tieState,
      countsFinal,
      leaders,
      rank1,
      rank2,
      rank3,
      tieFlags,
      [],
      [],
    );
    
    // Store result text from gameplay payload
    if (result.success && result.resultText) {
      console.log("[Index] Gameplay result text received:", result.resultText.substring(0, 100) + "...");
      setResultText(result.resultText);
    }
  };

  // Helper function to send payload after tournament
  const sendTournamentPayload = async (
    rank1: HollandCode | null,
    rank2: HollandCode | null,
    rank3: HollandCode | null,
    tieTrace: typeof tournament.state.tieTrace
  ) => {
    const tieState = {
      triggered: true,
      missionId: state.tieMissionUsed?.mission_id || null,
      choiceMade: true,
      locked: true,
    };
    
    const DEFAULT_ORDER: HollandCode[] = ['r', 'i', 'a', 's', 'e', 'c'];
    const findCandidates = (excludeCodes: HollandCode[]): HollandCode[] => {
      const remaining = DEFAULT_ORDER.filter(code => !excludeCodes.includes(code));
      if (remaining.length === 0) return [];
      const maxScore = Math.max(...remaining.map(code => countsFinal[code]));
      return remaining.filter(code => countsFinal[code] === maxScore);
    };
    
    const rank2Candidates = rank1 ? findCandidates([rank1]) : [];
    const rank3Candidates = (rank1 && rank2) ? findCandidates([rank1, rank2]) : [];
    
    const tieFlags = {
      rank1_triggered: leaders.length > 1,
      rank2_triggered: rank2Candidates.length > 1,
      rank2_candidates: rank2Candidates.map(c => c.toLowerCase() as HollandCode),
      rank3_triggered: rank3Candidates.length > 1,
      rank3_candidates: rank3Candidates.map(c => c.toLowerCase() as HollandCode),
    };
    
    const combinedTieTrace = tieTrace.map((t, index) => ({
      round: `rank${t.rank}_comparison_${index + 1}`,
      pair: t.pairCodes.toLowerCase(),
      winner: t.winner.toLowerCase(),
    }));
    
    const rank23TieTrace = tieTrace.map((t, index) => ({
      round: `rank${t.rank}_comparison_${index + 1}`,
      pair: t.pairCodes.toLowerCase(),
      winner: t.winner.toLowerCase(),
      loser: t.loser.toLowerCase(),
    }));
    
    const result = await sendGameplayPayload(
      state.avatarGender,
      state.firstPicksByMissionId,
      state.finalPicksByMissionId,
      state.undoEvents,
      tieState,
      countsFinal,
      leaders,
      rank1,
      rank2,
      rank3,
      tieFlags,
      combinedTieTrace,
      rank23TieTrace,
    );
    
    // Store result text from gameplay payload
    if (result.success && result.resultText) {
      console.log("[Index] Tournament gameplay result text received:", result.resultText.substring(0, 100) + "...");
      setResultText(result.resultText);
    }
  };

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
    console.log("[Index] handleLeadSubmit called with:", data);
    setIsSubmitting(true);
    pendingLeadFormRef.current = data;
    setLeadForm(data);
    
    // Show processing screen while we wait
    setPhase('processing');

    try {
      console.log("[Index] About to call sendCompletionPayload...");
      const result = await sendCompletionPayload(data);
      console.log("[Index] Completion payload result:", result);
    } catch (error) {
      console.error("[Index] Failed to send completion payload:", error);
    }

    setIsSubmitting(false);
    
    // Wait for resultText to be available before showing summary
    // Use ref to check current value in polling loop
    if (resultTextRef.current) {
      console.log("[Index] Result text available, showing summary:", resultTextRef.current.length, "chars");
      setPhase('summary');
    } else {
      // If no result text yet, wait a bit and check again
      console.log("[Index] No result text yet, waiting...");
      
      // Poll for result text for up to 15 seconds
      const startTime = Date.now();
      const checkForResult = () => {
        if (resultTextRef.current) {
          console.log("[Index] Result text received:", resultTextRef.current.length, "chars");
          setPhase('summary');
        } else if (Date.now() - startTime > 15000) {
          // Timeout - show summary anyway
          console.log("[Index] Timeout waiting for result text, showing summary");
          setPhase('summary');
        } else {
          setTimeout(checkForResult, 500);
        }
      };
      setTimeout(checkForResult, 500);
    }
  };

  // Wrapper for selectOption that includes telemetry
  const handleSelect = (missionId: string, key: 'a' | 'b', hollandCode: HollandCode, option?: MissionOption) => {
    const isTie = state.phase === 'tie';
    trackMissionPicked(missionId, key, isTie);
    selectOption(missionId, key, hollandCode, option);
  };

  // Handler for tournament choices
  const handleTournamentSelect = (missionId: string, key: 'a' | 'b', hollandCode: HollandCode) => {
    trackMissionPicked(missionId, key, true);
    tournament.processChoice(key);
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

  // Determine which mission to show for tournament phases
  const tournamentMission = tournament.currentMission;
  const tournamentMissionNumber = useMemo(() => {
    // Base number is 12 (main missions) + rank number
    const rankNum = tournament.currentRankBeingResolved || 1;
    return 12 + rankNum;
  }, [tournament.currentRankBeingResolved]);

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

        {/* Legacy 2-way tie phase (for backward compatibility) */}
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

        {/* Tournament Phases (Rank 1, 2, or 3) */}
        {(state.phase === 'tie1' || state.phase === 'tie2' || state.phase === 'tie3') && tournamentMission && (
          <VisualPlayScreen
            mission={tournamentMission}
            currentIndex={tournamentMissionNumber - 1}
            totalMissions={mainMissions.length + 3}
            isTieBreaker={true}
            canUndo={false}
            avatarGender={state.avatarGender}
            placedProps={placedProps}
            onSelect={handleTournamentSelect}
            onUndo={() => {}}
            toolEditMode={toolEditMode}
            onEditorNextMission={() => {
              const optionA = tournamentMission.options.find(o => o.key === 'a');
              if (optionA) {
                handleTournamentSelect(tournamentMission.mission_id, 'a', optionA.holland_code);
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
            resultText={resultText}
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
            rank23State={tournament.state}
            startingPhase={state.rank1Code ? (tournament.checkNeedsTournament([state.rank1Code]).needsRank2 ? 'rank2' : 'rank3') : null}
            currentPhase={state.phase}
            rank2Candidates={tournament.getCandidatesForDebug(state.rank1Code).rank2Candidates}
            rank3Candidates={tournament.getCandidatesForDebug(state.rank1Code).rank3Candidates}
            lastComparison={tournament.state.tieTrace[tournament.state.tieTrace.length - 1]}
          />
        </>
      )}
    </>
  );
};

export default Index;
