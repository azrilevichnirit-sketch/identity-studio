import React from 'react';

interface SpeechBubbleProps {
  children: React.ReactNode;
  /** Direction the tail points to (where avatar is) */
  tailDirection?: 'right' | 'left';
  /** Additional class names */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

/**
 * Reusable speech bubble component with seamless chat-style tail.
 * Uses high-contrast cream background with dark text.
 * RTL-ready with Hebrew-friendly typography.
 * 
 * The tail is built as a CSS pseudo-element so it shares the same
 * drop-shadow as the bubble (no visible seam).
 */
export function SpeechBubble({ 
  children, 
  tailDirection = 'right',
  className = '',
  style = {},
}: SpeechBubbleProps) {
  return (
    <div 
      className={`relative ${className}`}
      style={{
        filter: 'drop-shadow(0 14px 28px rgba(0,0,0,0.18))',
        ...style,
      }}
    >
      {/* Bubble panel with seamless tail pseudo-element */}
      <div 
        className="relative rounded-[22px]"
        style={{
          background: 'rgba(255,255,255,0.94)',
          border: '1px solid rgba(255,255,255,0.55)',
        }}
      >
        {/* Tail - CSS element for seamless shadow */}
        <div
          style={{
            position: 'absolute',
            width: '20px',
            height: '20px',
            background: 'rgba(255,255,255,0.94)',
            borderRadius: '6px',
            ...(tailDirection === 'right' ? {
              right: '-6px',
              top: '55%',
              transform: 'translateY(-50%) rotate(45deg)',
            } : {
              left: '-6px',
              top: '55%',
              transform: 'translateY(-50%) rotate(45deg)',
            }),
          }}
        />
        
        {/* Content with comfortable padding */}
        <div 
          className="relative px-5 py-3 md:px-6 md:py-3"
          style={{
            fontFamily: "'Rubik', sans-serif",
            fontSize: '17px',
            lineHeight: '1.55',
            color: '#111',
            direction: 'rtl',
            textAlign: 'right',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
