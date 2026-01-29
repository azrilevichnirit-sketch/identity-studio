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
 * Reusable speech bubble component with chat-style tail.
 * Uses high-contrast cream background (#FFFCF5) with dark text (#111).
 * RTL-ready with Hebrew-friendly typography.
 */
export function SpeechBubble({ 
  children, 
  tailDirection = 'right',
  className = '',
  style = {},
}: SpeechBubbleProps) {
  return (
    <div 
      className={`relative rounded-2xl ${className}`}
      style={{
        background: 'rgba(255, 252, 245, 0.96)',
        boxShadow: '0 6px 24px rgba(0,0,0,0.2)',
        ...style,
      }}
    >
      {/* Bubble tail - clean triangle using borders */}
      <div 
        className="absolute"
        style={{
          ...(tailDirection === 'right' ? {
            right: '-14px',
            bottom: '32px',
            width: 0,
            height: 0,
            borderTop: '12px solid transparent',
            borderBottom: '12px solid transparent',
            borderLeft: '14px solid rgba(255, 252, 245, 0.96)',
          } : {
            left: '-14px',
            bottom: '32px',
            width: 0,
            height: 0,
            borderTop: '12px solid transparent',
            borderBottom: '12px solid transparent',
            borderRight: '14px solid rgba(255, 252, 245, 0.96)',
          }),
        }}
      />
      
      {/* Content with proper typography */}
      <div 
        className="p-5"
        style={{
          fontFamily: "'Heebo', 'Assistant', sans-serif",
          fontSize: '18px',
          lineHeight: '1.55',
          color: '#111',
          direction: 'rtl',
          textAlign: 'right',
        }}
      >
        {children}
      </div>
    </div>
  );
}
