import type { AvatarGender } from '@/types/identity';
import { getAvatarImage } from '@/lib/assetUtils';
import studioEntryBg from '@/assets/backgrounds/studio_entry_inside_bg.png';
import { SpeechBubble } from './SpeechBubble';
import { ArrowLeft } from 'lucide-react';

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
        width: '100vw',
        height: '100vh',
        backgroundImage: `url(${studioEntryBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: 'saturate(1.18) contrast(1.08)',
      }}
    >
      {/* Bottom gradient for grounding */}
      <div 
        className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 100%)',
        }}
      />

      {/* Avatar - bottom right, larger size */}
      {avatarImage && (
        <div 
          className="absolute z-20 animate-fade-in"
          style={{
            right: '60px',
            bottom: '30px',
            height: '340px',
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

      {/* Speech bubble with welcome text - positioned to the left so avatar can overlap edge */}
      <div 
        className="absolute z-15 animate-scale-in"
        style={{
          right: '280px',
          bottom: '100px',
          maxWidth: '440px',
        }}
      >
        <SpeechBubble tailDirection="right">
          <div className="space-y-3 pr-4">
            <p className="font-semibold text-lg">היי! איזה כיף להכיר אותך.</p>
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
        </SpeechBubble>
      </div>

      {/* CTA Button - LEFT side with LEFT arrow, dark background */}
      <div 
        className="absolute z-20 animate-fade-in"
        style={{
          left: '40px',
          bottom: '60px',
        }}
      >
        <button
          onClick={onStart}
          className="flex items-center gap-2 px-7 py-4 rounded-xl font-semibold text-lg transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: 'hsl(220 30% 12%)',
            color: 'white',
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
          }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>יאללה, מתחילים?</span>
        </button>
      </div>

      {/* Disclaimer - tiny footer at bottom corner */}
      <div 
        className="absolute z-10"
        style={{
          right: '16px',
          bottom: '16px',
          fontSize: '11px',
          color: 'rgba(255,255,255,0.5)',
          maxWidth: '280px',
          textAlign: 'right',
          direction: 'rtl',
        }}
      >
        התוצאות מיועדות להכוונה ראשונית ואינן מהוות תחליף לייעוץ מקצועי.
      </div>
    </div>
  );
}
