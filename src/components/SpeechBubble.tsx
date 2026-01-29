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
 * The tail is implemented as a CSS pseudo-element (::after) so it
 * shares the same drop-shadow filter as the bubble body, creating
 * a seamless unified shape with no visible seam.
 */
export function SpeechBubble({ 
  children, 
  tailDirection = 'right',
  className = '',
  style = {},
}: SpeechBubbleProps) {
  // Wrapper applies drop-shadow filter to the entire shape (body + tail)
  // This creates a unified shadow that wraps both elements seamlessly
  return (
    <div 
      className={`speech-bubble-wrapper ${className}`}
      style={{
        position: 'relative',
        filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.15)) drop-shadow(0 2px 6px rgba(0,0,0,0.08))',
        ...style,
      }}
    >
      {/* Main bubble body with ::after tail */}
      <div 
        className={`speech-bubble-body speech-bubble-tail-${tailDirection}`}
        style={{
          position: 'relative',
          background: '#FFFDF8',
          borderRadius: '18px',
        }}
      >
        {/* Content area */}
        <div 
          className="speech-bubble-content"
          style={{
            padding: '14px 18px',
            fontFamily: "'Rubik', sans-serif",
            fontSize: '15px',
            lineHeight: '1.55',
            color: '#1a1a1a',
            direction: 'rtl',
            textAlign: 'right',
          }}
        >
          {children}
        </div>
      </div>

      {/* 
        Inline style tag for ::after pseudo-element
        This is cleaner than injecting global CSS and keeps the component self-contained
      */}
      <style>{`
        .speech-bubble-tail-right::after,
        .speech-bubble-tail-left::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          background: #FFFDF8;
          border-radius: 4px;
          bottom: 20px;
          z-index: -1;
        }
        
        .speech-bubble-tail-right::after {
          right: -7px;
          transform: rotate(45deg);
        }
        
        .speech-bubble-tail-left::after {
          left: -7px;
          transform: rotate(45deg);
        }
      `}</style>
    </div>
  );
}
