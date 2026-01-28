import type { AvatarGender } from '@/types/identity';

interface IntroScreenProps {
  avatarGender: AvatarGender;
  onStart: () => void;
}

export function IntroScreen({ avatarGender, onStart }: IntroScreenProps) {
  return (
    <div className="screen-container">
      <div className="card-surface w-full max-w-sm text-center">
        <div className="text-5xl mb-4">
          {avatarGender === 'female' ? '👩‍🎨' : '👨‍🎨'}
        </div>
        
        <h1 className="text-2xl font-bold mb-2">ברוכים הבאים לסטודיו!</h1>
        
        <p className="text-muted-foreground mb-6 leading-relaxed">
          לפניך 12 משימות שיעזרו לנו להכיר אותך טוב יותר.
          בכל משימה תבחר/י בין שתי אפשרויות.
          אין תשובות נכונות או שגויות – פשוט בחר/י את מה שמדבר אליך!
        </p>
        
        <button
          onClick={onStart}
          className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-colors"
        >
          בוא/י נתחיל
        </button>
      </div>
    </div>
  );
}
