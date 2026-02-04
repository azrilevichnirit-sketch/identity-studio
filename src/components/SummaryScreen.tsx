import type { GameState, CountsFinal, HollandCode, AnalysisResponse } from '@/types/identity';
import galleryBg from '@/assets/backgrounds/gallery_main_stylized.webp';
import logoKinneret from '@/assets/logo_kinneret.png';
import { Disclaimer } from './Disclaimer';

interface SummaryScreenProps {
  state: GameState;
  countsFinal: CountsFinal;
  leaders: HollandCode[];
  analysis: AnalysisResponse | null;
}

const HOLLAND_LABELS: Record<HollandCode, string> = {
  r: 'מעשי (Realistic)',
  i: 'חוקר (Investigative)',
  a: 'אמנותי (Artistic)',
  s: 'חברתי (Social)',
  e: 'יזמי (Enterprising)',
  c: 'מאורגן (Conventional)',
};

export function SummaryScreen({ state, countsFinal, leaders, analysis }: SummaryScreenProps) {
  const maxCount = Math.max(...Object.values(countsFinal));

  return (
    <div 
      className="game-stage flex items-center justify-center"
      style={{
        backgroundImage: `url(${galleryBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
        filter: 'saturate(1.18) contrast(1.08)',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Content */}
      <div 
        className="relative z-10 flex flex-col gap-4 animate-fade-in overflow-auto w-full h-full items-center justify-start md:justify-center game-stage-content p-4 md:p-8"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 16px), 24px)',
        }}
      >
        {/* Main results card */}
        <div 
          className="p-5 md:p-6 rounded-2xl w-full flex-shrink-0"
          style={{
            maxWidth: 'min(400px, 92vw)',
            background: 'rgba(255, 252, 245, 0.96)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
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

          {/* Analysis from Make - if available */}
          {analysis && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              {/* Summary text */}
              {analysis.summary && (
                <div className="mb-4">
                  <p 
                    className="text-sm leading-relaxed text-center"
                    style={{ color: '#333', fontFamily: "'Rubik', sans-serif" }}
                  >
                    {analysis.summary}
                  </p>
                </div>
              )}

              {/* Personality type */}
              {analysis.personalityType && (
                <div className="mb-4 text-center">
                  <span 
                    className="inline-block px-4 py-2 rounded-xl bg-primary/10 text-primary font-semibold"
                    style={{ fontFamily: "'Rubik', sans-serif" }}
                  >
                    {analysis.personalityType}
                  </span>
                </div>
              )}

              {/* Traits */}
              {analysis.traits && analysis.traits.length > 0 && (
                <div className="mb-4">
                  <h3 
                    className="text-sm font-semibold mb-2"
                    style={{ color: '#555', fontFamily: "'Rubik', sans-serif" }}
                  >
                    תכונות בולטות:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.traits.map((trait, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded-lg bg-slate-100 text-xs"
                        style={{ color: '#444', fontFamily: "'Rubik', sans-serif" }}
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div>
                  <h3 
                    className="text-sm font-semibold mb-2"
                    style={{ color: '#555', fontFamily: "'Rubik', sans-serif" }}
                  >
                    המלצות:
                  </h3>
                  <ul className="space-y-1.5">
                    {analysis.recommendations.map((rec, idx) => (
                      <li 
                        key={idx}
                        className="text-sm flex items-start gap-2"
                        style={{ color: '#333', fontFamily: "'Rubik', sans-serif" }}
                      >
                        <span className="text-primary mt-0.5">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
      </div>

      {/* Disclaimer in bottom corner */}
      <div 
        className="absolute z-20"
        style={{
          bottom: 'max(env(safe-area-inset-bottom, 8px), 16px)',
          left: 'max(env(safe-area-inset-left, 8px), 16px)',
        }}
      >
        <Disclaimer className="text-white/60" />
      </div>
    </div>
  );
}
