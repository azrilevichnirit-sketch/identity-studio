import type { GameState, CountsFinal, HollandCode } from '@/types/identity';
import logoKinneret from '@/assets/logo_kinneret.png';
import { Disclaimer } from './Disclaimer';

interface SummaryScreenProps {
  state: GameState;
  countsFinal: CountsFinal;
  leaders: HollandCode[];
  resultText: string | null;
}

const HOLLAND_LABELS: Record<HollandCode, string> = {
  r: 'מעשי (Realistic)',
  i: 'חוקר (Investigative)',
  a: 'אמנותי (Artistic)',
  s: 'חברתי (Social)',
  e: 'יזמי (Enterprising)',
  c: 'מאורגן (Conventional)',
};

export function SummaryScreen({ state, countsFinal, leaders, resultText }: SummaryScreenProps) {
  const maxCount = Math.max(...Object.values(countsFinal));

  return (
    <div 
      className="min-h-screen w-full"
      style={{
        background: '#FFFCF5', // Light cream background
      }}
    >
      {/* Content - regular page flow */}
      <div 
        className="flex flex-col gap-4 animate-fade-in w-full items-center py-8 px-4 md:px-8"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 32px), 32px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 32px), 32px)',
        }}
      >
        {/* Main results card */}
        <div 
          className="p-5 md:p-6 rounded-2xl w-full"
          style={{
            maxWidth: 'min(500px, 92vw)',
            background: 'white',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          {/* Logo inside card - centered at top */}
          <div className="flex justify-center mb-3">
            <img 
              src={logoKinneret} 
              alt="Kinneret Academy" 
              className="h-10 md:h-12 object-contain"
            />
          </div>
          
          <h1 
            className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-center"
            style={{ color: '#111', fontFamily: "'Rubik', sans-serif" }}
          >
            התוצאות שלך!
          </h1>
          
          {/* Top 3 Profile Rankings */}
          <div className="mb-3 md:mb-4">
            <p 
              className="text-sm mb-3 text-center"
              style={{ color: '#555', fontFamily: "'Rubik', sans-serif" }}
            >
              שלושת הפרופילים המובילים שלך:
            </p>
            <div className="flex flex-col gap-2">
              {/* Rank 1 */}
              {state.rank1Code && (
                <div className="flex items-center gap-2 justify-center">
                  <span 
                    className="w-6 h-6 rounded-full bg-amber-400 text-white text-xs font-bold flex items-center justify-center"
                    title="מקום ראשון"
                  >
                    1
                  </span>
                  <span
                    className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium"
                    style={{ fontFamily: "'Rubik', sans-serif" }}
                  >
                    {HOLLAND_LABELS[state.rank1Code]}
                  </span>
                </div>
              )}
              {/* Rank 2 */}
              {state.rank2Code && (
                <div className="flex items-center gap-2 justify-center">
                  <span 
                    className="w-6 h-6 rounded-full bg-slate-400 text-white text-xs font-bold flex items-center justify-center"
                    title="מקום שני"
                  >
                    2
                  </span>
                  <span
                    className="px-3 py-1 rounded-full bg-primary/80 text-primary-foreground text-sm font-medium"
                    style={{ fontFamily: "'Rubik', sans-serif" }}
                  >
                    {HOLLAND_LABELS[state.rank2Code]}
                  </span>
                </div>
              )}
              {/* Rank 3 */}
              {state.rank3Code && (
                <div className="flex items-center gap-2 justify-center">
                  <span 
                    className="w-6 h-6 rounded-full bg-amber-700 text-white text-xs font-bold flex items-center justify-center"
                    title="מקום שלישי"
                  >
                    3
                  </span>
                  <span
                    className="px-3 py-1 rounded-full bg-primary/60 text-primary-foreground text-sm font-medium"
                    style={{ fontFamily: "'Rubik', sans-serif" }}
                  >
                    {HOLLAND_LABELS[state.rank3Code]}
                  </span>
                </div>
              )}
              {/* Fallback to old leaders if new ranks not available */}
              {!state.rank1Code && leaders.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {leaders.map((code) => (
                    <span
                      key={code}
                      className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium"
                      style={{ fontFamily: "'Rubik', sans-serif" }}
                    >
                      {HOLLAND_LABELS[code]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Result text from Make - displayed as-is */}
          {resultText && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div 
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: '#333', fontFamily: "'Rubik', sans-serif" }}
              >
                {resultText}
              </div>
            </div>
          )}

          {/* Scores breakdown */}
          <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-slate-200">
            <h2 
              className="text-sm font-semibold mb-2 md:mb-3"
              style={{ color: '#555', fontFamily: "'Rubik', sans-serif" }}
            >
              חלוקת הניקוד
            </h2>
            <div className="space-y-1.5 md:space-y-2">
              {(Object.keys(countsFinal) as HollandCode[]).map((code) => (
                <div key={code} className="flex items-center gap-2">
                  <span 
                    className="text-xs w-16 md:w-20 truncate"
                    style={{ color: '#333', fontFamily: "'Rubik', sans-serif" }}
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

        {/* Disclaimer at bottom */}
        <div className="mt-6">
          <Disclaimer className="text-slate-400" />
        </div>
      </div>
    </div>
  );
}
