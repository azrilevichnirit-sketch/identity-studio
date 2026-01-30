import { useState, useEffect, useMemo } from 'react';

// Import staff avatar images
import femaleStaffWalk from '@/assets/avatars/studio_01_female_staff_walk.webp';
import maleStaffWalk from '@/assets/avatars/studio_01_male_staff_walk.webp';

export type StaffGender = 'female' | 'male';
export type CharacterState = 'entering' | 'idle' | 'walking-to-tool' | 'exited';

interface AnimatedStaffCharacterProps {
  gender: StaffGender;
  /** Current animation state */
  state: CharacterState;
  /** Starting X position (percentage from left) */
  startX?: number;
  /** Target X position when walking to tool (percentage from left) */
  targetX?: number;
  /** Y position (percentage from bottom) */
  bottomY?: number;
  /** Scale of the character */
  scale?: number;
  /** Z-index for layering */
  zIndex?: number;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Delay before animation starts */
  delay?: number;
  /** Flip horizontally (face left instead of right) */
  flipX?: boolean;
}

export function AnimatedStaffCharacter({
  gender,
  state,
  startX = -10,
  targetX = 50,
  bottomY = 15,
  scale = 1,
  zIndex = 25,
  animationDuration = 2000,
  delay = 0,
  flipX = false,
}: AnimatedStaffCharacterProps) {
  const [currentX, setCurrentX] = useState(startX);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const avatarSrc = gender === 'female' ? femaleStaffWalk : maleStaffWalk;

  // Handle state changes
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (state === 'entering') {
      // Start entering animation after delay
      timeout = setTimeout(() => {
        setIsVisible(true);
        setIsAnimating(true);
        // Move to idle position (center-ish)
        setCurrentX(30 + (gender === 'male' ? 15 : 0));
      }, delay);
    } else if (state === 'walking-to-tool') {
      setIsAnimating(true);
      setCurrentX(targetX);
    } else if (state === 'exited') {
      setIsAnimating(true);
      setCurrentX(110); // Move off screen
      timeout = setTimeout(() => {
        setIsVisible(false);
      }, animationDuration);
    }

    return () => clearTimeout(timeout);
  }, [state, delay, targetX, gender, animationDuration]);

  // Stop animating after duration
  useEffect(() => {
    if (isAnimating) {
      const timeout = setTimeout(() => {
        setIsAnimating(false);
      }, animationDuration);
      return () => clearTimeout(timeout);
    }
  }, [isAnimating, animationDuration]);

  if (!isVisible && state !== 'entering') return null;

  return (
    <div
      className="animated-staff-character"
      style={{
        position: 'absolute',
        left: `${currentX}%`,
        bottom: `${bottomY}%`,
        transform: `translateX(-50%) scale(${scale}) ${flipX ? 'scaleX(-1)' : ''}`,
        transformOrigin: 'bottom center',
        zIndex,
        transition: isAnimating 
          ? `left ${animationDuration}ms ease-in-out, opacity 300ms ease`
          : 'none',
        opacity: isVisible ? 1 : 0,
        pointerEvents: 'none',
      }}
    >
      <img
        src={avatarSrc}
        alt={`${gender} staff member`}
        className={isAnimating ? 'animate-walk' : 'animate-subtle-float'}
        style={{
          height: 'clamp(120px, 18vh, 200px)',
          width: 'auto',
          objectFit: 'contain',
          filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))',
        }}
      />
    </div>
  );
}
