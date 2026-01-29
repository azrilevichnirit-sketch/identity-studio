// Small disclaimer text component
interface DisclaimerProps {
  className?: string;
}

export function Disclaimer({ className = '' }: DisclaimerProps) {
  return (
    <p 
      className={`text-[10px] text-white/50 leading-tight select-none ${className}`}
      style={{ letterSpacing: '0.01em' }}
    >
      התוצאות מיועדות להכוונה ראשונית ואינן מהוות תחליף לייעוץ מקצועי.
    </p>
  );
}
