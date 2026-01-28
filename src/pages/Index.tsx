import { useEffect, useMemo } from 'react';
import { useGameState } from '@/hooks/useGameState';
import { GameStage } from '@/components/GameStage';
import { DimensionSelect } from '@/components/DimensionSelect';
import { ComingSoon } from '@/components/ComingSoon';
import { AvatarSelect } from '@/components/AvatarSelect';
import { IntroScreen } from '@/components/IntroScreen';
import { VisualPlayScreen } from '@/components/VisualPlayScreen';
import { LeadForm } from '@/components/LeadForm';
import { SummaryScreen } from '@/components/SummaryScreen';
import { DebugPanel } from '@/components/DebugPanel';
import type { Dimension } from '@/types/identity';

const Index = () => {
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
  } = useGameState();

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
    setPhase('intro');
  };

  const handleStart = () => {
    setPhase('main');
  };

  const handleLeadSubmit = (data: { fullName: string; email: string; phone: string }) => {
    setLeadForm(data);
    setPhase('summary');
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
            onSelect={selectOption}
            onUndo={undo}
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
            onSelect={selectOption}
            onUndo={undo}
          />
        )}

        {state.phase === 'lead' && (
          <LeadForm onSubmit={handleLeadSubmit} />
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
      />
    </>
  );
};

export default Index;
