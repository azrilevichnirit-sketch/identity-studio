import { useEffect, useState } from 'react';
import galleryBg from '@/assets/backgrounds/gallery_main_stylized.webp';
import logoKinneret from '@/assets/logo_kinneret.png';

interface ProcessingScreenProps {
  /** Estimated processing time in ms (for progress animation) */
  estimatedTimeMs?: number;
}

/**
 * Loading screen shown while waiting for Make webhook response.
 * Features an animated "tank" filling up with the text "התוצאות מתבשלות..."
 */
export function ProcessingScreen({ estimatedTimeMs = 5000 }: ProcessingScreenProps) {
  // Start at 15% so user immediately sees activity
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      // Faster fill: use shorter estimated time
      const rawProgress = Math.min(elapsed / estimatedTimeMs, 0.95);
      // Ease-out cubic but starting from 15%
      const easedProgress = 0.15 + (1 - Math.pow(1 - rawProgress, 3)) * 0.80;
      setProgress(easedProgress * 100);
      
      if (rawProgress < 0.95) {
        requestAnimationFrame(animate);
      }
    };
    
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [estimatedTimeMs]);

  return (
    <div 
      className="game-stage flex items-center justify-center"
      style={{
        backgroundImage: `url(${galleryBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
        filter: 'saturate(1.18) contrast(1.08)',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Logo - top right */}
      <div 
        className="absolute z-20"
        style={{
          top: 'max(env(safe-area-inset-top, 16px), 20px)',
          right: 'max(env(safe-area-inset-right, 16px), 20px)',
        }}
      >
        <img 
          src={logoKinneret} 
          alt="Kinneret Academy" 
          className="h-14 md:h-16 object-contain"
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center animate-fade-in">
        {/* Card container */}
        <div 
          className="p-6 md:p-8 rounded-2xl text-center"
          style={{
            width: 'min(320px, 88vw)',
            background: 'rgba(255, 252, 245, 0.96)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          {/* Animated icon */}
          <div className="text-4xl md:text-5xl mb-4 animate-pulse">🔮</div>
          
          {/* Title */}
          <h1 
            className="text-xl md:text-2xl font-bold mb-6"
            style={{ color: '#111', fontFamily: "'Rubik', sans-serif" }}
          >
            התוצאות מתבשלות...
          </h1>
          
          {/* Tank container */}
          <div 
            className="relative mx-auto rounded-full overflow-hidden"
            style={{
              width: '140px',
              height: '180px',
              background: 'linear-gradient(180deg, #e8e4dc 0%, #d4cfc5 100%)',
              border: '4px solid #a89f8f',
              boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            {/* Liquid fill */}
            <div 
              className="absolute bottom-0 left-0 right-0 transition-all duration-300"
              style={{
                height: `${progress}%`,
                background: 'linear-gradient(180deg, hsl(170 70% 45%) 0%, hsl(170 80% 35%) 100%)',
                boxShadow: 'inset 0 2px 8px rgba(255,255,255,0.3)',
              }}
            >
              {/* Bubbles animation */}
              <div className="absolute inset-0 overflow-hidden">
                <div 
                  className="absolute w-3 h-3 rounded-full bg-white/30"
                  style={{
                    left: '20%',
                    animation: 'rise 2s ease-in-out infinite',
                  }}
                />
                <div 
                  className="absolute w-2 h-2 rounded-full bg-white/20"
                  style={{
                    left: '60%',
                    animation: 'rise 2.5s ease-in-out infinite 0.5s',
                  }}
                />
                <div 
                  className="absolute w-2.5 h-2.5 rounded-full bg-white/25"
                  style={{
                    left: '40%',
                    animation: 'rise 1.8s ease-in-out infinite 1s',
                  }}
                />
              </div>
              
              {/* Surface waves */}
              <div 
                className="absolute top-0 left-0 right-0 h-2"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%)',
                  animation: 'wave 1.5s ease-in-out infinite',
                }}
              />
            </div>
            
            {/* Glass reflection */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)',
              }}
            />
          </div>
          
          {/* Progress text */}
          <p 
            className="mt-4 text-sm"
            style={{ color: '#666', fontFamily: "'Rubik', sans-serif" }}
          >
            מנתחים את הפרופיל שלך...
          </p>
        </div>
      </div>
      
      {/* CSS Animations */}
      <style>{`
        @keyframes rise {
          0% {
            bottom: 0;
            opacity: 0.6;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            bottom: 100%;
            opacity: 0;
          }
        }
        
        @keyframes wave {
          0%, 100% {
            transform: translateX(-5%) scaleY(1);
          }
          50% {
            transform: translateX(5%) scaleY(1.5);
          }
        }
      `}</style>
    </div>
  );
}
