import type { AvatarGender } from '@/types/identity';
import { getAvatarImage } from '@/lib/assetUtils';
import studioEntryBg from '@/assets/backgrounds/studio_entry_inside_bg.png';
import { SpeechBubble } from './SpeechBubble';
import { ArrowLeft } from 'lucide-react';
import { GameStage } from './GameStage';

interface IntroScreenProps {
  avatarGender: AvatarGender;
  onStart: () => void;
}

// Avatar names by gender
const AVATAR_NAMES: Record<'female' | 'male', string> = {
  female: 'נועה',
  male: 'ליאו',
};

export function IntroScreen({ avatarGender, onStart }: IntroScreenProps) {
  const avatarImage = getAvatarImage(avatarGender, 'idle');
  const avatarName = avatarGender ? AVATAR_NAMES[avatarGender] : 'המדריך שלך';
  const arenaName = 'סטודיו';

  return (
    <GameStage backgroundImage={studioEntryBg} enhanceBackground>
      {/* Bottom gradient for grounding */}
      <div 
        className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 100%)',
          zIndex: 2,
        }}
      />

      {/* Avatar - responsive positioning, bottom right, larger on mobile */}
      {avatarImage && (
        <div 
          className="absolute z-20 animate-fade-in"
          style={{
            right: 'max(env(safe-area-inset-right, 0px), 8px)',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
            height: 'clamp(200px, 38vh, 360px)',
            filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.6))',
          }}
        >
          <img 
            src={avatarImage} 
            alt="Your avatar"
            className="h-full w-auto object-contain"
          />
        </div>
      )}

      {/* Speech bubble with welcome text - positioned left of avatar, compact */}
      <div 
        className="absolute z-30 animate-scale-in"
        style={{
          right: 'clamp(120px, 30vw, 300px)',
          bottom: 'clamp(50px, 10vh, 100px)',
          maxWidth: 'min(360px, 56vw)',
          minWidth: 'min(240px, 62vw)',
        }}
      >
        <SpeechBubble 
          tailDirection="right"
        >
          <div className="space-y-1 pr-2 md:pr-4">
            <p className="font-semibold text-sm md:text-base">היי! איזה כיף להכיר אותך.</p>
            <p className="text-xs md:text-sm leading-snug">
              אני {avatarName}, ואני איתך לאורך כל המסע הזה.
            </p>
            <p className="text-xs md:text-sm leading-snug">
              כאן ניצור ביחד את ה{arenaName} שלך, צעד אחרי צעד - עם בחירות קטנות שמרכיבות עולם שלם.
            </p>
            <p className="text-xs md:text-sm leading-snug">
              בכל שלב מחכה לך משימה ושתי אפשרויות. בוחרים, גוררים, וממשיכים.
            </p>
            <p className="text-xs md:text-sm leading-snug">
              בסוף נראה יחד את התמונה שנוצרה מהבחירות שלך.
            </p>
          </div>
        </SpeechBubble>
      </div>

      {/* CTA Button - bottom left, thumb-friendly placement */}
      <div 
        className="absolute z-20 animate-fade-in"
        style={{
          left: 'max(env(safe-area-inset-left, 16px), 20px)',
          bottom: 'max(env(safe-area-inset-bottom, 16px), 28px)',
        }}
      >
        <button
          onClick={onStart}
          className="flex items-center gap-2 px-5 py-3 md:px-7 md:py-4 rounded-xl font-semibold text-sm md:text-base transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: 'hsl(220 30% 12%)',
            color: 'white',
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
            minHeight: '48px',
          }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>יאללה, מתחילים?</span>
        </button>
      </div>
      {/* No disclaimer here - it exists only on World Select and Summary */}
    </GameStage>
  );
}
