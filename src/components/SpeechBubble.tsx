import React, { useState, useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface SpeechBubbleProps {
  children: React.ReactNode;
  /** Direction the tail points to (where avatar is) */
  tailDirection?: 'right' | 'left';
  /** Additional class names */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Unique key to trigger new mission animation */
  missionKey?: string;
  /** Callback when idle timeout triggers (desktop only) */
  onIdleTimeout?: () => void;
}

const IDLE_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Reusable speech bubble component with seamless chat-style tail.
 * Uses high-contrast cream background with dark text.
 * RTL-ready with Hebrew-friendly typography.
 * 
 * Features:
 * - New mission glow animation when missionKey changes
 * - Idle reminder pulse after 30s inactivity (desktop only)
 */
export function SpeechBubble({ 
  children, 
  tailDirection = 'right',
  className = '',
  style = {},
  missionKey,
  onIdleTimeout,
}: SpeechBubbleProps) {
  const isMobile = useIsMobile();
  const [isNewMission, setIsNewMission] = useState(false);
  const [isIdleReminder, setIsIdleReminder] = useState(false);
  const prevMissionKeyRef = useRef<string | undefined>(undefined);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle new mission animation
  useEffect(() => {
    if (missionKey && missionKey !== prevMissionKeyRef.current) {
      prevMissionKeyRef.current = missionKey;
      setIsNewMission(true);
      setIsIdleReminder(false);
      
      // Remove animation class after it completes
      const timer = setTimeout(() => {
        setIsNewMission(false);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [missionKey]);

  // Handle idle reminder (desktop only)
  useEffect(() => {
    if (isMobile) return;
    
    // Clear existing timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    
    // Reset idle state when mission changes
    setIsIdleReminder(false);
    
    // Start idle timer
    idleTimerRef.current = setTimeout(() => {
      setIsIdleReminder(true);
      onIdleTimeout?.();
    }, IDLE_TIMEOUT_MS);
    
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [missionKey, isMobile, onIdleTimeout]);

  // Build frame classes
  const frameClasses = [
    'speech-bubble-frame',
    isNewMission ? 'new-mission' : '',
    isIdleReminder && !isNewMission ? 'idle-reminder' : '',
  ].filter(Boolean).join(' ');

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
      {/* Animated frame wrapper */}
      <div className={frameClasses}>
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
    </div>
  );
}
