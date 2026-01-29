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

      {/* MOBILE: Absolute positioned avatar and bubble (unchanged) */}
      <div className="lg:hidden">
        {/* Avatar - mobile positioning */}
        {avatarImage && (
          <div 
            className="absolute z-20 animate-fade-in intro-avatar"
            style={{
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

        {/* Speech bubble - mobile positioning */}
        <div className="absolute z-30 animate-scale-in intro-bubble">
          <SpeechBubble tailDirection="right">
            <div className="space-y-1 pr-2">
              <p className="font-semibold text-sm">היי! איזה כיף להכיר אותך.</p>
              <p className="text-xs leading-snug">
                אני {avatarName}, ואני איתך לאורך כל המסע הזה.
              </p>
              <p className="text-xs leading-snug">
                כאן ניצור ביחד את ה{arenaName} שלך, צעד אחרי צעד - עם בחירות קטנות שמרכיבות עולם שלם.
              </p>
              <p className="text-xs leading-snug">
                בכל שלב מחכה לך משימה ושתי אפשרויות. בוחרים, גוררים, וממשיכים.
              </p>
              <p className="text-xs leading-snug">
                בסוף נראה יחד את התמונה שנוצרה מהבחירות שלך.
              </p>
            </div>
          </SpeechBubble>
        </div>
      </div>

      {/* DESKTOP: Flex container for bubble + avatar (no overlap) */}
      <div 
        className="hidden lg:flex items-end absolute z-20 animate-fade-in"
        style={{
          right: 'clamp(40px, 5vw, 80px)',
          bottom: '28px',
          gap: '20px',
        }}
      >
        {/* Speech bubble - left side of flex */}
        <div className="animate-scale-in flex-shrink-0">
          <SpeechBubble tailDirection="right">
            <div className="space-y-1 pr-4" style={{ maxWidth: '380px', minWidth: '300px' }}>
              <p className="font-semibold text-base">היי! איזה כיף להכיר אותך.</p>
              <p className="text-sm leading-snug">
                אני {avatarName}, ואני איתך לאורך כל המסע הזה.
              </p>
              <p className="text-sm leading-snug">
                כאן ניצור ביחד את ה{arenaName} שלך, צעד אחרי צעד - עם בחירות קטנות שמרכיבות עולם שלם.
              </p>
              <p className="text-sm leading-snug">
                בכל שלב מחכה לך משימה ושתי אפשרויות. בוחרים, גוררים, וממשיכים.
              </p>
              <p className="text-sm leading-snug">
                בסוף נראה יחד את התמונה שנוצרה מהבחירות שלך.
              </p>
            </div>
          </SpeechBubble>
        </div>

        {/* Avatar - right side of flex, foreground */}
        {avatarImage && (
          <div 
            className="flex-shrink-0"
            style={{
              height: 'clamp(380px, 42vh, 520px)',
              filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.6))',
              zIndex: 25,
            }}
          >
            <img 
              src={avatarImage} 
              alt="Your avatar"
              className="h-full w-auto object-contain"
            />
          </div>
        )}
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
