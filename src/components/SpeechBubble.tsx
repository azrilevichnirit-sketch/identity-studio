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
  // Using a wrapper with drop-shadow filter so the tail shares the same shadow
  // This creates a seamless single-bubble appearance
  return (
    <div 
      className={`relative speech-bubble-wrapper ${className}`}
      style={{
        // drop-shadow on wrapper applies to all child shapes uniformly
        filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.20))',
        ...style,
      }}
    >
      {/* Main bubble body */}
      <div 
        className="relative rounded-[20px] speech-bubble-body"
        style={{
          background: '#FFFDF8',
        }}
      >
        {/* Tail - positioned to overlap bubble edge, creating seamless connection */}
        {/* Using same background color and no separate shadow (wrapper handles it) */}
        <div
          className="speech-bubble-tail"
          style={{
            position: 'absolute',
            width: '22px',
            height: '22px',
            background: '#FFFDF8',
            borderRadius: '5px',
            // Position tail to slightly overlap the bubble body
            ...(tailDirection === 'right' ? {
              right: '-8px',
              bottom: '24px',
              transform: 'rotate(45deg)',
            } : {
              left: '-8px',
              bottom: '24px',
              transform: 'rotate(45deg)',
            }),
            // Clip the outer corner for smoother blend
            zIndex: -1,
          }}
        />
        
        {/* Content area with comfortable padding */}
        <div 
          className="relative px-4 py-3 md:px-5 md:py-3.5"
          style={{
            fontFamily: "'Rubik', sans-serif",
            fontSize: '15px',
            lineHeight: '1.5',
            color: '#1a1a1a',
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
