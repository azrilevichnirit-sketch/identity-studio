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
      className="w-full overflow-y-auto"
      style={{
        background: '#FFFCF5',
        minHeight: '100dvh',
      }}
    >
      {/* Logo - top right, on the background */}
      <div 
        className="flex justify-end py-4 px-4 md:px-8"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        }}
      >
        <img 
          src={logoKinneret} 
          alt="Kinneret Academy" 
          className="h-16 md:h-20 object-contain"
        />
      </div>

      {/* Content */}
      <div 
        className="flex flex-col gap-4 animate-fade-in w-full items-center px-4 md:px-8"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 48px)',
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
            className="text-xl md:text-2xl font-bold mb-4 text-center"
            style={{ color: '#111', fontFamily: "'Rubik', sans-serif" }}
          >
            בנית לעצמך כיוון
          </h1>

          {/* Result text from Make - displayed as-is, FULL TEXT */}
          {resultText && (
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
          )}

          {/* Fallback message if no result text */}
          {!resultText && (
            <div className="text-center">
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
