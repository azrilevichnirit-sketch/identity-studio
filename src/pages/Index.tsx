import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameState } from '@/hooks/useGameState';
import { useTelemetry } from '@/hooks/useTelemetry';
import { GameStage } from '@/components/GameStage';
import { DimensionSelect } from '@/components/DimensionSelect';
import { ComingSoon } from '@/components/ComingSoon';
import { AvatarSelect } from '@/components/AvatarSelect';
import { IntroScreen } from '@/components/IntroScreen';
import { VisualPlayScreen } from '@/components/VisualPlayScreen';
import { LeadForm } from '@/components/LeadForm';
import { SummaryScreen } from '@/components/SummaryScreen';
import { DebugPanel } from '@/components/DebugPanel';
import type { Dimension, HollandCode, MissionOption, LeadFormData } from '@/types/identity';

const Index = () => {
  const [toolEditMode, setToolEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  } = useGameState();

  const {
    trackRunStarted,
    trackAvatarSelected,
    trackMissionShown,
    trackMissionPicked,
    trackUndo,
    sendPayload,
  } = useTelemetry();

  // Track run start on mount
  useEffect(() => {
    trackRunStarted();
  }, [trackRunStarted]);

  // Track mission shown when currentMission changes
  const lastTrackedMissionRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentMission && currentMission.mission_id !== lastTrackedMissionRef.current) {
      lastTrackedMissionRef.current = currentMission.mission_id;
      const isTie = state.phase === 'tie';
      trackMissionShown(currentMission.mission_id, isTie);
    }
  }, [currentMission, state.phase, trackMissionShown]);

  // Handle phase transitions after main missions complete
  useEffect(() => {
    if (state.phase === 'main' && isMainComplete) {
      // Check for two-way tie
      const hasTie = checkAndSetTiePhase();
      if (!hasTie) {
        // No tie, go to lead form
        setPhase('lead');
      }
    }
  }, [state.phase, isMainComplete, checkAndSetTiePhase, setPhase]);

  // Handle tie choice completion
  useEffect(() => {
    if (state.phase === 'tie' && state.tieChoiceMade) {
      setPhase('lead');
    }
  }, [state.phase, state.tieChoiceMade, setPhase]);

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
    
    // Build tie state
    const tieState = {
      triggered: state.tieMissionUsed !== null,
      missionId: state.tieMissionUsed?.mission_id || null,
      choiceMade: state.tieChoiceMade,
      locked: state.tieChoiceMade,
    };

    // Send telemetry payload
    await sendPayload(
      state.avatarGender,
      state.firstPicksByMissionId,
      state.finalPicksByMissionId,
      state.undoEvents,
      tieState,
      countsFinal,
      leaders,
      data,
    );

    // Continue to summary regardless of webhook result
    setLeadForm(data);
    setIsSubmitting(false);
    setPhase('summary');
  };

  // Wrapper for selectOption that includes telemetry
  const handleSelect = (missionId: string, key: 'a' | 'b', hollandCode: HollandCode, option?: MissionOption) => {
    const isTie = state.phase === 'tie';
    trackMissionPicked(missionId, key, isTie);
    selectOption(missionId, key, hollandCode, option);
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

        {state.phase === 'lead' && (
          <LeadForm onSubmit={handleLeadSubmit} isSubmitting={isSubmitting} />
        )}

        {state.phase === 'summary' && (
          <SummaryScreen
            state={state}
            countsFinal={countsFinal}
            leaders={leaders}
          />
        )}
      </GameStage>

      <DebugPanel
        state={state}
        countsFinal={countsFinal}
        leaders={leaders}
        historyLength={historyLength}
        onToolEditModeChange={setToolEditMode}
        onJumpToMission={jumpToMission}
        totalMissions={mainMissions.length}
      />
    </>
  );
};

export default Index;
