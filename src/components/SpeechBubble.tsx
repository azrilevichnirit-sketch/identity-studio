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
      {/* Bubble tail - clean triangle using clip-path for seamless join */}
      <div 
        className="absolute"
        style={{
          ...(tailDirection === 'right' ? {
            right: '-16px',
            top: tailVerticalPosition,
            transform: 'translateY(-50%)',
            width: '18px',
            height: '24px',
            background: '#FFFCF5',
            clipPath: 'polygon(0 0, 0 100%, 100% 50%)',
          } : {
            left: '-16px',
            top: tailVerticalPosition,
            transform: 'translateY(-50%)',
            width: '18px',
            height: '24px',
            background: '#FFFCF5',
            clipPath: 'polygon(100% 0, 100% 100%, 0 50%)',
          }),
        }}
      />
      
      {/* Content with proper typography */}
      <div 
        className="p-5 md:p-6"
        style={{
          fontFamily: "'Assistant', sans-serif",
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
