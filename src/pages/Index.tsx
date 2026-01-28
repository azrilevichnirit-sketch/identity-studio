import { useEffect } from 'react';
import { useGameState } from '@/hooks/useGameState';
import { AvatarSelect } from '@/components/AvatarSelect';
import { IntroScreen } from '@/components/IntroScreen';
import { PlayScreen } from '@/components/PlayScreen';
import { LeadForm } from '@/components/LeadForm';
import { SummaryScreen } from '@/components/SummaryScreen';
import { DebugPanel } from '@/components/DebugPanel';

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

  return (
    <div className="min-h-screen pb-12">
      {state.phase === 'avatar' && (
        <AvatarSelect onSelect={handleAvatarSelect} />
      )}

      {state.phase === 'intro' && (
        <IntroScreen avatarGender={state.avatarGender} onStart={handleStart} />
      )}

      {state.phase === 'main' && currentMission && (
        <PlayScreen
          mission={currentMission}
          currentIndex={state.mainIndex}
          totalMissions={mainMissions.length}
          isTieBreaker={false}
          canUndo={canUndo}
          onSelect={selectOption}
          onUndo={undo}
        />
      )}

      {state.phase === 'tie' && currentMission && (
        <PlayScreen
          mission={currentMission}
          currentIndex={mainMissions.length}
          totalMissions={mainMissions.length + 1}
          isTieBreaker={true}
          canUndo={canUndo}
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

      <DebugPanel
        state={state}
        countsFinal={countsFinal}
        leaders={leaders}
        historyLength={historyLength}
      />
    </div>
  );
};

export default Index;
