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

      {/* Avatar - responsive positioning, bottom right */}
      {avatarImage && (
        <div 
          className="absolute z-20 animate-fade-in"
          style={{
            right: 'clamp(16px, 4vw, 60px)',
            bottom: 'clamp(16px, 3vh, 30px)',
            height: 'clamp(180px, 35vh, 340px)',
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

      {/* Speech bubble with welcome text - responsive positioning */}
      <div 
        className="absolute z-15 animate-scale-in"
        style={{
          // On mobile: more left space, on desktop: fixed position
          right: 'clamp(140px, 35vw, 320px)',
          bottom: 'clamp(80px, 15vh, 120px)',
          maxWidth: 'min(420px, 55vw)',
          minWidth: 'min(280px, 70vw)',
        }}
      >
        <SpeechBubble 
          tailDirection="right" 
          className="py-3"
          style={{
            maxHeight: '50vh',
            overflowY: 'auto',
          }}
        >
          <div className="space-y-2 pr-4 md:pr-6">
            <p className="font-semibold text-base md:text-lg">היי! איזה כיף להכיר אותך.</p>
            <p className="text-sm md:text-base">
              אני {avatarName}, ואני איתך לאורך כל המסע הזה.
            </p>
            <p className="text-sm md:text-base">
              כאן ניצור ביחד את ה{arenaName} שלך, צעד אחרי צעד - עם בחירות קטנות שמרכיבות עולם שלם.
            </p>
            <p className="text-sm md:text-base">
              בכל שלב מחכה לך משימה ושתי אפשרויות. בוחרים, גוררים, וממשיכים.
            </p>
            <p className="text-sm md:text-base">
              בסוף נראה יחד את התמונה שנוצרה מהבחירות שלך.
            </p>
          </div>
        </SpeechBubble>
      </div>

      {/* CTA Button - bottom left, thumb-friendly placement */}
      <div 
        className="absolute z-20 animate-fade-in"
        style={{
          left: 'max(env(safe-area-inset-left, 16px), 24px)',
          bottom: 'max(env(safe-area-inset-bottom, 16px), 32px)',
        }}
      >
        <button
          onClick={onStart}
          className="flex items-center gap-2 px-5 py-3.5 md:px-7 md:py-4 rounded-xl font-semibold text-base md:text-lg transition-all duration-200 hover:scale-105 active:scale-95"
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

    </GameStage>
  );
}
