import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import type { Mission, HollandCode, AvatarGender, PickRecord, MissionOption, AnchorRef } from '@/types/identity';
import { getToolImage, getBackgroundForMission, getAvatarImage, getBackgroundKey, getBackgroundByName, getPanoramicBackground, preloadBackground } from '@/lib/assetUtils';
import { getAnchorPosition } from '@/lib/jsonDataLoader';
import { SpeechBubble } from './SpeechBubble';
import { Info, Hand, X } from 'lucide-react';
import { UndoConfirmPopover } from './UndoConfirmDialog';
import { ProgressTank } from './ProgressTank';
import { DragHint } from './DragHint';
// import { useSceneExtras } from '@/hooks/useSceneExtras'; // Disabled for now
import { MissionLayout } from './layouts/MissionLayout';
import { usePanningBackground } from '@/hooks/usePanningBackground';
import { useIsMobile } from '@/hooks/use-mobile';
import { BackgroundCrossfade } from './BackgroundCrossfade';
import femaleStaffWalk from '@/assets/avatars/studio_01_female_staff_walk.webp';
// import { AnimatedStaffCharacter, type CharacterState } from './AnimatedStaffCharacter'; // Disabled

const DRAG_HINT_STORAGE_KEY = 'ie_hasDraggedOnce';

interface VisualPlayScreenProps {
  mission: Mission;
  currentIndex: number;
  totalMissions: number;
  isTieBreaker: boolean;
  canUndo: boolean;
  avatarGender: AvatarGender;
  placedProps: PickRecord[];
  onSelect: (missionId: string, key: 'a' | 'b', hollandCode: HollandCode, option?: MissionOption) => void;
  onUndo: () => void;
}

