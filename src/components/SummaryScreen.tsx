import type { GameState, CountsFinal, HollandCode } from '@/types/identity';

interface SummaryScreenProps {
  state: GameState;
  countsFinal: CountsFinal;
  leaders: HollandCode[];
}

const HOLLAND_LABELS: Record<HollandCode, string> = {
  r: 'מעשי (Realistic)',
  i: 'חוקר (Investigative)',
  a: 'אמנותי (Artistic)',
  s: 'חברתי (Social)',
  e: 'יזמי (Enterprising)',
  c: 'מאורגן (Conventional)',
};

export function SummaryScreen({ state, countsFinal, leaders }: SummaryScreenProps) {
  const exportData = {
    avatarGender: state.avatarGender,
    countsFinal,
    leaders,
    firstPicksByMissionId: state.firstPicksByMissionId,
    finalPicksByMissionId: state.finalPicksByMissionId,
    undoEvents: state.undoEvents,
    tieMissionUsed: state.tieMissionUsed?.mission_id || null,
    leadForm: state.leadForm,
    timestamp: new Date().toISOString(),
  };

  const maxCount = Math.max(...Object.values(countsFinal));

  return (
    <div className="screen-container">
      <div className="w-full max-w-sm">
        <div className="card-surface mb-4 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h1 className="text-2xl font-bold mb-2">התוצאות שלך!</h1>
          
          {leaders.length > 0 && (
            <div className="mb-4">
              <p className="text-muted-foreground text-sm mb-2">הפרופיל המוביל שלך:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {leaders.map((code) => (
                  <span
                    key={code}
                    className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium"
                  >
                    {HOLLAND_LABELS[code]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Scores breakdown */}
        <div className="card-surface mb-4">
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground">חלוקת הניקוד</h2>
          <div className="space-y-2">
            {(Object.keys(countsFinal) as HollandCode[]).map((code) => (
              <div key={code} className="flex items-center gap-3">
                <span className="text-xs w-24 truncate">{HOLLAND_LABELS[code]}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{
                      width: maxCount > 0 ? `${(countsFinal[code] / maxCount) * 100}%` : '0%',
                    }}
                  />
                </div>
                <span className="text-xs font-medium w-4 text-left">{countsFinal[code]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* JSON output */}
        <div className="card-surface">
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground">JSON Export</h2>
          <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto max-h-48 text-left" dir="ltr">
            {JSON.stringify(exportData, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
