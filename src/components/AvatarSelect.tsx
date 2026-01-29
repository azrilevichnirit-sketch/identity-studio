import type { AvatarGender } from '@/types/identity';
import { getAvatarImage } from '@/lib/assetUtils';
import studioEntryBg from '@/assets/backgrounds/studio_entry_inside_bg.png';
import { GameStage } from './GameStage';

interface AvatarSelectProps {
  onSelect: (gender: AvatarGender) => void;
}

export function AvatarSelect({ onSelect }: AvatarSelectProps) {
  const femaleAvatar = getAvatarImage('female', 'idle');
  const maleAvatar = getAvatarImage('male', 'idle');

  return (
    <GameStage backgroundImage={studioEntryBg} enhanceBackground>
      {/* Dark overlay for contrast */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.35) 100%)',
          zIndex: 1,
        }}
      />
      
      {/* Content - scrollable on mobile */}
      <div 
        className="relative z-10 h-full flex flex-col items-center justify-center px-4 py-6 overflow-auto"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 16px), 24px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 24px)',
        }}
      >
        <div className="flex flex-col items-center gap-5 md:gap-8 animate-fade-in w-full max-w-2xl">
          {/* Title */}
          <div className="text-center px-4">
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">Identity Engine</h1>
            <p className="text-base md:text-xl text-white/90 drop-shadow-md">בחר/י את הדמות שלך</p>
          </div>
          
          {/* Avatar selection cards - stacked on mobile, side-by-side on tablet+ */}
          <div className="flex flex-col md:flex-row gap-4 md:gap-8 w-full items-center justify-center">
            <button
              onClick={() => onSelect('female')}
              className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                width: 'min(88vw, 380px)',
                height: 'clamp(140px, 35vw, 200px)',
                minHeight: '140px',
                background: 'rgba(255, 252, 245, 0.92)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center p-4 gap-4">
              {femaleAvatar ? (
                  <img 
                    src={femaleAvatar} 
                    alt="Female avatar" 
                    className="h-full max-h-32 md:max-h-40 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span className="text-5xl md:text-6xl">👩</span>
                )}
              </div>
              
              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at center, hsl(var(--primary) / 0.2) 0%, transparent 70%)',
                }}
              />
            </button>
            
            <button
              onClick={() => onSelect('male')}
              className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                width: 'min(88vw, 380px)',
                height: 'clamp(140px, 35vw, 200px)',
                minHeight: '140px',
                background: 'rgba(255, 252, 245, 0.92)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center p-4 gap-4">
              {maleAvatar ? (
                  <img 
                    src={maleAvatar} 
                    alt="Male avatar" 
                    className="h-full max-h-32 md:max-h-40 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span className="text-5xl md:text-6xl">👨</span>
                )}
              </div>
              
              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at center, hsl(var(--primary) / 0.2) 0%, transparent 70%)',
                }}
              />
            </button>
          </div>
        </div>
      </div>
    </GameStage>
  );
}
