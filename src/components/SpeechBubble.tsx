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
  // Tail position closer to top (near avatar's face/torso)
  const tailVerticalPosition = '65%';
  
  return (
    <div 
      className={`relative rounded-2xl ${className}`}
      style={{
        background: '#FFFCF5',
        boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
        ...style,
      }}
    >
      {/* Bubble tail - seamless triangle using SVG for clean edges */}
      <svg 
        className="absolute"
        width="20"
        height="28"
        viewBox="0 0 20 28"
        fill="none"
        style={{
          ...(tailDirection === 'right' ? {
            right: '-19px',
            top: tailVerticalPosition,
            transform: 'translateY(-50%)',
          } : {
            left: '-19px',
            top: tailVerticalPosition,
            transform: 'translateY(-50%) scaleX(-1)',
          }),
        }}
      >
        <path 
          d="M0 0 L0 28 L20 14 Z" 
          fill="#FFFCF5"
        />
      </svg>
      
      {/* Content with compact padding */}
      <div 
        className="px-5 py-3 md:px-6 md:py-3"
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
  );
}
