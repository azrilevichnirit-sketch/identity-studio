import { useMemo, useState, useRef, useCallback, useEffect, forwardRef } from 'react';
import type { Mission, HollandCode, AvatarGender, PickRecord, MissionOption, AnchorRef } from '@/types/identity';
import { getToolImage, getBackgroundForMission, getAvatarImage, getBackgroundKey, getBackgroundByName, getPanoramicBackground, preloadBackground } from '@/lib/assetUtils';
import { getAnchorPosition } from '@/lib/jsonDataLoader';
import { SpeechBubble } from './SpeechBubble';
import { Info, Hand, X } from 'lucide-react';
import { UndoConfirmPopover } from './UndoConfirmDialog';
import { ProgressTank } from './ProgressTank';
import { DragHint } from './DragHint';
import { useSceneExtras } from '@/hooks/useSceneExtras';
import { MissionLayout } from './layouts/MissionLayout';
import type { PanningApi } from './PannableBackground';
import { PannableBackground } from './PannableBackground';
import { useIsMobile } from '@/hooks/use-mobile';
// BackgroundCrossfade is used inside PannableBackground
import { EdgePanIndicators } from './EdgePanIndicators';
import { AnchorDebugOverlay } from './AnchorDebugOverlay';
import { GridDebugOverlay } from './GridDebugOverlay';
import { ZLayerDebugOverlay, type ZLayerItem, LAYER_ZINDEX } from './ZLayerDebugOverlay';
import { ToolCalibrationEditor } from './ToolCalibrationEditor';
import { Mission7CalibrationEditor } from './Mission7CalibrationEditor';
import { Mission11CalibrationEditor } from './Mission11CalibrationEditor';
import { WaterLeakEffect } from './WaterLeakEffect';
// import { AnimatedStaffCharacter, type CharacterState } from './AnimatedStaffCharacter'; // Disabled

const DRAG_HINT_STORAGE_KEY = 'ie_hasDraggedOnce';

