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
  return (
    <div 
      className="min-h-screen w-full"
      style={{
        background: '#FFFCF5', // Light cream background
      }}
    >
      {/* Logo - top right, on the background (outside card) */}
      <div 
        className="flex justify-start py-4 px-4 md:px-8"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        }}
      >
        <img 
          src={logoKinneret} 
          alt="Kinneret Academy" 
          className="h-14 md:h-16 object-contain"
        />
      </div>

      {/* Content */}
      <div 
        className="flex flex-col gap-4 animate-fade-in w-full items-center pb-8 px-4 md:px-8"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)',
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

          {/* Result text from Make - displayed as-is, FULL TEXT */}
          {resultText && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div 
                className="text-sm leading-relaxed whitespace-pre-wrap break-words"
                style={{ 
                  color: '#333', 
                  fontFamily: "'Rubik', sans-serif",
                  wordBreak: 'break-word',
                }}
              >
                {resultText}
              </div>
            </div>
          )}

          {/* Fallback message if no result text */}
          {!resultText && (
            <div className="mt-4 pt-4 border-t border-slate-200 text-center">
              <p 
                className="text-sm"
                style={{ color: '#666', fontFamily: "'Rubik', sans-serif" }}
              >
                הניתוח יישלח אליך בקרוב
              </p>
            </div>
          )}
        </div>

        {/* Disclaimer at bottom */}
        <div className="mt-6">
          <Disclaimer className="text-slate-400" />
        </div>
      </div>
    </div>
  );
}
