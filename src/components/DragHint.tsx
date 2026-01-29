import { memo } from 'react';

interface DragHintProps {
  className?: string;
}

/**
 * A subtle animated hint showing a hand/arrow gesture.
 * Displayed before the user's first successful drag-drop.
 */
export const DragHint = memo(function DragHint({ className = '' }: DragHintProps) {
  return (
    <div 
      className={`pointer-events-none animate-drag-float ${className}`}
      aria-hidden="true"
    >
      <svg 
        width="32" 
        height="32" 
        viewBox="0 0 24 24" 
        fill="none"
        className="drop-shadow-md"
        style={{ opacity: 0.85 }}
      >
        {/* Upward arrow */}
        <path 
          d="M12 19V5M5 12l7-7 7 7" 
          stroke="hsl(170, 80%, 50%)" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
      {/* Hand icon below arrow */}
      <svg 
        width="28" 
        height="28" 
        viewBox="0 0 24 24" 
        fill="none"
        className="drop-shadow-md -mt-1"
        style={{ opacity: 0.85 }}
      >
        <path 
          d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v1M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v6M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" 
          stroke="hsl(220, 20%, 25%)" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <path 
          d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15V6" 
          stroke="hsl(220, 20%, 25%)" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});
