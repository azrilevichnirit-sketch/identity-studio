import { useMemo } from 'react';

interface ProgressTankProps {
  current: number;
  total: number;
}

export function ProgressTank({ current, total }: ProgressTankProps) {
  const progress = (current / total) * 100;
  
  // Generate random bubble positions once
  const bubbles = useMemo(() => [
    { left: '15%', delay: '0s', size: 4, duration: '2.5s' },
    { left: '45%', delay: '0.8s', size: 3, duration: '2s' },
    { left: '75%', delay: '1.5s', size: 5, duration: '2.8s' },
    { left: '30%', delay: '2s', size: 3, duration: '2.2s' },
  ], []);

  return (
    <div className="flex items-center gap-3">
      {/* Tank container - capsule shape */}
      <div 
        className="relative overflow-hidden"
        style={{
          width: '110px',
          height: '28px',
          borderRadius: '14px',
          background: 'linear-gradient(180deg, rgba(0,20,30,0.7) 0%, rgba(0,40,50,0.5) 100%)',
          border: '3px solid rgba(80,200,180,0.4)',
          boxShadow: `
            inset 0 4px 12px rgba(0,0,0,0.4),
            inset 0 -2px 6px rgba(255,255,255,0.05),
            0 2px 8px rgba(0,0,0,0.3)
          `,
        }}
      >
        {/* Liquid fill */}
        <div 
          className="absolute bottom-0 left-0 right-0 transition-all overflow-hidden"
          style={{ 
            height: `${progress}%`,
            transitionDuration: '400ms',
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
            background: 'linear-gradient(0deg, hsl(170 75% 35%) 0%, hsl(170 80% 50%) 60%, hsl(170 85% 60%) 100%)',
            borderRadius: '0 0 11px 11px',
          }}
        >
          {/* Surface wave effect */}
          <div 
            className="absolute top-0 left-0 right-0 h-2"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)',
              animation: 'wave 2s ease-in-out infinite',
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
            background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
            borderRadius: '11px',
          }}
        />

        {/* Animated shine streak */}
        <div 
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ borderRadius: '11px' }}
        >
          <div 
            className="absolute h-full w-1/3"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
              animation: 'tank-shine 3s ease-in-out infinite',
            }}
          />
        </div>

        {/* Inner reflections - left */}
        <div 
          className="absolute top-1 left-1 bottom-1 w-1 rounded-full pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%)',
          }}
        />
      </div>

      {/* Counter text */}
      <span 
        className="text-sm md:text-base font-semibold"
        style={{ 
          color: 'rgba(255,255,255,0.9)',
          fontVariantNumeric: 'tabular-nums',
          textShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}
      >
        {current}/{total}
      </span>
    </div>
  );
}
