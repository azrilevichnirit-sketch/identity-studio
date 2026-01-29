import type { Dimension } from '@/types/identity';
import studioEntranceBg from '@/assets/backgrounds/studio_in_entrance_view_bg.webp';
import { Disclaimer } from './Disclaimer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    <TooltipProvider>
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{
          backgroundImage: `url(${studioEntranceBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          filter: 'saturate(1.1) contrast(1.05)',
        }}
      >
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-8 animate-fade-in">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">Identity Engine</h1>
            <p className="text-xl text-white/90 drop-shadow-md">בחר/י את העולם שלך</p>
          </div>
          
          {/* Horizontal dimension cards */}
          <div className="flex gap-6">
            {DIMENSIONS.map((dim) => (
              <Tooltip key={dim.key}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSelect(dim.key)}
                    disabled={!dim.available}
                    className="group relative w-48 h-56 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{
                      background: 'rgba(255, 252, 245, 0.85)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    }}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4">
                      <span className="text-6xl transition-transform duration-300 group-hover:scale-110">
                        {dim.emoji}
                      </span>
                      <span className="font-semibold text-xl text-foreground">{dim.label}</span>
                      {!dim.available && (
                        <span className="text-sm text-muted-foreground">(בקרוב)</span>
                      )}
                    </div>
                    
                    {/* Hover glow */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{
                        background: 'radial-gradient(circle at center, hsl(var(--primary) / 0.2) 0%, transparent 70%)',
                      }}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[220px] text-center">
                  <Disclaimer />
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
