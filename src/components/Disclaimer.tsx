import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface DisclaimerProps {
  className?: string;
}

/**
 * Disclaimer text for professional advice.
 * Displayed in very small font in the bottom corner of world selection
 * and results footer.
 */
export const Disclaimer = forwardRef<HTMLParagraphElement, DisclaimerProps>(
  ({ className }, ref) => {
    return (
      <p 
        ref={ref}
        className={cn(
          "text-[11px] leading-tight opacity-70",
          className
        )}
        style={{
          fontFamily: "'Rubik', sans-serif",
          direction: 'rtl',
        }}
      >
        התוצאות מיועדות להכוונה ראשונית ואינן מהוות תחליף לייעוץ מקצועי.
      </p>
    );
  }
);

Disclaimer.displayName = 'Disclaimer';
