import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * Props for the mission layout wrapper.
 * These are the UI elements that need to be positioned differently
 * between desktop and mobile layouts.
 */
export interface MissionLayoutProps {
  /** The background element (covers entire stage) */
  background: React.ReactNode;
  /** Gradient overlay */
  gradientOverlay: React.ReactNode;
  /** Scene extras (NPCs, decorations) */
  sceneExtras: React.ReactNode;
  /** Target zone indicator during drag */
  targetZone: React.ReactNode;
  /** Placed props layer */
  placedProps: React.ReactNode;
  /** Undo button */
  undoButton: React.ReactNode;
  /** Avatar element */
  avatar: React.ReactNode;
  /** Speech bubble */
  speechBubble: React.ReactNode;
  /** Tool panel/tray */
  toolPanel: React.ReactNode;
  /** Dragging ghost (follows cursor) */
  draggingGhost: React.ReactNode;
  /** Edge pan indicators (mobile only) */
  edgePanIndicators?: React.ReactNode;
  /** Stage ref for drag calculations */
  stageRef: React.RefObject<HTMLDivElement>;
  /** Handler for canceling carry mode */
  onCancelCarry?: () => void;
  /** Whether carry mode is active */
  isCarryMode: boolean;
  /** Whether a tool is currently being dragged */
  isDragging?: boolean;
  /** Pan offset for panoramic backgrounds (mobile only) - percentage points */
  panOffsetX?: number;
  /** Whether panoramic panning is active */
  isPanoramic?: boolean;
}

/**
 * Desktop layout - for screens >= 1024px
 * - Tray anchored bottom-left
 * - Bubble near avatar on right side
 * - Avatar larger, foreground, may overlap bubble edge
 */
function DesktopMissionLayout({
  background,
  gradientOverlay,
  sceneExtras,
  targetZone,
  placedProps,
  undoButton,
  avatar,
  speechBubble,
  toolPanel,
  draggingGhost,
  stageRef,
  onCancelCarry,
  isCarryMode,
}: MissionLayoutProps) {
  return (
    <div 
      ref={stageRef} 
      className="game-stage desktop-layout missionScreen"
      onClick={isCarryMode ? onCancelCarry : undefined}
    >
      {/* Background layer */}
      {background}
      {gradientOverlay}

      {/* Scene extras */}
      {sceneExtras}

      {/* Target zone */}
      {targetZone}

      {/* Placed props */}
      {placedProps}

      {/* Top-right undo button */}
      <div className="absolute z-30 top-4 right-4">
        {undoButton}
      </div>

      {/* Hero row: bubble + avatar, like Welcome screen */}
      <div className="mission-hero-desktop">
        <div className="mission-bubble-desktop">
          {speechBubble}
        </div>
        <div className="mission-avatar-desktop">
          {avatar}
        </div>
      </div>

      {/* Tool panel - bottom LEFT on desktop */}
      <div className="mission-tool-panel-desktop">
        {toolPanel}
      </div>

      {/* Dragging ghost */}
      {draggingGhost}
    </div>
  );
}

/**
 * Mobile layout - for portrait screens < 768px
 * - Stage fills viewport (100vw x 100dvh)
 * - Tray bottom-left (compact)
 * - Bubble above tray
 * - Avatar on right, slightly bigger
 * - Layering: background < tray < bubble < avatar < top controls
 */
function MobileMissionLayout({
  background,
  gradientOverlay,
  sceneExtras,
  targetZone,
  placedProps,
  undoButton,
  avatar,
  speechBubble,
  toolPanel,
  draggingGhost,
  edgePanIndicators,
  stageRef,
  onCancelCarry,
  isCarryMode,
  isDragging = false,
  panOffsetX = 0,
  isPanoramic = false,
}: MissionLayoutProps) {
  // For panoramic backgrounds, we need to offset placed props to match background position
  // The background uses backgroundPosition: `${50 + panOffsetX}% 100%`
  // 
  // Math: Panoramic image width = ~144% of viewport (panRange 22% on each side)
  // When panOffsetX = 22, background position = 72%, showing left side of image
  // The visual content shifts RIGHT by: panOffsetX * (imageWidth / 100)
  //   = 22 * 1.44 = ~31.7% of viewport width
  // Props layer must shift LEFT by the same amount to stay aligned with painted positions
  // 
  // CSS translateX uses container width (100vw = viewport), so:
  // propsTranslateX = -panOffsetX * 1.44
  const panCompensationFactor = 1.44; // Based on 144% wide panoramic image
  const propsTranslateX = isPanoramic ? `${-panOffsetX * panCompensationFactor}%` : '0';

  // Add dragging class to enable CSS-based hiding of hero elements
  const stageClasses = `game-stage mobile-layout missionScreen${isDragging ? ' is-dragging' : ''}`;

  return (
    <div 
      ref={stageRef} 
      className={stageClasses}
      onClick={isCarryMode ? onCancelCarry : undefined}
    >
      {/* Background layer with mobile zoom */}
      {background}
      {gradientOverlay}

      {/* Panoramic content layer - moves with background */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translateX(${propsTranslateX})`,
          transition: 'transform 0.15s ease-out',
        }}
      >
        {/* Scene extras */}
        {sceneExtras}

        {/* Placed props */}
        {placedProps}
      </div>

      {/* Target zone - also moves with background */}
      <div 
        className="absolute inset-0"
        style={{
          transform: `translateX(${propsTranslateX})`,
          transition: 'transform 0.15s ease-out',
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          {targetZone}
        </div>
      </div>

      {/* Top-right undo button */}
      <div className="mission-undo-btn">
        {undoButton}
      </div>

      {/* Tool panel - bottom-left */}
      <div className="mission-tool-panel-mobile">
        {toolPanel}
      </div>

      {/* Hero row: bubble + avatar (like Welcome screen) */}
      <div className="mission-hero-mobile">
        <div className="mission-bubble-mobile">
          {speechBubble}
        </div>
        <div className="mission-avatar-mobile">
          {avatar}
        </div>
      </div>

      {/* Edge pan indicators (mobile only) */}
      {edgePanIndicators}

      {/* Dragging ghost */}
      {draggingGhost}
    </div>
  );
}

/**
 * MissionLayout - Automatically selects Desktop or Mobile layout
 * based on viewport width. All game logic is shared; only positioning differs.
 */
export function MissionLayout(props: MissionLayoutProps) {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return <MobileMissionLayout {...props} />;
  }
  
  return <DesktopMissionLayout {...props} />;
}
