import type { AvatarGender } from '@/types/identity';

interface AvatarSelectProps {
  onSelect: (gender: AvatarGender) => void;
}

export function AvatarSelect({ onSelect }: AvatarSelectProps) {
  return (
    <div className="screen-container">
      <div className="card-surface w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-2">Identity Engine</h1>
        <p className="text-muted-foreground mb-8">בחר/י את הדמות שלך</p>
        
        <div className="flex gap-4">
          <button
            onClick={() => onSelect('female')}
            className="flex-1 py-8 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors border-2 border-transparent hover:border-primary"
          >
            <div className="text-4xl mb-2">👩</div>
            <div className="font-medium">נקבה</div>
          </button>
          
          <button
            onClick={() => onSelect('male')}
            className="flex-1 py-8 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors border-2 border-transparent hover:border-primary"
          >
            <div className="text-4xl mb-2">👨</div>
            <div className="font-medium">זכר</div>
          </button>
        </div>
      </div>
    </div>
  );
}
