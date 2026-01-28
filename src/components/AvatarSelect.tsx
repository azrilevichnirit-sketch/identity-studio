import type { AvatarGender } from '@/types/identity';
import { getAvatarImage } from '@/lib/assetUtils';
import studioEntranceBg from '@/assets/backgrounds/studio_in_entrance_view_bg.webp';

interface AvatarSelectProps {
  onSelect: (gender: AvatarGender) => void;
}

export function AvatarSelect({ onSelect }: AvatarSelectProps) {
  const femaleAvatar = getAvatarImage('female', 'idle');
  const maleAvatar = getAvatarImage('male', 'idle');

  return (
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
          <p className="text-xl text-white/90 drop-shadow-md">בחר/י את הדמות שלך</p>
        </div>
        
        {/* Avatar selection cards */}
        <div className="flex gap-8">
          <button
            onClick={() => onSelect('female')}
            className="group relative w-52 h-72 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: 'rgba(255, 252, 245, 0.85)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              {femaleAvatar ? (
                <img 
                  src={femaleAvatar} 
                  alt="Female avatar" 
                  className="h-48 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <span className="text-7xl">👩</span>
              )}
              <span className="font-semibold text-lg text-foreground mt-2">נקבה</span>
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
            className="group relative w-52 h-72 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: 'rgba(255, 252, 245, 0.85)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              {maleAvatar ? (
                <img 
                  src={maleAvatar} 
                  alt="Male avatar" 
                  className="h-48 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <span className="text-7xl">👨</span>
              )}
              <span className="font-semibold text-lg text-foreground mt-2">זכר</span>
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
  );
}
