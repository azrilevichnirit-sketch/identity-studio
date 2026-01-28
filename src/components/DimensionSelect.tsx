import type { Dimension } from '@/types/identity';

interface DimensionSelectProps {
  onSelect: (dimension: Dimension) => void;
}

const DIMENSIONS = [
  { key: 'studio' as const, emoji: '🎨', label: 'סטודיו', available: true },
  { key: 'farm' as const, emoji: '🌾', label: 'חווה', available: false },
  { key: 'surprise' as const, emoji: '✨', label: 'הפתעה', available: false },
];

export function DimensionSelect({ onSelect }: DimensionSelectProps) {
  return (
    <div className="screen-container">
      <div className="card-surface w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-2">Identity Engine</h1>
        <p className="text-muted-foreground mb-8">בחר/י את העולם שלך</p>
        
        <div className="flex flex-col gap-3">
          {DIMENSIONS.map((dim) => (
            <button
              key={dim.key}
              onClick={() => onSelect(dim.key)}
              className="w-full py-6 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors border-2 border-transparent hover:border-primary flex items-center justify-center gap-3"
            >
              <span className="text-3xl">{dim.emoji}</span>
              <span className="font-medium text-lg">{dim.label}</span>
              {!dim.available && (
                <span className="text-xs text-muted-foreground">(בקרוב)</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
