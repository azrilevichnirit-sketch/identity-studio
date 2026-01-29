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
  /** Stage ref for drag calculations */
  stageRef: React.RefObject<HTMLDivElement>;
  /** Handler for canceling carry mode */
  onCancelCarry?: () => void;
  /** Whether carry mode is active */
  isCarryMode: boolean;
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
      className="game-stage desktop-layout"
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

      {/* Avatar - right side, foreground */}
      <div className="desktop-avatar">
        {avatar}
      </div>

      {/* Speech bubble - near avatar, behind it */}
      <div className="desktop-bubble">
        {speechBubble}
      </div>

      {/* Tool panel - bottom LEFT on desktop */}
      <div className="desktop-tool-panel">
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
  stageRef,
  onCancelCarry,
  isCarryMode,
}: MissionLayoutProps) {
  return (
    <div 
      ref={stageRef} 
      className="game-stage mobile-layout"
      onClick={isCarryMode ? onCancelCarry : undefined}
    >
      {/* Background layer with mobile zoom */}
      {background}
      {gradientOverlay}

      {/* Scene extras - z-index 3-8 */}
      {sceneExtras}

      {/* Target zone - z-index 12 */}
      {targetZone}

      {/* Placed props - z-index 5-15 */}
      {placedProps}

      {/* Tool panel - z-index 18 (bottom-left, compact) */}
      <div className="mobile-tool-panel">
        {toolPanel}
      </div>

      {/* Speech bubble - z-index 20 (above tray) */}
      <div className="mobile-bubble">
        {speechBubble}
      </div>

      {/* Avatar - z-index 25 (right side, foreground) */}
      <div className="mobile-avatar">
        {avatar}
      </div>

      {/* Top-right undo button - z-index 30 */}
      <div className="mobile-undo-btn">
        {undoButton}
      </div>

      {/* Dragging ghost - z-index 55 */}
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
