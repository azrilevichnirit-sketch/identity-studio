import { useState } from 'react';
import type { LeadFormData } from '@/types/identity';
import studioEntranceBg from '@/assets/backgrounds/studio_in_entrance_view_bg.webp';

interface LeadFormProps {
  onSubmit: (data: LeadFormData) => void;
}

export function LeadForm({ onSubmit }: LeadFormProps) {
  const [formData, setFormData] = useState<LeadFormData>({
    fullName: '',
    email: '',
    phone: '',
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
      <div className="relative z-10 animate-fade-in">
        <div 
          className="p-8 rounded-2xl w-[400px]"
          style={{
            background: 'rgba(255, 252, 245, 0.95)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <h1 className="text-2xl font-bold mb-2 text-center text-foreground">כמעט סיימנו!</h1>
          <p className="text-muted-foreground mb-6 text-center">
            מלא/י את הפרטים כדי לקבל את התוצאות
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">שם מלא</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-white border border-border focus:border-primary focus:outline-none transition-colors text-foreground"
                placeholder="הכנס/י שם מלא"
              />
              {errors.fullName && (
                <p className="text-destructive text-xs mt-1">{errors.fullName}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">אימייל</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-white border border-border focus:border-primary focus:outline-none transition-colors text-foreground"
                placeholder="example@email.com"
                dir="ltr"
              />
              {errors.email && (
                <p className="text-destructive text-xs mt-1">{errors.email}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">טלפון</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-white border border-border focus:border-primary focus:outline-none transition-colors text-foreground"
                placeholder="050-0000000"
                dir="ltr"
              />
              {errors.phone && (
                <p className="text-destructive text-xs mt-1">{errors.phone}</p>
              )}
            </div>
            
            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] mt-4"
            >
              הצג תוצאות
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
