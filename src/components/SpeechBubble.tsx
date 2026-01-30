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
  return (
    <div 
      className={`speech-bubble-wrapper ${className}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        maxWidth: '100%',
        filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.15)) drop-shadow(0 2px 6px rgba(0,0,0,0.08))',
        ...style,
      }}
    >
      {/* Main bubble body */}
      <div 
        className="speech-bubble-body"
        style={{
          position: 'relative',
          background: '#FFFDF8',
          borderRadius: '18px',
          overflow: 'visible',
        }}
      >
        {/* Content area */}
        <div 
          className="speech-bubble-content"
          style={{
            padding: '12px 14px',
            fontFamily: "'Rubik', sans-serif",
            fontSize: '15px',
            lineHeight: '1.55',
            color: '#1a1a1a',
            direction: 'rtl',
            textAlign: 'right',
          }}
        >
          <div style={{ direction: 'rtl', textAlign: 'right' }}>
            {children}
          </div>
        </div>
        
        {/* Tail - rendered as a sibling with proper stacking */}
        <div
          style={{
            position: 'absolute',
            width: '20px',
            height: '20px',
            background: '#FFFDF8',
            borderRadius: '4px',
            bottom: '20px',
            ...(tailDirection === 'right' 
              ? { right: '-7px', transform: 'rotate(45deg)' }
              : { left: '-7px', transform: 'rotate(45deg)' }
            ),
          }}
        />
      </div>
    </div>
  );
}
