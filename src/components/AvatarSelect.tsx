import type { AvatarGender } from '@/types/identity';
import { getAvatarImage } from '@/lib/assetUtils';
import galleryBg from '@/assets/backgrounds/gallery_main_stylized.webp';
import { GameStage } from './GameStage';

interface AvatarSelectProps {
  onSelect: (gender: AvatarGender) => void;
}

export function AvatarSelect({ onSelect }: AvatarSelectProps) {
  const femaleAvatar = getAvatarImage('female', 'idle');
  const maleAvatar = getAvatarImage('male', 'idle');

  return (
    <GameStage backgroundImage={galleryBg} enhanceBackground>
      {/* Dark overlay for contrast */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.3) 100%)',
          zIndex: 1,
        }}
      />
      
      {/* Content - scrollable on mobile, properly centered */}
      <div 
        className="relative z-10 h-full flex flex-col items-center justify-center overflow-auto"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 16px), 24px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 24px)',
          paddingLeft: 'max(env(safe-area-inset-left, 16px), 16px)',
          paddingRight: 'max(env(safe-area-inset-right, 16px), 16px)',
        }}
      >
        <div className="flex flex-col items-center gap-6 md:gap-10 animate-fade-in w-full max-w-2xl">
          {/* Title */}
          <div className="text-center px-4">
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">נקודת הזינוק שלך</h1>
            <p className="text-base md:text-xl text-white/90 drop-shadow-md">עכשיו רק תבחרו מי ילווה אתכם במסע</p>
          </div>
          
          {/* Avatar selection - no boxes, just the avatars */}
          <div className="flex flex-row gap-8 md:gap-16 w-full items-end justify-center">
            <button
              onClick={() => onSelect('female')}
              className="group relative transition-all duration-300 hover:scale-110 active:scale-95"
            >
              {femaleAvatar ? (
                <img 
                  src={femaleAvatar} 
                  alt="Female avatar" 
                  className="h-40 md:h-56 w-auto object-contain drop-shadow-2xl transition-transform duration-300 group-hover:scale-105"
                  style={{
                    filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))',
                  }}
                />
              ) : (
                <span className="text-6xl md:text-8xl">👩</span>
              )}
              
              {/* Hover glow */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-full"
                style={{
                  background: 'radial-gradient(circle at center bottom, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
                  transform: 'scale(1.5)',
                }}
              />
            </button>
            
            <button
              onClick={() => onSelect('male')}
              className="group relative transition-all duration-300 hover:scale-110 active:scale-95"
            >
              {maleAvatar ? (
                <img 
                  src={maleAvatar} 
                  alt="Male avatar" 
                  className="h-40 md:h-56 w-auto object-contain drop-shadow-2xl transition-transform duration-300 group-hover:scale-105"
                  style={{
                    filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))',
                  }}
                />
              ) : (
                <span className="text-6xl md:text-8xl">👨</span>
              )}
              
              {/* Hover glow */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-full"
                style={{
                  background: 'radial-gradient(circle at center bottom, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
                  transform: 'scale(1.5)',
                }}
              />
            </button>
          </div>
        </div>
      </div>
      {/* No disclaimer here - it exists only on World Select and Summary */}
    </GameStage>
  );
}
