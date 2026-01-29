import { useState } from 'react';
import type { Dimension } from '@/types/identity';
import { Disclaimer } from './Disclaimer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft } from 'lucide-react';

interface DimensionSelectProps {
  onSelect: (dimension: Dimension) => void;
}

const DIMENSIONS = [
  { key: 'studio' as const, emoji: '🎨', label: 'סטודיו', available: true },
  { key: 'farm' as const, emoji: '🌾', label: 'חווה', available: false },
  { key: 'surprise' as const, emoji: '✨', label: 'הפתעה', available: false },
];

export function DimensionSelect({ onSelect }: DimensionSelectProps) {
  const [selectedDimension, setSelectedDimension] = useState<Dimension | null>(null);

  const handleCardClick = (dim: typeof DIMENSIONS[0]) => {
    if (dim.available) {
      setSelectedDimension(dim.key);
    }
  };

  const handleProceed = () => {
    if (selectedDimension) {
      onSelect(selectedDimension);
    }
  };

  return (
    <TooltipProvider>
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center p-4"
        style={{
          background: 'linear-gradient(135deg, hsl(220 25% 12%) 0%, hsl(220 20% 18%) 50%, hsl(220 15% 22%) 100%)',
        }}
      >
        {/* Subtle pattern overlay */}
        <div 
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, hsl(170 80% 45% / 0.1) 0%, transparent 50%),
                             radial-gradient(circle at 80% 50%, hsl(280 60% 55% / 0.1) 0%, transparent 50%)`,
          }}
        />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-6 md:gap-8 animate-fade-in w-full max-w-3xl">
          <div className="text-center">
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">Identity Engine</h1>
            <p className="text-lg md:text-xl text-white/90 drop-shadow-md">בחר/י את העולם שלך</p>
          </div>
          
          {/* Dimension cards - responsive grid */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            {DIMENSIONS.map((dim) => {
              const isSelected = selectedDimension === dim.key;
              
              return (
                <Tooltip key={dim.key}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleCardClick(dim)}
                      disabled={!dim.available}
                      className={`group relative w-32 h-40 md:w-48 md:h-56 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                        isSelected ? 'ring-4 ring-primary scale-105' : ''
                      }`}
                      style={{
                        background: 'rgba(255, 252, 245, 0.9)',
                        boxShadow: isSelected 
                          ? '0 12px 40px rgba(0,0,0,0.4), 0 0 30px hsl(170 80% 45% / 0.3)'
                          : '0 8px 32px rgba(0,0,0,0.3)',
                      }}
                    >
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 md:gap-4 p-4">
                        <span className={`text-4xl md:text-6xl transition-transform duration-300 ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}>
                          {dim.emoji}
                        </span>
                        <span className="font-semibold text-lg md:text-xl text-slate-900">{dim.label}</span>
                        {!dim.available && (
                          <span className="text-xs md:text-sm text-slate-500">(בקרוב)</span>
                        )}
                      </div>
                      
                      {/* Selection indicator */}
                      {isSelected && (
                        <div 
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: 'radial-gradient(circle at center, hsl(170 80% 45% / 0.15) 0%, transparent 70%)',
                          }}
                        />
                      )}
                      
                      {/* Hover glow */}
                      <div className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${isSelected ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}
                        style={{
                          background: 'radial-gradient(circle at center, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
                        }}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[220px] text-center bg-slate-800 text-white border-slate-600">
                    <Disclaimer />
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Bottom-left arrow CTA - appears when dimension is selected */}
        <div 
          className={`absolute bottom-8 left-8 md:bottom-12 md:left-12 transition-all duration-300 z-20 ${
            selectedDimension ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          <button
            onClick={handleProceed}
            className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 hover:bg-primary/90 active:scale-95"
            style={{
              boxShadow: '0 8px 24px hsl(170 80% 45% / 0.4)',
            }}
            aria-label="המשך"
          >
            <ArrowLeft className="w-7 h-7 md:w-8 md:h-8 text-primary-foreground" />
          </button>
        </div>

        {/* Disclaimer at bottom */}
        <div className="absolute bottom-4 right-4 z-20">
          <Disclaimer className="text-white/40" />
        </div>
      </div>
    </TooltipProvider>
  );
}