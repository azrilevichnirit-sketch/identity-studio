import { useState } from 'react';
import type { LeadFormData } from '@/types/identity';
import studioEntranceBg from '@/assets/backgrounds/studio_in_entrance_view_bg.webp';
import { GameStage } from './GameStage';

interface LeadFormProps {
  onSubmit: (data: LeadFormData) => void;
}

export function LeadForm({ onSubmit }: LeadFormProps) {
  const [formData, setFormData] = useState<LeadFormData>({
    fullName: '',
    email: '',
    phone: '',
    wantsUpdates: true,
  });
  const [errors, setErrors] = useState<Partial<LeadFormData>>({});

  const validate = (): boolean => {
    const newErrors: Partial<LeadFormData> = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'נא להזין שם מלא';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'נא להזין אימייל';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'אימייל לא תקין';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'נא להזין טלפון';
    } else if (!/^0\d{8,9}$/.test(formData.phone.replace(/[-\s]/g, ''))) {
      newErrors.phone = 'מספר טלפון לא תקין';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <GameStage backgroundImage={studioEntranceBg} enhanceBackground>
      {/* Dark overlay - no pointer events */}
      <div className="absolute inset-0 bg-black/50 pointer-events-none z-1" />
      
      {/* Content - fully scrollable for keyboard */}
      <div 
        className="relative z-20 h-full w-full overflow-auto flex items-center justify-center"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 16px), 24px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 24px)',
          paddingLeft: 'max(env(safe-area-inset-left, 16px), 16px)',
          paddingRight: 'max(env(safe-area-inset-right, 16px), 16px)',
        }}
      >
        <div 
          className="p-5 md:p-8 rounded-2xl w-full animate-fade-in"
          style={{
            maxWidth: 'min(400px, 92vw)',
            background: 'rgba(255, 252, 245, 0.98)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <h1 className="text-xl md:text-2xl font-bold mb-2 text-center" style={{ color: '#1a1a1a' }}>
            המשימה הושלמה והמידע נאסף
          </h1>
          <p className="text-sm md:text-base mb-5 md:mb-6 text-center" style={{ color: '#555' }}>
            לאן לשלוח את התוצאות שלך?
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#333' }}>שם מלא</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-3.5 rounded-xl bg-white border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors text-base"
                style={{ color: '#1a1a1a', minHeight: '48px', fontSize: '16px' }}
                placeholder="הכנס/י שם מלא"
                autoComplete="name"
                inputMode="text"
              />
              {errors.fullName && (
                <p className="text-destructive text-xs mt-1">{errors.fullName}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#333' }}>אימייל</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3.5 rounded-xl bg-white border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors text-base"
                style={{ color: '#1a1a1a', minHeight: '48px', fontSize: '16px' }}
                placeholder="example@email.com"
                dir="ltr"
                autoComplete="email"
                inputMode="email"
              />
              {errors.email && (
                <p className="text-destructive text-xs mt-1">{errors.email}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#333' }}>טלפון</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3.5 rounded-xl bg-white border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors text-base"
                style={{ color: '#1a1a1a', minHeight: '48px', fontSize: '16px' }}
                placeholder="050-0000000"
                dir="ltr"
                autoComplete="tel"
                inputMode="tel"
              />
              {errors.phone && (
                <p className="text-destructive text-xs mt-1">{errors.phone}</p>
              )}
            </div>
            
            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base md:text-lg hover:bg-primary/90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] mt-4 md:mt-6"
              style={{ minHeight: '52px' }}
            >
              קחו אותי לפרופיל שלי &gt;&gt;
            </button>
            
            <label className="flex items-center gap-3 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.wantsUpdates}
                onChange={(e) => setFormData({ ...formData, wantsUpdates: e.target.checked })}
                className="w-5 h-5 rounded border-2 border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
              <span className="text-sm" style={{ color: '#555' }}>אני רוצה לקבל מידע ועדכונים</span>
            </label>
          </form>
        </div>
      </div>
    </GameStage>
  );
}
