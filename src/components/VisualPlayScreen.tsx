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
import { AnchorDebugOverlay } from './AnchorDebugOverlay';
import { GridDebugOverlay } from './GridDebugOverlay';
import femaleStaffWalk from '@/assets/avatars/studio_01_female_staff_walk.webp';
import maleStaffWalk from '@/assets/avatars/studio_01_male_staff_walk.webp';
import { DraggableNpcEditor } from './DraggableNpcEditor';
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
  npcEditMode?: boolean;
  /** Called when editor "Save & Next" is clicked - selects Tool A and advances */
  onEditorNextMission?: () => void;
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
  npcEditMode = false,
  onEditorNextMission,
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
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);
  const [showGridOverlay, setShowGridOverlay] = useState(false);
  
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
    preloadBackground('studio_in_workshop_bg'); // Mission 03 workshop
  }, []);

  // Clear any staged background override whenever the mission changes.
  // (Otherwise, a previous mission's bg beat can leak into the next mission.)
  useEffect(() => {
    const id = window.setTimeout(() => setLocalBgOverride(null), 0);
    return () => window.clearTimeout(id);
  }, [mission.mission_id]);

  // Get the *actual* previous mission pick (Object.values order is not reliable)
  // Product rule: Mission 02 uses white walls. Mission 03+ uses workshop background.
  const previousBgOverride = useMemo(() => {
    // Mission 02 only: always use white walls
    if (mission.phase === 'main' && (mission.mission_id === 'studio_02' || mission.sequence === 2)) {
      return PAINTED_WALLS_BG_KEY;
    }
    
    // Mission 03+: use the workshop background (or let the mission's bg_override take over)
    if (mission.phase === 'main' && (mission.mission_id === 'studio_03' || mission.sequence >= 3)) {
      return 'studio_in_workshop_bg';
    }

    return undefined;
  }, [mission.phase, mission.sequence, mission.mission_id]);

  const currentBg = useMemo(() => getBackgroundForMission(mission, previousBgOverride), [mission, previousBgOverride]);
  const currentBgKey = useMemo(() => getBackgroundKey(mission, previousBgOverride), [mission, previousBgOverride]);

  // ==================== FIXED ANCHOR MAPPING ====================
  // Hard-coded Y positions for Mission 01 to avoid calculation errors
  // These are absolute percentages from top of viewport
  // 
  // Background: gallery_main_stylized_v3 / gallery_main_stylized_white_v1
  // - wall_back (windows bottom edge): ~52%
  // - floor (front): ~87%
  // - "back floor" (floor near walls, just below windows): ~68%
  // - "mid floor": ~78% (middle of the visible floor)
  // - "front floor": ~85% (closer to camera)
  // ================================================================
  
  // Mission 01 Tool A: drop zone - on the floor, just below the windows
  const BACK_FLOOR_Y = 68; // Fixed: drop zone Y position
  
  // Mission 01 Tool A placement (after drop): where the 3 paint buckets appear
  const DUPLICATE_BUCKETS_Y = 71; // Fixed: placement Y - on the back floor plane
  
  // Mission 01 Tool B: center floor area
  const CENTER_FLOOR_Y = 80; // Fixed: center of the visible floor
  
  // Mission 01 Tool B placement position
  const M01_TOOL_B_Y = CENTER_FLOOR_Y;

  const avatarImage = getAvatarImage(avatarGender, 'idle');
  const toolAImage = getToolImage(optionA.asset);
  const toolBImage = getToolImage(optionB.asset);
  
  // Mobile panning support
  const isMobile = useIsMobile();
  // Product rule: Mission 02 uses white walls, Mission 03 uses workshop.
  // Guardrail: lock by mission_id too (in case sequence is inconsistent).
  const isWhiteWallsLocked =
    mission.phase === 'main' && (mission.mission_id === 'studio_02' || mission.sequence === 2);
  const isWorkshopLocked =
    mission.phase === 'main' && (mission.mission_id === 'studio_03' || mission.sequence >= 3);
  const bgKeyForPanorama = isWhiteWallsLocked ? PAINTED_WALLS_BG_KEY : (isWorkshopLocked ? 'studio_in_workshop_bg' : currentBgKey);
  const panoramicBg = useMemo(() => getPanoramicBackground(bgKeyForPanorama), [bgKeyForPanorama]);
  
  // Calculate initial pan position based on Tool A's target location
  // This ensures the background auto-pans to show where the first tool should be placed
  const initialPanTargetX = useMemo(() => {
    if (!isMobile || !panoramicBg) return undefined;
    
    // Get Tool A's anchor position
    const anchorRef = optionA.anchor_ref as AnchorRef;
    const anchorPos = getAnchorPosition(currentBgKey, anchorRef);
    
    if (anchorPos) {
      return anchorPos.x;
    }
    
    // Fallback: center
    return 50;
  }, [isMobile, panoramicBg, optionA.anchor_ref, currentBgKey, getAnchorPosition]);
  
  const { backgroundPosition, updatePanFromDrag, resetPan, panToPosition } = usePanningBackground({
    enabled: isMobile && !!panoramicBg,
    initialTargetX: initialPanTargetX,
  });

  const taskText = mission.task_heb || `MISSING: task_heb`;

  // Get the target background for a tool option
  const getTargetBgForOption = useCallback((option: MissionOption) => {
    // Product rule: Mission 02 locked to white walls, Mission 03 locked to workshop
    if (mission.phase === 'main' && (mission.mission_id === 'studio_02' || mission.sequence === 2)) {
      const lockedKey = PAINTED_WALLS_BG_KEY;
      const lockedImage = getBackgroundByName(lockedKey) || currentBg;
      return { key: lockedKey, image: lockedImage };
    }
    if (mission.phase === 'main' && (mission.mission_id === 'studio_03' || mission.sequence >= 3)) {
      const lockedKey = 'studio_in_workshop_bg';
      const lockedImage = getBackgroundByName(lockedKey) || currentBg;
      return { key: lockedKey, image: lockedImage };
    }

    const targetBgKey = option.next_bg_override || currentBgKey;
    const targetBgImage = getBackgroundByName(targetBgKey) || currentBg;
    return { key: targetBgKey, image: targetBgImage };
  }, [currentBgKey, currentBg, mission.phase, mission.sequence, mission.mission_id, PAINTED_WALLS_BG_KEY]);

  // Determine which background to show during drag/carry
  const activeToolVariant = draggingTool || carryModeTool;
  const dragPreviewBg = useMemo(() => {
    if (!activeToolVariant) return null;

    // Mission 01 (paint): don't preview the post-paint background while dragging.
    // The player should drag/place on the current scene, then see the walls turn white.
    if (mission.mission_id === 'studio_01' && activeToolVariant === 'a') {
      return null;
    }

    // From mission 02 onwards, background is locked to white walls.
    // Also covers the mission-01 paint path once the player advanced.
    if ((mission.phase === 'main' && mission.sequence >= 2) || hasPaintedWalls) {
      return null;
    }

    const option = activeToolVariant === 'a' ? optionA : optionB;
    const target = getTargetBgForOption(option);
    if (target.key !== currentBgKey) {
      return target;
    }
    return null;
  }, [activeToolVariant, optionA, optionB, getTargetBgForOption, currentBgKey, hasPaintedWalls, mission.mission_id, mission.phase, mission.sequence]);

  // Priority: local "painted" beat > drag preview > current
  const displayBg = localBgOverride?.image || dragPreviewBg?.image || currentBg;
  const displayBgKey = localBgOverride?.key || dragPreviewBg?.key || currentBgKey;

  // Final guardrail: Mission 02 = white walls, Mission 03+ = workshop
  const lockedBgKey = isWhiteWallsLocked ? PAINTED_WALLS_BG_KEY : (isWorkshopLocked ? 'studio_in_workshop_bg' : displayBgKey);
  const lockedBg = isWhiteWallsLocked 
    ? (getBackgroundByName(PAINTED_WALLS_BG_KEY) || displayBg) 
    : (isWorkshopLocked ? (getBackgroundByName('studio_in_workshop_bg') || displayBg) : displayBg);

  // Get target anchor for currently selected tool
  // Uses anchor_ref from quest data to look up coordinates in anchor map
  // IMPORTANT: Look up anchor in the CURRENT background (where placement happens),
  // not in next_bg_override (which is the background AFTER placement)
  const getTargetAnchor = useCallback((variant: 'a' | 'b') => {
    const option = variant === 'a' ? optionA : optionB;
    
    // Use anchor_ref from quest data (e.g. m01_tool_a, m01_tool_b)
    const anchorRef = option.anchor_ref as AnchorRef;
    
    // Try current background first (where the tool will be placed)
    let anchorPos = getAnchorPosition(currentBgKey, anchorRef);
    
    // If not found, try the next background (fallback)
    if (!anchorPos) {
      const nextBgKey = option.next_bg_override || currentBgKey;
      anchorPos = getAnchorPosition(nextBgKey, anchorRef);
    }
    
    if (anchorPos) {
      return anchorPos;
    }

    // Fallback for missions without defined anchors
    // Mission 03: Tool A (workbench) -> center of floor, Tool B (sound desk) -> back floor near wall
    if (mission.mission_id === 'studio_03') {
      if (variant === 'a') {
        return { x: 50, y: 82, scale: 1, z_layer: 'mid' as const };
      } else {
        return { x: 18, y: 68, scale: 1, z_layer: 'mid' as const };
      }
    }

    // Default fallback
    return { x: 50, y: 70, scale: 1, z_layer: 'mid' as const };
  }, [optionA, optionB, currentBgKey, mission.mission_id]);

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

  // Calculate and return the fixed placement for a tool (for persisted tools)
  const calculateFixedPlacement = useCallback((missionId: string, key: 'a' | 'b'): { x: number; y: number; scale: number; flipX?: boolean; wallMount?: boolean; bgKey?: string } | undefined => {
    // Special handling for Mission 01 Tool A (3 buckets) - don't persist these
    
    // Special handling for Mission 01 Tool A (3 buckets) - don't persist these
    if (missionId === 'studio_01' && key === 'a') return undefined;
    
    // Get anchor info from the placement logic
    const anchorRef = key === 'a' 
      ? `m${missionId.replace('studio_', '').padStart(2, '0')}_tool_a`
      : `m${missionId.replace('studio_', '').padStart(2, '0')}_tool_b`;
    
    // IMPORTANT: Fixed placement must be computed from the *current* background where
    // the user actually drops the tool (not from any drag-preview / next-bg override).
    // Otherwise persisted tools can “jump” in the following mission.
    const anchorPos = getAnchorPosition(lockedBgKey, anchorRef as AnchorRef);
    if (anchorPos) {
      return {
        x: anchorPos.x,
        y: anchorPos.y,
        scale: anchorPos.scale,
        flipX: anchorPos.flipX,
        wallMount: missionId === 'studio_02' && key === 'b', // Tool B of mission 2 is wall-mounted
        bgKey: lockedBgKey, // Store the background key where the tool was placed
      };
    }
    return undefined;
  }, [lockedBgKey]);

  // Complete a tool selection (used by both drag and carry mode)
  const completePlacement = useCallback((variant: 'a' | 'b') => {
    const option = variant === 'a' ? optionA : optionB;
    if (!hasDraggedOnce) {
      setHasDraggedOnce(true);
      localStorage.setItem(DRAG_HINT_STORAGE_KEY, 'true');
    }
    
    // Calculate fixed placement for persisted tools
    const fixedPlacement = option.persist === 'keep' 
      ? calculateFixedPlacement(mission.mission_id, variant)
      : undefined;
    
    // Store the fixed placement on the option so it gets saved to placedProps
    const optionWithPlacement = fixedPlacement 
      ? { ...option, fixedPlacement }
      : option;
    
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
    const isMission01ToolB = mission.mission_id === 'studio_01' && variant === 'b';
    
    // ===== Mission 01 Tool B timing sequence =====
    // 0ms:      Tool appears on floor (localPlacement set above)
    // 300ms:    Lock glow starts (smooth confirmation)
    // 1100ms:   Lock glow ends (300 + 800ms duration)
    // 1200ms:   Staff character enters (after lock completes)
    // 2800ms:   Mission advances (player sees staff arrive)
    // ===============================================
    
    const lockDelayMs = isMission01Paint ? 900 : (isMission01ToolB ? 300 : 120);
    const lockOnId = window.setTimeout(() => {
      setJustPlaced(`${mission.mission_id}-${variant}`);
      setLockPulseKey(`${mission.mission_id}-${variant}`);
    }, lockDelayMs);
    timeoutsRef.current.push(lockOnId);

    // Lock pulse duration
    const lockPulseDuration = isMission01ToolB ? 800 : 650;
    const lockOffId = window.setTimeout(() => {
      setLockPulseKey(null);
    }, lockDelayMs + lockPulseDuration);
    timeoutsRef.current.push(lockOffId);

    // Step 2: "Painted walls" beat before transitioning (only for Tool A paint scenario, NOT for Tool B)
    // Product rule: from mission 02 onwards, walls are ALWAYS white.
    // So we only allow background beats during mission 01 (paint scenario).
    const allowBgBeat = mission.phase === 'main' && mission.sequence < 2;
    const hasBgBeat = allowBgBeat && (!!option.next_bg_override || isMission01Paint);
    if (hasBgBeat && !isMission01ToolB) {
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
    const isMission02 = mission.mission_id === 'studio_02';
    // Mission 01 Tool B: 2800ms - enough time for lock (1100ms) + staff entry + viewing
    // Mission 02: 3500ms - tool locks, then male staff enters, then wait 1 second before advancing
    const advanceDelay = isMission01Paint ? 3200 : (isMission01ToolB ? 2800 : (isMission02 ? 3500 : 2500));
    const advanceId = window.setTimeout(() => {
      // For Mission 01 Tool B: DON'T clear localPlacement before onSelect
      // This prevents the tool from disappearing before it's added to placedProps
      if (!isMission01ToolB) {
        setLocalPlacement(null);
      }
      setJustPlaced(null);
      setLockPulseKey(null);
      onSelect(mission.mission_id, variant, option.holland_code as HollandCode, optionWithPlacement);
      // Clear localPlacement AFTER onSelect has added it to placedProps (next tick)
      if (isMission01ToolB) {
        window.setTimeout(() => setLocalPlacement(null), 100);
      }
    }, advanceDelay);
    timeoutsRef.current.push(advanceId);
    
    setCarryModeTool(null);
  }, [mission.mission_id, mission.phase, mission.sequence, optionA, optionB, onSelect, hasDraggedOnce, getTargetBgForOption, PAINTED_WALLS_BG_KEY, currentBg, calculateFixedPlacement]);

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

  // Helper to determine if two backgrounds are in the same "zone"
  // Tools placed in one background should appear in related backgrounds
  const isSameZone = useCallback((bgKey1: string | undefined, bgKey2: string): boolean => {
    if (!bgKey1) return true; // Legacy tools without bgKey always show
    if (bgKey1 === bgKey2) return true;
    
    // Define zones - backgrounds that share the same "room"
    const galleryZone = ['studio_entry_inside_bg', 'studio_in_gallery_wall_bg', 'studio_in_gallery_bg', 'studio_in_gallery_alt_bg'];
    const workshopZone = ['studio_in_workshop_bg'];
    const exteriorZone = ['studio_front_bg'];
    
    const getZone = (bg: string): string => {
      if (galleryZone.includes(bg)) return 'gallery';
      if (workshopZone.includes(bg)) return 'workshop';
      if (exteriorZone.includes(bg)) return 'exterior';
      return bg; // Unknown backgrounds are their own zone
    };
    
    return getZone(bgKey1) === getZone(bgKey2);
  }, []);

  // Show the current local placement AND persisted tools from previous missions
  const displayedPlacement = useMemo(() => {
    const placements: Array<{
      missionId: string;
      key: 'a' | 'b';
      assetName: string;
      hollandCode: HollandCode;
      isPersisted?: boolean;
      // Fixed placement for persisted tools
      fixedPlacement?: {
        x: number;
        y: number;
        scale: number;
        flipX?: boolean;
        wallMount?: boolean;
        bgKey?: string;
      };
    }> = [];
    
    // Get the current mission sequence number
    const currentSeq = mission.sequence;
    
    // Add persisted tools from previous missions based on persist flag
    // Only show tools that were placed in the SAME ZONE as current background
    placedProps.forEach((prop) => {
      const propSeq = parseInt(prop.missionId.replace('studio_', ''), 10);
      
      // Skip if this is the current mission (tool still being placed)
      if (propSeq >= currentSeq) return;
      
      // Tools with persist: 'keep' should show when in same zone
      if (prop.persist === 'keep' && prop.fixedPlacement) {
        const toolBgKey = prop.fixedPlacement.bgKey;
        
        // Only show if background is in the same zone
        if (isSameZone(toolBgKey, lockedBgKey)) {
          placements.push({
            missionId: prop.missionId,
            key: prop.key,
            assetName: prop.assetName || `${prop.missionId}_${prop.key}`,
            hollandCode: prop.hollandCode,
            isPersisted: true,
            fixedPlacement: prop.fixedPlacement,
          });
        }
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
  }, [localPlacement, placedProps, mission.mission_id, mission.sequence, lockedBgKey, isSameZone]);

  const targetPosition = useMemo(() => {
    if (activeToolVariant) {
      return getTargetAnchor(activeToolVariant);
    }
    return null;
  }, [activeToolVariant, getTargetAnchor]);

  // Scene extras (NPCs)
  // Mission 01 Tool B: staff should enter shortly AFTER placement (not after a secondary lock animation).
  const [staffEnterReady, setStaffEnterReady] = useState(false);
  
  // Mission 02: track which tool was selected for male staff placement
  const [mission02ToolSelected, setMission02ToolSelected] = useState<'a' | 'b' | null>(null);
  const [maleStaffEnterReady, setMaleStaffEnterReady] = useState(false);
  const [hadM02Lock, setHadM02Lock] = useState(false);
  
  // Mission 03: track if Tool A (workbench) was selected - used only to keep workshop positioning stable
  const [mission03ToolASelected, setMission03ToolASelected] = useState(false);

  // Mission 03: derive if Tool A is already placed (more reliable than only lock pulse)
  const mission03ToolAPlaced = useMemo(() => {
    return placedProps.some((p) => p.missionId === 'studio_03' && p.key === 'a');
  }, [placedProps]);
  
  // Reset staff visibility when mission changes (except when going to mission 02+ with Tool B)
  useEffect(() => {
    // Only show female staff if we're in mission 02+ AND Tool B was chosen in mission 01
    const hasMission01ToolB = placedProps.some(p => p.missionId === 'studio_01' && p.key === 'b');
    if ((mission.mission_id === 'studio_02' || mission.sequence >= 2) && hasMission01ToolB) {
      setStaffEnterReady(true);
    } else if (mission.mission_id === 'studio_01') {
      // Reset when back in mission 1 (fresh start or undo)
      setStaffEnterReady(false);
    }
    
    // Keep male staff visible in Mission 03+ if he was shown in Mission 02
    const hasMission02Tool = placedProps.some(p => p.missionId === 'studio_02');
    if (mission.sequence >= 3 && hasMission02Tool) {
      setMaleStaffEnterReady(true);
      // Determine which tool was selected in Mission 02
      const m02Pick = placedProps.find(p => p.missionId === 'studio_02');
      if (m02Pick) {
        setMission02ToolSelected(m02Pick.key);
      }
    } else if (mission.mission_id === 'studio_02' && !hasMission02Tool) {
      // UNDO case: returned to Mission 02 but pick was removed - reset NPC states
      setMission02ToolSelected(null);
      setMaleStaffEnterReady(false);
      setHadM02Lock(false);
    } else if (mission.mission_id === 'studio_01') {
      setMission02ToolSelected(null);
      setMaleStaffEnterReady(false);
      setHadM02Lock(false);
    }
  }, [mission.mission_id, mission.sequence, placedProps]);
  
  // Track if we've seen the lock pulse for M01 Tool B (to know when it ends)
  const [hadM01ToolBLock, setHadM01ToolBLock] = useState(false);
  
  // When lock pulse starts for M01 Tool B, track it
  useEffect(() => {
    if (lockPulseKey === 'studio_01-b') {
      setHadM01ToolBLock(true);
    }
  }, [lockPulseKey]);
  
  // Trigger female staff entry AFTER lock pulse finishes
  useEffect(() => {
    // When lock pulse ends for Mission 01 Tool B (hadM01ToolBLock true but lockPulseKey null)
    if (hadM01ToolBLock && !lockPulseKey && localPlacement?.missionId === 'studio_01' && localPlacement.key === 'b') {
      const id = window.setTimeout(() => setStaffEnterReady(true), 100);
      return () => window.clearTimeout(id);
    }
  }, [hadM01ToolBLock, lockPulseKey, localPlacement]);
  
  // Reset hadM01ToolBLock when mission changes
  useEffect(() => {
    if (mission.mission_id !== 'studio_01') {
      setHadM01ToolBLock(false);
    }
  }, [mission.mission_id]);
  
  // Track Mission 02 lock pulse start
  useEffect(() => {
    if (lockPulseKey === 'studio_02-a' || lockPulseKey === 'studio_02-b') {
      setHadM02Lock(true);
      setMission02ToolSelected(lockPulseKey === 'studio_02-a' ? 'a' : 'b');
    }
    // Track Mission 03 Tool A selection
    if (lockPulseKey === 'studio_03-a') {
      setMission03ToolASelected(true);
    }
  }, [lockPulseKey]);

  // Keep Mission 03 Tool A state stable across mission transitions (e.g., to mission 4)
  // Reset only when leaving the workshop flow (undo/back to missions < 3).
  useEffect(() => {
    if (!isWorkshopLocked) {
      setMission03ToolASelected(false);
      return;
    }
    if (mission03ToolAPlaced) {
      setMission03ToolASelected(true);
    }
  }, [isWorkshopLocked, mission03ToolAPlaced]);

  // Trigger male staff entry AFTER Mission 02 lock pulse finishes.
  // (Important: don't schedule off the "lockPulseKey is active" state, because cleanup will cancel it.)
  useEffect(() => {
    if (!hadM02Lock) return;
    if (mission.mission_id !== 'studio_02') return;
    if (lockPulseKey !== null) return;
    if (!localPlacement || localPlacement.missionId !== 'studio_02') return;

    const id = window.setTimeout(() => setMaleStaffEnterReady(true), 120);
    return () => window.clearTimeout(id);
  }, [hadM02Lock, lockPulseKey, localPlacement, mission.mission_id]);
  
  // In Mission 03: show staff in original positions until Tool A is selected
  // After Tool A: staff moves to table sides (handled in workshop section)
  const showFemaleStaff = staffEnterReady && !isWorkshopLocked;
  const showMaleStaff = maleStaffEnterReady && mission02ToolSelected !== null && !isWorkshopLocked;

  const shouldShowWorkshopStaffAtTable =
    isWorkshopLocked &&
    (mission03ToolASelected ||
      mission03ToolAPlaced ||
      (localPlacement?.missionId === 'studio_03' && localPlacement.key === 'a'));
  
  const sceneExtras: never[] = []; // Keep the original array empty for now

  // ========== RENDER ELEMENTS ==========
  // These are passed to the layout wrapper

  // Use panoramic background on mobile if available
  const effectiveBg = isMobile && panoramicBg ? panoramicBg : lockedBg;
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
      durationMs={1500}
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
      {/* Mission change flash removed from full screen - now applied only to speech bubble */}
    </>
  );

  // Scene extras - Female staff NPC appears after Mission 01 Tool B placement.
  // Position her relative to Tool B (so she's close and clearly looking at it).
  const femaleStaffPos = useMemo(() => {
    const floor = getAnchorPosition(lockedBgKey, 'floor');
    const toolBX = (floor?.x ?? 50) + 8; // matches getDuplicateAnchors() offsetX for M01 Tool B
    const staffX = Math.max(8, Math.min(92, toolBX - 10));
    return {
      left: `${staffX}%`,
      bottom: '6%',
    };
  }, [lockedBgKey]);

  // Male staff position for Mission 02
  // Uses anchor map positions based on which tool was selected
  const maleStaffPos = useMemo((): { left: string; bottom?: string; top?: string; facingRight: boolean; scale?: number } => {
    // Get position from anchor map based on selected tool
    const anchorRef = mission02ToolSelected === 'a' ? 'm02_npc_male_a' : 'm02_npc_male_b';
    const anchorPos = getAnchorPosition(lockedBgKey, anchorRef as AnchorRef);
    
    if (anchorPos) {
      return {
        left: `${anchorPos.x}%`,
        top: `${anchorPos.y}%`,
        facingRight: mission02ToolSelected === 'b', // Face right when Tool B (wall-mounted on left)
        scale: anchorPos.scale,
      };
    }
    
    // Fallback positions
    if (mission02ToolSelected === 'a') {
      // Tool A: staff stands near the tool
      return {
        left: '38%',
        bottom: '6%',
        facingRight: false,
      };
    } else {
      // Tool B: staff stands facing the wall-mounted tool
      return {
        left: '38%',
        bottom: '6%',
        facingRight: false,
      };
    }
  }, [mission02ToolSelected, lockedBgKey, getAnchorPosition]);

  // Mission 03+: two staff members facing each other - use anchor map positions
  const workshopWaitingStaffPos = useMemo(() => {
    // Read from anchor map for workshop background
    const maleAnchor = getAnchorPosition('studio_in_workshop_bg', 'm03_npc_male' as AnchorRef);
    const femaleAnchor = getAnchorPosition('studio_in_workshop_bg', 'm03_npc_female' as AnchorRef);
    
    return {
      male: {
        left: maleAnchor ? `${maleAnchor.x}%` : '54.3%',
        top: maleAnchor ? `${maleAnchor.y}%` : '72.9%',
        scale: maleAnchor?.scale || 1.0,
      },
      female: {
        left: femaleAnchor ? `${femaleAnchor.x}%` : '44%',
        top: femaleAnchor ? `${femaleAnchor.y}%` : '73.7%',
        scale: femaleAnchor?.scale || 1.0,
      },
    };
  }, []);

  // After Mission 03 Tool A (workbench): staff move closer to the table
  // Offset slightly from waiting positions toward center
  const workshopTableStaffPos = useMemo(() => {
    const waiting = workshopWaitingStaffPos;
    return {
      male: {
        left: waiting.male.left,
        top: `${parseFloat(waiting.male.top) - 5}%`, // Move 5% up (closer to table)
        scale: (waiting.male.scale || 1) * 0.9, // Slightly smaller at table
      },
      female: {
        left: waiting.female.left,
        top: `${parseFloat(waiting.female.top) - 5}%`, // Move 5% up
        scale: (waiting.female.scale || 1) * 0.9,
      },
    };
  }, [workshopWaitingStaffPos]);

  const sceneExtrasElement = (
    <>
      {/* Female staff - Mission 01 Tool B */}
      {showFemaleStaff && (
        <div
          className="absolute pointer-events-none animate-npc-enter"
          style={{
            left: femaleStaffPos.left,
            bottom: femaleStaffPos.bottom,
            zIndex: 18,
            transform: 'translateX(-50%)',
            transformOrigin: 'bottom center',
          }}
        >
          <img
            src={femaleStaffWalk}
            alt="Staff member"
            className="w-auto object-contain animate-subtle-idle"
            style={{
              height: 'clamp(280px, 48vh, 460px)',
              filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.45))',
              transform: 'scaleX(-1)', // Face right toward the tool
            }}
          />
        </div>
      )}
      
      {/* Male staff - Mission 02 - BEHIND the tool (lower z-index) */}
      {showMaleStaff && (
        <div
          className="absolute pointer-events-none animate-npc-enter"
          style={{
            left: maleStaffPos.left,
            bottom: maleStaffPos.bottom,
            top: maleStaffPos.top,
            zIndex: 8, // Behind tools (tools are ~15-20)
            transform: maleStaffPos.top 
              ? `translate(-50%, -100%) scale(${maleStaffPos.scale || 1})` 
              : 'translateX(-50%)',
            transformOrigin: 'bottom center',
          }}
        >
          <img
            src={maleStaffWalk}
            alt="Staff member"
            className="w-auto object-contain animate-subtle-idle"
            style={{
              height: 'clamp(260px, 44vh, 420px)',
              filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.45))',
              transform: maleStaffPos.facingRight ? 'scaleX(1)' : 'scaleX(-1)',
            }}
          />
        </div>
      )}

      {/* Mission 03+: Staff in workshop - single render with dynamic position */}
      {isWorkshopLocked && (
        <>
          {/* Male staff */}
          {maleStaffEnterReady && mission02ToolSelected !== null && (
            <div
              key="workshop-male-staff"
              className="absolute pointer-events-none"
              style={{
                left: shouldShowWorkshopStaffAtTable 
                  ? workshopTableStaffPos.male.left 
                  : workshopWaitingStaffPos.male.left,
                top: shouldShowWorkshopStaffAtTable 
                  ? workshopTableStaffPos.male.top 
                  : workshopWaitingStaffPos.male.top,
                zIndex: 10,
                transform: 'translate(-50%, -100%)',
                transformOrigin: 'bottom center',
                transition: 'left 0.6s ease-out, top 0.6s ease-out',
              }}
            >
              <img
                src={maleStaffWalk}
                alt="דמות צוות מחכה"
                className="w-auto object-contain animate-subtle-idle"
                style={{
                  height: shouldShowWorkshopStaffAtTable 
                    ? 'clamp(180px, 28vh, 280px)' 
                    : 'clamp(220px, 34vh, 340px)',
                  filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.45))',
                  transform: 'scaleX(-1)',
                  transition: 'height 0.6s ease-out',
                }}
              />
            </div>
          )}

          {/* Female staff */}
          {staffEnterReady && (
            <div
              key="workshop-female-staff"
              className="absolute pointer-events-none"
              style={{
                left: shouldShowWorkshopStaffAtTable 
                  ? workshopTableStaffPos.female.left 
                  : workshopWaitingStaffPos.female.left,
                top: shouldShowWorkshopStaffAtTable 
                  ? workshopTableStaffPos.female.top 
                  : workshopWaitingStaffPos.female.top,
                zIndex: 10,
                transform: 'translate(-50%, -100%)',
                transformOrigin: 'bottom center',
                transition: 'left 0.6s ease-out, top 0.6s ease-out',
              }}
            >
              <img
                src={femaleStaffWalk}
                alt="דמות צוות מחכה"
                className="w-auto object-contain animate-subtle-idle"
                style={{
                  height: shouldShowWorkshopStaffAtTable 
                    ? 'clamp(180px, 28vh, 280px)' 
                    : 'clamp(220px, 34vh, 340px)',
                  filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.45))',
                  transition: 'height 0.6s ease-out',
                }}
              />
            </div>
          )}
        </>
      )}
    </>
  );

  const targetZoneElement = activeToolVariant && targetPosition ? (
    <div 
      className="absolute z-[12] animate-fade-in cursor-pointer"
      style={{
        left: `${targetPosition.x}%`,
        top: `${targetPosition.y}%`,
        // Align the drop target to the same anchor point the tool will snap to
        // (we anchor tool placement by its bottom-center)
        transform: 'translate(-50%, -100%)',
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
  const getDuplicateAnchors = (prop: typeof displayedPlacement[0]): { anchor: AnchorRef; offsetX: number; offsetY: number; customScale?: number; absoluteY?: number; absoluteX?: number; wallMount?: boolean; flipX?: boolean }[] => {
    // Product rule: Mission 01 tool A duplicates to 3 placements (one per wall)
    // Position: on the floor adjacent to each wall (left/center/right)
    if (prop.missionId === 'studio_01' && prop.key === 'a') {
      // Use fixed X positions for left/center/right walls (22%, 50%, 78%)
      // Position close to back wall with larger scale so they look like real tools
      // absoluteX ensures exact positioning regardless of anchor
      return [
        { anchor: 'floor', offsetX: 0, offsetY: 0, customScale: 2.0, absoluteY: DUPLICATE_BUCKETS_Y, absoluteX: 22 },
        { anchor: 'floor', offsetX: 0, offsetY: 0, customScale: 2.0, absoluteY: DUPLICATE_BUCKETS_Y, absoluteX: 50 },
        { anchor: 'floor', offsetX: 0, offsetY: 0, customScale: 2.0, absoluteY: DUPLICATE_BUCKETS_Y, absoluteX: 78 },
      ];
    }
    
    // Mission 01 Tool B: use anchor map coordinates
    if (prop.missionId === 'studio_01' && prop.key === 'b') {
      const anchorPos = getAnchorPosition(currentBgKey, 'm01_tool_b');
      if (anchorPos) {
        return [{ 
          anchor: 'm01_tool_b' as AnchorRef, 
          offsetX: 0, 
          offsetY: 0, 
          customScale: anchorPos.scale, 
          absoluteY: anchorPos.y, 
          absoluteX: anchorPos.x,
          flipX: anchorPos.flipX
        }];
      }
      // Fallback
      return [{ anchor: 'floor', offsetX: 8, offsetY: 0, customScale: 1.8, absoluteY: M01_TOOL_B_Y }];
    }
    
    // Mission 02 Tool A: use anchor map coordinates
    if (prop.missionId === 'studio_02' && prop.key === 'a') {
      const anchorPos = getAnchorPosition(lockedBgKey, 'm02_tool_a');
      if (anchorPos) {
        return [{ 
          anchor: 'm02_tool_a' as AnchorRef, 
          offsetX: 0, 
          offsetY: 0, 
          customScale: anchorPos.scale, 
          absoluteY: anchorPos.y, 
          absoluteX: anchorPos.x,
          flipX: anchorPos.flipX
        }];
      }
      // Fallback
      return [{ anchor: 'floor', offsetX: 0, offsetY: 0, customScale: 1.6, absoluteY: DUPLICATE_BUCKETS_Y, absoluteX: 30 }];
    }
    
    // Mission 02 Tool B: use anchor map coordinates
    if (prop.missionId === 'studio_02' && prop.key === 'b') {
      const anchorPos = getAnchorPosition(lockedBgKey, 'm02_tool_b');
      if (anchorPos) {
        return [{ 
          anchor: 'm02_tool_b' as AnchorRef, 
          offsetX: 0, 
          offsetY: 0, 
          customScale: anchorPos.scale, 
          absoluteY: anchorPos.y, 
          absoluteX: anchorPos.x,
          wallMount: true,
          flipX: anchorPos.flipX
        }];
      }
      // Fallback
      return [{ anchor: 'wall_left', offsetX: 0, offsetY: 0, customScale: 1.4, absoluteY: 52, absoluteX: 25, wallMount: true }];
    }

    // Mission 03 Tool A (workbench): use anchor map coordinates
    if (prop.missionId === 'studio_03' && prop.key === 'a') {
      const anchorPos = getAnchorPosition(lockedBgKey, 'm03_tool_a');
      if (anchorPos) {
        return [{ 
          anchor: 'm03_tool_a' as AnchorRef, 
          offsetX: 0, 
          offsetY: 0, 
          customScale: anchorPos.scale, 
          absoluteY: anchorPos.y, 
          absoluteX: anchorPos.x,
          flipX: anchorPos.flipX
        }];
      }
      // Fallback
      return [{ anchor: 'floor', offsetX: 0, offsetY: 0, customScale: 3.0, absoluteY: 70, absoluteX: 60 }];
    }
    
    // Mission 03 Tool B (sound desk): use anchor map coordinates
    if (prop.missionId === 'studio_03' && prop.key === 'b') {
      const anchorPos = getAnchorPosition(lockedBgKey, 'm03_tool_b');
      if (anchorPos) {
        return [{ 
          anchor: 'm03_tool_b' as AnchorRef, 
          offsetX: 0, 
          offsetY: 0, 
          customScale: anchorPos.scale, 
          absoluteY: anchorPos.y, 
          absoluteX: anchorPos.x,
          flipX: anchorPos.flipX
        }];
      }
      // Fallback
      return [{ anchor: 'floor', offsetX: 0, offsetY: 0, customScale: 2.2, absoluteY: 71, absoluteX: 18 }];
    }

    // Mission 04 Tool A (industrial lights): duplicates to 5 items in a row on the ceiling
    if (prop.missionId === 'studio_04' && prop.key === 'a') {
      const ceilingY = 18; // High up on ceiling
      const spacing = 14; // Spacing between lights
      const startX = 22; // Start from left
      return [
        { anchor: 'ceiling', offsetX: 0, offsetY: 0, customScale: 1.6, absoluteY: ceilingY, absoluteX: startX },
        { anchor: 'ceiling', offsetX: 0, offsetY: 0, customScale: 1.6, absoluteY: ceilingY, absoluteX: startX + spacing },
        { anchor: 'ceiling', offsetX: 0, offsetY: 0, customScale: 1.6, absoluteY: ceilingY, absoluteX: startX + spacing * 2 },
        { anchor: 'ceiling', offsetX: 0, offsetY: 0, customScale: 1.6, absoluteY: ceilingY, absoluteX: startX + spacing * 3 },
        { anchor: 'ceiling', offsetX: 0, offsetY: 0, customScale: 1.6, absoluteY: ceilingY, absoluteX: startX + spacing * 4 },
      ];
    }

    // Mission 04 Tool B (sculptural lights): duplicates to 3 items in room corners
    if (prop.missionId === 'studio_04' && prop.key === 'b') {
      const floorY = 78; // On the floor near walls
      return [
        { anchor: 'floor', offsetX: 0, offsetY: 0, customScale: 1.8, absoluteY: floorY, absoluteX: 18 },  // Left corner
        { anchor: 'floor', offsetX: 0, offsetY: 0, customScale: 1.8, absoluteY: floorY, absoluteX: 50 },  // Center back
        { anchor: 'floor', offsetX: 0, offsetY: 0, customScale: 1.8, absoluteY: floorY, absoluteX: 82 },  // Right corner
      ];
    }

    // Mission 05 Tool A (exterior decor): single placement outside
    if (prop.missionId === 'studio_05' && prop.key === 'a') {
      return [{ anchor: 'floor', offsetX: 0, offsetY: 0, customScale: 2.0, absoluteY: 75, absoluteX: 35 }];
    }

    // Mission 05 Tool B (exterior element): single placement outside
    if (prop.missionId === 'studio_05' && prop.key === 'b') {
      return [{ anchor: 'floor', offsetX: 0, offsetY: 0, customScale: 2.0, absoluteY: 75, absoluteX: 65 }];
    }

    // Mission 06 Tool A (wall decor): duplicates 6 times side by side on wall
    if (prop.missionId === 'studio_06' && prop.key === 'a') {
      const wallY = 58.9; // Calibrated Y position on wall
      const spacing = 10; // Spacing between items
      const startX = 22; // Start from left side
      return [
        { anchor: 'wall_back', offsetX: 0, offsetY: 0, customScale: 1.4, absoluteY: wallY, absoluteX: startX },
        { anchor: 'wall_back', offsetX: 0, offsetY: 0, customScale: 1.4, absoluteY: wallY, absoluteX: startX + spacing },
        { anchor: 'wall_back', offsetX: 0, offsetY: 0, customScale: 1.4, absoluteY: wallY, absoluteX: startX + spacing * 2 },
        { anchor: 'wall_back', offsetX: 0, offsetY: 0, customScale: 1.4, absoluteY: wallY, absoluteX: startX + spacing * 3 },
        { anchor: 'wall_back', offsetX: 0, offsetY: 0, customScale: 1.4, absoluteY: wallY, absoluteX: startX + spacing * 4 },
        { anchor: 'wall_back', offsetX: 0, offsetY: 0, customScale: 1.4, absoluteY: wallY, absoluteX: startX + spacing * 5 },
      ];
    }

    // Mission 06 Tool B (large item): grows large behind avatar (calibrated position)
    if (prop.missionId === 'studio_06' && prop.key === 'b') {
      return [{ anchor: 'floor', offsetX: 0, offsetY: 0, customScale: 3.5, absoluteY: 79.5, absoluteX: 81.2 }];
    }

    // Default: single placement at floor with realistic size
    return [{ anchor: 'floor', offsetX: 0, offsetY: 0, customScale: 1.8 }];
  };

  const placedPropsElement = (
    <>
      {displayedPlacement.flatMap((prop, propIdx) => {
        const assetName = prop.assetName || `${prop.missionId.replace('studio_', 'studio_')}_${prop.key}`;
        const toolImg = getToolImage(assetName);
        
        if (!toolImg) return null;
        
        const isPersisted = 'isPersisted' in prop && prop.isPersisted;
        const isJustPlaced = justPlaced === `${prop.missionId}-${prop.key}`;
        const isMission01Buckets = prop.missionId === 'studio_01' && prop.key === 'a';
        const isMission01ToolB = prop.missionId === 'studio_01' && prop.key === 'b';
        const isMission02ToolB = prop.missionId === 'studio_02' && prop.key === 'b';
        
        // USE FIXED PLACEMENT FOR PERSISTED TOOLS
        // This ensures tools stay exactly where they were placed, not recalculated
        if (isPersisted && prop.fixedPlacement) {
          const fixed = prop.fixedPlacement;
          const transformStyle = fixed.wallMount
            ? `translate(-50%, -50%) scale(${fixed.scale})`
            : `translate(-50%, -100%) scale(${fixed.scale})`;
          
          return [(
            <div
              key={`${prop.missionId}-${propIdx}-fixed`}
              className="absolute pointer-events-none"
              style={{
                left: `${fixed.x}%`,
                top: `${fixed.y}%`,
                transform: transformStyle,
                zIndex: 15,
              }}
            >
              <img 
                src={toolImg}
                alt=""
                className={`${isMission01ToolB || isMission02ToolB ? 'w-32 h-32 md:w-40 md:h-40' : 'w-24 h-24 md:w-32 md:h-32'} object-contain`}
                style={{
                  filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))',
                  transform: fixed.flipX ? 'scaleX(-1)' : undefined,
                }}
              />
            </div>
          )];
        }
        
        // For non-persisted tools or tools without fixedPlacement, use original logic
        const anchorInfos = getDuplicateAnchors(prop);
        
        return anchorInfos.map((anchorInfo, idx) => {
          // Mission 01 paint: keep tool coordinates stable even while the background is crossfading.
          const anchorKeyForPlacement = (prop.missionId === 'studio_01' && prop.key === 'a') ? currentBgKey : lockedBgKey;
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
          
          // Use absoluteX if provided (for fixed horizontal positioning)
          const leftValue = anchorInfo.absoluteX !== undefined
            ? anchorInfo.absoluteX
            : anchorPos.x + anchorInfo.offsetX;
          
          // Wall-mounted tools use center transform, floor tools use bottom-anchored
          const transformStyle = anchorInfo.wallMount
            ? `translate(-50%, -50%) scale(${finalScale})`
            : `translate(-50%, -100%) scale(${finalScale})`;
          
          return (
              <div
                key={`${prop.missionId}-${propIdx}-${idx}`}
                className={`absolute pointer-events-none ${
                  isPersisted
                    ? ''
                    : (isMission01ToolB
                        // Tool B: simple fade-in, lock glow handled on img element
                        ? 'animate-tool-appear'
                        : (isMission01Buckets
                            ? 'animate-snap-place'
                            : (isJustPlaced ? 'animate-snap-pop-blink' : 'animate-snap-place')))
                }`}
                style={{
                left: `${leftValue}%`,
                top: `${topValue}%`,
                // Use calculated scale
                transform: transformStyle,
                // Ensure tools near walls are visible above floor elements
                zIndex: 15 + idx,
                animationDelay: isPersisted ? '0ms' : `${animationDelay}ms`,
              }}
            >
              <img 
                src={toolImg}
                alt=""
                className={`${isMission01Buckets ? 'w-28 h-28 md:w-36 md:h-36' : (isMission01ToolB || isMission02ToolB ? 'w-32 h-32 md:w-40 md:h-40' : 'w-24 h-24 md:w-32 md:h-32')} object-contain ${lockPulseKey === `${prop.missionId}-${prop.key}` ? 'tool-lock-confirm' : ''}`}
                 style={{
                   filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))',
                   // Apply rotation for Mission 01 Tool B, and flipX from anchor map
                    transform: isMission01ToolB
                      ? 'rotate(-15deg) scaleX(-1)'
                      : (anchorInfo.flipX ? 'scaleX(-1)' : undefined),
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

  // Get mission number for display (1-12 for main, special for tie)
  const missionDisplayNumber = useMemo(() => {
    if (mission.phase === 'main') {
      return mission.sequence;
    }
    return null; // Tie-breaker missions don't show number
  }, [mission.phase, mission.sequence]);

  // Split task text after comma for better readability (tablet/mobile only)
  // Also prepend mission number in bold
  const formattedTaskText = useMemo(() => {
    const missionPrefix = missionDisplayNumber ? (
      <span>
        <strong>משימה {missionDisplayNumber}:</strong>{' '}
      </span>
    ) : null;

    if (!isTabletOrMobile) {
      // Desktop: no line breaks
      return <>{missionPrefix}{taskText}</>;
    }
    // Tablet/Mobile: split after commas
    const textParts = taskText.split(',').map((part, index, arr) => (
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
    return <>{missionPrefix}{textParts}</>;
  }, [taskText, isTabletOrMobile, missionDisplayNumber]);

  const speechBubbleElement = (
    <div className="relative">
      {/* Subtle flash on mission change - only on the bubble */}
      {showMissionFlash && (
        <div 
          className="absolute inset-0 rounded-2xl pointer-events-none animate-mission-flash"
          style={{
            background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.22) 0%, transparent 80%)',
            zIndex: 5,
          }}
        />
      )}
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
    </div>
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

  // Debug overlay anchors
  const debugAnchors = useMemo(() => [
    { name: 'wall_back (windows)', y: 38, color: '#e74c3c' },
    { name: 'windows_bottom', y: 52, color: '#e67e22' },
    { name: 'BACK_FLOOR (Tool A drop)', y: BACK_FLOOR_Y, color: '#2ecc71' },
    { name: 'BUCKETS_Y (placement)', y: DUPLICATE_BUCKETS_Y, color: '#27ae60' },
    { name: 'CENTER_FLOOR (Tool B)', y: CENTER_FLOOR_Y, color: '#3498db' },
    { name: 'floor (front)', y: 87, color: '#9b59b6' },
  ], [BACK_FLOOR_Y, DUPLICATE_BUCKETS_Y, CENTER_FLOOR_Y]);

  // Avatar for the editor (separate from NPCs)
  const editorAvatar = useMemo(() => {
    const avatarImg = getAvatarImage(avatarGender, 'idle');
    if (!avatarImg) return undefined;
    return {
      id: 'player-avatar',
      label: `Avatar (${avatarGender})`,
      left: 85,
      top: 85,
      height: 'clamp(300px, 50vh, 500px)',
      imageSrc: avatarImg,
    };
  }, [avatarGender]);

  // NPC positions for the editor (staff only)
  // In edit mode, show ALL NPCs for calibration (not just visible ones based on game state)
  const editorNpcs = useMemo(() => {
    const npcs = [];
    
    // Mission 01-02: Female staff (appears after Tool B selection in M01)
    // Always show in editor for calibration
    const isMission01or02 = mission.mission_id === 'studio_01' || mission.mission_id === 'studio_02';
    if (isMission01or02 || showFemaleStaff) {
      npcs.push({
        id: 'mission-female',
        label: 'Female Staff (M01 Tool B)',
        left: parseFloat(femaleStaffPos.left || '70'),
        top: 100 - parseFloat(femaleStaffPos.bottom?.replace('%', '') || '10'),
        height: 'clamp(280px, 48vh, 460px)',
        imageSrc: femaleStaffWalk,
      });
    }
    
    // Mission 02: Male staff (appears after any tool selection in M02)
    // Always show in editor when in M02 for calibration
    const isMission02 = mission.mission_id === 'studio_02';
    if (isMission02 || showMaleStaff) {
      npcs.push({
        id: 'mission-male',
        label: 'Male Staff (M02)',
        left: parseFloat(maleStaffPos.left?.replace('%', '') || '30'),
        top: maleStaffPos.top ? parseFloat(maleStaffPos.top.replace('%', '')) : (100 - parseFloat(maleStaffPos.bottom?.replace('%', '') || '10')),
        height: 'clamp(260px, 44vh, 420px)',
        imageSrc: maleStaffWalk,
      });
    }
    
    // Workshop staff positions (Mission 03+)
    if (isWorkshopLocked) {
      const malePos = shouldShowWorkshopStaffAtTable 
        ? workshopTableStaffPos.male 
        : workshopWaitingStaffPos.male;
      const femalePos = shouldShowWorkshopStaffAtTable 
        ? workshopTableStaffPos.female 
        : workshopWaitingStaffPos.female;
      
      npcs.push({
        id: 'workshop-male',
        label: 'Male Staff (Workshop)',
        left: parseFloat(malePos.left),
        top: parseFloat(malePos.top),
        height: shouldShowWorkshopStaffAtTable ? 'clamp(180px, 28vh, 280px)' : 'clamp(220px, 34vh, 340px)',
        imageSrc: maleStaffWalk,
      });
      npcs.push({
        id: 'workshop-female',
        label: 'Female Staff (Workshop)',
        left: parseFloat(femalePos.left),
        top: parseFloat(femalePos.top),
        height: shouldShowWorkshopStaffAtTable ? 'clamp(180px, 28vh, 280px)' : 'clamp(220px, 34vh, 340px)',
        imageSrc: femaleStaffWalk,
      });
    }
    
    return npcs;
  }, [mission.mission_id, isWorkshopLocked, shouldShowWorkshopStaffAtTable, workshopTableStaffPos, workshopWaitingStaffPos, showFemaleStaff, showMaleStaff, femaleStaffPos, maleStaffPos]);

  // Tools/Props positions for the editor
  // ONLY show tools for the CURRENT mission - not previous missions
  const editorTools = useMemo(() => {
    const tools = [];
    
    // Add current mission tools (available in tray) - these can be dragged to test positions
    const toolAImage = getToolImage(optionA.asset);
    const toolBImage = getToolImage(optionB.asset);
    
    if (toolAImage && !localPlacement) {
      const anchor = getTargetAnchor('a');
      tools.push({
        id: `current-${mission.mission_id}-a`,
        label: `${mission.mission_id.replace('studio_', 'M')} A (target)`,
        left: anchor?.x ?? 50,
        top: anchor?.y ?? 70,
        height: 'clamp(80px, 15vh, 150px)',
        imageSrc: toolAImage,
      });
    }
    if (toolBImage && !localPlacement) {
      const anchor = getTargetAnchor('b');
      tools.push({
        id: `current-${mission.mission_id}-b`,
        label: `${mission.mission_id.replace('studio_', 'M')} B (target)`,
        left: anchor?.x ?? 50,
        top: anchor?.y ?? 70,
        height: 'clamp(80px, 15vh, 150px)',
        imageSrc: toolBImage,
      });
    }
    
    // Add local placement if exists
    if (localPlacement) {
      const toolImage = getToolImage(localPlacement.assetName);
      if (toolImage) {
        const anchor = getTargetAnchor(localPlacement.key);
        tools.push({
          id: `local-${localPlacement.missionId}-${localPlacement.key}`,
          label: `LOCAL: ${localPlacement.missionId.replace('studio_', 'M')} ${localPlacement.key.toUpperCase()}`,
          left: anchor?.x ?? 50,
          top: anchor?.y ?? 70,
          height: 'clamp(80px, 15vh, 150px)',
          imageSrc: toolImage,
        });
      }
    }
    
    return tools;
  }, [localPlacement, getTargetAnchor, mission.mission_id, optionA.asset, optionB.asset]);

  // Speech bubble for the editor
  const editorBubble = useMemo(() => {
    return {
      id: 'speech-bubble',
      label: 'Speech Bubble',
      left: 50,
      top: 85,
      height: 'auto',
      width: 'clamp(200px, 40vw, 400px)',
      content: taskText,
    };
  }, [taskText]);

  return (
    <>
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
      <AnchorDebugOverlay
        anchors={debugAnchors}
        isVisible={showDebugOverlay}
        onToggle={() => setShowDebugOverlay(!showDebugOverlay)}
      />
      <GridDebugOverlay
        isVisible={showGridOverlay}
        onToggle={() => setShowGridOverlay(!showGridOverlay)}
        rows={5}
        cols={5}
      />
      
      {/* NPC + Tools + Avatar + Bubble Visual Editor */}
      {npcEditMode && (
        <DraggableNpcEditor
          isEnabled={npcEditMode}
          npcs={editorNpcs}
          tools={editorTools}
          avatar={editorAvatar}
          bubble={editorBubble}
          onSaveAndNext={onEditorNextMission}
          missionLabel={`Mission ${currentIndex + 1}/${totalMissions}: ${mission.mission_id}`}
        />
      )}
    </>
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
