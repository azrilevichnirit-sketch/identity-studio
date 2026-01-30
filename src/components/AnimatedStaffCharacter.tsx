import { useState, useEffect } from 'react';

// Import staff avatar images
import femaleStaffWalk from '@/assets/avatars/studio_01_female_staff_walk.webp';
import maleStaffWalk from '@/assets/avatars/studio_01_male_staff_walk.webp';

export type StaffGender = 'female' | 'male';
export type CharacterState = 'entering' | 'idle' | 'working' | 'walking-to-tool' | 'exited';

interface AnimatedStaffCharacterProps {
  gender: StaffGender;
  /** Current animation state */
  state: CharacterState;
  /** Starting X position (percentage from left) */
  startX?: number;
  /** Idle X position after entering */
  idleX?: number;
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
  idleX = 25,
  targetX = 50,
  bottomY = 8,
  scale = 1.4,
  zIndex = 25,
  animationDuration = 2500,
  delay = 0,
  flipX = false,
}: AnimatedStaffCharacterProps) {
  const [currentX, setCurrentX] = useState(startX);
  const [isVisible, setIsVisible] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [currentFlip, setCurrentFlip] = useState(flipX);

  const avatarSrc = gender === 'female' ? femaleStaffWalk : maleStaffWalk;

  // Handle state changes
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (state === 'entering') {
      // Start entering animation after delay
      timeout = setTimeout(() => {
        setIsVisible(true);
        setIsMoving(true);
        // Move to idle position
        setCurrentX(idleX + (gender === 'male' ? 20 : 0));
        // Face right when entering
        setCurrentFlip(false);
      }, delay);
    } else if (state === 'idle' || state === 'working') {
      setIsMoving(false);
    } else if (state === 'walking-to-tool') {
      setIsMoving(true);
      // Determine direction to face based on target
      const currentPos = idleX + (gender === 'male' ? 20 : 0);
      setCurrentFlip(targetX < currentPos);
      setCurrentX(targetX + (gender === 'male' ? 5 : -5));
    } else if (state === 'exited') {
      setIsMoving(true);
      setCurrentFlip(true); // Face left when exiting
      setCurrentX(-15);
      timeout = setTimeout(() => {
        setIsVisible(false);
      }, animationDuration);
    }

    return () => clearTimeout(timeout);
  }, [state, delay, targetX, idleX, gender, animationDuration]);

  // Stop moving animation after reaching destination
  useEffect(() => {
    if (isMoving) {
      const timeout = setTimeout(() => {
        setIsMoving(false);
      }, animationDuration);
      return () => clearTimeout(timeout);
    }
  }, [isMoving, animationDuration]);

  if (!isVisible && state !== 'entering') return null;

  return (
    <div
      className="animated-staff-character"
      style={{
        position: 'absolute',
        left: `${currentX}%`,
        bottom: `${bottomY}%`,
        transform: `translateX(-50%) scale(${scale}) ${currentFlip ? 'scaleX(-1)' : ''}`,
        transformOrigin: 'bottom center',
        zIndex,
        transition: isMoving 
          ? `left ${animationDuration}ms ease-in-out, opacity 400ms ease`
          : 'opacity 400ms ease',
        opacity: isVisible ? 1 : 0,
        pointerEvents: 'none',
      }}
    >
      <img
        src={avatarSrc}
        alt={`${gender} staff member`}
        className={isMoving ? 'animate-walk' : 'animate-subtle-idle'}
        style={{
          height: 'clamp(180px, 28vh, 320px)',
          width: 'auto',
          objectFit: 'contain',
          filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.5))',
        }}
      />
    </div>
  );
}
