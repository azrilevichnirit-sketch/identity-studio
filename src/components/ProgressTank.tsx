import React, { useMemo } from 'react';

interface ProgressTankProps {
  /** Progress value from 0 to 1 */
  value: number;
}

export const ProgressTank = React.forwardRef<HTMLDivElement, ProgressTankProps>(
  function ProgressTank({ value }, ref) {
    // Clamp value between 0-1 and convert to percentage
    const progress = Math.min(1, Math.max(0, value)) * 100;

    // Generate bubble positions once
    const bubbles = useMemo(
      () => [
        { left: '20%', delay: '0s', size: 3, duration: '2.5s' },
        { left: '50%', delay: '0.8s', size: 2, duration: '2s' },
        { left: '75%', delay: '1.5s', size: 4, duration: '2.8s' },
      ],
      []
    );

    return (
      <div
        ref={ref}
        className="relative overflow-hidden"
        style={{
          minWidth: '120px',
          maxWidth: '180px',
          width: '100%',
          height: '18px',
          borderRadius: '9px',
          background: 'linear-gradient(180deg, rgba(0,20,30,0.75) 0%, rgba(0,40,50,0.55) 100%)',
          border: '2px solid rgba(80,200,180,0.35)',
          boxShadow: `
            inset 0 3px 10px rgba(0,0,0,0.45),
            inset 0 -2px 4px rgba(255,255,255,0.05),
            0 2px 6px rgba(0,0,0,0.25)
          `,
        }}
      >
      {/* Liquid fill */}
      <div 
        className="absolute bottom-0 left-0 overflow-hidden transition-[width]"
        style={{ 
          width: `${progress}%`,
          height: '100%',
          transitionDuration: '350ms',
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'linear-gradient(0deg, hsl(170 75% 35%) 0%, hsl(170 80% 50%) 50%, hsl(170 85% 60%) 100%)',
          borderRadius: '7px 0 0 7px',
        }}
      >
        {/* Surface highlight on right edge */}
        <div 
          className="absolute top-0 right-0 bottom-0 w-1"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.1) 100%)',
          }}
        />
        
        {/* Rising bubbles */}
        {bubbles.map((bubble, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: bubble.left,
              width: `${bubble.size}px`,
              height: `${bubble.size}px`,
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), rgba(255,255,255,0.2))',
              animation: `bubble-rise ${bubble.duration} ease-in-out infinite`,
              animationDelay: bubble.delay,
            }}
          />
        ))}
      </div>

      {/* Glass highlight overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%, rgba(0,0,0,0.08) 100%)',
          borderRadius: '7px',
        }}
      />

      {/* Animated shine streak */}
      <div 
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ borderRadius: '7px' }}
      >
        <div 
          className="absolute h-full w-1/4"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
            animation: 'tank-shine 3s ease-in-out infinite',
          }}
        />
      </div>

      {/* Inner reflection - top edge */}
      <div 
        className="absolute top-0.5 left-1 right-1 h-0.5 rounded-full pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 100%)',
        }}
      />
      </div>
    );
  }
);

