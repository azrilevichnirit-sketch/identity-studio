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
      
      {/* Logo - top right */}
      <div 
        className="absolute z-20"
        style={{
          top: 'max(env(safe-area-inset-top, 16px), 20px)',
          right: 'max(env(safe-area-inset-right, 16px), 20px)',
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
        className="relative z-10 flex flex-col gap-4 animate-fade-in overflow-auto w-full h-full items-center justify-start md:justify-center game-stage-content p-4 md:p-8"
        style={{
          paddingTop: 'max(calc(env(safe-area-inset-top, 16px) + 80px), 100px)',
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
          <div className="text-3xl md:text-4xl mb-2 md:mb-3 text-center">🎉</div>
          <h1 
            className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-center"
            style={{ color: '#111', fontFamily: "'Rubik', sans-serif" }}
          >
            התוצאות שלך!
          </h1>
          
          {/* Leading profile */}
          {leaders.length > 0 && (
            <div className="mb-3 md:mb-4">
              <p 
                className="text-sm mb-2 text-center"
                style={{ color: '#555', fontFamily: "'Rubik', sans-serif" }}
              >
                הפרופיל המוביל שלך:
              </p>
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
            </div>
          )}

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
