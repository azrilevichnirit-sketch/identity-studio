import type { AvatarGender } from '@/types/identity';
import { getAvatarImage } from '@/lib/assetUtils';
import studioEntranceBg from '@/assets/backgrounds/studio_in_entrance_view_bg.webp';
import bubbleRightAsset from '@/assets/ui/ui_bubble_right_1600x900.webp';

interface IntroScreenProps {
  avatarGender: AvatarGender;
  onStart: () => void;
}

export function IntroScreen({ avatarGender, onStart }: IntroScreenProps) {
  const avatarImage = getAvatarImage(avatarGender, 'idle');

  return (
    <div 
      className="absolute inset-0"
      style={{
        backgroundImage: `url(${studioEntranceBg})`,
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

      {/* Speech bubble with intro text */}
      <div 
        className="absolute z-15 animate-scale-in"
        style={{
          left: '60px',
          bottom: '100px',
          maxWidth: '500px',
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
          <h2 className="text-2xl font-bold mb-3 text-foreground">ברוכים הבאים לסטודיו!</h2>
          <p className="text-base text-muted-foreground leading-relaxed mb-5">
            לפניך 12 משימות שיעזרו לנו להכיר אותך טוב יותר.
            בכל משימה תבחר/י בין שתי אפשרויות.
            אין תשובות נכונות או שגויות – פשוט בחר/י את מה שמדבר אליך!
          </p>
          
          <button
            onClick={onStart}
            className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            בוא/י נתחיל
          </button>
        </div>
      </div>
    </div>
  );
}
