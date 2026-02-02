import { useState } from 'react';
import type { Dimension } from '@/types/identity';
import { Disclaimer } from './Disclaimer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft } from 'lucide-react';
import studioPreviewBg from '@/assets/backgrounds/gallery_main_stylized.webp';
import kinneretLogo from '@/assets/logo_kinneret.png';

interface DimensionSelectProps {
  onSelect: (dimension: Dimension) => void;
}

const DIMENSIONS = [
  { key: 'studio' as const, emoji: '🎨', label: 'הסטודיו', available: true, image: studioPreviewBg },
  { key: 'farm' as const, emoji: '🌾', label: 'חווה', available: false, image: null },
  { key: 'surprise' as const, emoji: '✨', label: 'הפתעה', available: false, image: null },
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
        className="game-stage flex flex-col items-center justify-center"
        style={{
          background: '#FFFFFF',
        }}
      >
        {/* Content - desktop centered, mobile with safe-area */}
        <div 
          className="relative z-10 flex flex-col items-center gap-1 md:gap-2 animate-fade-in w-full max-w-3xl overflow-auto game-stage-content p-4 md:p-8"
        >
          {/* Logo - above title, aligned right (RTL) */}
          <div className="w-full flex justify-start px-4">
            <img 
              src={kinneretLogo} 
              alt="האקדמית כנרת" 
              className="h-44 md:h-56 w-auto"
            />
          </div>

          {/* Title */}
          <div className="text-center px-4">
            <h1 className="text-2xl md:text-4xl font-bold text-slate-900 mb-2">נקודת הזינוק שלך</h1>
            <p className="text-base md:text-xl text-slate-600">לאיזה עולם קופצים?</p>
          </div>
          
          {/* Dimension cards - stacked on mobile, row on tablet+ */}
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 md:gap-6 w-full px-2">
            {DIMENSIONS.map((dim) => {
              const isSelected = selectedDimension === dim.key;
              
              return (
                <Tooltip key={dim.key}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleCardClick(dim)}
                      disabled={!dim.available}
                      className={`group relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                        isSelected ? 'ring-4 ring-primary scale-105' : ''
                      }`}
                      style={{
                        width: 'min(88vw, 200px)',
                        height: 'clamp(100px, 20vw, 160px)',
                        minHeight: '100px',
                        background: dim.image ? `url(${dim.image}) center/cover` : 'rgba(255, 252, 245, 0.9)',
                        boxShadow: isSelected 
                          ? '0 12px 40px rgba(0,0,0,0.4), 0 0 30px hsl(170 80% 45% / 0.3)'
                          : '0 8px 32px rgba(0,0,0,0.2)',
                        margin: '0 auto',
                      }}
                    >
                      {/* Dark overlay for image cards */}
                      {dim.image && (
                        <div className="absolute inset-0 bg-black/30 pointer-events-none" />
                      )}
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 md:gap-3 p-4">
                        {!dim.image && (
                          <span className={`text-4xl md:text-5xl transition-transform duration-300 ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}>
                            {dim.emoji}
                          </span>
                        )}
                        <span className={`font-bold text-xl md:text-2xl ${dim.image ? 'text-white drop-shadow-lg' : 'text-slate-900'}`}>
                          {dim.label}
                        </span>
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

        {/* Bottom-left arrow CTA - FIXED position so it's always visible on mobile */}
        <div 
          className={`fixed z-30 transition-all duration-300 ${
            selectedDimension ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
          style={{
            bottom: 'max(env(safe-area-inset-bottom, 16px), 24px)',
            left: 'max(env(safe-area-inset-left, 16px), 24px)',
          }}
        >
          <button
            onClick={handleProceed}
            className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 hover:bg-primary/90 active:scale-95"
            style={{
              boxShadow: '0 8px 24px hsl(170 80% 45% / 0.4)',
              minWidth: '56px',
              minHeight: '56px',
            }}
            aria-label="המשך"
          >
            <ArrowLeft className="w-7 h-7 md:w-8 md:h-8 text-primary-foreground" />
          </button>
        </div>

        {/* Disclaimer at bottom right */}
        <div 
          className="absolute z-20"
          style={{
            bottom: 'max(env(safe-area-inset-bottom, 8px), 16px)',
            right: 'max(env(safe-area-inset-right, 8px), 16px)',
          }}
        >
          <Disclaimer className="text-slate-400" />
        </div>
      </div>
    </TooltipProvider>
  );
}
