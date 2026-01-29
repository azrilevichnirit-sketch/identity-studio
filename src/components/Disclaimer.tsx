import { cn } from '@/lib/utils';

interface DisclaimerProps {
  className?: string;
}

/**
 * Disclaimer text for professional advice.
 * Displayed in very small font in the bottom corner of world selection
 * and results footer.
 */
export function Disclaimer({ className }: DisclaimerProps) {
  return (
    <p 
      className={cn(
        "text-[11px] leading-tight opacity-70",
        className
      )}
      style={{
        fontFamily: "'Heebo', sans-serif",
        direction: 'rtl',
      }}
    >
      התוצאות מיועדות להכוונה ראשונית ואינן מהוות תחליף לייעוץ מקצועי.
    </p>
  );
}