function zIndexForAnchorLayer(layer?: string): number {
  // Keep aligned with GameStage layering guide.
  // back: 0-5, mid: 6-10, front: 11-15
  switch (layer) {
    case 'back':
      return 6;
    case 'front':
      return 14;
    case 'mid':
    default:
      return 10;
  }
}

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
  toolEditMode?: boolean;
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
  toolEditMode = false,
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
  const [showZLayerOverlay, setShowZLayerOverlay] = useState(false);
  
  // Edge proximity for mobile pan indicators
  const [edgeProximity, setEdgeProximity] = useState<{ edge: 'left' | 'right' | null; intensity: number }>({ edge: null, intensity: 0 });
  
  // Track pan offset for placed props positioning (mobile panoramic only)
  const [panOffsetX, setPanOffsetX] = useState(0);
  // Track background transitions - hide persisted tools during crossfade
  const [isBackgroundTransitioning, setIsBackgroundTransitioning] = useState(false);
  const previousBgKeyRef = useRef<string | null>(null);
  
  // Local placement state - shows tool BEFORE it's added to global placedProps
  const [localPlacement, setLocalPlacement] = useState<{
    missionId: string;
    key: 'a' | 'b';
    assetName: string;
    fixedPlacement?: {
      x: number;
      y: number;
      scale: number;
      flipX?: boolean;
      z_layer?: string;
    };
  } | null>(null);

  // Local background override for "painted walls" beat before advancing missions
  const [localBgOverride, setLocalBgOverride] = useState<{ key: string; image: string } | null>(null);

  // Mission 7 calibration editor background override
  const [m7CalibrationBg, setM7CalibrationBg] = useState<{ key: string; image: string } | null>(null);

  // Callback for Mission 7 calibration editor to change background
  const handleM7BackgroundChange = useCallback((bgUrl: string, bgKey: string) => {
    setM7CalibrationBg({ key: bgKey, image: bgUrl });
  }, []);

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
  const PAINTED_WALLS_BG_KEY = 'gallery_main_stylized_white_v1';
  const hasPaintedWalls = useMemo(() => {
    return placedProps.some((p) => p.missionId === 'studio_01' && p.key === 'a');
  }, [placedProps]);

  // Preload the “painted walls” background to avoid a flash/jump on transition.
  useEffect(() => {
    preloadBackground(PAINTED_WALLS_BG_KEY);
    preloadBackground('studio_in_workshop_bg'); // Mission 03 workshop
    preloadBackground('studio_exterior_bg'); // Mission 05 exterior
  }, []);

  // Track if we're transitioning from Mission 7 (need to preserve bg during fixation)
  const m7TransitionRef = useRef<{ active: boolean; bgKey: string | null }>({ active: false, bgKey: null });
  
  // Clear any staged background override whenever the mission changes.
  // (Otherwise, a previous mission's bg beat can leak into the next mission.)
  // EXCEPTION: Mission 7 transition - we preserve the target bg until fixation completes
  useEffect(() => {
    // If coming from M7 with an active transition, don't clear immediately
    if (m7TransitionRef.current.active) {
      // Clear after a delay to allow the user to see the tool on its target background
      const id = window.setTimeout(() => {
        setLocalBgOverride(null);
        m7TransitionRef.current = { active: false, bgKey: null };
      }, 100);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setLocalBgOverride(null), 0);
    return () => window.clearTimeout(id);
  }, [mission.mission_id]);

  // Get the *actual* previous mission pick (Object.values order is not reliable)
  // BACKGROUND LOGIC:
  // - Mission 01: STARTS with cracked walls (gallery_main_stylized_v3)
  // - Mission 01 Tool A chosen -> white walls (gallery_main_stylized_white_v1)
  // - Mission 01 Tool B chosen -> main studio (gallery_main_stylized)
  // - Mission 02: Uses result from Mission 01 (white or main studio)
  // - Mission 03+: Workshop (studio_in_workshop_v3)
  // - Mission 05: Exterior
  // - Mission 09, 12: Main studio (gallery_main_stylized)
  const previousBgOverride = useMemo(() => {
    // Mission 01: ALWAYS start with cracked walls
    if (mission.phase === 'main' && mission.mission_id === 'studio_01') {
      return 'gallery_main_stylized_v3'; // Cracked walls
    }
    
    // Mission 02: depends on Mission 01 choice
    if (mission.phase === 'main' && (mission.mission_id === 'studio_02' || mission.sequence === 2)) {
      if (hasPaintedWalls) {
        return PAINTED_WALLS_BG_KEY; // White walls (Tool A chosen)
      }
      // Tool B was chosen - use main studio (finished)
      return 'gallery_main_stylized';
    }
    
    // Exterior missions (view: "out") - Mission 05 ONLY
    // Mission 11 continues in workshop despite having view: "out" in data
    if (mission.phase === 'main' && mission.view === 'out' && mission.mission_id !== 'studio_11') {
      return 'studio_exterior_bg';
    }
    
    // Mission 11: Continue in workshop (same as M10)
    if (mission.phase === 'main' && mission.mission_id === 'studio_11') {
      return 'studio_in_workshop_bg';
    }
    
    // Mission 07: Use workshop background ONLY when not in calibration mode
    // (Calibration mode handles its own background switching)
    if (mission.phase === 'main' && mission.mission_id === 'studio_07') {
      return 'studio_in_workshop_bg';
    }
    
    // Mission 09 & 12: Use main studio (gallery_main_stylized)
    if (mission.phase === 'main' && (mission.mission_id === 'studio_09' || mission.mission_id === 'studio_12')) {
      return 'gallery_main_stylized';
    }
    
    // Mission 10: Back to workshop (like M08)
    if (mission.phase === 'main' && mission.mission_id === 'studio_10') {
      return 'studio_in_workshop_bg';
    }
    
    // Mission 03+ (except exterior, M07, M09, M10): use the workshop background
    if (mission.phase === 'main' && (mission.mission_id === 'studio_03' || mission.sequence >= 3)) {
      return 'studio_in_workshop_bg';
    }

    return undefined;
  }, [mission.phase, mission.sequence, mission.mission_id, mission.view, hasPaintedWalls]);

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
  
  // Mobile detection (used across background + interactions)
  const isMobile = useIsMobile();
  // Product rule: Mission 02 uses white walls ONLY if Tool A was chosen in Mission 01.
  // If Tool B was chosen, keep the cracked walls background.
  // Exterior missions (view: "out") use exterior background.
  // Guardrail: lock by mission_id too (in case sequence is inconsistent).
  const isWhiteWallsLocked =
    mission.phase === 'main' && (mission.mission_id === 'studio_02' || mission.sequence === 2) && hasPaintedWalls;
  const isCrackedWallsLocked =
    mission.phase === 'main' && (mission.mission_id === 'studio_02' || mission.sequence === 2) && !hasPaintedWalls;
  const isExteriorLocked =
    mission.phase === 'main' && mission.view === 'out' && mission.mission_id !== 'studio_11';
  // Mission 09 & 12: Gallery (uses bg_override) - NOT workshop locked
  const isGalleryMission = (mission.mission_id === 'studio_09' || mission.mission_id === 'studio_12') && mission.bg_override;
  const isWorkshopLocked =
    mission.phase === 'main' &&
    ((mission.mission_id === 'studio_03' || mission.sequence >= 3) && !isExteriorLocked && !isGalleryMission);

  const taskText = mission.task_heb || `MISSING: task_heb`;

  // Get the target background for a tool option
  const getTargetBgForOption = useCallback((option: MissionOption) => {
    // TIE-BREAKER MISSIONS: Stay on mission's bg_override, game ends after choice
    // No background transition - the tool is placed and then we go to summary
    if (mission.phase === 'tb') {
      const lockedKey = mission.bg_override || currentBgKey;
      const lockedImage = getBackgroundByName(lockedKey) || currentBg;
      return { key: lockedKey, image: lockedImage };
    }
    // Product rule: Mission 02 locked to white walls
    if (mission.phase === 'main' && (mission.mission_id === 'studio_02' || mission.sequence === 2)) {
      const lockedKey = PAINTED_WALLS_BG_KEY;
      const lockedImage = getBackgroundByName(lockedKey) || currentBg;
      return { key: lockedKey, image: lockedImage };
    }
    // Exterior missions (except M11 which stays in workshop)
    if (mission.phase === 'main' && mission.view === 'out' && mission.mission_id !== 'studio_11') {
      const lockedKey = 'studio_exterior_bg';
      const lockedImage = getBackgroundByName(lockedKey) || currentBg;
      return { key: lockedKey, image: lockedImage };
    }
    // Mission 07: Tool-specific destination rooms
    // Tool A -> Storage, Tool B -> Gallery (MUST be gallery_main_stylized.webp)
    // This MUST come BEFORE the workshop lock check
    if (mission.mission_id === 'studio_07') {
      const targetBgKey = option.key === 'a' ? 'studio_in_storage_bg' : 'gallery_main_stylized';
      const targetBgImage = getBackgroundByName(targetBgKey) || currentBg;
      return { key: targetBgKey, image: targetBgImage };
    }
    // Workshop missions (M03+, except M07, exterior, M09, M12)
    if (mission.phase === 'main' && (mission.mission_id === 'studio_03' || mission.sequence >= 3) && mission.mission_id !== 'studio_07' && !isGalleryMission) {
      const lockedKey = 'studio_in_workshop_bg';
      const lockedImage = getBackgroundByName(lockedKey) || currentBg;
      return { key: lockedKey, image: lockedImage };
    }

    const targetBgKey = option.next_bg_override || currentBgKey;
    const targetBgImage = getBackgroundByName(targetBgKey) || currentBg;
    return { key: targetBgKey, image: targetBgImage };
  }, [currentBgKey, currentBg, mission.phase, mission.sequence, mission.mission_id, mission.view, mission.bg_override, PAINTED_WALLS_BG_KEY, isGalleryMission]);

  // Determine which background to show during drag/carry
  const activeToolVariant = draggingTool || carryModeTool;
  const dragPreviewBg = useMemo(() => {
    if (!activeToolVariant) return null;

    // Mission 01: NEVER preview a different background during drag.
    // The player should drag/place on the current scene, then see the walls turn white (tool A)
    // or the scene transition (tool B). This prevents jarring background jumps while dragging.
    if (mission.mission_id === 'studio_01') {
      return null;
    }

    // Mission 07: SHOW background preview during drag (room transition!)
    if (mission.mission_id === 'studio_07') {
      const option = activeToolVariant === 'a' ? optionA : optionB;
      const target = getTargetBgForOption(option);
      if (target.key !== currentBgKey) {
        return target;
      }
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

  // Priority: M7 calibration > local "painted" beat > drag preview > current
  const displayBg = m7CalibrationBg?.image || localBgOverride?.image || dragPreviewBg?.image || currentBg;
  const displayBgKey = m7CalibrationBg?.key || localBgOverride?.key || dragPreviewBg?.key || currentBgKey;

  // In calibration mode, bypass the normal background locking
  // M07 and M11 have specialized calibration editors that must be able to switch backgrounds.
  const isM7CalibrationMode = toolEditMode && mission.mission_id === 'studio_07';
  const isM11CalibrationMode = toolEditMode && mission.mission_id === 'studio_11';
  const isCalibrationBgOverrideMode = isM7CalibrationMode || isM11CalibrationMode;

  // Final guardrail: Mission 02 = white walls OR cracked walls (based on M01 choice), exterior = park, M03+ = workshop
  // BUT: M7 calibration mode FULLY overrides all locks - uses m7CalibrationBg directly
  // ALSO: M7 during drag/carry uses dragPreviewBg to show the destination room
  const isM7DragActive = mission.mission_id === 'studio_07' && activeToolVariant && dragPreviewBg;
  const lockedBgKey = isCalibrationBgOverrideMode && m7CalibrationBg ? m7CalibrationBg.key
    : isM7DragActive ? dragPreviewBg.key // M7 drag overrides workshop lock
    : isWhiteWallsLocked ? PAINTED_WALLS_BG_KEY 
    : isCrackedWallsLocked ? 'studio_entry_inside_bg'
    : isExteriorLocked ? 'studio_exterior_bg'
    : isWorkshopLocked && !isCalibrationBgOverrideMode ? 'studio_in_workshop_bg' 
    : displayBgKey;
  const lockedBg = isCalibrationBgOverrideMode && m7CalibrationBg ? m7CalibrationBg.image
    : isM7DragActive ? dragPreviewBg.image // M7 drag overrides workshop lock
    : isWhiteWallsLocked 
    ? (getBackgroundByName(PAINTED_WALLS_BG_KEY) || displayBg) 
    : isCrackedWallsLocked
    ? (getBackgroundByName('studio_entry_inside_bg') || displayBg)
    : isExteriorLocked 
    ? (getBackgroundByName('studio_exterior_bg') || displayBg)
    : (isWorkshopLocked && !isCalibrationBgOverrideMode ? (getBackgroundByName('studio_in_workshop_bg') || displayBg) : displayBg);

  // ==================== MOBILE PANORAMIC PANNING ====================
  // IMPORTANT: panning must follow the *actual* background being shown (lockedBgKey),
  // otherwise some missions won't pan on mobile and side-wall anchors become unreachable.
  const isPanoramic = useMemo(() => {
    if (!isMobile) return false;
    return !!getPanoramicBackground(lockedBgKey);
  }, [isMobile, lockedBgKey]);

  // Auto-pan on mission entry toward Tool A's target (helps reveal side-wall targets)
  const initialPanTargetX = useMemo(() => {
    if (!isMobile || !isPanoramic) return undefined;

    const anchorRef = optionA.anchor_ref as AnchorRef;
    const anchorPos = getAnchorPosition(lockedBgKey, anchorRef);
    return anchorPos?.x ?? 50;
  }, [isMobile, isPanoramic, optionA.anchor_ref, lockedBgKey]);

  const panApiRef = useRef<PanningApi | null>(null);

  // Sync pan offset when initial target changes (mission transition)
  useEffect(() => {
    if (isMobile && isPanoramic && initialPanTargetX !== undefined) {
      // Initial pan is set by usePanningBackground, sync our state
      // Give a small delay for the hook to initialize
      const timer = setTimeout(() => {
        if (panApiRef.current) {
          setPanOffsetX(panApiRef.current.getOffsetX());
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isMobile, isPanoramic, initialPanTargetX]);

  // Uses anchor_ref from quest data to look up coordinates in anchor map
  // IMPORTANT: Look up anchor in the CURRENT background (where placement happens),
  // not in next_bg_override (which is the background AFTER placement)
  const getTargetAnchor = useCallback((variant: 'a' | 'b') => {
    const option = variant === 'a' ? optionA : optionB;
    
    // Prefer mission-specific tool anchors (mXX_tool_a/b) so drag target == final placement.
    // Some quest rows still use generic anchors (e.g. wall_left/ceiling), which should not drive calibrated drop zones.
    const missionNum = String(mission.mission_id).replace('studio_', '').padStart(2, '0');
    const preferredAnchorRef = (`m${missionNum}_tool_${variant}`) as AnchorRef;
    const fallbackAnchorRef = option.anchor_ref as AnchorRef;
    
    // SPECIAL CASE: Mission 07 - tool-specific destination rooms
    // Tool A -> studio_in_storage_bg, Tool B -> gallery_main_stylized
    if (mission.mission_id === 'studio_07') {
      const targetBgKey = variant === 'a' ? 'studio_in_storage_bg' : 'gallery_main_stylized';
      let anchorPos = getAnchorPosition(targetBgKey, preferredAnchorRef);
      if (!anchorPos) {
        anchorPos = getAnchorPosition(targetBgKey, fallbackAnchorRef);
      }
      if (anchorPos) {
        return anchorPos;
      }
    }
    
    // CRITICAL: For missions with locked backgrounds (M02 = white/cracked walls, exterior, M03+ = workshop),
    // we must look up coordinates in the LOCKED background, not current
    const lookupBgKey = isWhiteWallsLocked ? PAINTED_WALLS_BG_KEY 
      : isCrackedWallsLocked ? 'studio_entry_inside_bg'
      : isExteriorLocked ? 'studio_exterior_bg'
      : isWorkshopLocked ? 'studio_in_workshop_bg' 
      : currentBgKey;
    
    // Try locked/current background first
    let anchorPos = getAnchorPosition(lookupBgKey, preferredAnchorRef);
    if (!anchorPos) {
      anchorPos = getAnchorPosition(lookupBgKey, fallbackAnchorRef);
    }
    
    // If not found, try the next background (fallback)
    if (!anchorPos) {
      const nextBgKey = option.next_bg_override || lookupBgKey;
      anchorPos = getAnchorPosition(nextBgKey, preferredAnchorRef);
      if (!anchorPos) {
        anchorPos = getAnchorPosition(nextBgKey, fallbackAnchorRef);
      }
    }
    
    if (anchorPos) {
      return anchorPos;
    }

    // Default fallback
    return { x: 50, y: 70, scale: 1, z_layer: 'mid' as const, flipX: false };
  }, [optionA, optionB, currentBgKey, isWhiteWallsLocked, isCrackedWallsLocked, isExteriorLocked, isWorkshopLocked, PAINTED_WALLS_BG_KEY, mission.mission_id]);

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

  // Track background changes and trigger transition state
  // This hides persisted tools during the crossfade to prevent them appearing before bg changes
  const CROSSFADE_DURATION = 1500; // Must match BackgroundCrossfade durationMs
  useEffect(() => {
    // Skip if this is the first render or bg hasn't changed
    if (previousBgKeyRef.current === null) {
      previousBgKeyRef.current = lockedBgKey;
      return;
    }
    
    if (previousBgKeyRef.current !== lockedBgKey) {
      // Background is changing - hide persisted tools during transition
      setIsBackgroundTransitioning(true);
      previousBgKeyRef.current = lockedBgKey;
      
      // After crossfade completes, show the tools
      const fadeTimer = window.setTimeout(() => {
        setIsBackgroundTransitioning(false);
      }, CROSSFADE_DURATION);
      
      return () => window.clearTimeout(fadeTimer);
    }
  }, [lockedBgKey]);

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

  // Simple tool placement lookup from anchor map (single source of truth)
  // REMOVED: Complex calculateFixedPlacement that tried to predict next_bg_override
  const getToolPlacementFromAnchorMap = useCallback((missionId: string, key: 'a' | 'b', bgKey: string) => {
    const anchorRef = `m${missionId.replace('studio_', '').padStart(2, '0')}_tool_${key}` as AnchorRef;
    const anchorPos = getAnchorPosition(bgKey, anchorRef);
    if (anchorPos) {
      return {
        x: anchorPos.x,
        y: anchorPos.y,
        scale: anchorPos.scale,
        flipX: anchorPos.flipX,
        z_layer: anchorPos.z_layer,
      };
    }
    return null;
  }, []);

  // Complete a tool selection (used by both drag and carry mode)
  // SIMPLIFIED: No longer calculates or saves fixedPlacement - anchor map is single source of truth
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
    // Snap LOCAL placement immediately to the calibrated anchor for all missions
    // (otherwise the user sees it "stick" where they released, until the next mission renders the persisted version)
    const shouldSnapLocalToAnchorNow = true;
    const snapped = shouldSnapLocalToAnchorNow ? getTargetAnchor(variant) : null;
    setLocalPlacement({
      missionId: mission.mission_id,
      key: variant,
      assetName: option.asset,
      fixedPlacement: snapped
        ? {
            x: snapped.x,
            y: snapped.y,
            scale: snapped.scale,
            flipX: snapped.flipX,
            z_layer: snapped.z_layer,
          }
        : undefined,
    });

    // Mission 07: Lock the background to the target room IMMEDIATELY on placement
    // This keeps the tool visible on its destination room during the fixation animation
    const isMission07 = mission.mission_id === 'studio_07';
    if (isMission07) {
      const targetBg = getTargetBgForOption(option);
      setLocalBgOverride(targetBg);
      // Mark that we're in a M7 transition - prevents immediate bg clear on mission change
      m7TransitionRef.current = { active: true, bgKey: targetBg.key };
    }
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
    // Mission 01 paint: only advance after the player clearly sees the "painted walls" beat.
    // Mission 07: Extra delay to let players see the tool fixation on the destination room
    const isMission02 = mission.mission_id === 'studio_02';
    // Mission 01 Tool B: 2800ms - enough time for lock (1100ms) + staff entry + viewing
    // Mission 02: 3500ms - tool locks, then male staff enters, then wait 1 second before advancing
    // Mission 07: 2800ms - tool locks on destination room, player sees it before transition
    const advanceDelay = isMission01Paint ? 3200 
      : isMission01ToolB ? 2800 
      : isMission02 ? 3500 
      : isMission07 ? 2800
      : 2500;
    const advanceId = window.setTimeout(() => {
      // For Mission 01 Tool B: DON'T clear localPlacement before onSelect
      // This prevents the tool from disappearing before it's added to placedProps
      if (!isMission01ToolB) {
        setLocalPlacement(null);
      }
      setJustPlaced(null);
      setLockPulseKey(null);
      // SIMPLIFIED: Just pass the option without fixedPlacement - anchor map is source of truth
      onSelect(mission.mission_id, variant, option.holland_code as HollandCode, option);
      // Clear localPlacement AFTER onSelect has added it to placedProps (next tick)
      if (isMission01ToolB) {
        window.setTimeout(() => setLocalPlacement(null), 100);
      }
    }, advanceDelay);
    timeoutsRef.current.push(advanceId);
    
    setCarryModeTool(null);
  }, [mission.mission_id, mission.phase, mission.sequence, optionA, optionB, onSelect, hasDraggedOnce, getTargetBgForOption, PAINTED_WALLS_BG_KEY, currentBg, getTargetAnchor]);

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
    if (stageRef.current && isMobile && isPanoramic) {
      const rect = stageRef.current.getBoundingClientRect();
      const normalizedX = (e.clientX - rect.left) / rect.width;
      panApiRef.current?.updatePanFromDrag(normalizedX);
      
      // Update pan offset for placed props positioning
      if (panApiRef.current) {
        setPanOffsetX(panApiRef.current.getOffsetX());
      }
      
      // Calculate edge proximity for visual indicators (matches panning edge zone)
      const EDGE_ZONE = 0.18; // 18% from each edge - matches usePanningBackground
      if (normalizedX < EDGE_ZONE) {
        // Approaching left edge - use easeOutQuad for natural feel
        const t = 1 - (normalizedX / EDGE_ZONE);
        const intensity = t * t;
        setEdgeProximity({ edge: 'left', intensity });
      } else if (normalizedX > 1 - EDGE_ZONE) {
        // Approaching right edge - use easeOutQuad for natural feel
        const t = (normalizedX - (1 - EDGE_ZONE)) / EDGE_ZONE;
        const intensity = t * t;
        setEdgeProximity({ edge: 'right', intensity });
      } else {
        // In center zone
        setEdgeProximity({ edge: null, intensity: 0 });
      }
    }
  }, [draggingTool, isMobile, isPanoramic]);

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
    
    // Reset pan and edge indicators when drag ends
    panApiRef.current?.resetPan();
    setPanOffsetX(0);
    setEdgeProximity({ edge: null, intensity: 0 });
  }, [draggingTool, completePlacement, getTargetAnchor, mission.mission_id]);

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

  // REMOVED: isSameZone - no longer needed, anchor map is single source of truth

  // Show the current local placement AND persisted tools from previous missions
  // SIMPLIFIED: Read placement directly from anchor map (single source of truth)
  // Zone-based visibility for tools
  // Tools only persist within the same logical zone
  const getZoneForBackground = (bgKey: string): 'gallery' | 'workshop' | 'exterior' => {
    if (bgKey.includes('exterior') || bgKey.includes('park')) return 'exterior';
    if (bgKey.includes('workshop')) return 'workshop';
    return 'gallery'; // gallery, storage, entry are all "gallery" zone
  };
  
  const getZoneForMission = (missionSeq: number): 'gallery' | 'workshop' | 'exterior' | 'workshop2' => {
    // Zones per product spec (used ONLY for persisted tool visibility)
    // Gallery: Missions 1-2 (gallery scenes)
    // Workshop: Missions 3, 4, 6, 7 (original workshop - M7 CONTINUES workshop!)
    // Exterior: Mission 5 only
    // Workshop2: Missions 8, 10, 11 (duplicated workshop - separate persistence)
    // M9 and M12 are clean gallery resets - no persisted tools
    if (missionSeq <= 2) return 'gallery';
    if (missionSeq === 5) return 'exterior';
    if (missionSeq === 9 || missionSeq === 12) return 'gallery'; // Clean reset
    if (missionSeq >= 8) return 'workshop2';
    return 'workshop'; // M3, 4, 6, 7
  };

  const displayedPlacement = useMemo(() => {
    const placements: Array<{
      missionId: string;
      key: 'a' | 'b';
      assetName: string;
      hollandCode: HollandCode;
      isPersisted?: boolean;
      fixedPlacement?: {
        x: number;
        y: number;
        scale: number;
        flipX?: boolean;
        z_layer?: string;
      };
    }> = [];
    
    // Get the current mission sequence number and zone
    const currentSeq = mission.sequence;
    // CRITICAL: Calculate zone by mission sequence, NOT background key
    // This prevents tools from Mission 1 leaking into Mission 7 just because
    // their background keys both resolve to "gallery" zone
    const currentZone = getZoneForMission(currentSeq);

    // Product/UI rule: Missions 07, 09, and 12 are "clean scene" resets.
    // M7: Player chooses storage vs gallery - different room entirely
    // M9: Gallery scene - fresh start, no persisted tools
    // M12: Final mission - fresh gallery scene
    // M8, M10, M11 share the "workshop2" zone - tools persist between them
    // Do NOT render persisted tools from previous missions here.
    // (This only affects visibility; it does not modify game state.)
    const hidePersistedToolsForThisMission = mission.mission_id === 'studio_07' || mission.mission_id === 'studio_09' || mission.mission_id === 'studio_12';
    
    // Add persisted tools from previous missions based on persist flag AND zone
    if (!hidePersistedToolsForThisMission) {
      placedProps.forEach((prop) => {
        const propSeq = parseInt(prop.missionId.replace('studio_', ''), 10);
        
        // Skip if this is the current mission (tool still being placed)
        if (propSeq >= currentSeq) return;
        
        // Check zone compatibility - tools only persist in the same zone
        const toolZone = getZoneForMission(propSeq);
        if (toolZone !== currentZone) return; // Different zone = don't show
        
        // Tools with persist: 'keep' - look up from anchor map
        if (prop.persist === 'keep') {
          const anchorRef = `m${prop.missionId.replace('studio_', '').padStart(2, '0')}_tool_${prop.key}` as AnchorRef;
          const placement = getAnchorPosition(lockedBgKey, anchorRef);
          
          // Only show if anchor exists in current background
          if (placement) {
            placements.push({
              missionId: prop.missionId,
              key: prop.key,
              assetName: prop.assetName || `${prop.missionId}_${prop.key}`,
              hollandCode: prop.hollandCode,
              isPersisted: true,
              fixedPlacement: {
                x: placement.x,
                y: placement.y,
                scale: placement.scale,
                flipX: placement.flipX,
                z_layer: placement.z_layer,
              },
            });
          }
        }
      });
    }
    
    // Add current local placement (tool being placed in this mission)
    if (localPlacement) {
      placements.push({
        missionId: localPlacement.missionId,
        key: localPlacement.key as 'a' | 'b',
        assetName: localPlacement.assetName,
        hollandCode: 'r' as HollandCode, // Not used for display
        fixedPlacement: localPlacement.fixedPlacement,
      });
    }
    
    return placements;
  }, [localPlacement, placedProps, mission.sequence, lockedBgKey]);

  const targetPosition = useMemo(() => {
    if (activeToolVariant) {
      return getTargetAnchor(activeToolVariant);
    }
    return null;
  }, [activeToolVariant, getTargetAnchor]);

  // ========== NPC LOGIC REMOVED ==========
  // NPCs will be re-added after all tools are calibrated
  // Placeholder for future implementation

  // ========== RENDER ELEMENTS ==========
  // These are passed to the layout wrapper

  const backgroundElement = (
    <PannableBackground
      src={lockedBg}
      className="layout-bg"
      filter="saturate(1.18) contrast(1.08)"
      durationMs={1500}
      zIndex={0}
      enabled={isMobile && isPanoramic}
      isPanoramic={isMobile && isPanoramic}
      initialTargetX={initialPanTargetX}
      panApiRef={panApiRef}
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

  // ========== SCENE EXTRAS (Floor artworks, wall art for M07) ==========
  const sceneExtras = useSceneExtras(mission.mission_id, currentIndex, placedProps);
  
  const sceneExtrasElement = useMemo(() => {
    // Only render extras for missions that define them (currently Mission 7)
    if (sceneExtras.length === 0) return null;
    
    return (
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
        {sceneExtras.map((extra) => {
          // Get anchor position from the current background
          const anchorPos = getAnchorPosition(lockedBgKey, extra.anchorRef);
          if (!anchorPos) {
            // Fallback position if anchor not found
            console.warn(`Anchor ${extra.anchorRef} not found for background ${lockedBgKey}`);
            return null;
          }
          
          const zIndex = zIndexForAnchorLayer(extra.zLayer);
          const leftPos = anchorPos.x + extra.offsetX;
          const topPos = anchorPos.y + extra.offsetY;
          const scale = extra.scale * (anchorPos.scale || 1);
          
          return (
            <div
              key={extra.id}
              className="absolute animate-fade-in"
              style={{
                left: `${leftPos}%`,
                top: `${topPos}%`,
                transform: `translate(-50%, -100%) scale(${scale})`,
                zIndex,
              }}
            >
              <img 
                src={extra.image}
                alt=""
                className="w-32 h-32 md:w-48 md:h-48 object-contain"
                style={{
                  filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.4))',
                }}
              />
            </div>
          );
        })}
      </div>
    );
  }, [sceneExtras, lockedBgKey]);

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

    // Mission 04 Tool A: single placement using anchor map coordinates
    if (prop.missionId === 'studio_04' && prop.key === 'a') {
      const anchorPos = getAnchorPosition(lockedBgKey, 'm04_tool_a');
      if (anchorPos) {
        return [{ 
          anchor: 'm04_tool_a' as AnchorRef, 
          offsetX: 0, 
          offsetY: 0, 
          customScale: anchorPos.scale, 
          absoluteY: anchorPos.y, 
          absoluteX: anchorPos.x,
          flipX: anchorPos.flipX
        }];
      }
      // Fallback
      return [{ anchor: 'ceiling', offsetX: 0, offsetY: 0, customScale: 1.6, absoluteY: 18, absoluteX: 50 }];
    }

    // Mission 04 Tool B: single placement using anchor map coordinates
    if (prop.missionId === 'studio_04' && prop.key === 'b') {
      const anchorPos = getAnchorPosition(lockedBgKey, 'm04_tool_b');
      if (anchorPos) {
        return [{ 
          anchor: 'm04_tool_b' as AnchorRef, 
          offsetX: 0, 
          offsetY: 0, 
          customScale: anchorPos.scale, 
          absoluteY: anchorPos.y, 
          absoluteX: anchorPos.x,
          flipX: anchorPos.flipX
        }];
      }
      // Fallback
      return [{ anchor: 'floor', offsetX: 0, offsetY: 0, customScale: 1.4, absoluteY: 70, absoluteX: 58 }];
    }

    // Mission 05 Tool A: single placement using anchor map coordinates
    if (prop.missionId === 'studio_05' && prop.key === 'a') {
      const anchorPos = getAnchorPosition(lockedBgKey, 'm05_tool_a');
      if (anchorPos) {
        return [{ 
          anchor: 'm05_tool_a' as AnchorRef, 
          offsetX: 0, 
          offsetY: 0, 
          customScale: anchorPos.scale, 
          absoluteY: anchorPos.y, 
          absoluteX: anchorPos.x,
          flipX: anchorPos.flipX
        }];
      }
      // Fallback
      return [{ anchor: 'floor', offsetX: 0, offsetY: 0, customScale: 2.0, absoluteY: 32, absoluteX: 35 }];
    }

    // Mission 05 Tool B: single placement using anchor map coordinates
    if (prop.missionId === 'studio_05' && prop.key === 'b') {
      const anchorPos = getAnchorPosition(lockedBgKey, 'm05_tool_b');
      if (anchorPos) {
        return [{ 
          anchor: 'm05_tool_b' as AnchorRef, 
          offsetX: 0, 
          offsetY: 0, 
          customScale: anchorPos.scale, 
          absoluteY: anchorPos.y, 
          absoluteX: anchorPos.x,
          flipX: anchorPos.flipX
        }];
      }
      // Fallback
      return [{ anchor: 'floor', offsetX: 0, offsetY: 0, customScale: 1.7, absoluteY: 76, absoluteX: 48 }];
    }

    // Mission 06 Tool A: single placement using anchor map coordinates
    if (prop.missionId === 'studio_06' && prop.key === 'a') {
      const anchorPos = getAnchorPosition(lockedBgKey, 'm06_tool_a');
      if (anchorPos) {
        return [{ 
          anchor: 'm06_tool_a' as AnchorRef, 
          offsetX: 0, 
          offsetY: 0, 
          customScale: anchorPos.scale, 
          absoluteY: anchorPos.y, 
          absoluteX: anchorPos.x,
          flipX: anchorPos.flipX
        }];
      }
      // Fallback
      return [{ anchor: 'wall_back', offsetX: 0, offsetY: 0, customScale: 1.2, absoluteY: 45, absoluteX: 15 }];
    }

    // Mission 06 Tool B: single placement using anchor map coordinates
    if (prop.missionId === 'studio_06' && prop.key === 'b') {
      const anchorPos = getAnchorPosition(lockedBgKey, 'm06_tool_b');
      if (anchorPos) {
        return [{ 
          anchor: 'm06_tool_b' as AnchorRef, 
          offsetX: 0, 
          offsetY: 0, 
          customScale: anchorPos.scale, 
          absoluteY: anchorPos.y, 
          absoluteX: anchorPos.x,
          flipX: anchorPos.flipX
        }];
      }
      // Fallback
      return [{ anchor: 'floor', offsetX: 0, offsetY: 0, customScale: 2.6, absoluteY: 78, absoluteX: 77 }];
    }

    // Mission 07 Tool A: placed in Storage room
    if (prop.missionId === 'studio_07' && prop.key === 'a') {
      const anchorPos = getAnchorPosition('studio_in_storage_bg', 'm07_tool_a');
      if (anchorPos) {
        return [{ 
          anchor: 'm07_tool_a' as AnchorRef, 
          offsetX: 0, 
          offsetY: 0, 
          customScale: anchorPos.scale, 
          absoluteY: anchorPos.y, 
          absoluteX: anchorPos.x,
          flipX: anchorPos.flipX
        }];
      }
      // Fallback
      return [{ anchor: 'wall_back', offsetX: 0, offsetY: 0, customScale: 2.0, absoluteY: 46, absoluteX: 50 }];
    }

    // Mission 07 Tool B: placed in Gallery room
    if (prop.missionId === 'studio_07' && prop.key === 'b') {
      const anchorPos = getAnchorPosition('studio_in_gallery_bg', 'm07_tool_b');
      if (anchorPos) {
        return [{ 
          anchor: 'm07_tool_b' as AnchorRef, 
          offsetX: 0, 
          offsetY: 0, 
          customScale: anchorPos.scale, 
          absoluteY: anchorPos.y, 
          absoluteX: anchorPos.x,
          flipX: anchorPos.flipX
        }];
      }
      // Fallback
      return [{ anchor: 'wall_back', offsetX: 0, offsetY: 0, customScale: 2.0, absoluteY: 40, absoluteX: 50 }];
    }

    // Mission 08 Tool A: single placement using anchor map coordinates
    if (prop.missionId === 'studio_08' && prop.key === 'a') {
      const anchorPos = getAnchorPosition(lockedBgKey, 'm08_tool_a');
      if (anchorPos) {
        return [{ 
          anchor: 'm08_tool_a' as AnchorRef, 
          offsetX: 0, 
          offsetY: 0, 
          customScale: anchorPos.scale, 
          absoluteY: anchorPos.y, 
          absoluteX: anchorPos.x,
          flipX: anchorPos.flipX
        }];
      }
    }

    // Mission 08 Tool B: single placement using anchor map coordinates
    if (prop.missionId === 'studio_08' && prop.key === 'b') {
      const anchorPos = getAnchorPosition(lockedBgKey, 'm08_tool_b');
      if (anchorPos) {
        return [{ 
          anchor: 'm08_tool_b' as AnchorRef, 
          offsetX: 0, 
          offsetY: 0, 
          customScale: anchorPos.scale, 
          absoluteY: anchorPos.y, 
          absoluteX: anchorPos.x,
          flipX: anchorPos.flipX
        }];
      }
    }

    // Mission 09 Tool A: single placement using anchor map coordinates
    if (prop.missionId === 'studio_09' && prop.key === 'a') {
      const anchorPos = getAnchorPosition('gallery_main_stylized', 'm09_tool_a');
      if (anchorPos) {
        return [{ 
          anchor: 'm09_tool_a' as AnchorRef, 
          offsetX: 0, 
          offsetY: 0, 
          customScale: anchorPos.scale, 
          absoluteY: anchorPos.y, 
          absoluteX: anchorPos.x,
          flipX: anchorPos.flipX
        }];
      }
    }

    // Mission 09 Tool B: single placement using anchor map coordinates
    if (prop.missionId === 'studio_09' && prop.key === 'b') {
      const anchorPos = getAnchorPosition('gallery_main_stylized', 'm09_tool_b');
      if (anchorPos) {
        return [{ 
          anchor: 'm09_tool_b' as AnchorRef, 
          offsetX: 0, 
          offsetY: 0, 
          customScale: anchorPos.scale, 
          absoluteY: anchorPos.y, 
          absoluteX: anchorPos.x,
          flipX: anchorPos.flipX
        }];
      }
    }

    // Mission 10 Tool A: single placement using anchor map coordinates
    if (prop.missionId === 'studio_10' && prop.key === 'a') {
      const anchorPos = getAnchorPosition('studio_in_workshop_bg', 'm10_tool_a');
      if (anchorPos) {
        return [{ 
          anchor: 'm10_tool_a' as AnchorRef, 
          offsetX: 0, 
          offsetY: 0, 
          customScale: anchorPos.scale, 
          absoluteY: anchorPos.y, 
          absoluteX: anchorPos.x,
          flipX: anchorPos.flipX
        }];
      }
    }

    // Mission 10 Tool B: single placement using anchor map coordinates
    if (prop.missionId === 'studio_10' && prop.key === 'b') {
      const anchorPos = getAnchorPosition('studio_in_workshop_bg', 'm10_tool_b');
      if (anchorPos) {
        return [{ 
          anchor: 'm10_tool_b' as AnchorRef, 
          offsetX: 0, 
          offsetY: 0, 
          customScale: anchorPos.scale, 
          absoluteY: anchorPos.y, 
          absoluteX: anchorPos.x,
          flipX: anchorPos.flipX
        }];
      }
    }

    // Mission 11 Tool A: single placement using anchor map coordinates
    if (prop.missionId === 'studio_11' && prop.key === 'a') {
      const anchorPos = getAnchorPosition('studio_in_workshop_bg', 'm11_tool_a');
      if (anchorPos) {
        return [{ 
          anchor: 'm11_tool_a' as AnchorRef, 
          offsetX: 0, 
          offsetY: 0, 
          customScale: anchorPos.scale, 
          absoluteY: anchorPos.y, 
          absoluteX: anchorPos.x,
          flipX: anchorPos.flipX
        }];
      }
    }

    // Mission 11 Tool B: single placement using anchor map coordinates
    if (prop.missionId === 'studio_11' && prop.key === 'b') {
      const anchorPos = getAnchorPosition('studio_in_workshop_bg', 'm11_tool_b');
      if (anchorPos) {
        return [{ 
          anchor: 'm11_tool_b' as AnchorRef, 
          offsetX: 0, 
          offsetY: 0, 
          customScale: anchorPos.scale, 
          absoluteY: anchorPos.y, 
          absoluteX: anchorPos.x,
          flipX: anchorPos.flipX
        }];
      }
    }

    // Mission 12 Tool A: single placement using anchor map coordinates
    if (prop.missionId === 'studio_12' && prop.key === 'a') {
      const anchorPos = getAnchorPosition('gallery_main_stylized', 'm12_tool_a');
      if (anchorPos) {
        return [{ 
          anchor: 'm12_tool_a' as AnchorRef, 
          offsetX: 0, 
          offsetY: 0, 
          customScale: anchorPos.scale, 
          absoluteY: anchorPos.y, 
          absoluteX: anchorPos.x,
          flipX: anchorPos.flipX
        }];
      }
    }

    // Mission 12 Tool B: single placement using anchor map coordinates
    if (prop.missionId === 'studio_12' && prop.key === 'b') {
      const anchorPos = getAnchorPosition('gallery_main_stylized', 'm12_tool_b');
      if (anchorPos) {
        return [{ 
          anchor: 'm12_tool_b' as AnchorRef, 
          offsetX: 0, 
          offsetY: 0, 
          customScale: anchorPos.scale, 
          absoluteY: anchorPos.y, 
          absoluteX: anchorPos.x,
          flipX: anchorPos.flipX
        }];
      }
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
        const isLocalCurrentMissionPlacement = prop.missionId === mission.mission_id;
        
        // USE FIXED PLACEMENT FOR PERSISTED TOOLS
        // This ensures tools stay exactly where they were placed, not recalculated
        // No more duplication patterns - all missions use single placement from anchor map
        const hasDuplicationPattern = false;

        // Mission 10: LOCAL placement should use fixedPlacement immediately (snap-now)
        if (!isPersisted && isLocalCurrentMissionPlacement && prop.fixedPlacement && !hasDuplicationPattern) {
          const fixed = prop.fixedPlacement;
          const zIndex = zIndexForAnchorLayer(fixed.z_layer);
          const transformStyle = `translate(-50%, -100%) scale(${fixed.scale})`;

          return [(
            <div
              key={`${prop.missionId}-${propIdx}-local-fixed`}
              className={`absolute pointer-events-none ${
                isMission01ToolB
                  ? 'animate-tool-appear'
                  : (isJustPlaced ? 'animate-snap-pop-blink' : 'animate-snap-place')
              }`}
              style={{
                left: `${fixed.x}%`,
                top: `${fixed.y}%`,
                transform: transformStyle,
                zIndex,
              }}
            >
              <img
                src={toolImg}
                alt=""
                className={`${isMission01ToolB || isMission02ToolB ? 'w-32 h-32 md:w-40 md:h-40' : 'w-24 h-24 md:w-32 md:h-32'} object-contain ${lockPulseKey === `${prop.missionId}-${prop.key}` ? 'tool-lock-confirm' : ''}`}
                style={{
                  filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))',
                  transform: fixed.flipX ? 'scaleX(-1)' : undefined,
                }}
              />
            </div>
          )];
        }
        
        if (isPersisted && prop.fixedPlacement && !hasDuplicationPattern) {
          const fixed = prop.fixedPlacement;
          // SIMPLIFIED: Use z_layer from anchor map for proper z-indexing
          const zIndex = zIndexForAnchorLayer(fixed.z_layer);
          const transformStyle = `translate(-50%, -100%) scale(${fixed.scale})`;
          
          return [(
            <div
              key={`${prop.missionId}-${propIdx}-fixed`}
              className="absolute pointer-events-none"
              style={{
                left: `${fixed.x}%`,
                top: `${fixed.y}%`,
                transform: transformStyle,
                zIndex,
                // Persisted tools should always be visible - no fade effect
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
                // Persisted tools should always be visible - no fade effect
              }}
            >
              <img 
                src={toolImg}
                alt=""
                className={`${isMission01Buckets ? 'w-28 h-28 md:w-36 md:h-36' : (isMission01ToolB || isMission02ToolB ? 'w-32 h-32 md:w-40 md:h-40' : 'w-24 h-24 md:w-32 md:h-32')} object-contain ${lockPulseKey === `${prop.missionId}-${prop.key}` ? 'tool-lock-confirm' : ''}`}
                   style={{
                   filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))',
                   // Only apply flipX from anchor map - no rotation
                   transform: anchorInfo.flipX ? 'scaleX(-1)' : undefined,
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

  // Get mission number for display (1-12 for main, 13 for tie-breaker)
  const missionDisplayNumber = useMemo(() => {
    if (mission.phase === 'main') {
      return mission.sequence;
    }
    // Tie-breaker missions always show as mission 13
    return 13;
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
      <SpeechBubble 
        tailDirection="right"
        missionKey={mission.mission_id}
      >
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

  // ========== NPC EDITOR REMOVED ==========
  // NPCs will be re-added after all tools are calibrated
  const editorNpcs: never[] = [];

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

  // Z-Layer debug items - simplified without NPCs
  const zLayerItems = useMemo((): ZLayerItem[] => {
    const items: ZLayerItem[] = [];
    
    // Add placed tools with their z-layer info
    displayedPlacement.forEach((prop) => {
      const anchorRef = `m${prop.missionId.replace('studio_', '').padStart(2, '0')}_tool_${prop.key}` as AnchorRef;
      const anchorPos = getAnchorPosition(lockedBgKey, anchorRef);
      const zLayer = anchorPos?.z_layer || 'mid';
      
      items.push({
        id: `tool-${prop.missionId}-${prop.key}`,
        type: 'tool',
        label: `${prop.missionId.replace('studio_', 'M')} ${prop.key.toUpperCase()}`,
        zLayer: zLayer as 'back' | 'mid' | 'front',
        zIndex: zIndexForAnchorLayer(zLayer),
        x: anchorPos?.x ?? 50,
        y: anchorPos?.y ?? 70,
      });
    });
    
    // Add avatar
    items.push({
      id: 'avatar',
      type: 'avatar',
      label: 'Avatar',
      zLayer: 'front',
      zIndex: 20,
      x: isMobile ? 75 : 85,
      y: isMobile ? 75 : 80,
    });
    
    return items;
  }, [displayedPlacement, lockedBgKey, isMobile]);

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
        edgePanIndicators={
          isMobile && isPanoramic && draggingTool ? (
            <EdgePanIndicators 
              activeEdge={edgeProximity.edge} 
              intensity={edgeProximity.intensity} 
            />
          ) : null
        }
        isCarryMode={!!carryModeTool}
        isDragging={!!draggingTool}
        onCancelCarry={handleCancelCarry}
        panOffsetX={panOffsetX}
        isPanoramic={isPanoramic}
      />
      
      {/* Water leak effect for Mission 9 */}
      {mission.mission_id === 'studio_09' && <WaterLeakEffect />}
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
      <ZLayerDebugOverlay
        items={zLayerItems}
        isVisible={showZLayerOverlay}
        onToggle={() => setShowZLayerOverlay(!showZLayerOverlay)}
      />
      
      {/* Tool Calibration Editor */}
      {toolEditMode && mission.mission_id === 'studio_07' && (
        <Mission7CalibrationEditor
          mission={mission}
          onBackgroundChange={handleM7BackgroundChange}
        />
      )}
      {toolEditMode && mission.mission_id === 'studio_11' && (
        <Mission11CalibrationEditor
          mission={mission}
          onBackgroundChange={handleM7BackgroundChange}
        />
      )}
      {toolEditMode && mission.mission_id !== 'studio_07' && mission.mission_id !== 'studio_11' && (
        <ToolCalibrationEditor
          mission={mission}
          currentBgKey={lockedBgKey}
          onNextMission={onEditorNextMission}
          sceneExtras={sceneExtras}
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

const DraggableToolTile = forwardRef<HTMLDivElement, DraggableToolTileProps>(function DraggableToolTile({ 
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
}: DraggableToolTileProps, ref) {
  return (
    <div
      ref={ref}
      className={`relative ${isDragging ? 'opacity-40' : ''} ${isCarryMode ? 'carry-mode-active' : ''}`}
    >
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
});
