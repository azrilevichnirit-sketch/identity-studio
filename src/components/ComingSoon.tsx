import studioEntranceBg from '@/assets/backgrounds/studio_in_entrance_view_bg.webp';
import { ArrowRight } from 'lucide-react';

interface ComingSoonProps {
  onBack: () => void;
}

export function ComingSoon({ onBack }: ComingSoonProps) {
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
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 animate-fade-in">
        <div 
          className="p-10 rounded-2xl text-center"
          style={{
            background: 'rgba(255, 252, 245, 0.9)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <div className="text-6xl mb-4">🚧</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">בקרוב!</h2>
          <p className="text-muted-foreground mb-6">עולם זה עדיין בפיתוח</p>
          
          <button
            onClick={onBack}
            className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <ArrowRight className="w-5 h-5" />
            חזרה לבחירה
          </button>
        </div>
      </div>
    </div>
  );
}
