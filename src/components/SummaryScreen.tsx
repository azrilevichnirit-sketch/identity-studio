import type { GameState, CountsFinal, HollandCode } from '@/types/identity';
import studioEntranceBg from '@/assets/backgrounds/studio_in_entrance_view_bg.webp';
import { Disclaimer } from './Disclaimer';

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
    <div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: `url(${studioEntranceBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
        filter: 'saturate(1.1) contrast(1.05)',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Content - horizontal layout */}
      <div className="relative z-10 flex gap-6 animate-fade-in px-8">
        {/* Results card */}
        <div 
          className="p-6 rounded-2xl w-[320px]"
          style={{
            background: 'rgba(255, 252, 245, 0.96)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <div className="text-4xl mb-3 text-center">🎉</div>
          <h1 
            className="text-2xl font-bold mb-4 text-center"
            style={{ color: '#111', fontFamily: "'Heebo', sans-serif" }}
          >
            התוצאות שלך!
          </h1>
          
          {leaders.length > 0 && (
            <div className="mb-4">
              <p 
                className="text-sm mb-2 text-center"
                style={{ color: '#555', fontFamily: "'Heebo', sans-serif" }}
              >
                הפרופיל המוביל שלך:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {leaders.map((code) => (
                  <span
                    key={code}
                    className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium"
                    style={{ fontFamily: "'Heebo', sans-serif" }}
                  >
                    {HOLLAND_LABELS[code]}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Scores breakdown */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <h2 
              className="text-sm font-semibold mb-3"
              style={{ color: '#555', fontFamily: "'Heebo', sans-serif" }}
            >
              חלוקת הניקוד
            </h2>
            <div className="space-y-2">
              {(Object.keys(countsFinal) as HollandCode[]).map((code) => (
                <div key={code} className="flex items-center gap-2">
                  <span 
                    className="text-xs w-20 truncate"
                    style={{ color: '#333', fontFamily: "'Heebo', sans-serif" }}
                  >
                    {HOLLAND_LABELS[code].split(' ')[0]}
                  </span>
                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{
                        width: maxCount > 0 ? `${(countsFinal[code] / maxCount) * 100}%` : '0%',
                      }}
                    />
                  </div>
                  <span 
                    className="text-xs font-medium w-4"
                    style={{ color: '#333' }}
                  >
                    {countsFinal[code]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* JSON output card */}
        <div 
          className="p-6 rounded-2xl w-[400px] max-h-[500px] overflow-hidden flex flex-col"
          style={{
            background: 'rgba(255, 252, 245, 0.96)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <h2 
            className="text-sm font-semibold mb-3"
            style={{ color: '#555', fontFamily: "'Heebo', sans-serif" }}
          >
            JSON Export
          </h2>
          <pre 
            className="text-xs bg-slate-100 rounded-lg p-3 overflow-auto flex-1 text-left" 
            dir="ltr"
            style={{ color: '#333' }}
          >
            {JSON.stringify(exportData, null, 2)}
          </pre>
        </div>
      </div>

      {/* Disclaimer in bottom corner */}
      <div className="absolute bottom-4 left-4 z-20">
        <Disclaimer className="text-white/60" />
      </div>
    </div>
  );
}
