import type { CountsFinal, HollandCode } from '@/types/identity';

interface ScoreDisplayProps {
  countsFinal: CountsFinal;
  onContinue: () => void;
}

const HOLLAND_LABELS: Record<HollandCode, { en: string; heb: string }> = {
  r: { en: 'R', heb: 'ביצועי' },
  i: { en: 'I', heb: 'חוקרני' },
  a: { en: 'A', heb: 'אמנותי' },
  s: { en: 'S', heb: 'חברתי' },
  e: { en: 'E', heb: 'יזמי' },
  c: { en: 'C', heb: 'מסודר' },
};

const CODE_ORDER: HollandCode[] = ['r', 'i', 'a', 's', 'e', 'c'];

export function ScoreDisplay({ countsFinal, onContinue }: ScoreDisplayProps) {
  const maxScore = Math.max(...CODE_ORDER.map(c => countsFinal[c]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" dir="rtl">
      <div className="bg-slate-900 border border-slate-600 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-xl font-bold text-amber-400 text-center mb-2">
          ציוני בסיס
        </h2>
        <p className="text-slate-400 text-sm text-center mb-6">
          (מסך פנימי לבדיקה)
        </p>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {CODE_ORDER.map(code => {
            const score = countsFinal[code];
            const isMax = score === maxScore;
            return (
              <div
                key={code}
                className={`flex flex-col items-center p-3 rounded-xl border ${
                  isMax
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <span className="text-2xl font-bold">{score}</span>
                <span className="text-xs mt-1 font-medium">
                  {HOLLAND_LABELS[code].en} – {HOLLAND_LABELS[code].heb}
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={onContinue}
          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-lg transition-colors"
        >
          המשך
        </button>
      </div>
    </div>
  );
}
