import type { AvatarGender } from '@/types/identity';
import { getAvatarImage } from '@/lib/assetUtils';
import studioEntryBg from '@/assets/backgrounds/studio_entry_inside_bg.png';
import bubbleRightAsset from '@/assets/ui/ui_bubble_right_1600x900.webp';

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
    <div 
      className="absolute inset-0"
      style={{
        backgroundImage: `url(${studioEntryBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
        filter: 'saturate(1.18) contrast(1.08)',
      }}
    >
      {/* Bottom gradient for grounding */}
      <div 
        className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 100%)',
        }}
      />

      {/* Avatar - bottom right */}
      {avatarImage && (
        <div 
          className="absolute z-20 animate-fade-in"
          style={{
            right: '80px',
            bottom: '40px',
            height: '280px',
            filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))',
          }}
        >
          <img 
            src={avatarImage} 
            alt="Your avatar"
            className="h-full w-auto object-contain"
          />
        </div>
      )}

      {/* Speech bubble with welcome text */}
      <div 
        className="absolute z-15 animate-scale-in"
        style={{
          left: '60px',
          bottom: '100px',
          maxWidth: '520px',
        }}
      >
        <div 
          className="relative"
          style={{
            backgroundImage: `url(${bubbleRightAsset})`,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            padding: '32px 48px 32px 32px',
          }}
        >
          <div className="text-base text-foreground leading-relaxed space-y-3">
            <p className="font-semibold text-lg">היי! איזה כיף לראות אותך</p>
            <p>
              אני {avatarName}, ואני איתך לאורך כל המסע הזה.
            </p>
            <p>
              כאן ניצור ביחד את ה{arenaName} שלך, צעד אחרי צעד - עם בחירות קטנות שמרכיבות עולם שלם.
            </p>
            <p>
              בכל שלב מחכה לך משימה ושתי אפשרויות. בוחרים, גוררים, וממשיכים.
            </p>
            <p>
              בסוף נראה יחד את התמונה שנוצרה מהבחירות שלך.
            </p>
          </div>
          
          <button
            onClick={onStart}
            className="mt-5 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            יאללה, מתחילים? →
          </button>
        </div>
      </div>
    </div>
  );
}