export function VisualPlayScreen({
  mission,
  currentIndex,
  totalMissions,
  isTieBreaker,
  canUndo,
  avatarGender,
  placedProps,
  onSelect,
  onUndo,
}: VisualPlayScreenProps) {
  const [showUndoDialog, setShowUndoDialog] = useState(false);
  const [draggingTool, setDraggingTool] = useState<'a' | 'b' | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [justPlaced, setJustPlaced] = useState<string | null>(null);
  const [lockPulseKey, setLockPulseKey] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<'a' | 'b' | null>(null);
  const [hasDraggedOnce, setHasDraggedOnce] = useState(() => {
    return localStorage.getItem(DRAG_HINT_STORAGE_KEY) === 'true';
  });
  // Carry mode for touch fallback - tap to pick up, tap target to place
  const [carryModeTool, setCarryModeTool] = useState<'a' | 'b' | null>(null);
  const [showToolSwapCue, setShowToolSwapCue] = useState(false);
  
  // Local placement state - shows tool BEFORE it's added to global placedProps
  const [localPlacement, setLocalPlacement] = useState<{
    missionId: string;
    key: 'a' | 'b';
    assetName: string;
  } | null>(null);

  // Local background override for "painted walls" beat before advancing missions
  const [localBgOverride, setLocalBgOverride] = useState<{ key: string; image: string } | null>(null);

  // Track and cleanup staged timeouts (avoid state updates after unmount)
  const timeoutsRef = useRef<number[]>([]);
  const didMountRef = useRef(false);
  
  const stageRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  
  // Options from mission
  const optionA = mission.options.find((o) => o.key === 'a')!;
  const optionB = mission.options.find((o) => o.key === 'b')!;

  // Mission 01 special rule (per product spec): choosing tool A paints the walls white
  const PAINTED_WALLS_BG_KEY = 'studio_in_gallery_wall_bg';
  const hasPaintedWalls = useMemo(() => {
    return placedProps.some((p) => p.missionId === 'studio_01' && p.key === 'a');
  }, [placedProps]);

  // Preload the “painted walls” background to avoid a flash/jump on transition.
  useEffect(() => {
    preloadBackground(PAINTED_WALLS_BG_KEY);
  }, []);

  // After we advanced to the next mission, rely on normal background selection.
  useEffect(() => {
    if (mission.mission_id !== 'studio_01' && localBgOverride?.key === PAINTED_WALLS_BG_KEY) {
      const id = window.setTimeout(() => setLocalBgOverride(null), 50);
      return () => window.clearTimeout(id);
    }
  }, [mission.mission_id, localBgOverride]);

  // Get the *actual* previous mission pick (Object.values order is not reliable)
  const previousBgOverride = useMemo(() => {
    // Product rule: if player painted in mission 01, mission 02+ walls are white
    if (mission.phase === 'main' && mission.sequence >= 2 && hasPaintedWalls) {
      return PAINTED_WALLS_BG_KEY;
    }

    if (mission.phase !== 'main' || mission.sequence <= 1) return undefined;

    const prevSeq = mission.sequence - 1;
    const prevMissionId = `studio_${String(prevSeq).padStart(2, '0')}`;
    const prevPick = placedProps.find((p) => p.missionId === prevMissionId);
    return prevPick?.nextBgOverride;
  }, [placedProps, mission.phase, mission.sequence, hasPaintedWalls]);

  const currentBg = useMemo(() => getBackgroundForMission(mission, previousBgOverride), [mission, previousBgOverride]);
  const currentBgKey = useMemo(() => getBackgroundKey(mission, previousBgOverride), [mission, previousBgOverride]);

  // Mission 01: derive "floor near wall" from anchors so it never drifts onto windows.
  const FLOOR_NEAR_WALL_Y = useMemo(() => {
    const wallBack = getAnchorPosition(currentBgKey, 'wall_back');
    const floor = getAnchorPosition(currentBgKey, 'floor');
    if (!wallBack || !floor) return 64;

    const midpoint = wallBack.y + (floor.y - wallBack.y) * 0.5;
    const minY = wallBack.y + 6;
    const maxY = floor.y - 6;
    return Math.max(minY, Math.min(maxY, midpoint));
  }, [currentBgKey]);

  // Mission 01 duplicates: keep them near the back wall (on the floor close to the walls).
  // Important: do NOT change the target marker (FLOOR_NEAR_WALL_Y) since it's already correct.
  const DUPLICATE_BUCKETS_Y = useMemo(() => {
    const wallBack = getAnchorPosition(currentBgKey, 'wall_back');
    const floor = getAnchorPosition(currentBgKey, 'floor');
    // Fallback tuned to this game's backgrounds: "under windows" but still on the floor plane
    if (!wallBack || !floor) return 70;

    // We keep the *drop marker* at FLOOR_NEAR_WALL_Y, but for the duplicated buckets
    // we want them a bit LOWER (closer to the actual floor) so they never sit in the window area.
    const y = FLOOR_NEAR_WALL_Y + (floor.y - FLOOR_NEAR_WALL_Y) * 0.25;
    const minY = FLOOR_NEAR_WALL_Y + 4;
    const maxY = floor.y - 6;
    return Math.max(minY, Math.min(maxY, y));
  }, [currentBgKey]);
  const avatarImage = getAvatarImage(avatarGender, 'idle');
  const toolAImage = getToolImage(optionA.asset);
  const toolBImage = getToolImage(optionB.asset);
  
  // Mobile panning support
  const isMobile = useIsMobile();
  const panoramicBg = useMemo(() => getPanoramicBackground(currentBgKey), [currentBgKey]);
  const { backgroundPosition, updatePanFromDrag, resetPan } = usePanningBackground({
    enabled: isMobile && !!panoramicBg,
  });

  const taskText = mission.task_heb || `MISSING: task_heb`;

  // Get the target background for a tool option
  const getTargetBgForOption = useCallback((option: MissionOption) => {
    const targetBgKey = option.next_bg_override || currentBgKey;
    const targetBgImage = getBackgroundByName(targetBgKey) || currentBg;
    return { key: targetBgKey, image: targetBgImage };
  }, [currentBgKey, currentBg]);

  // Determine which background to show during drag/carry
  const activeToolVariant = draggingTool || carryModeTool;
  const dragPreviewBg = useMemo(() => {
    if (!activeToolVariant) return null;

    // Mission 01 (paint): don't preview the post-paint background while dragging.
    // The player should drag/place on the current scene, then see the walls turn white.
    if (mission.mission_id === 'studio_01' && activeToolVariant === 'a') {
      return null;
    }

    const option = activeToolVariant === 'a' ? optionA : optionB;
    const target = getTargetBgForOption(option);
    if (target.key !== currentBgKey) {
      return target;
    }
    return null;
  }, [activeToolVariant, optionA, optionB, getTargetBgForOption, currentBgKey]);

  // Priority: local "painted" beat > drag preview > current
  const displayBg = localBgOverride?.image || dragPreviewBg?.image || currentBg;
  const displayBgKey = localBgOverride?.key || dragPreviewBg?.key || currentBgKey;

  // Get target anchor for currently selected tool
  // For mission 1, target the FLOOR area so drop zone appears on the floor near walls
  const getTargetAnchor = useCallback((variant: 'a' | 'b') => {
    const option = variant === 'a' ? optionA : optionB;
    const targetBgKey = option.next_bg_override || currentBgKey;

    // Mission 01: target FLOOR-NEAR-WALL (baseboard line) so indicator isn't on windows or front floor
    if (mission.mission_id === 'studio_01') {
      const wallBack = getAnchorPosition(currentBgKey, 'wall_back');
      if (wallBack) {
        // Place marker at 50% X (center) and fixed Y for floor near wall
        return { x: wallBack.x, y: FLOOR_NEAR_WALL_Y, scale: 1, z_layer: 'mid' as const };
      }
    }

    const anchorRef = option.anchor_ref as AnchorRef;
    return getAnchorPosition(targetBgKey, anchorRef);
  }, [optionA, optionB, currentBgKey, mission.mission_id, FLOOR_NEAR_WALL_Y]);

  // Flash cue when mission changes (helps player notice the transition)
  const [showMissionFlash, setShowMissionFlash] = useState(false);
  
  useEffect(() => {
    // Tool-swap cue to help the player notice that the mission advanced.
    // Skip first mount to avoid flashing on initial load.
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    setShowToolSwapCue(true);
    setShowMissionFlash(true);
    const toolId = window.setTimeout(() => setShowToolSwapCue(false), 420);
    const flashId = window.setTimeout(() => setShowMissionFlash(false), 600);
    return () => {
      window.clearTimeout(toolId);
      window.clearTimeout(flashId);
    };
  }, [mission.mission_id]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
      timeoutsRef.current = [];
    };
  }, []);

  const handleUndoConfirm = () => {
    onUndo();
    setShowUndoDialog(false);
  };

  // Complete a tool selection (used by both drag and carry mode)
  const completePlacement = useCallback((variant: 'a' | 'b') => {
    const option = variant === 'a' ? optionA : optionB;
    if (!hasDraggedOnce) {
      setHasDraggedOnce(true);
      localStorage.setItem(DRAG_HINT_STORAGE_KEY, 'true');
    }
    
    // Clear any previous staged transitions
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];

    // Step 1: Immediately show the tool on the floor (local state, before global update)
    setLocalPlacement({
      missionId: mission.mission_id,
      key: variant,
      assetName: option.asset,
    });

    // Let the player *first* see the tool settle, then a subtle lock confirmation.
    setJustPlaced(null);
    setLockPulseKey(null);
    const isMission01Paint = mission.mission_id === 'studio_01' && variant === 'a';
    const lockDelayMs = isMission01Paint ? 900 : 120;
    const lockOnId = window.setTimeout(() => {
      setJustPlaced(`${mission.mission_id}-${variant}`);
      setLockPulseKey(`${mission.mission_id}-${variant}`);
    }, lockDelayMs);
    timeoutsRef.current.push(lockOnId);

    const lockOffId = window.setTimeout(() => {
      setLockPulseKey(null);
    }, lockDelayMs + 650);
    timeoutsRef.current.push(lockOffId);

    // Step 2: "Painted walls" beat before transitioning (only if the option defines it)
    // We want: place tool -> SEE it near the walls -> walls turn white -> tool disappears -> mission advances.
    const hasBgBeat = !!option.next_bg_override || (mission.mission_id === 'studio_01' && variant === 'a');
    if (hasBgBeat) {
      // Mission 01 A: place -> blink -> paint -> only then allow transition
      // TIMING FOR MISSION 01 PAINT:
      // 1. Tools appear on floor (instant)
      // 2. ~900ms later - subtle lock confirmation
      // 3. Shortly after - walls turn white (crossfade)
      // 4. Brief white-walls hold for comprehension
      // 5. Advance to mission 2
      const beatDelay = isMission01Paint ? 1600 : 900;
      const clearDelay = isMission01Paint ? 2300 : 1800;
      const paintTarget = isMission01Paint
        ? { key: PAINTED_WALLS_BG_KEY, image: getBackgroundByName(PAINTED_WALLS_BG_KEY) || currentBg }
        : getTargetBgForOption(option);

      const beatId = window.setTimeout(() => {
        setLocalBgOverride(paintTarget);
      }, beatDelay);
      timeoutsRef.current.push(beatId);

      const clearId = window.setTimeout(() => {
        setLocalPlacement(null);
      }, clearDelay);
      timeoutsRef.current.push(clearId);
    }
    
    // Step 3: Wait for animation to complete, then transition to next mission
    // Animation is 800ms per item + 300ms stagger × 3 items = ~1700ms total
    // We wait 2500ms to ensure users see the full blink effect + painted walls
    // Mission 01 paint: only advance after the player clearly sees the “painted walls” beat.
    const advanceDelay = (mission.mission_id === 'studio_01' && variant === 'a') ? 3200 : 2500;
    const advanceId = window.setTimeout(() => {
      setLocalPlacement(null);
      setJustPlaced(null);
      setLockPulseKey(null);
      onSelect(mission.mission_id, variant, option.holland_code as HollandCode, option);
    }, advanceDelay);
    timeoutsRef.current.push(advanceId);
    
    setCarryModeTool(null);
  }, [mission.mission_id, optionA, optionB, onSelect, hasDraggedOnce, getTargetBgForOption, PAINTED_WALLS_BG_KEY, currentBg]);

  // Pointer Events for unified mouse/touch handling
  const handlePointerDown = useCallback((variant: 'a' | 'b', e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If already in carry mode for a different tool, switch to this one
    if (carryModeTool && carryModeTool !== variant) {
      setCarryModeTool(variant);
      return;
    }
    
    isDraggingRef.current = false;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    setDraggingTool(variant);
    setDragPosition({ x: e.clientX, y: e.clientY });
    
    // Capture pointer for reliable tracking
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [carryModeTool]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingTool || !dragStartPosRef.current) return;
    
    const dx = e.clientX - dragStartPosRef.current.x;
    const dy = e.clientY - dragStartPosRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Mark as actual drag if moved more than 10px
    if (distance > 10) {
      isDraggingRef.current = true;
    }
    
    setDragPosition({ x: e.clientX, y: e.clientY });
    
    // Update panning based on pointer position (normalized 0-1)
    if (stageRef.current && isMobile && panoramicBg) {
      const rect = stageRef.current.getBoundingClientRect();
      const normalizedX = (e.clientX - rect.left) / rect.width;
      updatePanFromDrag(normalizedX);
    }
  }, [draggingTool, isMobile, panoramicBg, updatePanFromDrag]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!draggingTool || !stageRef.current) {
      // Release pointer capture
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      return;
    }

    const wasActualDrag = isDraggingRef.current;
    
    // Release pointer capture
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    
    if (wasActualDrag) {
      // It was a real drag - check if dropped near the target position
      const rect = stageRef.current.getBoundingClientRect();
      const dropX = ((e.clientX - rect.left) / rect.width) * 100;
      const dropY = ((e.clientY - rect.top) / rect.height) * 100;

      const isMission01 = mission.mission_id === 'studio_01';
      const isMission01Paint = isMission01 && draggingTool === 'a';
      
      // Get target position for current tool
      const target = getTargetAnchor(draggingTool);
      if (target) {
        // Check if within target radius (generous ~20% of screen)
        const dx = dropX - target.x;
        const dy = dropY - target.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Mission 01: accept if user drops on the floor
        // Other missions: keep existing generous rules
        const accepted = isMission01Paint
          ? (distance < 28 && dropY > 45 && dropY < 92)
          : (isMission01 ? (dropY > 55 && dropY < 98) : (distance < 20 || (dropY < 75 && dropY > 5)));

        if (accepted) {
          completePlacement(draggingTool);
        }
        // Otherwise return to tray (no placement)
      } else {
        // Fallback: accept if in valid zone
        if (isMission01Paint ? (dropY > 45 && dropY < 92) : (isMission01 ? (dropY > 55 && dropY < 98) : (dropY < 75 && dropY > 5))) {
          completePlacement(draggingTool);
        }
      }
    } else {
      // It was a tap - enter carry mode
      setCarryModeTool(draggingTool);
    }
    
    setDraggingTool(null);
    setDragPosition(null);
    isDraggingRef.current = false;
    dragStartPosRef.current = null;
    
    // Reset pan when drag ends
    resetPan();
  }, [draggingTool, completePlacement, getTargetAnchor, resetPan, mission.mission_id]);

  // Handle tap on drop zone in carry mode
  const handleDropZoneTap = useCallback(() => {
    if (carryModeTool) {
      completePlacement(carryModeTool);
    }
  }, [carryModeTool, completePlacement]);

  // Cancel carry mode on escape or background tap
  const handleCancelCarry = useCallback(() => {
    setCarryModeTool(null);
  }, []);

  // Escape key cancels carry mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && carryModeTool) {
        setCarryModeTool(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [carryModeTool]);

  // Show the current local placement AND persisted tools from previous missions
  const displayedPlacement = useMemo(() => {
    const placements: Array<{
      missionId: string;
      key: 'a' | 'b';
      assetName: string;
      hollandCode: HollandCode;
      isPersisted?: boolean;
    }> = [];
    
    // Add persisted tools from previous missions (e.g., Mission 01 Tool B persists to Mission 02)
    placedProps.forEach((prop) => {
      // Mission 01 Tool B persists into Mission 02
      if (prop.missionId === 'studio_01' && prop.key === 'b' && mission.mission_id === 'studio_02') {
        placements.push({
          missionId: prop.missionId,
          key: prop.key,
          assetName: prop.assetName || 'studio_01_b',
          hollandCode: prop.hollandCode,
          isPersisted: true,
        });
      }
    });
    
    // Add current local placement (tool being placed in this mission)
    if (localPlacement) {
      placements.push({
        missionId: localPlacement.missionId,
        key: localPlacement.key as 'a' | 'b',
        assetName: localPlacement.assetName,
        hollandCode: 'r' as HollandCode, // Not used for display
      });
    }
    
    return placements;
  }, [localPlacement, placedProps, mission.mission_id]);

  const targetPosition = useMemo(() => {
    if (activeToolVariant) {
      return getTargetAnchor(activeToolVariant);
    }
    return null;
  }, [activeToolVariant, getTargetAnchor]);

  // Scene extras (NPCs) - show female staff after Mission 01 Tool B is placed
  const showFemaleStaff = useMemo(() => {
    // Show staff if: Mission 01 Tool B was chosen AND we're still in mission 01 (after placement) or in mission 02
    const hasMission01ToolB = placedProps.some(p => p.missionId === 'studio_01' && p.key === 'b');
    const isPlacingToolB = localPlacement?.missionId === 'studio_01' && localPlacement?.key === 'b';
    const isInMission02 = mission.mission_id === 'studio_02';
    
    // Show after placement animation completes (when justPlaced is set) or in mission 02
    return (hasMission01ToolB && isInMission02) || (isPlacingToolB && justPlaced === 'studio_01-b');
  }, [placedProps, localPlacement, mission.mission_id, justPlaced]);
  
  const sceneExtras: never[] = []; // Keep the original array empty for now

  // ========== RENDER ELEMENTS ==========
  // These are passed to the layout wrapper

  // Use panoramic background on mobile if available
  const effectiveBg = isMobile && panoramicBg ? panoramicBg : displayBg;
  const effectiveBgPosition = isMobile && panoramicBg ? backgroundPosition : 'center';
  // For panoramic backgrounds, use 'auto 100%' to show full height and allow horizontal pan
  const effectiveBgSize = isMobile && panoramicBg ? 'auto 100%' : 'cover';

  const backgroundElement = (
    <BackgroundCrossfade
      src={effectiveBg}
      className="layout-bg"
      backgroundSize={effectiveBgSize}
      backgroundPosition={effectiveBgPosition}
      backgroundRepeat="no-repeat"
      filter="saturate(1.18) contrast(1.08)"
      durationMs={1200}
      zIndex={0}
    />
  );

  const gradientOverlayElement = (
    <>
      <div 
        className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 100%)',
          zIndex: 1,
        }}
      />
      {/* Mission change flash - brief bright overlay to signal new mission */}
      {showMissionFlash && (
        <div 
          className="absolute inset-0 pointer-events-none animate-mission-flash"
          style={{
            background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.18) 0%, transparent 70%)',
            zIndex: 2,
          }}
        />
      )}
    </>
  );

  // Scene extras - Female staff NPC appears after Mission 01 Tool B placement
  // She stands on the floor looking at Tool B (positioned to her right)
  const sceneExtrasElement = showFemaleStaff ? (
    <div 
      className="absolute pointer-events-none animate-npc-enter"
      style={{
        // Position on the floor, to the left of center (looking right at the tool)
        left: '32%',
        bottom: '8%',
        zIndex: 14,
        transform: 'translateX(-50%)',
        transformOrigin: 'bottom center',
      }}
    >
      <img 
        src={femaleStaffWalk}
        alt="Staff member"
        className="w-auto object-contain"
        style={{
          height: 'clamp(180px, 32vh, 320px)',
          filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.45))',
          transform: 'scaleX(-1)', // Face right (toward the tool)
        }}
      />
    </div>
  ) : null;

  const targetZoneElement = activeToolVariant && targetPosition ? (
    <div 
      className="absolute z-[12] animate-fade-in cursor-pointer"
      style={{
        left: `${targetPosition.x}%`,
        top: `${targetPosition.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
      onClick={(e) => {
        e.stopPropagation();
        handleDropZoneTap();
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        handleDropZoneTap();
      }}
    >
      {/* Outer glow effect */}
      <div 
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          width: '140px',
          height: '140px',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, hsl(170 80% 50% / 0.35) 0%, transparent 70%)',
          animation: 'pulse-glow 1.2s ease-in-out infinite',
        }}
      />
      
      {/* Main pulsing ring */}
      <div 
        className="w-20 h-20 md:w-28 md:h-28 rounded-full relative"
        style={{
          border: '4px solid hsl(170 80% 50%)',
          boxShadow: '0 0 40px hsl(170 80% 50% / 0.6), inset 0 0 25px hsl(170 80% 50% / 0.2)',
          background: 'radial-gradient(circle, hsl(170 80% 50% / 0.25) 0%, transparent 60%)',
          animation: 'pulse 1.2s ease-in-out infinite',
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-white/80" style={{ boxShadow: '0 0 8px white' }} />
        </div>
      </div>
      
      {/* Downward arrow */}
      <div className="absolute left-1/2 -top-14 -translate-x-1/2 flex flex-col items-center">
        <svg 
          className="animate-bounce drop-shadow-lg"
          width="36" height="36" viewBox="0 0 24 24" 
          fill="hsl(170, 80%, 50%)" stroke="white" strokeWidth="1"
        >
          <path d="M12 5v14M5 12l7 7 7-7" fill="none" stroke="hsl(170, 80%, 50%)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      
      {/* Hand icon */}
      <div className="absolute left-1/2 -bottom-10 -translate-x-1/2">
        <svg 
          className="animate-hand-move drop-shadow-md"
          width="28" height="28" viewBox="0 0 24 24" 
          fill="none" stroke="hsl(170, 80%, 50%)" strokeWidth="2"
        >
          <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v6M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15V6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      
      {/* Carry mode instruction */}
      {carryModeTool && !draggingTool && (
        <div 
          className="absolute top-full mt-14 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-semibold px-4 py-2 rounded-xl animate-pulse"
          style={{
            background: 'hsl(170 80% 45%)',
            color: 'white',
            boxShadow: '0 4px 16px hsl(170 80% 45% / 0.5)',
          }}
        >
          לחץ כאן להנחה
        </div>
      )}
    </div>
  ) : null;

  // Special duplication logic for certain missions (e.g., studio_01 option A duplicates to 3 floor corners)
  // For mission 1, the paint buckets should be placed near EACH WALL (left, back, right)
  // צמוד לקיר = close to wall, on the floor
  const getDuplicateAnchors = (prop: typeof displayedPlacement[0]): { anchor: AnchorRef; offsetX: number; offsetY: number; customScale?: number; absoluteY?: number }[] => {
    // Product rule: Mission 01 tool A duplicates to 3 placements (one per wall)
    // Position: on the floor adjacent to each wall (left/center/right)
    if (prop.missionId === 'studio_01' && prop.key === 'a') {
      // Use fixed X positions for left/center/right walls (22%, 50%, 78%)
      // Position close to back wall with larger scale so they look like real tools
      return [
        { anchor: 'floor', offsetX: -28, offsetY: 0, customScale: 2.0, absoluteY: DUPLICATE_BUCKETS_Y },
        { anchor: 'floor', offsetX: 0, offsetY: 0, customScale: 2.0, absoluteY: DUPLICATE_BUCKETS_Y },
        { anchor: 'floor', offsetX: 28, offsetY: 0, customScale: 2.0, absoluteY: DUPLICATE_BUCKETS_Y },
      ];
    }
    
    // Mission 01 Tool B: single placement in back-center, persists into Mission 02
    if (prop.missionId === 'studio_01' && prop.key === 'b') {
      return [{ anchor: 'floor', offsetX: 8, offsetY: 0, customScale: 1.8, absoluteY: DUPLICATE_BUCKETS_Y }];
    }

    // Default: single placement at floor
    return [{ anchor: 'floor', offsetX: 0, offsetY: 0 }];
  };

  const placedPropsElement = (
    <>
      {displayedPlacement.flatMap((prop, propIdx) => {
        const assetName = prop.assetName || `${prop.missionId.replace('studio_', 'studio_')}_${prop.key}`;
        const toolImg = getToolImage(assetName);
        
        if (!toolImg) return null;
        
        const anchorInfos = getDuplicateAnchors(prop);
        const isJustPlaced = justPlaced === `${prop.missionId}-${prop.key}`;
        const isMission01Buckets = prop.missionId === 'studio_01' && prop.key === 'a';
        
        return anchorInfos.map((anchorInfo, idx) => {
          // Mission 01 paint: keep tool coordinates stable even while the background is crossfading.
          const anchorKeyForPlacement = (prop.missionId === 'studio_01' && prop.key === 'a') ? currentBgKey : displayBgKey;
          const anchorPos = getAnchorPosition(anchorKeyForPlacement, anchorInfo.anchor);
          if (!anchorPos) return null;
          
          // Stagger animation for duplicates - longer delay for better visibility
          const animationDelay = idx * 300;
          // Use custom scale if provided, otherwise default
          const finalScale = anchorInfo.customScale || (anchorPos.scale * 2.2);
          
          // Use absoluteY if provided (for fixed floor-near-wall positioning)
          const topValue = anchorInfo.absoluteY !== undefined 
            ? anchorInfo.absoluteY 
            : anchorPos.y + anchorInfo.offsetY;
          
          const isPersisted = 'isPersisted' in prop && prop.isPersisted;
          const isMission01ToolB = prop.missionId === 'studio_01' && prop.key === 'b';
          
          return (
            <div
              key={`${prop.missionId}-${propIdx}-${idx}`}
              className={`absolute pointer-events-none ${isPersisted ? '' : (isJustPlaced ? (prop.missionId === 'studio_01' && prop.key === 'a' ? 'animate-snap-place' : 'animate-snap-pop-blink') : 'animate-snap-place')}`}
              style={{
                left: `${anchorPos.x + anchorInfo.offsetX}%`,
                top: `${topValue}%`,
                // Use calculated scale
                transform: `translate(-50%, -100%) scale(${finalScale})`,
                // Ensure tools near walls are visible above floor elements
                zIndex: 15 + idx,
                animationDelay: isPersisted ? '0ms' : `${animationDelay}ms`,
              }}
            >
              <img 
                src={toolImg}
                alt=""
                className={`${isMission01Buckets ? 'w-28 h-28 md:w-36 md:h-36' : (isMission01ToolB ? 'w-32 h-32 md:w-40 md:h-40' : 'w-24 h-24 md:w-32 md:h-32')} object-contain ${lockPulseKey === `${prop.missionId}-${prop.key}` ? 'tool-lock-confirm' : ''}`}
                style={{
                  filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))',
                }}
              />
            </div>
          );
        });
      })}
    </>
  );

  const undoButtonElement = (
    <UndoConfirmPopover
      open={showUndoDialog}
      onOpenChange={setShowUndoDialog}
      onConfirm={handleUndoConfirm}
      disabled={!canUndo}
    />
  );

  const avatarElement = avatarImage ? (
    <img 
      src={avatarImage} 
      alt="Guide avatar"
      className="h-full w-auto object-contain animate-subtle-float"
    />
  ) : null;

  // Check if we're on tablet or mobile (< 1024px) for text wrapping
  const [isTabletOrMobile, setIsTabletOrMobile] = useState(false);
  useEffect(() => {
    const checkWidth = () => setIsTabletOrMobile(window.innerWidth < 1024);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Split task text after comma for better readability (tablet/mobile only)
  const formattedTaskText = useMemo(() => {
    if (!isTabletOrMobile) {
      // Desktop: no line breaks
      return taskText;
    }
    // Tablet/Mobile: split after commas
    return taskText.split(',').map((part, index, arr) => (
      <span key={index}>
        {part.trim()}
        {index < arr.length - 1 && (
          <>
            ,
            <br />
          </>
        )}
      </span>
    ));
  }, [taskText, isTabletOrMobile]);

  const speechBubbleElement = (
    <SpeechBubble tailDirection="right">
      <p 
        className="font-medium text-sm md:text-base"
        style={{ 
          lineHeight: 1.45,
          direction: 'rtl',
          textAlign: 'right',
          maxHeight: 'calc(22vh - 28px)',
          overflowY: 'auto',
        }}
      >
        {formattedTaskText}
      </p>
    </SpeechBubble>
  );

  const toolPanelElement = (
    <div className="layout-tool-panel-inner tool-panel-responsive relative" style={{ direction: 'ltr' }}>
      {showToolSwapCue && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2 }}>
          <div
            className="absolute inset-y-0 -left-1/3 w-1/2"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.22) 50%, transparent 100%)',
              animation: 'shine 420ms ease-out forwards',
              filter: 'blur(0.5px)',
            }}
          />
        </div>
      )}
      {/* Main row: Progress tank (horizontal), tools */}
      <div className="tool-panel-main-row">
        {/* Progress tank */}
        <div className="progress-tank-wrapper">
          <ProgressTank value={(currentIndex + 1) / totalMissions} />
        </div>

        {/* Tool tiles */}
        <div className="tool-tiles-area">
          <div className="tool-tiles-row">
            <DraggableToolTile
              image={toolAImage}
              onPointerDown={(e) => handlePointerDown('a', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onInfoClick={() => setActiveTooltip(activeTooltip === 'a' ? null : 'a')}
              onInfoClose={() => setActiveTooltip(null)}
              variant="a"
              isDragging={draggingTool === 'a'}
              isCarryMode={carryModeTool === 'a'}
              isInfoActive={activeTooltip === 'a'}
              tooltipText={optionA.tooltip_heb || 'MISSING: option_a_tooltip_heb'}
              isMobile={isMobile}
            />
            <DraggableToolTile
              image={toolBImage}
              onPointerDown={(e) => handlePointerDown('b', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onInfoClick={() => setActiveTooltip(activeTooltip === 'b' ? null : 'b')}
              onInfoClose={() => setActiveTooltip(null)}
              variant="b"
              isDragging={draggingTool === 'b'}
              isCarryMode={carryModeTool === 'b'}
              isInfoActive={activeTooltip === 'b'}
              tooltipText={optionB.tooltip_heb || 'MISSING: option_b_tooltip_heb'}
              isMobile={isMobile}
            />
          </div>

          {/* Animated drag hint */}
          {!hasDraggedOnce && !draggingTool && !carryModeTool && (
            <div className="tool-drag-hint">
              <DragHint />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const draggingGhostElement = draggingTool && dragPosition ? (
    <div 
      className="fixed pointer-events-none z-[55]"
      style={{
        left: dragPosition.x,
        top: dragPosition.y,
        transform: 'translate(-50%, -80%)',
      }}
    >
      {/* Glow behind tool */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          width: '100px',
          height: '100px',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, hsl(170 80% 50% / 0.4) 0%, transparent 70%)',
          filter: 'blur(8px)',
        }}
      />
      <img 
        src={draggingTool === 'a' ? toolAImage : toolBImage}
        alt=""
        className="w-20 h-20 md:w-24 md:h-24 object-contain relative"
        style={{
          filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.5))',
        }}
      />
      <div 
        className="absolute -bottom-2 -right-2"
        style={{ color: 'hsl(220 20% 20%)' }}
      >
        <Hand className="w-7 h-7 md:w-8 md:h-8 drop-shadow-lg" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
      </div>
    </div>
  ) : null;

  return (
    <MissionLayout
      stageRef={stageRef}
      background={backgroundElement}
      gradientOverlay={gradientOverlayElement}
      sceneExtras={sceneExtrasElement}
      targetZone={targetZoneElement}
      placedProps={placedPropsElement}
      undoButton={undoButtonElement}
      avatar={avatarElement}
      speechBubble={speechBubbleElement}
      toolPanel={toolPanelElement}
      draggingGhost={draggingGhostElement}
      isCarryMode={!!carryModeTool}
      onCancelCarry={handleCancelCarry}
    />
  );
}

interface DraggableToolTileProps {
  image: string | undefined;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onInfoClick: () => void;
  onInfoClose: () => void;
  variant: 'a' | 'b';
  isDragging: boolean;
  isCarryMode: boolean;
  isInfoActive: boolean;
  tooltipText: string;
  isMobile: boolean;
}

function DraggableToolTile({ 
  image, 
  onPointerDown, 
  onPointerMove, 
  onPointerUp, 
  onInfoClick, 
  onInfoClose,
  variant, 
  isDragging, 
  isCarryMode,
  isInfoActive,
  tooltipText,
  isMobile,
}: DraggableToolTileProps) {
  return (
    <div className={`relative ${isDragging ? 'opacity-40' : ''} ${isCarryMode ? 'carry-mode-active' : ''}`}>
      {/* Tool tile - transparent PNG, no white card */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="draggable-tool group relative overflow-visible transition-all duration-200 hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing tool-tile"
      >
        {/* Tool image - transparent PNG with subtle shadow */}
        <div className="absolute inset-0 flex items-center justify-center">
          {image ? (
            <img 
              src={image} 
              alt="Tool option"
              className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-108"
              style={{
                filter: 'drop-shadow(0 5px 10px rgba(0,0,0,0.45))',
              }}
              draggable={false}
            />
          ) : (
            <span className="text-xl sm:text-2xl md:text-3xl">{variant === 'a' ? '🔧' : '🎨'}</span>
          )}
        </div>
        
        {/* Subtle hover glow */}
        <div 
          className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{
            boxShadow: '0 0 20px hsl(170 80% 50% / 0.3)',
          }}
        />
      </div>

      {/* Info button with tooltip - CSS hover for all devices */}
      <div className="tool-info-wrapper">
        <button 
          className={`tool-info-btn ${isInfoActive ? 'is-active' : ''}`}
          aria-label="מידע על הכלי"
        >
          <Info className="tool-info-icon" />
        </button>
        
        {/* CSS hover tooltip - works on all devices */}
        <div className="desktop-hover-tooltip" role="tooltip">
          <span>{tooltipText}</span>
        </div>
      </div>
    </div>
  );
}
