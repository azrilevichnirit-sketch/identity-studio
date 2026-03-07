import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import type { Mission, HollandCode, AvatarGender, PickRecord, MissionOption, AnchorRef } from '@/types/identity';
import { getToolImage, getBackgroundForMission, getAvatarImage, getBackgroundKey, getBackgroundByName, getPanoramicBackground, getMobilePortraitBackground, preloadBackground, preloadAllBackgrounds } from '@/lib/assetUtils';
import { panOffsetToDropCompensation, panOffsetToTranslatePercent } from '@/lib/pan';
import { getAnchorPosition as _getAnchorPosition } from '@/lib/jsonDataLoader';
import { SpeechBubble } from './SpeechBubble';
import { Info } from 'lucide-react';
import { UndoConfirmPopover } from './UndoConfirmDialog';
import { ProgressTank } from './ProgressTank';
// DragHint removed - click-to-place mode
import { useSceneExtras } from '@/hooks/useSceneExtras';
import { MissionLayout } from './layouts/MissionLayout';
import type { PanningApi } from './PannableBackground';
import { PannableBackground } from './PannableBackground';
import { useIsMobile } from '@/hooks/use-mobile';
// BackgroundCrossfade is used inside PannableBackground
import { EdgePanIndicators } from './EdgePanIndicators';
import { DropTargetIndicator } from './DropTargetIndicator';
import { AnchorDebugOverlay } from './AnchorDebugOverlay';
import { GridDebugOverlay } from './GridDebugOverlay';
import { ZLayerDebugOverlay, type ZLayerItem, LAYER_ZINDEX } from './ZLayerDebugOverlay';
import { ToolCalibrationEditor } from './ToolCalibrationEditor';
import { Mission7CalibrationEditor } from './Mission7CalibrationEditor';
import { Mission11CalibrationEditor } from './Mission11CalibrationEditor';
import { BranchingCalibrationEditor } from './BranchingCalibrationEditor';
import { VisitorCalibrationEditor } from './VisitorCalibrationEditor';
import { WaterLeakEffect } from './WaterLeakEffect';

// Mission 8 visitor imports
import visitorM08_01 from '@/assets/avatars/studio_visitor_m08_01.png';
import visitorM08_02 from '@/assets/avatars/studio_visitor_m08_02.png';
import visitorM08_03 from '@/assets/avatars/studio_visitor_m08_03.png';
// Mission 5 visitor imports
import visitorM05_01 from '@/assets/avatars/studio_visitor_m05_01.png';
import visitorM05_02 from '@/assets/avatars/studio_visitor_m05_02.png';
import visitorM05_03 from '@/assets/avatars/studio_visitor_m05_03.png';
// Mission 3 visitor imports
import visitorM03_01 from '@/assets/extras/m03_visitor_01.webp';
import visitorM03_02 from '@/assets/extras/m03_visitor_02.webp';
import visitorM03_03 from '@/assets/extras/m03_visitor_03.webp';
import visitorM03_04 from '@/assets/extras/m03_visitor_04.webp';
// Mission 10 staff character imports
import femaleStaffSittingImg from '@/assets/extras/studio_female_staff_sitting.webp';
import femaleStaffStandingImg from '@/assets/extras/studio_female_staff_standing.webp';
// Mission 11 Tool B crowd asset
import m11CrowdAsset from '@/assets/extras/studio_extra_asset_07.webp';
// Mission 6 rack prop
import m06RackImg from '@/assets/extras/studio_extra_asset_05.webp';
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
  // Ref to prevent immediate cancel after entering carry mode (click fires after pointerup)
  const carryModeJustSetRef = useRef(false);
  const [showToolSwapCue, setShowToolSwapCue] = useState(false);
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);
  const [showGridOverlay, setShowGridOverlay] = useState(false);
  const [showZLayerOverlay, setShowZLayerOverlay] = useState(false);
  // Mobile: temporarily hide tool panel after placement so the placed tool is visible
  const [suppressToolPanel, setSuppressToolPanel] = useState(false);
  
  // Edge proximity for mobile pan indicators
  const [edgeProximity, setEdgeProximity] = useState<{ edge: 'left' | 'right' | null; intensity: number }>({ edge: null, intensity: 0 });

  // Track background transitions - hide persisted tools during crossfade
  const [isBackgroundTransitioning, setIsBackgroundTransitioning] = useState(false);
  const previousBgKeyRef = useRef<string | null>(null);
  
  // Calibration editor overrides for scene extras (position/scale)
  const [extraOverrides, setExtraOverrides] = useState<Record<string, { x: number; y: number; scale: number }>>({});
  
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

  // Local background override for short beats (e.g. M01 painted walls, M07 destination lock).
  // IMPORTANT: scope to missionId to prevent one-mission overrides from leaking into the next
  // and accidentally becoming the "previous" layer in BackgroundCrossfade.
  const [localBgOverride, setLocalBgOverride] = useState<{ key: string; image: string; missionId: string } | null>(null);

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
  const isStagePanningRef = useRef(false);

  // Keep latest pan offset WITHOUT triggering React re-renders.
  const panOffsetXRef = useRef(0);
  const panSyncRafRef = useRef<number | null>(null);
  
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
    preloadAllBackgrounds();
    // Preload all avatar images so they appear instantly in the speech bubble
    const avatarImg = getAvatarImage(avatarGender, 'idle');
    if (avatarImg) {
      const img = new Image();
      img.src = avatarImg;
    }
  }, [avatarGender]);

  // Mission 10: prewarm M10 result AND M11 starting backgrounds
  // so both transitions (M10 pick → M10 result, M10 result → M11 start) are instant.
  useEffect(() => {
    if (mission.mission_id === 'studio_10') {
      preloadBackground('gallery_mission10a_bg');
      preloadBackground('gallery_mission10b_bg');
      preloadBackground('gallery_mission11a_bg');
      preloadBackground('gallery_mission11b_bg');
    }
    if (mission.mission_id === 'studio_13' || mission.mission_id === 'studio_12') {
      preloadBackground('gallery_mission13a_bg');
      preloadBackground('gallery_mission13b_bg');
      preloadBackground('gallery_mission13a_mobile_bg');
      preloadBackground('gallery_mission13b_mobile_bg');
    }
    if (mission.mission_id === 'studio_15' || mission.mission_id === 'studio_14') {
      preloadBackground('gallery_mission15a_bg');
      preloadBackground('gallery_mission15b_bg');
      preloadBackground('gallery_mission15_mobile_bg');
      preloadBackground('gallery_mission15a_mobile_bg');
      preloadBackground('gallery_mission15b_mobile_bg');
      preloadBackground('gallery_mission14a_desk_bg');
      preloadBackground('gallery_mission14b_desk_bg');
      preloadBackground('gallery_mission14_mobile_bg');
      preloadBackground('gallery_mission14a_mobile_bg');
      preloadBackground('gallery_mission14b_mobile_bg');
    }
    // Preload tie-breaker T14 baked backgrounds
    if (mission.mission_id === 'studio_tie_14' || mission.mission_id === 'studio_tie_13') {
      preloadBackground('gallery_tie14_desk_bg');
      preloadBackground('gallery_tie14a_desk_bg');
      preloadBackground('gallery_tie14b_desk_bg');
      preloadBackground('gallery_tie14_mobile_bg');
      preloadBackground('gallery_tie14a_mobile_bg');
      preloadBackground('gallery_tie14b_mobile_bg');
    }
    // Preload tie-breaker T15 baked backgrounds
    if (mission.mission_id === 'studio_tie_15' || mission.mission_id === 'studio_tie_14') {
      preloadBackground('gallery_tie15_desk_bg');
      preloadBackground('gallery_tie15a_desk_bg');
      preloadBackground('gallery_tie15b_desk_bg');
      preloadBackground('gallery_tie15_mobile_bg');
      preloadBackground('gallery_tie15a_mobile_bg');
      preloadBackground('gallery_tie15b_mobile_bg');
    }
  }, [mission.mission_id]);

  // Track if we're transitioning from Mission 7 (need to preserve bg during fixation)
  const m7TransitionRef = useRef<{ active: boolean; bgKey: string | null }>({ active: false, bgKey: null });
  
  // Clear any staged background override whenever the mission changes.
  // (Otherwise, a previous mission's bg beat can leak into the next mission.)
  // EXCEPTION: Mission 7 transition - we preserve the target bg until fixation completes
  useEffect(() => {
    // Reset mobile UI suppression on mission change
    setSuppressToolPanel(false);

    // Clear any pending timing callbacks from previous mission
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];

    // Clear transient placement/animation state to prevent cross-mission ghost renders
    setLocalPlacement(null);
    setJustPlaced(null);
    setLockPulseKey(null);

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
  // - Mission 09: Doorway park view (like M06)
  // TIE-BREAKER BACKGROUND: Always use the LAST main game background (gallery_main_stylized)
  // This is the background from Mission 12 - the final stylized gallery scene
  const TIE_BREAKER_BG_KEY = 'gallery_main_stylized';
  
  const previousBgOverride = useMemo(() => {
    // TIE-BREAKER MISSIONS: All T1-T15 use platform-aware baked base backgrounds
    if (mission.phase === 'tb') {
      const tieNum = mission.mission_id.replace('studio_tie_', '');
      const paddedNum = tieNum.padStart(2, '0');
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 821;
      const platformKey = isDesktop ? `gallery_tie${paddedNum}_desk_bg` : `gallery_tie${paddedNum}_mobile_bg`;
      const platformImage = getBackgroundByName(platformKey);
      if (platformImage) {
        return platformKey;
      }
      // Fallback to raw bg_override if baked not found
      if (mission.bg_override) {
        return mission.bg_override;
      }
      return TIE_BREAKER_BG_KEY;
    }
    
    // Mission 01: ALWAYS start with cracked walls
    // Mobile: use dedicated portrait baked background
    if (mission.phase === 'main' && mission.mission_id === 'studio_01') {
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 821;
      return isDesktop ? 'gallery_main_stylized_v3' : 'gallery_mission1_mobile_bg';
    }
    
    // Mission 02: boxes/moving scene
    if (mission.phase === 'main' && (mission.mission_id === 'studio_02' || mission.sequence === 2)) {
      return 'gallery_main_boxes_v1';
    }
    
    // Mission 04: dedicated background
    if (mission.phase === 'main' && mission.mission_id === 'studio_04') {
      return 'gallery_mission4_bg';
    }
    
    // Exterior missions (view: "out") - Mission 05 ONLY
    // Mission 11 continues in workshop despite having view: "out" in data
    if (mission.phase === 'main' && mission.view === 'out' && mission.mission_id !== 'studio_11') {
      return 'studio_exterior_bg';
    }
    
    // Mission 11: starts on M10 result (10a/10b), then switches to M11 result (11a/11b) right after pick.
    if (mission.phase === 'main' && mission.mission_id === 'studio_11') {
      const m11LocalPick = localPlacement?.missionId === 'studio_11' ? localPlacement.key : null;
      if (m11LocalPick === 'a') {
        const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 821;
        if (isDesktop) {
          return avatarGender === 'female' ? 'gallery_mission11a_f_desk_bg' : 'gallery_mission11a_m_desk_bg';
        }
        return avatarGender === 'female' ? 'gallery_mission11a_f_mobile_bg' : 'gallery_mission11a_m_mobile_bg';
      }
      if (m11LocalPick === 'b') {
        const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 821;
        return isDesktop ? 'gallery_mission11b_bg' : 'gallery_mission11b_mobile_bg';
      }

      const m10Pick = placedProps.find(p => p.missionId === 'studio_10');
      if (m10Pick?.key === 'a') return 'gallery_mission10a_bg';
      if (m10Pick?.key === 'b') return 'gallery_mission10b_bg';
      return 'gallery_mission10a_bg'; // fallback
    }
    
    // Mission 07: use mission-defined background (entrance view) as base scene.
    if (mission.phase === 'main' && mission.mission_id === 'studio_07') {
      return mission.bg_override || 'studio_in_entrance_view_bg';
    }
    
    // Mission 09: Doorway park view
    if (mission.phase === 'main' && mission.mission_id === 'studio_09') {
      return 'studio_doorway_park_view_bg';
    }
    
    // Missions 12, 13, 15: Use main studio (gallery_main_stylized)
    if (mission.phase === 'main' && mission.mission_id === 'studio_12') {
      return 'gallery_main_desktop';
    }
    if (mission.phase === 'main' && mission.mission_id === 'studio_13') {
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 821;
      return isDesktop ? 'gallery_main_stylized' : 'gallery_mission13_mobile_bg';
    }
    if (mission.phase === 'main' && mission.mission_id === 'studio_15') {
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 821;
      return isDesktop ? 'gallery_main_stylized' : 'gallery_mission15_mobile_bg';
    }
    
    // Mission 14: Storage room (mobile uses dedicated portrait bg)
    if (mission.phase === 'main' && mission.mission_id === 'studio_14') {
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 821;
      return isDesktop ? 'studio_in_storage_bg' : 'gallery_mission14_mobile_bg';
    }
    
    // Mission 08: Dedicated gallery background
    if (mission.phase === 'main' && mission.mission_id === 'studio_08') {
      return 'gallery_mission8_bg';
    }
    
    // Mission 10: Dedicated workshop background
    if (mission.phase === 'main' && mission.mission_id === 'studio_10') {
      return 'gallery_mission10_bg';
    }
    
    // Mission 03+ (except exterior, M07, M09, M10): use bg_override from quest data or fallback to workshop
    if (mission.phase === 'main' && (mission.mission_id === 'studio_03' || mission.sequence >= 3)) {
      return mission.bg_override || 'studio_in_workshop_bg';
    }

    return undefined;
  }, [mission.phase, mission.sequence, mission.mission_id, mission.view, mission.bg_override, hasPaintedWalls, toolEditMode, placedProps, localPlacement]);

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
  const [isPortraitOrientation, setIsPortraitOrientation] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerHeight >= window.innerWidth;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const portraitMql = window.matchMedia('(orientation: portrait)');
    const updateOrientation = () => {
      setIsPortraitOrientation(portraitMql.matches);
    };

    portraitMql.addEventListener('change', updateOrientation);
    window.addEventListener('resize', updateOrientation);
    updateOrientation();

    return () => {
      portraitMql.removeEventListener('change', updateOrientation);
      window.removeEventListener('resize', updateOrientation);
    };
  }, []);
  
  // Mobile-aware anchor lookup: automatically checks for _mobile overrides on mobile devices.
  // Desktop is completely unaffected — this wrapper only adds the isMobile flag.
  const getAnchorPosition = useCallback((bgKey: string, anchorRef: AnchorRef) => {
    return _getAnchorPosition(bgKey, anchorRef, { isMobile });
  }, [isMobile]);
  // Product rule: Mission 02 uses white walls ONLY if Tool A was chosen in Mission 01.
  // If Tool B was chosen, keep the cracked walls background.
  // Exterior missions (view: "out") use exterior background.
  // Guardrail: lock by mission_id too (in case sequence is inconsistent).
  const isWhiteWallsLocked = false;
  const isBoxesBgLocked =
    mission.phase === 'main' && (mission.mission_id === 'studio_02' || mission.sequence === 2);
  const isMission4BgLocked =
    mission.phase === 'main' && mission.mission_id === 'studio_04';
  const isMission6BgLocked =
    mission.phase === 'main' && mission.mission_id === 'studio_06';
  const isMission8BgLocked =
    mission.phase === 'main' && mission.mission_id === 'studio_08';
  const isMission9BgLocked =
    mission.phase === 'main' && mission.mission_id === 'studio_09';
  const isCrackedWallsLocked =
    mission.phase === 'main' && mission.mission_id === 'studio_01';
  const isExteriorLocked =
    mission.phase === 'main' && mission.view === 'out' && mission.mission_id !== 'studio_11';
  // Missions with explicit bg_override that are NOT workshop: M06 (doorway), M09/M12 (gallery), tie-breakers
  const isGalleryMission = ((mission.mission_id === 'studio_09' || mission.mission_id === 'studio_12' || mission.mission_id === 'studio_13' || mission.mission_id === 'studio_15') && mission.bg_override) || mission.mission_id === 'studio_14' || mission.phase === 'tb';
  const isTieBreakerLocked = mission.phase === 'tb' && !toolEditMode;
  const isMission10BgLocked =
    mission.phase === 'main' && mission.mission_id === 'studio_10';
  const isMission11BgLocked =
    mission.phase === 'main' && mission.mission_id === 'studio_11';
  const isMission12BgLocked =
    mission.phase === 'main' && mission.mission_id === 'studio_12';
  const isMission13BgLocked =
    mission.phase === 'main' && mission.mission_id === 'studio_13';
  const isMission14BgLocked =
    mission.phase === 'main' && mission.mission_id === 'studio_14';
  const isMission15BgLocked =
    mission.phase === 'main' && mission.mission_id === 'studio_15';
  const isWorkshopLocked =
    mission.phase === 'main' &&
    ((mission.mission_id === 'studio_03' || mission.sequence >= 3) && !isExteriorLocked && !isGalleryMission && !isMission4BgLocked && !isMission6BgLocked && !isMission8BgLocked && !isMission9BgLocked && !isMission10BgLocked && !isMission11BgLocked && !isMission12BgLocked && !isMission13BgLocked && !isMission14BgLocked && !isMission15BgLocked) &&
    (!mission.bg_override || mission.bg_override === 'studio_in_workshop_bg');

  const taskText = mission.task_heb || `MISSING: task_heb`;

  // Get the target background for a tool option
  const getTargetBgForOption = useCallback((option: MissionOption) => {
    // TIE-BREAKER MISSIONS: use next_bg_override if present (baked backgrounds)
    if (mission.phase === 'tb') {
      if (option.next_bg_override) {
        // Resolve to platform-aware variant (desk/mobile suffix)
        const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 821;
        const baseName = option.next_bg_override.replace(/_bg$/, '');
        const platformKey = isDesktop ? `${baseName}_desk_bg` : `${baseName}_mobile_bg`;
        const platformImage = getBackgroundByName(platformKey);
        if (platformImage) {
          return { key: platformKey, image: platformImage };
        }
        // Fallback to the raw key
        const rawImage = getBackgroundByName(option.next_bg_override);
        if (rawImage) {
          return { key: option.next_bg_override, image: rawImage };
        }
      }
      const lockedKey = mission.bg_override || currentBgKey;
      const lockedImage = getBackgroundByName(lockedKey) || currentBg;
      return { key: lockedKey, image: lockedImage };
    }
    // Mission 02: Use bg_override from quest data
    if (mission.phase === 'main' && (mission.mission_id === 'studio_02' || mission.sequence === 2)) {
      const lockedKey = mission.bg_override || PAINTED_WALLS_BG_KEY;
      const lockedImage = getBackgroundByName(lockedKey) || currentBg;
      return { key: lockedKey, image: lockedImage };
    }
    // Exterior missions (except M11 which has tool-specific backgrounds)
    if (mission.phase === 'main' && mission.view === 'out' && mission.mission_id !== 'studio_11' && mission.mission_id !== 'studio_05') {
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
    // Mission 10/11: Tool-specific backgrounds are data-driven via next_bg_override
    // (prevents hardcoded mismatches and visual jumps between missions)
    if (mission.mission_id === 'studio_10' || mission.mission_id === 'studio_11' || mission.mission_id === 'studio_13' || mission.mission_id === 'studio_15') {
      const targetBgKey = option.next_bg_override || mission.bg_override || currentBgKey;
      const targetBgImage = getBackgroundByName(targetBgKey) || currentBg;
      return { key: targetBgKey, image: targetBgImage };
    }
    // Workshop missions (M03+, except M07, exterior, M09, M12, or missions with non-workshop bg_override)
    if (mission.phase === 'main' && (mission.mission_id === 'studio_03' || mission.sequence >= 3) && mission.mission_id !== 'studio_07' && mission.mission_id !== 'studio_10' && !isGalleryMission && (!mission.bg_override || mission.bg_override === 'studio_in_workshop_bg')) {
      const lockedKey = 'studio_in_workshop_bg';
      const lockedImage = getBackgroundByName(lockedKey) || currentBg;
      return { key: lockedKey, image: lockedImage };
    }
    // Missions with explicit bg_override: use it
    if (mission.phase === 'main' && mission.bg_override) {
      const lockedKey = mission.bg_override;
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

    // Mission 10: SHOW background preview during drag (tool-specific bg!)
    if (mission.mission_id === 'studio_10') {
      const option = activeToolVariant === 'a' ? optionA : optionB;
      const target = getTargetBgForOption(option);
      if (target.key !== currentBgKey) {
        return target;
      }
      return null;
    }

    // Mission 11: SHOW background preview during drag (exterior/gallery transition!)
    if (mission.mission_id === 'studio_11') {
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

  const scopedLocalBgOverride = localBgOverride?.missionId === mission.mission_id ? localBgOverride : null;

  // In calibration mode, bypass the normal background locking
  // M07 and M11 have specialized calibration editors that must be able to switch backgrounds.
  const isM7CalibrationMode = toolEditMode && mission.mission_id === 'studio_07';
  const isM11CalibrationMode = toolEditMode && mission.mission_id === 'studio_11';
  const isCalibrationBgOverrideMode = isM7CalibrationMode || isM11CalibrationMode;

  // Priority: M7/M11 calibration > local beat > drag preview > current
  // IMPORTANT: m7CalibrationBg is ONLY used during calibration mode to prevent leaking into subsequent missions
  const scopedCalibrationBg = isCalibrationBgOverrideMode ? m7CalibrationBg : null;
  const displayBg = scopedCalibrationBg?.image || scopedLocalBgOverride?.image || dragPreviewBg?.image || currentBg;
  const displayBgKey = scopedCalibrationBg?.key || scopedLocalBgOverride?.key || dragPreviewBg?.key || currentBgKey;

  // Final guardrail: Mission 02 = white walls OR cracked walls (based on M01 choice), exterior = park, M03+ = workshop
  // BUT: M7/M11 calibration mode FULLY overrides all locks - uses m7CalibrationBg directly
  // ALSO: M7/M11 during drag/carry uses dragPreviewBg to show the destination room
  const isM7DragActive = mission.mission_id === 'studio_07' && activeToolVariant && dragPreviewBg;
  const isM10DragActive = mission.mission_id === 'studio_10' && activeToolVariant && dragPreviewBg;
  const isM11DragActive = mission.mission_id === 'studio_11' && activeToolVariant && dragPreviewBg;
  const isBgSwitchingDragActive = isM7DragActive || isM10DragActive || isM11DragActive;
  // IMPORTANT: scopedLocalBgOverride must be able to override the workshop lock.
  // This is required for Mission 7/11 post-drop “fixation” where the background
  // switches rooms and must remain there until mission advance.
  const lockedBgKey = isCalibrationBgOverrideMode && m7CalibrationBg
    ? m7CalibrationBg.key
    : isBgSwitchingDragActive
    ? dragPreviewBg.key
    : isTieBreakerLocked && scopedLocalBgOverride
    ? scopedLocalBgOverride.key // Tie-breaker per-tool bg switch (T4, T7, T8)
    : isTieBreakerLocked
    ? (previousBgOverride || mission.bg_override || TIE_BREAKER_BG_KEY)
    : isWhiteWallsLocked
    ? (mission.bg_override || PAINTED_WALLS_BG_KEY)
    : isBoxesBgLocked
    ? 'gallery_main_boxes_v1'
    : isMission4BgLocked && scopedLocalBgOverride
    ? scopedLocalBgOverride.key
    : isMission4BgLocked
    ? 'gallery_mission4_bg'
    : isMission6BgLocked && scopedLocalBgOverride
    ? scopedLocalBgOverride.key
    : isMission6BgLocked
    ? 'gallery_mission6_bg'
    : isMission8BgLocked && scopedLocalBgOverride
    ? scopedLocalBgOverride.key
    : isMission8BgLocked
    ? (isMobile ? 'gallery_mission8_bg' : 'gallery_mission8_desk_bg')
    : isMission9BgLocked && scopedLocalBgOverride
    ? scopedLocalBgOverride.key
    : isMission9BgLocked
    ? (isMobile ? 'gallery_mission9_mobile_bg' : 'studio_doorway_park_view_bg')
    : isMission10BgLocked && scopedLocalBgOverride
    ? scopedLocalBgOverride.key
    : isMission10BgLocked
    ? (isMobile ? 'gallery_mission10_mobile_bg' : 'gallery_mission10_bg')
    : isMission11BgLocked && scopedLocalBgOverride
    ? scopedLocalBgOverride.key
    : isMission11BgLocked
    ? (previousBgOverride || 'gallery_mission11a_bg')
    : isMission12BgLocked && scopedLocalBgOverride
    ? scopedLocalBgOverride.key
    : isMission12BgLocked
    ? (isMobile ? 'gallery_mission12_mobile_bg' : 'gallery_main_desktop')
    : isMission13BgLocked && scopedLocalBgOverride
    ? scopedLocalBgOverride.key
    : isMission13BgLocked
    ? (isMobile ? 'gallery_mission13_mobile_bg' : 'gallery_main_stylized')
    : isMission14BgLocked && scopedLocalBgOverride
    ? scopedLocalBgOverride.key
    : isMission14BgLocked
    ? (isMobile ? 'gallery_mission14_mobile_bg' : 'studio_in_storage_bg')
    : isMission15BgLocked && scopedLocalBgOverride
    ? scopedLocalBgOverride.key
    : isMission15BgLocked
    ? (isMobile ? 'gallery_mission15_mobile_bg' : 'gallery_main_stylized_v4')
    : isCrackedWallsLocked
    ? (mission.bg_override || 'studio_entry_inside_bg')
    : isExteriorLocked && scopedLocalBgOverride
    ? scopedLocalBgOverride.key
    : isExteriorLocked
    ? 'studio_exterior_bg'
    : scopedLocalBgOverride
    ? scopedLocalBgOverride.key
    : isWorkshopLocked && !isCalibrationBgOverrideMode
    ? 'studio_in_workshop_bg'
    : displayBgKey;

  const lockedBg = isCalibrationBgOverrideMode && m7CalibrationBg
    ? m7CalibrationBg.image
    : isBgSwitchingDragActive
    ? dragPreviewBg.image
    : isTieBreakerLocked && scopedLocalBgOverride
    ? scopedLocalBgOverride.image
    : isTieBreakerLocked
    ? (getBackgroundByName(previousBgOverride || mission.bg_override || TIE_BREAKER_BG_KEY) || displayBg)
    : isWhiteWallsLocked
    ? (getBackgroundByName(mission.bg_override || PAINTED_WALLS_BG_KEY) || displayBg)
    : isBoxesBgLocked
    ? (getBackgroundByName('gallery_main_boxes_v1') || displayBg)
    : isMission4BgLocked && scopedLocalBgOverride
    ? scopedLocalBgOverride.image
    : isMission4BgLocked
    ? (getBackgroundByName('gallery_mission4_bg') || displayBg)
    : isMission6BgLocked && scopedLocalBgOverride
    ? scopedLocalBgOverride.image
    : isMission6BgLocked
    ? (getBackgroundByName('gallery_mission6_bg') || displayBg)
    : isMission8BgLocked && scopedLocalBgOverride
    ? scopedLocalBgOverride.image
    : isMission8BgLocked
    ? (getBackgroundByName(isMobile ? 'gallery_mission8_bg' : 'gallery_mission8_desk_bg') || displayBg)
    : isMission9BgLocked && scopedLocalBgOverride
    ? scopedLocalBgOverride.image
    : isMission9BgLocked
    ? (getBackgroundByName(isMobile ? 'gallery_mission9_mobile_bg' : 'studio_doorway_park_view_bg') || displayBg)
    : isMission10BgLocked && scopedLocalBgOverride
    ? scopedLocalBgOverride.image
    : isMission10BgLocked
    ? (getBackgroundByName(isMobile ? 'gallery_mission10_mobile_bg' : 'gallery_mission10_bg') || displayBg)
    : isMission11BgLocked && scopedLocalBgOverride
    ? scopedLocalBgOverride.image
    : isMission11BgLocked
    ? (getBackgroundByName(previousBgOverride || 'gallery_mission11a_bg') || displayBg)
    : isMission12BgLocked && scopedLocalBgOverride
    ? scopedLocalBgOverride.image
    : isMission12BgLocked
    ? (getBackgroundByName(isMobile ? 'gallery_mission12_mobile_bg' : 'gallery_main_desktop') || displayBg)
    : isMission13BgLocked && scopedLocalBgOverride
    ? scopedLocalBgOverride.image
    : isMission13BgLocked
    ? (getBackgroundByName(isMobile ? 'gallery_mission13_mobile_bg' : 'gallery_main_stylized') || displayBg)
    : isMission14BgLocked && scopedLocalBgOverride
    ? scopedLocalBgOverride.image
    : isMission14BgLocked
    ? (getBackgroundByName(isMobile ? 'gallery_mission14_mobile_bg' : 'studio_in_storage_bg') || displayBg)
    : isMission15BgLocked && scopedLocalBgOverride
    ? scopedLocalBgOverride.image
    : isMission15BgLocked
    ? (getBackgroundByName(isMobile ? 'gallery_mission15_mobile_bg' : 'gallery_main_stylized_v4') || displayBg)
    : isCrackedWallsLocked
    ? (getBackgroundByName(mission.bg_override || 'studio_entry_inside_bg') || displayBg)
    : isExteriorLocked && scopedLocalBgOverride
    ? scopedLocalBgOverride.image
    : isExteriorLocked
    ? (getBackgroundByName('studio_exterior_bg') || displayBg)
    : scopedLocalBgOverride
    ? scopedLocalBgOverride.image
    : isWorkshopLocked && !isCalibrationBgOverrideMode
    ? (getBackgroundByName('studio_in_workshop_bg') || displayBg)
    : displayBg;

  // ==================== MOBILE PORTRAIT BACKGROUNDS ====================
  // If a native portrait (3072x4096) background exists for the current bg key,
  // use it directly on mobile — no panoramic panning needed.
  const mobilePortraitBg = useMemo(() => {
    if (!isMobile || !isPortraitOrientation) return null;
    return getMobilePortraitBackground(lockedBgKey);
  }, [isMobile, isPortraitOrientation, lockedBgKey]);

  const effectiveLockedBg = mobilePortraitBg || lockedBg;

  // ==================== MOBILE PANORAMIC PANNING ====================
  // IMPORTANT: panning must follow the *actual* background being shown (lockedBgKey),
  // otherwise some missions won't pan on mobile and side-wall anchors become unreachable.
  // Panoramic panning is DISABLED when a portrait background is available.
  const isPanoramic = useMemo(() => {
    if (!isMobile) return false;
    if (mobilePortraitBg) return false; // Portrait bg = no panning
    return !!getPanoramicBackground(lockedBgKey);
  }, [isMobile, lockedBgKey, mobilePortraitBg]);

  const getRenderX = useCallback((x: number) => {
    // Keep anchor coordinates in raw mission space (0-100).
    // Mobile panoramic translation is applied once via --pan-shift-x on the moving layer.
    // This preserves parity with calibration values and prevents double-offset drift.
    return x;
  }, []);

  // Deep parity sizing policy:
  // keep sprite base identical to desktop for all viewports (including <=820 and <=360)
  // so no tool/extra/avatar appears smaller than desktop calibration.
  const getSpriteBasePx = useCallback((variant: 'normal' | 'large' | 'xlarge' = 'normal') => {
    const viewportBase = 128;
    const factor = variant === 'xlarge' ? 160 / 128 : variant === 'large' ? 144 / 128 : 1;
    return Math.round(viewportBase * factor);
  }, []);

  const getSpriteTransform = useCallback((scale: number, flipX?: boolean, _category?: 'tool' | 'visitor' | 'avatar' | 'extra') => {
    return `scale(${scale})${flipX ? ' scaleX(-1)' : ''}`;
  }, []);

  // Auto-pan on mission entry toward Tool A's target (helps reveal side-wall targets)
  const initialPanTargetX = useMemo(() => {
    if (!isMobile || !isPanoramic) return undefined;

    const anchorRef = optionA.anchor_ref as AnchorRef;
    const anchorPos = getAnchorPosition(lockedBgKey, anchorRef);
    // Pan API expects RAW anchor X in 0-100 mission space.
    return anchorPos?.x ?? 50;
  }, [isMobile, isPanoramic, optionA.anchor_ref, lockedBgKey]);

  const panApiRef = useRef<PanningApi | null>(null);

  // Imperatively sync the CSS var for the content layer so tools/props follow the background.
  const syncPanCssVar = useCallback(() => {
    const offset = panApiRef.current?.getOffsetX() ?? 0;
    panOffsetXRef.current = offset;
    if (stageRef.current) {
      stageRef.current.style.setProperty('--pan-shift-x', panOffsetToTranslatePercent(offset));
    }
  }, []);

  // Sync initial pan into the CSS var (no React state) when missions change.
  useEffect(() => {
    if (!isMobile || !isPanoramic) return;
    const timer = window.setTimeout(() => {
      syncPanCssVar();
    }, 60);
    return () => window.clearTimeout(timer);
  }, [isMobile, isPanoramic, initialPanTargetX, syncPanCssVar]);

  // Cleanup any pending RAF on unmount
  useEffect(() => {
    return () => {
      if (panSyncRafRef.current) {
        window.cancelAnimationFrame(panSyncRafRef.current);
        panSyncRafRef.current = null;
      }
    };
  }, []);

  // Uses anchor_ref from quest data to look up coordinates in anchor map
   // IMPORTANT: Look up anchor in the CURRENT background (where placement happens),
   // not in next_bg_override (which is the background AFTER placement)
   const getTargetAnchor = useCallback((variant: 'a' | 'b') => {
     const option = variant === 'a' ? optionA : optionB;
     
     // Prefer mission-specific tool anchors so drag target == final placement.
     const isTie = mission.mission_id.includes('_tie_');
     const missionNum = String(mission.mission_id).replace('studio_', '').replace('tie_', '').padStart(2, '0');
     const preferredAnchorRef = (isTie ? `tie_${missionNum}_tool_${variant}` : `m${missionNum}_tool_${variant}`) as AnchorRef;
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

     // SPECIAL CASE: Mission 11 - place using the option's destination background
     if (mission.mission_id === 'studio_11') {
       const targetBgKey = option.next_bg_override || currentBgKey;
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
        : isBoxesBgLocked ? 'gallery_main_boxes_v1'
        : isMission4BgLocked ? 'gallery_mission4_bg'
        : isMission6BgLocked ? 'gallery_mission6_bg'
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
   }, [optionA, optionB, currentBgKey, isWhiteWallsLocked, isBoxesBgLocked, isMission4BgLocked, isMission6BgLocked, isCrackedWallsLocked, isExteriorLocked, isWorkshopLocked, PAINTED_WALLS_BG_KEY, mission.mission_id]);

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
  // This hides persisted tools AND mission UI during the crossfade
  const CROSSFADE_DURATION = 800; // Must match BackgroundCrossfade durationMs
  useEffect(() => {
    // Skip if this is the first render or bg hasn't changed
    if (previousBgKeyRef.current === null) {
      previousBgKeyRef.current = lockedBgKey;
      return;
    }
    
    if (previousBgKeyRef.current !== lockedBgKey) {
      // M10: same room with items appearing — skip UI hiding for seamless feel
      const isM10Transition = mission.mission_id === 'studio_10';
      if (!isM10Transition) {
        // Background is changing - hide UI during transition
        setIsBackgroundTransitioning(true);
      }
      previousBgKeyRef.current = lockedBgKey;
      
      // After crossfade completes, show the UI
      const fadeDuration = isM10Transition ? 200 : CROSSFADE_DURATION;
      const fadeTimer = window.setTimeout(() => {
        setIsBackgroundTransitioning(false);
      }, fadeDuration);
      
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
    const missionNum = missionId.includes('_tie_')
      ? missionId.replace('studio_tie_', '').padStart(2, '0')
      : missionId.replace('studio_', '').padStart(2, '0');

    const anchorRef = (missionId.includes('_tie_')
      ? `tie_${missionNum}_tool_${key}`
      : `m${missionNum}_tool_${key}`) as AnchorRef;

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
    // Keep local snap on the background currently shown to preserve calibration parity on mobile.
    // Only missions that intentionally switch background on placement should snap by target background.
    const shouldSnapLocalToAnchorNow = true;
    const targetBgForPlacement = getTargetBgForOption(option);
    const placementBgKeyForLocalSnap =
      mission.mission_id === 'studio_07' ||
      mission.mission_id === 'studio_11' ||
      (mission.phase === 'tb' && !!option.next_bg_override)
        ? targetBgForPlacement.key
        : lockedBgKey;
    const snapped = shouldSnapLocalToAnchorNow
      ? (getToolPlacementFromAnchorMap(mission.mission_id, variant, placementBgKeyForLocalSnap) ?? getTargetAnchor(variant))
      : null;
    
    // Mission 06 Tool A: spawn the prop (wood rack) FIRST, then show tool after a delay
    const isMission06ToolA = mission.mission_id === 'studio_06' && variant === 'a';
    const toolAppearDelay = isMission06ToolA ? 600 : 0;
    
    // For M06 Tool A, first set a "marker" localPlacement (no visual) to trigger the prop spawn
    // then replace it with the real placement after the delay
    if (isMission06ToolA) {
      // Set localPlacement with asset name only (for prop trigger) but hidden position
      setLocalPlacement({
        missionId: mission.mission_id,
        key: variant,
        assetName: option.asset,
        fixedPlacement: { x: -100, y: -100, scale: 0, flipX: false, z_layer: 'mid' },
      });
      const showToolId = window.setTimeout(() => {
        setLocalPlacement({
          missionId: mission.mission_id,
          key: variant,
          assetName: option.asset,
          fixedPlacement: snapped
            ? { x: snapped.x, y: snapped.y, scale: snapped.scale, flipX: snapped.flipX, z_layer: snapped.z_layer }
            : undefined,
        });
      }, toolAppearDelay);
      timeoutsRef.current.push(showToolId);
    } else {
      // M11 Tool B, M13, M15: tools are baked into their backgrounds — skip rendering the prop
      // M3 mobile: tools are baked into portrait mobile backgrounds
      const missionNum = Number(mission.mission_id.replace('studio_', ''));
      // M5 Tool A is dynamic (animated inflatable), so exclude it from desktop baked
      const isDesktopBakedMainMission =
        !isMobile && mission.phase === 'main' && missionNum >= 1 && missionNum <= 15
        && !(mission.mission_id === 'studio_05' && variant === 'a');
      const isM11BakedB = mission.mission_id === 'studio_11' && variant === 'b';
      const isM11BakedA = mission.mission_id === 'studio_11' && variant === 'a';
      const isM13Baked = mission.mission_id === 'studio_13';
      const isM15Baked = mission.mission_id === 'studio_15';
      const isM14Baked = mission.mission_id === 'studio_14';
      const isM12Baked = mission.mission_id === 'studio_12';
      const isM10Baked = mission.mission_id === 'studio_10';
      const isM1MobileBaked = mission.mission_id === 'studio_01' && isMobile;
      const isM2MobileBaked = mission.mission_id === 'studio_02' && isMobile;
      const isM3MobileBaked = mission.mission_id === 'studio_03' && isMobile;
      const isM4MobileBaked = mission.mission_id === 'studio_04' && isMobile;
      const isM5MobileBakedB = mission.mission_id === 'studio_05' && variant === 'b' && isMobile;
      const isM6MobileBaked = mission.mission_id === 'studio_06' && isMobile;
      const isM7Baked = mission.mission_id === 'studio_07';
      const isM8Baked = mission.mission_id === 'studio_08';
      const isM9MobileBaked = mission.mission_id === 'studio_09' && isMobile;
      const isTbBaked = mission.phase === 'tb' && !!option.next_bg_override;
      if (!isDesktopBakedMainMission && !isM11BakedB && !isM11BakedA && !isM13Baked && !isM15Baked && !isM14Baked && !isM12Baked && !isM10Baked && !isM1MobileBaked && !isM2MobileBaked && !isM3MobileBaked && !isM4MobileBaked && !isM5MobileBakedB && !isM6MobileBaked && !isM7Baked && !isM8Baked && !isM9MobileBaked && !isTbBaked) {
        setLocalPlacement({
          missionId: mission.mission_id,
          key: variant,
          assetName: option.asset,
          fixedPlacement: snapped
            ? { x: snapped.x, y: snapped.y, scale: snapped.scale, flipX: snapped.flipX, z_layer: snapped.z_layer }
            : undefined,
        });
      } else {
        // Still set localPlacement for background switching logic, but with no visual
        setLocalPlacement({
          missionId: mission.mission_id,
          key: variant,
          assetName: option.asset,
          fixedPlacement: { x: -999, y: -999, scale: 0, flipX: false, z_layer: 'mid' },
        });
      }
    }

    // Mobile: hide tool panel briefly so it doesn't cover the newly placed tool
    // This timer is cleared when the mission advances (line ~165)
    if (isMobile) {
      setSuppressToolPanel(true);
      // Don't set a timer - it will be cleared by the mission change effect
    }

    // Mobile panoramic: pan background to reveal the placed tool's position
    if (isMobile && isPanoramic && snapped && panApiRef.current) {
      panApiRef.current.panToPosition(snapped.x);
      // Sync the CSS var immediately so the content layer follows
      const timer = window.setTimeout(() => {
        syncPanCssVar();
      }, 60);
      timeoutsRef.current.push(timer);
    }

    // Mission 07: Lock the background to the target room IMMEDIATELY on placement
    // This keeps the tool visible on its destination room during the fixation animation
    const isMission07 = mission.mission_id === 'studio_07';
    if (isMission07) {
      if (isMobile) {
        // Mobile: switch to baked portrait background (tool + props pre-rendered)
        const m7MobileBgKey = variant === 'a' ? 'gallery_mission7a_mobile_bg' : 'gallery_mission7b_mobile_bg';
        const m7MobileBgImage = getBackgroundByName(m7MobileBgKey);
        if (m7MobileBgImage) {
          setLocalBgOverride({ key: m7MobileBgKey, image: m7MobileBgImage, missionId: mission.mission_id });
        }
      } else {
        // Desktop: switch to baked desktop background (tool + props pre-rendered)
        const m7DesktopBgKey = variant === 'a' ? 'gallery_mission7a_bg' : 'gallery_mission7b_bg';
        const m7DesktopBgImage = getBackgroundByName(m7DesktopBgKey);
        if (m7DesktopBgImage) {
          setLocalBgOverride({ key: m7DesktopBgKey, image: m7DesktopBgImage, missionId: mission.mission_id });
        } else {
          const targetBg = getTargetBgForOption(option);
          setLocalBgOverride({ ...targetBg, missionId: mission.mission_id });
        }
      }
      // Mark that we're in a M7 transition - prevents immediate bg clear on mission change
      const m7BgKey = isMobile
        ? (variant === 'a' ? 'gallery_mission7a_mobile_bg' : 'gallery_mission7b_mobile_bg')
        : (variant === 'a' ? 'gallery_mission7a_bg' : 'gallery_mission7b_bg');
      m7TransitionRef.current = { active: true, bgKey: m7BgKey };
    }

    // Mission 11: Lock the background to the tool-specific destination room on placement
    // so it does NOT snap back to the workshop before advancing to Mission 12.
    const isMission11 = mission.mission_id === 'studio_11';
    if (isMission11) {
      if (isMobile) {
        // Mobile: use gender-specific baked portrait backgrounds
        let m11MobileBgKey: string;
        if (variant === 'a') {
          m11MobileBgKey = avatarGender === 'female' ? 'gallery_mission11a_f_mobile_bg' : 'gallery_mission11a_m_mobile_bg';
        } else {
          m11MobileBgKey = 'gallery_mission11b_mobile_bg';
        }
        const m11MobileBgImage = getBackgroundByName(m11MobileBgKey);
        if (m11MobileBgImage) {
          setLocalBgOverride({ key: m11MobileBgKey, image: m11MobileBgImage, missionId: mission.mission_id });
        }
      } else if (variant === 'a') {
        // Desktop Tool A: use gender-specific baked backgrounds
        const m11DeskBgKey = avatarGender === 'female' ? 'gallery_mission11a_f_desk_bg' : 'gallery_mission11a_m_desk_bg';
        const m11DeskBgImage = getBackgroundByName(m11DeskBgKey);
        if (m11DeskBgImage) {
          setLocalBgOverride({ key: m11DeskBgKey, image: m11DeskBgImage, missionId: mission.mission_id });
        } else {
          const targetBg = getTargetBgForOption(option);
          setLocalBgOverride({ ...targetBg, missionId: mission.mission_id });
        }
      } else {
        // Desktop Tool B: use dedicated baked background
        const m11bDeskBgKey = 'gallery_mission11b_desk_bg';
        const m11bDeskBgImage = getBackgroundByName(m11bDeskBgKey);
        if (m11bDeskBgImage) {
          setLocalBgOverride({ key: m11bDeskBgKey, image: m11bDeskBgImage, missionId: mission.mission_id });
        }
      }
    }

    // Mission 10: Lock the background to the tool-specific result bg on placement
    if (mission.mission_id === 'studio_10') {
      if (isMobile) {
        const m10MobileBgKey = variant === 'a' ? 'gallery_mission10a_mobile_bg' : 'gallery_mission10b_mobile_bg';
        const m10MobileBgImage = getBackgroundByName(m10MobileBgKey);
        if (m10MobileBgImage) {
          setLocalBgOverride({ key: m10MobileBgKey, image: m10MobileBgImage, missionId: mission.mission_id });
        }
      } else {
        const m10DeskBgKey = variant === 'a' ? 'gallery_mission10a_desk_bg' : 'gallery_mission10b_desk_bg';
        const m10DeskBgImage = getBackgroundByName(m10DeskBgKey);
        if (m10DeskBgImage) {
          setLocalBgOverride({ key: m10DeskBgKey, image: m10DeskBgImage, missionId: mission.mission_id });
        }
      }
    }

    // Mission 13: Switch to baked background on tool selection (desktop and mobile)
    if (mission.mission_id === 'studio_13') {
      const m13BgKey = isMobile
        ? (variant === 'a' ? 'gallery_mission13a_mobile_bg' : 'gallery_mission13b_mobile_bg')
        : (variant === 'a' ? 'gallery_mission13a_bg' : 'gallery_mission13b_bg');
      const m13BgImage = getBackgroundByName(m13BgKey);
      if (m13BgImage) {
        setLocalBgOverride({ key: m13BgKey, image: m13BgImage, missionId: mission.mission_id });
      }
    }

    // Mission 14: Switch to baked background on tool selection (desktop and mobile)
    if (mission.mission_id === 'studio_14') {
      const m14BgKey = isMobile
        ? (variant === 'a' ? 'gallery_mission14a_mobile_bg' : 'gallery_mission14b_mobile_bg')
        : (variant === 'a' ? 'gallery_mission14a_desk_bg' : 'gallery_mission14b_desk_bg');
      const m14BgImage = getBackgroundByName(m14BgKey);
      if (m14BgImage) {
        setLocalBgOverride({ key: m14BgKey, image: m14BgImage, missionId: mission.mission_id });
      }
    }

    // Mission 15: Switch to baked background on tool selection
    if (mission.mission_id === 'studio_15') {
      const m15BgKey = isMobile
        ? (variant === 'a' ? 'gallery_mission15a_mobile_bg' : 'gallery_mission15b_mobile_bg')
        : (variant === 'a' ? 'gallery_mission15a_bg' : 'gallery_mission15b_bg');
      const m15BgImage = getBackgroundByName(m15BgKey);
      if (m15BgImage) {
        setLocalBgOverride({ key: m15BgKey, image: m15BgImage, missionId: mission.mission_id });
      }
    }

    // Tie-breaker missions with baked backgrounds (next_bg_override)
    if (mission.phase === 'tb' && option.next_bg_override) {
      const targetBg = getTargetBgForOption(option);
      if (targetBg.image) {
        setLocalBgOverride({ key: targetBg.key, image: targetBg.image, missionId: mission.mission_id });
      }
    }

    // Mission 12: Switch to baked background on tool selection (both mobile and desktop)
    if (mission.mission_id === 'studio_12') {
      const m12BgKey = isMobile
        ? (variant === 'a' ? 'gallery_mission12a_mobile_bg' : 'gallery_mission12b_mobile_bg')
        : (variant === 'a' ? 'gallery_mission12a_desk_bg' : 'gallery_mission12b_desk_bg');
      const m12BgImage = getBackgroundByName(m12BgKey);
      if (m12BgImage) {
        setLocalBgOverride({ key: m12BgKey, image: m12BgImage, missionId: mission.mission_id });
      }
    }

    // Mission 03: baked backgrounds on both mobile and desktop
    if (mission.mission_id === 'studio_03') {
      const m3BgKey = isMobile
        ? (variant === 'a' ? 'gallery_mission3a_mobile_bg' : 'gallery_mission3b_mobile_bg')
        : (variant === 'a' ? 'gallery_mission3a_desk_bg' : 'gallery_mission3b_desk_bg');
      const m3BgImage = getBackgroundByName(m3BgKey);
      if (m3BgImage) {
        setLocalBgOverride({ key: m3BgKey, image: m3BgImage, missionId: mission.mission_id });
      }
    }

    // Mission 04: baked backgrounds on both mobile and desktop
    // Tool B has gender-specific backgrounds (male/female avatar baked in)
    if (mission.mission_id === 'studio_04') {
      let m4BgKey: string;
      if (variant === 'a') {
        m4BgKey = isMobile ? 'gallery_mission4a_mobile_bg' : 'gallery_mission4a_desk_bg';
      } else {
        if (isMobile) {
          m4BgKey = avatarGender === 'female' ? 'gallery_mission4b_f_mobile_bg' : 'gallery_mission4b_m_mobile_bg';
        } else {
          m4BgKey = avatarGender === 'female' ? 'gallery_mission4b_f_desk_bg' : 'gallery_mission4b_m_desk_bg';
        }
      }
      const m4BgImage = getBackgroundByName(m4BgKey);
      if (m4BgImage) {
        setLocalBgOverride({ key: m4BgKey, image: m4BgImage, missionId: mission.mission_id });
      }
    }

    // Mission 06: baked backgrounds on both mobile and desktop
    if (mission.mission_id === 'studio_06') {
      const m6BgKey = isMobile
        ? (variant === 'a' ? 'gallery_mission6a_mobile_bg' : 'gallery_mission6b_mobile_bg')
        : (variant === 'a' ? 'gallery_mission6a_desk_bg' : 'gallery_mission6b_desk_bg');
      const m6BgImage = getBackgroundByName(m6BgKey);
      if (m6BgImage) {
        setLocalBgOverride({ key: m6BgKey, image: m6BgImage, missionId: mission.mission_id });
      }
    }

    // Mission 09: baked backgrounds on both mobile and desktop
    if (mission.mission_id === 'studio_09') {
      const m9BgKey = isMobile
        ? (variant === 'a' ? 'gallery_mission9a_mobile_bg' : 'gallery_mission9b_mobile_bg')
        : (variant === 'a' ? 'gallery_mission9a_desk_bg' : 'gallery_mission9b_desk_bg');
      const m9BgImage = getBackgroundByName(m9BgKey);
      if (m9BgImage) {
        setLocalBgOverride({ key: m9BgKey, image: m9BgImage, missionId: mission.mission_id });
      }
    }

    // Mission 01: baked backgrounds on both mobile and desktop
    if (mission.mission_id === 'studio_01') {
      const m1BgKey = isMobile
        ? (variant === 'a' ? 'gallery_mission1a_mobile_bg' : 'gallery_mission1b_mobile_bg')
        : (variant === 'a' ? 'gallery_mission1a_desk_bg' : 'gallery_mission1b_desk_bg');
      const m1BgImage = getBackgroundByName(m1BgKey);
      if (m1BgImage) {
        setLocalBgOverride({ key: m1BgKey, image: m1BgImage, missionId: mission.mission_id });
      }
    }

    // Mission 02: baked backgrounds on both mobile and desktop
    if (mission.mission_id === 'studio_02') {
      const m2BgKey = isMobile
        ? (variant === 'a' ? 'gallery_mission2a_mobile_bg' : 'gallery_mission2b_mobile_bg')
        : (variant === 'a' ? 'gallery_mission2a_desk_bg' : 'gallery_mission2b_desk_bg');
      const m2BgImage = getBackgroundByName(m2BgKey);
      if (m2BgImage) {
        setLocalBgOverride({ key: m2BgKey, image: m2BgImage, missionId: mission.mission_id });
      }
    }

    // Mission 05 Tool B: baked backgrounds on both mobile and desktop
    // (Tool A is dynamic/animated - no bg switch)
    if (mission.mission_id === 'studio_05' && variant === 'b') {
      const m5BgKey = isMobile ? 'gallery_mission5b_mobile_bg' : 'gallery_mission5b_desk_bg';
      const m5BgImage = getBackgroundByName(m5BgKey);
      if (m5BgImage) {
        setLocalBgOverride({ key: m5BgKey, image: m5BgImage, missionId: mission.mission_id });
      }
    }

    // Mission 08: baked backgrounds on both mobile and desktop (gender-specific)
    if (mission.mission_id === 'studio_08') {
      let m8BgKey: string;
      if (variant === 'a') {
        m8BgKey = isMobile
          ? (avatarGender === 'female' ? 'gallery_mission8a_f_mobile_bg' : 'gallery_mission8a_m_mobile_bg')
          : (avatarGender === 'female' ? 'gallery_mission8a_f_desk_bg' : 'gallery_mission8a_m_desk_bg');
      } else {
        m8BgKey = isMobile
          ? (avatarGender === 'female' ? 'gallery_mission8b_f_mobile_bg' : 'gallery_mission8b_m_mobile_bg')
          : (avatarGender === 'female' ? 'gallery_mission8b_f_desk_bg' : 'gallery_mission8b_m_desk_bg');
      }
      const m8BgImage = getBackgroundByName(m8BgKey);
      if (m8BgImage) {
        setLocalBgOverride({ key: m8BgKey, image: m8BgImage, missionId: mission.mission_id });
      }
    }

    if (mission.phase === 'tb' && option.next_bg_override) {
      const bgImage = getBackgroundByName(option.next_bg_override);
      if (bgImage) {
        setLocalBgOverride({ key: option.next_bg_override, image: bgImage, missionId: mission.mission_id });
      }
    }
    setJustPlaced(null);
    setLockPulseKey(null);
    const isMission01Paint = false; // M01 no longer changes background
    const isMission01ToolB = mission.mission_id === 'studio_01' && variant === 'b';

    // In Tool Edit mode we freeze progression after placement so calibration/debug
    // can inspect exact landing location without mission auto-advance.
    if (toolEditMode) {
      setJustPlaced(`${mission.mission_id}-${variant}`);
      setCarryModeTool(null);
      return;
    }
    
    // ===== TIMING SEQUENCE =====
    // Tool -> Lock pulse -> Advance to next mission
    // The player MUST see the tool placed for ~1s before advancing.
    // Mission 01 Paint:  600ms lock -> 1000ms beat -> 2200ms advance
    // Mission 01 Tool B: 200ms lock -> 1600ms advance
    // Mission 02:        80ms lock -> 1600ms advance 
    // Mission 07/11:     80ms lock -> 2200ms advance (bg fixation)
    // Mission 08 B:     80ms lock -> 2900ms advance (visitors appear + viewing)
    // Regular:           80ms lock -> 1400ms advance (visible ~1.3s)
    // ===============================================
    
    const lockDelayMs = isMission01Paint ? 600 : (isMission01ToolB ? 200 : 80);
    const lockOnId = window.setTimeout(() => {
      setJustPlaced(`${mission.mission_id}-${variant}`);
      setLockPulseKey(`${mission.mission_id}-${variant}`);
    }, lockDelayMs);
    timeoutsRef.current.push(lockOnId);

    // Lock pulse duration
    const lockPulseDuration = isMission01ToolB ? 550 : 450;
    const lockOffId = window.setTimeout(() => {
      setLockPulseKey(null);
    }, lockDelayMs + lockPulseDuration);
    timeoutsRef.current.push(lockOffId);

    // Step 2: "Painted walls" beat before transitioning (only for Tool A paint scenario, NOT for Tool B)
    const allowBgBeat = mission.phase === 'main' && mission.sequence < 2;
    const hasBgBeat = allowBgBeat && (!!option.next_bg_override || isMission01Paint);
    if (hasBgBeat && !isMission01ToolB) {
      const beatDelay = isMission01Paint ? 1000 : 600;
      const clearDelay = isMission01Paint ? 1500 : 1100;
      const paintTarget = isMission01Paint
        ? { key: PAINTED_WALLS_BG_KEY, image: getBackgroundByName(PAINTED_WALLS_BG_KEY) || currentBg }
        : getTargetBgForOption(option);

      const beatId = window.setTimeout(() => {
         setLocalBgOverride({ ...paintTarget, missionId: mission.mission_id });
      }, beatDelay);
      timeoutsRef.current.push(beatId);

      const clearId = window.setTimeout(() => {
        setLocalPlacement(null);
      }, clearDelay);
      timeoutsRef.current.push(clearId);
    }
    
    // Step 3: Advance to next mission
    const isMission02 = mission.mission_id === 'studio_02';
    const isMission03ToolB = mission.mission_id === 'studio_03' && variant === 'b';
    const isMission05ToolA = mission.mission_id === 'studio_05' && variant === 'a';
    const isMission05ToolB = mission.mission_id === 'studio_05' && variant === 'b';
    const isMission08ToolB = mission.mission_id === 'studio_08' && variant === 'b';
    const isMission11ToolA = mission.mission_id === 'studio_11' && variant === 'a';
    const isMission11ToolB = mission.mission_id === 'studio_11' && variant === 'b';
    const advanceDelay = isMission01Paint ? 2200 
      : isMission01ToolB ? 1600 
      : isMission02 ? 1600
      : isMission03ToolB ? 3600  // tables appear first, then visitors fade-in + viewing time
      : (isMission11ToolA || isMission11ToolB) ? 2200  // keep brief viewing time for M11 branch result
      : (isMission07 || isMission11) ? 2200
      : isMission06ToolA ? 2400  // extra time for prop spawn + tool appear
      : (mission.mission_id === 'studio_10') ? 1500  // faster handoff so M11 bubble appears quickly
      : (mission.mission_id === 'studio_13') ? 2200  // baked bg crossfade (800ms) + viewing time
      : (mission.mission_id === 'studio_14') ? 2200  // baked bg crossfade + viewing time
      : (mission.mission_id === 'studio_15') ? 2200  // baked bg crossfade + viewing time
      : isMission05ToolA ? 2400  // extra 1s viewing time for M05 tool A
      : isMission05ToolB ? 2900  // visitors fade-in + 1.5s viewing time
      : isMission08ToolB ? 2900  // visitors fade-in + 1.5s viewing time
      : 1400;
    const advanceId = window.setTimeout(() => {
      // For Mission 01 Tool B: DON'T clear localPlacement before onSelect
      // This prevents the tool from disappearing before it's added to placedProps
      if (!isMission01ToolB) {
        setLocalPlacement(null);
      }
      setJustPlaced(null);
      setLockPulseKey(null);
      
      // Mission 07: Clear background override BEFORE advancing so M8 starts fresh
      // The tool should NOT be visible when transitioning to M8
      if (isMission07) {
        setLocalBgOverride(null);
        m7TransitionRef.current = { active: false, bgKey: null };
      }
      
      // SIMPLIFIED: Just pass the option without fixedPlacement - anchor map is source of truth
      onSelect(mission.mission_id, variant, option.holland_code as HollandCode, option);
      // Clear localPlacement AFTER onSelect has added it to placedProps (next tick)
      if (isMission01ToolB) {
        window.setTimeout(() => setLocalPlacement(null), 100);
      }
    }, advanceDelay);
    timeoutsRef.current.push(advanceId);
    
    setCarryModeTool(null);
  }, [mission.mission_id, mission.phase, mission.sequence, optionA, optionB, onSelect, hasDraggedOnce, getTargetBgForOption, PAINTED_WALLS_BG_KEY, currentBg, getTargetAnchor, getToolPlacementFromAnchorMap, isMobile, isPanoramic, lockedBgKey, toolEditMode]);

  // Click-to-place: immediately place the selected tool
  const handleToolClick = useCallback((variant: 'a' | 'b', e: React.PointerEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Immediately place the tool - no dragging required
    completePlacement(variant);
  }, [completePlacement]);

  const handleStagePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!(isMobile && isPanoramic)) return;

    const target = e.target as HTMLElement;
    if (target.closest('button, [role="button"], input, textarea, select, .drop-target-anchor, .mission-tool-panel-mobile, .mission-tool-panel-desktop')) {
      return;
    }

    isStagePanningRef.current = true;

    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const normalizedX = Math.min(1, Math.max(0, (e.clientX - rect.left) / Math.max(1, rect.width)));
    panApiRef.current?.updatePanFromDrag(normalizedX);
    
    // Start continuous CSS var sync loop
    const syncLoop = () => {
      syncPanCssVar();
      if (isStagePanningRef.current) {
        panSyncRafRef.current = requestAnimationFrame(syncLoop);
      }
    };
    if (panSyncRafRef.current) cancelAnimationFrame(panSyncRafRef.current);
    panSyncRafRef.current = requestAnimationFrame(syncLoop);
  }, [isMobile, isPanoramic, syncPanCssVar]);

  const handleStagePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!(isMobile && isPanoramic) || !isStagePanningRef.current) return;

    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const normalizedX = Math.min(1, Math.max(0, (e.clientX - rect.left) / Math.max(1, rect.width)));
    panApiRef.current?.updatePanFromDrag(normalizedX);

    const edgeZone = 0.18;
    if (normalizedX < edgeZone) {
      setEdgeProximity({ edge: 'left', intensity: (edgeZone - normalizedX) / edgeZone });
      return;
    }
    if (normalizedX > 1 - edgeZone) {
      setEdgeProximity({ edge: 'right', intensity: (normalizedX - (1 - edgeZone)) / edgeZone });
      return;
    }
    setEdgeProximity({ edge: null, intensity: 0 });
  }, [isMobile, isPanoramic]);

  const handleStagePointerUp = useCallback(() => {
    isStagePanningRef.current = false;
    setEdgeProximity({ edge: null, intensity: 0 });
    // Stop sync loop
    if (panSyncRafRef.current) {
      cancelAnimationFrame(panSyncRafRef.current);
      panSyncRafRef.current = null;
    }
    // Final sync
    syncPanCssVar();
  }, [syncPanCssVar]);

  // Handle tap on drop zone in carry mode
  const handleDropZoneTap = useCallback(() => {
    if (carryModeTool) {
      completePlacement(carryModeTool);
    }
  }, [carryModeTool, completePlacement]);

  // Cancel carry mode on escape or background tap
  const handleCancelCarry = useCallback(() => {
    // Guard: don't cancel if carry mode was just set (click fires after pointerup)
    if (carryModeJustSetRef.current) return;
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
  
  const getZoneForMission = (missionSeq: number): 'gallery' | 'workshop' | 'exterior' | 'workshop2' | 'gallery2' | 'storage' | 'doorway' => {
    // Zones per product spec (used ONLY for persisted tool visibility)
    // Gallery: Missions 1-2 (gallery scenes)
    // Doorway: Mission 3 (doorway park view - separate zone, tools don't persist)
    // Workshop: Missions 4, 6, 7 (original workshop - M7 CONTINUES workshop!)
    // Exterior: Mission 5 only
    // Workshop2: Missions 8, 10, 11 (workshop continuation - M11 shows M8+M10)
    // M9, M12, M13, M15 are clean gallery resets - no persisted tools
    // M14: Storage room - clean reset
    if (missionSeq <= 2) return 'gallery';
    if (missionSeq === 3) return 'doorway';
    if (missionSeq === 5) return 'exterior';
    if (missionSeq === 9 || missionSeq === 12 || missionSeq === 13 || missionSeq === 15) return 'gallery'; // Clean reset
    if (missionSeq === 14) return 'storage'; // Clean reset - storage room
    if (missionSeq >= 8 && missionSeq <= 11) return 'workshop2';
    return 'workshop'; // M4, 6, 7
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

    // Product/UI rule: Missions 07, 09, 11, 12, 13, 14, 15 and ALL tie-breakers are "clean scene" resets.
    // M7: Tool-specific background transition (Storage/Gallery) - no persisted tools
    // M9: Gallery scene - fresh start, no persisted tools
    // M11: Tool-specific background transition - no persisted tools from previous missions
    // M12, M13, M15: Gallery scenes - clean start
    // M14: Storage room - clean start
    // M8: NO old tools from workshop zone
    // Do NOT render persisted tools from previous missions here.
    // (This only affects visibility; it does not modify game state.)
    const isTieBreakerMission = mission.mission_id.includes('_tie_');
    const hidePersistedToolsForThisMission = isTieBreakerMission || mission.mission_id === 'studio_03' || mission.mission_id === 'studio_06' || mission.mission_id === 'studio_07' || mission.mission_id === 'studio_08' || mission.mission_id === 'studio_09' || mission.mission_id === 'studio_10' || mission.mission_id === 'studio_11' || mission.mission_id === 'studio_12' || mission.mission_id === 'studio_13' || mission.mission_id === 'studio_14' || mission.mission_id === 'studio_15';
    
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
    // M10: skip tool rendering — everything is baked into the per-tool background
    // M11 Tool B: skip — baked into gallery_mission11b_bg
    // M3 mobile: skip — baked into portrait mobile backgrounds
    // M4 mobile: skip — baked into portrait mobile backgrounds
    const isM11BakedB = localPlacement?.missionId === 'studio_11' && localPlacement?.key === 'b';
    const isM11BakedA = localPlacement?.missionId === 'studio_11' && localPlacement?.key === 'a';
    const localMissionNum = localPlacement ? Number(localPlacement.missionId.replace('studio_', '')) : Number.NaN;
    // M5 Tool A is dynamic (animated inflatable), so exclude from desktop baked
    const isDesktopBakedMainMission = !isMobile && localMissionNum >= 1 && localMissionNum <= 15
      && !(localPlacement?.missionId === 'studio_05' && localPlacement?.key === 'a');
    const isM1MobileBaked = localPlacement?.missionId === 'studio_01' && isMobile;
    const isM2MobileBaked = localPlacement?.missionId === 'studio_02' && isMobile;
    const isM3MobileBaked = localPlacement?.missionId === 'studio_03' && isMobile;
    const isM4MobileBaked = localPlacement?.missionId === 'studio_04' && isMobile;
    const isM5BakedB = localPlacement?.missionId === 'studio_05' && localPlacement?.key === 'b';
    const isM6MobileBaked = localPlacement?.missionId === 'studio_06' && isMobile;
    const isM7Baked = localPlacement?.missionId === 'studio_07';
    const isM8Baked = localPlacement?.missionId === 'studio_08';
    const isM9MobileBaked = localPlacement?.missionId === 'studio_09' && isMobile;
    const isM12Baked = localPlacement?.missionId === 'studio_12';
    const isM13Baked = localPlacement?.missionId === 'studio_13';
    const isM14Baked = localPlacement?.missionId === 'studio_14';
    const isM15Baked = localPlacement?.missionId === 'studio_15';
    const isTieBreakerBaked = localPlacement?.missionId.includes('_tie_') ?? false;
    const isBakedMission = isTieBreakerBaked || isDesktopBakedMainMission || isM11BakedB || isM11BakedA || isM1MobileBaked || isM2MobileBaked || isM3MobileBaked || isM4MobileBaked || isM5BakedB || isM6MobileBaked || isM7Baked || isM8Baked || isM9MobileBaked || isM12Baked || isM13Baked || isM14Baked || isM15Baked;
    if (localPlacement && localPlacement.missionId !== 'studio_10' && !isBakedMission) {
      placements.push({
        missionId: localPlacement.missionId,
        key: localPlacement.key as 'a' | 'b',
        assetName: localPlacement.assetName,
        hollandCode: 'r' as HollandCode, // Not used for display
        fixedPlacement: localPlacement.fixedPlacement,
      });
    }
    
    return placements;
  }, [localPlacement, placedProps, mission.sequence, lockedBgKey, isMobile, isPanoramic]);

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

  // M10: very fast crossfade (same room, items just appear on table)
  const bgCrossfadeDuration = mission.mission_id === 'studio_10' ? 200 : 800;
  
  const backgroundElement = (
    <PannableBackground
      src={effectiveLockedBg}
      className="layout-bg"
      filter="saturate(1.18) contrast(1.08)"
      durationMs={bgCrossfadeDuration}
      zIndex={0}
      enabled={isMobile && isPanoramic}
      isPanoramic={isMobile && isPanoramic}
      isMobileView={isMobile}
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
  // Pass localPlacement so "after" trigger props can appear before the tool is added to placedProps
  const localSelectedTool = useMemo(() => {
    if (!localPlacement) return null;
    return { missionId: localPlacement.missionId, assetName: localPlacement.assetName };
  }, [localPlacement]);
  const sceneExtras = useSceneExtras(mission.mission_id, currentIndex, placedProps, localSelectedTool);
  
  const sceneExtrasElement = useMemo(() => {
    // Hide actual extras when calibration editor is active (it renders its own copies)
    // Mission 13 uses baked-in props in the background, so never render scene extras there.
    if (mission.mission_id === 'studio_13' || mission.mission_id === 'studio_14' || mission.mission_id === 'studio_15' || sceneExtras.length === 0 || toolEditMode) return null;
    // Mission 11: suppress scene extras once a tool is placed (baked into background)
    const isM11Baked = mission.mission_id === 'studio_11' && localPlacement?.missionId === 'studio_11';
    if (isM11Baked) return null;
    
    return (
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
        {sceneExtras.map((extra) => {
          // Mission 09/10 mobile: scene extras are baked into portrait backgrounds
          if ((mission.mission_id === 'studio_09' || mission.mission_id === 'studio_10') && isMobile) return null;
          // Mission 12: scene extras are baked into backgrounds (both mobile and desktop)
          if (mission.mission_id === 'studio_12') return null;
          // Pin extras to their calibrated background regardless of visual overrides.
          const calibratedBgKey = extra.anchorRef.startsWith('m10_') ? 'gallery_mission10_bg'
            : lockedBgKey;
          const anchorPos = getAnchorPosition(calibratedBgKey, extra.anchorRef);
          if (!anchorPos) {
            return null;
          }
          
          const resolvedLayer = (anchorPos.z_layer as 'back' | 'mid' | 'front' | undefined) ?? extra.zLayer;
          const zIndex = zIndexForAnchorLayer(resolvedLayer);
          const override = extraOverrides[extra.id];
          const rawLeftPos = override ? override.x : (anchorPos.x + extra.offsetX);
          const leftPos = getRenderX(rawLeftPos);
          const topPos = override ? override.y : (anchorPos.y + extra.offsetY);
          const scale = override ? override.scale : extra.scale * (anchorPos.scale || 1);
          
          // Delayed fade-in for M10 staff character (appears after tool)
          const isDelayedExtra = extra.anchorRef === ('m10_extra_staff' as AnchorRef) || extra.anchorRef === ('m10_extra_staff_b' as AnchorRef);
          
          return (
            <div
              key={extra.id}
              className="absolute"
              style={{
                left: `${leftPos}%`,
                top: `${topPos}%`,
                transform: `translate(-50%, -100%)`,
                zIndex,
                opacity: isDelayedExtra ? 0 : undefined,
                animation: isDelayedExtra ? 'fade-in 0.5s ease-out 0.6s forwards' : undefined,
              }}
            >
              <img 
                src={extra.image}
                alt=""
                className="object-contain"
                style={{
                  width: `${getSpriteBasePx('normal')}px`,
                  height: `${getSpriteBasePx('normal')}px`,
                  transform: getSpriteTransform(scale, anchorPos.flipX, 'extra'),
                  filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.4))',
                }}
              />
            </div>
          );
        })}
      </div>
    );
  }, [mission.mission_id, sceneExtras, lockedBgKey, extraOverrides, toolEditMode, localPlacement, getRenderX, getSpriteTransform]);

  const targetZoneElement = activeToolVariant && targetPosition ? (
    <div
      className="drop-target-anchor"
      style={{
        left: `${getRenderX(targetPosition.x)}%`,
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
      <DropTargetIndicator mode={carryModeTool && !draggingTool ? 'carry' : 'drag'} />
    </div>
  ) : null;

  // Special duplication logic for certain missions (e.g., studio_01 option A duplicates to 3 floor corners)
  // For mission 1, the paint buckets should be placed near EACH WALL (left, back, right)
  // צמוד לקיר = close to wall, on the floor
  const getDuplicateAnchors = (prop: typeof displayedPlacement[0]): { anchor: AnchorRef; offsetX: number; offsetY: number; customScale?: number; absoluteY?: number; absoluteX?: number; wallMount?: boolean; flipX?: boolean }[] => {
    // Mission 01 Tool A: single placement from calibrated anchor map
    if (prop.missionId === 'studio_01' && prop.key === 'a') {
      const anchorPos = getAnchorPosition(lockedBgKey, 'm01_tool_a');
      if (anchorPos) {
        return [{
          anchor: 'm01_tool_a' as AnchorRef,
          offsetX: 0,
          offsetY: 0,
          customScale: anchorPos.scale,
          absoluteY: anchorPos.y,
          absoluteX: anchorPos.x,
          flipX: anchorPos.flipX,
        }];
      }
      // Fallback
      return [{ anchor: 'floor', offsetX: 0, offsetY: 0, customScale: 1.8, absoluteY: BACK_FLOOR_Y, absoluteX: 50 }];
    }
    
    // Mission 01 Tool B: use anchor map coordinates
    if (prop.missionId === 'studio_01' && prop.key === 'b') {
      const anchorPos = getAnchorPosition(lockedBgKey, 'm01_tool_b');
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
    
    // Mission 03 Tool B (bar tables): duplicate 3 times using individual anchors
    if (prop.missionId === 'studio_03' && prop.key === 'b') {
      const anchors = ['m03_tool_b_1', 'm03_tool_b_2', 'm03_tool_b_3'] as AnchorRef[];
      const results = anchors.map(anchorRef => {
        const anchorPos = getAnchorPosition(lockedBgKey, anchorRef);
        return {
          anchor: anchorRef,
          offsetX: 0,
          offsetY: 0,
          customScale: anchorPos?.scale ?? 2.5,
          absoluteY: anchorPos?.y ?? 80,
          absoluteX: anchorPos?.x ?? 50,
          flipX: anchorPos?.flipX,
          noStagger: true,
        };
      });
      return results;
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
      const anchorPos = getAnchorPosition('gallery_main_stylized', 'm07_tool_b');
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
      const anchorPos = getAnchorPosition('studio_doorway_park_view_bg', 'm09_tool_a');
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
      const anchorPos = getAnchorPosition('studio_doorway_park_view_bg', 'm09_tool_b');
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
      const anchorPos = getAnchorPosition('gallery_mission10_bg', 'm10_tool_a');
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
      const anchorPos = getAnchorPosition('gallery_mission10_bg', 'm10_tool_b');
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

    // Mission 11 Tool A: single placement on M11-A background
    if (prop.missionId === 'studio_11' && prop.key === 'a') {
      const anchorPos = getAnchorPosition('gallery_mission11a_bg', 'm11_tool_a');
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

    // Mission 11 Tool B: baked in background (only used for calibration fallback anchors)
    if (prop.missionId === 'studio_11' && prop.key === 'b') {
      const anchorPos = getAnchorPosition('gallery_mission11b_bg', 'm11_tool_b');
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

    // Mission 12 Tool A: duplicate 5 times using individual anchors
    if (prop.missionId === 'studio_12' && prop.key === 'a') {
      const anchors = ['m12_tool_a_1', 'm12_tool_a_2', 'm12_tool_a_3', 'm12_tool_a_4', 'm12_tool_a_5'] as AnchorRef[];
      const results = anchors.map(anchorRef => {
        const anchorPos = getAnchorPosition('gallery_main_desktop', anchorRef);
        return {
          anchor: anchorRef,
          offsetX: 0,
          offsetY: 0,
          customScale: anchorPos?.scale ?? 1.3,
          absoluteY: anchorPos?.y ?? 90,
          absoluteX: anchorPos?.x ?? 50,
          flipX: anchorPos?.flipX,
          noStagger: true,
        };
      });
      if (results.length > 0) return results;
    }

    // Mission 12 Tool B: single placement using anchor map coordinates
    if (prop.missionId === 'studio_12' && prop.key === 'b') {
      const anchorPos = getAnchorPosition('gallery_main_desktop', 'm12_tool_b');
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
        // Mission 11 Tool B is baked into the background image - never render it as a prop
        if (prop.missionId === 'studio_11' && prop.key === 'b') {
          return null;
        }
        // Mission 13: all props are baked into the background - never render them
        if (prop.missionId === 'studio_13') {
          return null;
        }
        // Mission 15: all props are baked into the background - never render them
        if (prop.missionId === 'studio_15') {
          return null;
        }
        // Mission 14: all props are baked into the background - never render them
        if (prop.missionId === 'studio_14') {
          return null;
        }
        // Mission 08: all props are baked into the background - never render them
        if (prop.missionId === 'studio_08') {
          return null;
        }
        // Mission 09 mobile: all props are baked into the portrait background
        if (prop.missionId === 'studio_09' && isMobile) {
          return null;
        }
        // Mission 12: all props are baked into the background
        if (prop.missionId === 'studio_12') {
          return null;
        }

        const assetName = prop.assetName || `${prop.missionId.replace('studio_', 'studio_')}_${prop.key}`;
        // Mission 5 tool A: use animated GIF for placed prop
        const toolImg = assetName === 'studio_05_a'
          ? getToolImage('studio_05_a_animated') || getToolImage(assetName)
          : getToolImage(assetName);
        
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
        const hasDuplicationPattern = (prop.missionId === 'studio_03' && prop.key === 'b')
          || (prop.missionId === 'studio_12' && prop.key === 'a');

        // Mission 10: LOCAL placement should use fixedPlacement immediately (snap-now)
        if (!isPersisted && isLocalCurrentMissionPlacement && prop.fixedPlacement && !hasDuplicationPattern) {
          const fixed = prop.fixedPlacement;
          const zIndex = zIndexForAnchorLayer(fixed.z_layer);

          return [(
            <div
              key={`${prop.missionId}-${propIdx}-local-fixed`}
              className={`absolute pointer-events-none ${
                isPersisted ? '' : 'animate-fade-in'
              }`}
              style={{
                left: `${getRenderX(fixed.x)}%`,
                top: `${fixed.y}%`,
                transform: 'translate(-50%, -100%)',
                zIndex,
              }}
            >
              <img
                src={toolImg}
                alt=""
                className={`object-contain ${lockPulseKey === `${prop.missionId}-${prop.key}` ? 'tool-lock-confirm' : ''}`}
                style={{
                  width: `${getSpriteBasePx(isMission01ToolB || isMission02ToolB ? 'xlarge' : 'normal')}px`,
                  height: `${getSpriteBasePx(isMission01ToolB || isMission02ToolB ? 'xlarge' : 'normal')}px`,
                  filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))',
                  transform: getSpriteTransform(fixed.scale, fixed.flipX, 'tool'),
                }}
              />
            </div>
          )];
        }
        
        if (isPersisted && prop.fixedPlacement && !hasDuplicationPattern) {
          const fixed = prop.fixedPlacement;
          const zIndex = zIndexForAnchorLayer(fixed.z_layer);
          
          return [(
            <div
              key={`${prop.missionId}-${propIdx}-fixed`}
              className="absolute pointer-events-none"
              style={{
                left: `${getRenderX(fixed.x)}%`,
                top: `${fixed.y}%`,
                transform: 'translate(-50%, -100%)',
                zIndex,
              }}
            >
              <img 
                src={toolImg}
                alt=""
                className="object-contain"
                style={{
                  width: `${getSpriteBasePx(isMission01ToolB || isMission02ToolB ? 'xlarge' : 'normal')}px`,
                  height: `${getSpriteBasePx(isMission01ToolB || isMission02ToolB ? 'xlarge' : 'normal')}px`,
                  filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))',
                  transform: getSpriteTransform(fixed.scale, fixed.flipX, 'tool'),
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
          
          // Stagger animation for duplicates - skip stagger if noStagger flag is set
          const animationDelay = (anchorInfo as any).noStagger ? 0 : idx * 300;
          // Use custom scale if provided, otherwise default
          const finalScale = anchorInfo.customScale || (anchorPos.scale * 2.2);
          
          // Use absoluteY if provided (for fixed floor-near-wall positioning)
          const topValue = anchorInfo.absoluteY !== undefined 
            ? anchorInfo.absoluteY 
            : anchorPos.y + anchorInfo.offsetY;
          
          // Use absoluteX if provided (for fixed horizontal positioning)
          const rawLeftValue = anchorInfo.absoluteX !== undefined
            ? anchorInfo.absoluteX
            : anchorPos.x + anchorInfo.offsetX;
          // Apply panoramic conversion on mobile
          const leftValue = getRenderX(rawLeftValue);
          
          // Wall-mounted tools use center transform, floor tools use bottom-anchored
          const transformStyle = anchorInfo.wallMount
            ? 'translate(-50%, -50%)'
            : 'translate(-50%, -100%)';
          
          return (
              <div
                key={`${prop.missionId}-${propIdx}-${idx}`}
                className={`absolute pointer-events-none ${
                  isPersisted ? '' : 'animate-fade-in'
                }`}
                style={{
                left: `${leftValue}%`,
                top: `${topValue}%`,
                transform: transformStyle,
                zIndex: 15 + idx,
                animationDelay: isPersisted ? '0ms' : `${animationDelay}ms`,
              }}
            >
              <img 
                src={toolImg}
                alt=""
                className={`object-contain ${lockPulseKey === `${prop.missionId}-${prop.key}` ? 'tool-lock-confirm' : ''}`}
                style={{
                  width: `${getSpriteBasePx(isMission01Buckets ? 'large' : (isMission01ToolB || isMission02ToolB ? 'xlarge' : 'normal'))}px`,
                  height: `${getSpriteBasePx(isMission01Buckets ? 'large' : (isMission01ToolB || isMission02ToolB ? 'xlarge' : 'normal'))}px`,
                  filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))',
                  transform: getSpriteTransform(finalScale, anchorInfo.flipX, 'tool'),
                }}
              />
            </div>
          );
        });
      })}

      {/* Mission 8 Tool B visitors - appear with fade-in when tool B is placed */}
      {(() => {
        // Show visitors only when mission 8 tool B has been placed (locally or persisted)
        const m08ToolBPlaced = localPlacement?.missionId === 'studio_08' && localPlacement?.key === 'b'
          || displayedPlacement.some(p => p.missionId === 'studio_08' && p.key === 'b');
        const isOnM08 = mission.mission_id === 'studio_08';
        
        if (!m08ToolBPlaced || !isOnM08) return null;
        // Visitors + avatar are baked into the background (both mobile and desktop)
        return null;
        
        const visitors = [
          { img: visitorM08_01, anchor: 'm08_visitor_01' },
          { img: visitorM08_02, anchor: 'm08_visitor_02' },
          { img: visitorM08_03, anchor: 'm08_visitor_03' },
        ];
        
        // Render avatar alongside visitors
        const avatarImg = getAvatarImage(avatarGender, 'idle');
        const avatarAnchor = getAnchorPosition(lockedBgKey, 'm08_avatar' as AnchorRef);
        // Fallback position if anchor not found
        const avatarPos = avatarAnchor || { x: 45, y: 88, scale: 2.5, z_layer: 'front', flipX: false };
        
        return (
          <>
            {visitors.map((v, i) => {
              const pos = getAnchorPosition(lockedBgKey, v.anchor as AnchorRef);
              if (!pos) return null;
              const zIdx = zIndexForAnchorLayer(pos.z_layer);
              return (
                <div
                  key={`m08-visitor-${i}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${getRenderX(pos.x)}%`,
                    top: `${pos.y}%`,
                    transform: 'translate(-50%, -100%)',
                    zIndex: zIdx,
                  }}
                >
                  <div
                    style={{
                      opacity: 0,
                      animation: `scale-in 0.6s ease-out ${i * 150}ms forwards`,
                    }}
                  >
                    <img
                      src={v.img}
                      alt=""
                      className="object-contain"
                      style={{
                        width: `${getSpriteBasePx('normal')}px`,
                        height: `${getSpriteBasePx('normal')}px`,
                        filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.4))',
                        transform: getSpriteTransform(pos.scale, pos.flipX, 'visitor'),
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {avatarImg && (
              <div
                key="m08-avatar"
                className="absolute pointer-events-none"
                style={{
                  left: `${getRenderX(avatarPos.x)}%`,
                  top: `${avatarPos.y}%`,
                  transform: 'translate(-50%, -100%)',
                  zIndex: zIndexForAnchorLayer(avatarPos.z_layer),
                }}
              >
                <div
                  style={{
                    opacity: 0,
                    animation: `scale-in 0.6s ease-out 450ms forwards`,
                  }}
                >
                  <img
                    src={avatarImg}
                    alt=""
                    className="object-contain"
                    style={{
                      width: `${getSpriteBasePx('normal')}px`,
                      height: `${getSpriteBasePx('normal')}px`,
                      filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.4))',
                      transform: getSpriteTransform(avatarPos.scale, avatarPos.flipX, 'avatar'),
                    }}
                  />
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Mission 3 Tool B visitors - appear with fade-in when tool B is placed */}
      {(() => {
        const m03ToolBPlaced = localPlacement?.missionId === 'studio_03' && localPlacement?.key === 'b'
          || displayedPlacement.some(p => p.missionId === 'studio_03' && p.key === 'b');
        const isOnM03 = mission.mission_id === 'studio_03';
        
        if (!m03ToolBPlaced || !isOnM03) return null;
        
        const visitors = [
          { img: visitorM03_01, anchor: 'm03_visitor_01' },
          { img: visitorM03_02, anchor: 'm03_visitor_02' },
          { img: visitorM03_03, anchor: 'm03_visitor_03' },
          { img: visitorM03_04, anchor: 'm03_visitor_04' },
        ];
        
        return visitors.map((v, i) => {
          const pos = getAnchorPosition(lockedBgKey, v.anchor as AnchorRef);
          if (!pos) return null;
          const zIdx = zIndexForAnchorLayer(pos.z_layer);
          return (
            <div
              key={`m03-visitor-${i}`}
              className="absolute pointer-events-none"
              style={{
                left: `${getRenderX(pos.x)}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -100%)',
                zIndex: zIdx,
              }}
            >
              <div
                style={{
                  opacity: 0,
                  animation: `scale-in 0.6s ease-out ${1200 + i * 200}ms forwards`,
                }}
              >
                <img
                  src={v.img}
                  alt=""
                  className="object-contain"
                  style={{
                    width: `${getSpriteBasePx('normal')}px`,
                    height: `${getSpriteBasePx('normal')}px`,
                    filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.4))',
                    transform: getSpriteTransform(pos.scale, pos.flipX, 'visitor'),
                  }}
                />
              </div>
            </div>
          );
        });
      })()}

      {/* Mission 5 Tool B visitors - appear with fade-in when tool B is placed */}
      {(() => {
        const m05ToolBPlaced = localPlacement?.missionId === 'studio_05' && localPlacement?.key === 'b'
          || displayedPlacement.some(p => p.missionId === 'studio_05' && p.key === 'b');
        const isOnM05 = mission.mission_id === 'studio_05';
        
        if (!m05ToolBPlaced || !isOnM05) return null;
        // On mobile, visitors are baked into the portrait background
        if (isMobile) return null;
        
        const visitors = [
          { img: visitorM05_01, anchor: 'm05_visitor_01' },
          { img: visitorM05_02, anchor: 'm05_visitor_02' },
          { img: visitorM05_03, anchor: 'm05_visitor_03' },
        ];
        
        return visitors.map((v, i) => {
          const pos = getAnchorPosition(lockedBgKey, v.anchor as AnchorRef);
          if (!pos) return null;
          const zIdx = zIndexForAnchorLayer(pos.z_layer);
          return (
            <div
              key={`m05-visitor-${i}`}
              className="absolute pointer-events-none"
              style={{
                left: `${getRenderX(pos.x)}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -100%)',
                zIndex: zIdx,
              }}
            >
              <div
                style={{
                  opacity: 0,
                  animation: `scale-in 0.6s ease-out ${i * 150}ms forwards`,
                }}
              >
                <img
                  src={v.img}
                  alt=""
                  className="object-contain"
                  style={{
                    width: `${getSpriteBasePx('normal')}px`,
                    height: `${getSpriteBasePx('normal')}px`,
                    filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.4))',
                    transform: getSpriteTransform(pos.scale, pos.flipX, 'visitor'),
                  }}
                />
              </div>
            </div>
          );
        });
      })()}

      {/* Mission 11 Tool A avatar - appears with fade-in when tool A is placed */}
      {(() => {
        const m11ToolAPlaced = localPlacement?.missionId === 'studio_11' && localPlacement?.key === 'a'
          || displayedPlacement.some(p => p.missionId === 'studio_11' && p.key === 'a');
        const m11ToolBPlaced = localPlacement?.missionId === 'studio_11' && localPlacement?.key === 'b'
          || displayedPlacement.some(p => p.missionId === 'studio_11' && p.key === 'b');
        const isOnM11 = mission.mission_id === 'studio_11';
        
        if (!m11ToolAPlaced || m11ToolBPlaced || !isOnM11 || isMobile) return null;
        
        const avatarImg = getAvatarImage(avatarGender, 'idle');
        if (!avatarImg) return null;
        
        // Mission 11 Avatar is calibrated on M11-A result background
        const avatarAnchor = getAnchorPosition('gallery_mission11a_bg', 'm11_avatar' as AnchorRef);
        const avatarPos = avatarAnchor || { x: 50, y: 85, scale: 2.0, z_layer: 'front', flipX: false };
        
        return (
          <div
            key="m11-avatar"
            className="absolute pointer-events-none"
            style={{
              left: `${getRenderX(avatarPos.x)}%`,
              top: `${avatarPos.y}%`,
              transform: 'translate(-50%, -100%)',
              zIndex: zIndexForAnchorLayer(avatarPos.z_layer),
            }}
          >
            <div
              style={{
                opacity: 0,
                animation: `scale-in 0.6s ease-out 600ms forwards`,
              }}
            >
              <img
                src={avatarImg}
                alt=""
                className="object-contain"
                style={{
                  width: `${getSpriteBasePx('normal')}px`,
                  height: `${getSpriteBasePx('normal')}px`,
                  filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.4))',
                  transform: getSpriteTransform(avatarPos.scale, avatarPos.flipX, 'avatar'),
                }}
              />
            </div>
          </div>
        );
      })()}

      {/* Mission 11 Tool B crowd - appears with fade-in when tool B is placed */}
      {(() => {
        const m11ToolBPlaced = localPlacement?.missionId === 'studio_11' && localPlacement?.key === 'b'
          || displayedPlacement.some(p => p.missionId === 'studio_11' && p.key === 'b');
        const m11ToolAPlaced = localPlacement?.missionId === 'studio_11' && localPlacement?.key === 'a'
          || displayedPlacement.some(p => p.missionId === 'studio_11' && p.key === 'a');
        const isOnM11 = mission.mission_id === 'studio_11';
        
        if (!m11ToolBPlaced || m11ToolAPlaced || !isOnM11 || isMobile) return null;
        
        // Mission 11 Crowd is calibrated on M11-B result background only (Tool B branch)
        const crowdAnchor = getAnchorPosition('gallery_mission11b_bg', 'm11_crowd' as AnchorRef);
        const crowdPos = crowdAnchor || { x: 50, y: 80, scale: 2.0, z_layer: 'back', flipX: false };
        
        return (
          <div
            key="m11-crowd"
            className="absolute pointer-events-none"
            style={{
              left: `${getRenderX(crowdPos.x)}%`,
              top: `${crowdPos.y}%`,
              transform: 'translate(-50%, -100%)',
              zIndex: zIndexForAnchorLayer(crowdPos.z_layer),
            }}
          >
            <div
              style={{
                opacity: 0,
                animation: `scale-in 0.6s ease-out 600ms forwards`,
              }}
            >
              <img
                src={m11CrowdAsset}
                alt=""
                className="object-contain"
                style={{
                  width: `${getSpriteBasePx('normal')}px`,
                  height: `${getSpriteBasePx('normal')}px`,
                  filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.4))',
                  transform: getSpriteTransform(crowdPos.scale, crowdPos.flipX, 'visitor'),
                }}
              />
            </div>
          </div>
        );
      })()}
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

  // Avatar removed per user request
  const avatarElement = null;

  // Check if we're on tablet or mobile (< 1024px) for text wrapping
  const [isTabletOrMobile, setIsTabletOrMobile] = useState(false);
  useEffect(() => {
    const checkWidth = () => setIsTabletOrMobile(window.innerWidth < 821);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Get mission number for display (1-15 for main, 16+ for tie-breakers)
  const missionDisplayNumber = useMemo(() => {
    if (mission.phase === 'main') {
      return mission.sequence;
    }
    // Tie-breaker missions continue from main missions count
    // currentIndex is passed as (mainMissions.length) for first tie, so +1 gives 16
    return currentIndex + 1;
  }, [mission.phase, mission.sequence, currentIndex]);

  // Split task text after comma for better readability (tablet/mobile only)
  // Also prepend mission number in bold
  const formattedTaskText = useMemo(() => {
    const missionPrefix = missionDisplayNumber ? (
      <span>
        <strong>משימה {missionDisplayNumber}:</strong>{' '}
      </span>
    ) : null;

    // All viewports: natural text flow, no forced line breaks
    return <>{missionPrefix}{taskText}</>;
  }, [taskText, isTabletOrMobile, missionDisplayNumber]);

  const speechBubbleElement = (
    <div key={`bubble-${mission.mission_id}`}>
      <SpeechBubble 
        tailDirection="right"
        missionKey={mission.mission_id}
        className="mission-bubble-full-width"
      >
        <div className="mission-bubble-content-with-avatar">
          {/* Avatar inside the bubble on the right */}
          <div className="mission-bubble-avatar-inside">
            <img 
              src={avatarImage} 
              alt="Guide avatar"
              className="w-full h-full object-contain"
            />
          </div>
          {/* Text content */}
          <p 
            className="font-medium text-base md:text-lg flex-1"
            style={{ 
              lineHeight: 1.5,
              direction: 'rtl',
              textAlign: 'right',
            }}
          >
            {formattedTaskText}
          </p>
        </div>
        {/* Progress tank below text */}
        <div className="mission-bubble-progress">
          <ProgressTank value={(currentIndex + 1) / totalMissions} />
        </div>
      </SpeechBubble>
    </div>
  );

  const toolPanelElement = (
    <div
      className={`layout-tool-panel-inner tool-panel-responsive relative${suppressToolPanel ? ' tool-panel-suppressed' : ''}`}
      style={{ 
        direction: 'ltr',
      }}
    >
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
      {/* Tool tiles only - progress moved to speech bubble */}
      <div className="tool-panel-main-row">

        {/* Tool tiles */}
        <div className="tool-tiles-area">
          <div className="tool-tiles-row" key={`tools-${mission.mission_id}`}>
            <ClickableToolTile
              key={`a-${mission.mission_id}`}
              image={toolAImage}
              onClick={(e) => handleToolClick('a', e)}
              onInfoClick={() => setActiveTooltip(activeTooltip === 'a' ? null : 'a')}
              variant="a"
              isInfoActive={activeTooltip === 'a'}
              tooltipText={optionA.tooltip_heb || 'MISSING: option_a_tooltip_heb'}
            />
            <ClickableToolTile
              key={`b-${mission.mission_id}`}
              image={toolBImage}
              onClick={(e) => handleToolClick('b', e)}
              onInfoClick={() => setActiveTooltip(activeTooltip === 'b' ? null : 'b')}
              variant="b"
              isInfoActive={activeTooltip === 'b'}
              tooltipText={optionB.tooltip_heb || 'MISSING: option_b_tooltip_heb'}
            />
          </div>

          {/* Drag hint removed - click to place mode */}
        </div>
      </div>
    </div>
  );

  // Dragging ghost - disabled since click-to-place mode
  const draggingGhostElement = null;

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

  // Calibration overlay - rendered inside game-stage for coordinate alignment
  const calibrationOverlayElement = useMemo(() => {
    if (!toolEditMode) return null;
    if (mission.mission_id === 'studio_07') {
      return (
        <Mission7CalibrationEditor mission={mission} onBackgroundChange={handleM7BackgroundChange} />
      );
    }
    if (mission.mission_id === 'studio_11') {
      return (
        <>
          <Mission11CalibrationEditor mission={mission} onBackgroundChange={handleM7BackgroundChange} />
          {avatarImage && lockedBgKey === 'gallery_mission11a_bg' && (
            <VisitorCalibrationEditor bgKey="gallery_mission11a_bg" title="M11 Avatar (Tool A)" panelClassName="top-[290px] right-4" visitors={[
              { id: 'm11_avatar', img: avatarImage, label: 'אווטר' },
            ]} />
          )}
          {lockedBgKey === 'gallery_mission11b_bg' && (
            <VisitorCalibrationEditor bgKey="gallery_mission11b_bg" title="M11 Crowd (Tool B)" panelClassName="top-[290px] right-4" visitors={[
              { id: 'm11_crowd', img: m11CrowdAsset, label: 'קהל' },
            ]} />
          )}
        </>
      );
    }
    if (mission.mission_id === 'studio_12') {
      const toolAImg = getToolImage(mission.options.find(o => o.key === 'a')?.asset || '');
      return (
        <>
          <ToolCalibrationEditor
            mission={mission}
            currentBgKey={lockedBgKey}
            onNextMission={onEditorNextMission}
            sceneExtras={sceneExtras}
            onExtraPositionChange={(extraId, x, y, scale) => {
              setExtraOverrides(prev => ({ ...prev, [extraId]: { x, y, scale } }));
            }}
          />
          {toolAImg && (
            <VisitorCalibrationEditor bgKey="gallery_main_desktop" title="M12 Duplicates (A)" panelClassName="top-[290px] right-4" visitors={[
              { id: 'm12_tool_a_1', img: toolAImg, label: 'עותק 1' },
              { id: 'm12_tool_a_2', img: toolAImg, label: 'עותק 2' },
              { id: 'm12_tool_a_3', img: toolAImg, label: 'עותק 3' },
              { id: 'm12_tool_a_4', img: toolAImg, label: 'עותק 4' },
              { id: 'm12_tool_a_5', img: toolAImg, label: 'עותק 5' },
            ]} />
          )}
        </>
      );
    }
    if (mission.mission_id === 'studio_06') {
      return (
        <>
          <ToolCalibrationEditor
            mission={mission}
            currentBgKey={lockedBgKey}
            onNextMission={onEditorNextMission}
            sceneExtras={sceneExtras}
            onExtraPositionChange={(extraId, x, y, scale) => {
              setExtraOverrides(prev => ({ ...prev, [extraId]: { x, y, scale } }));
            }}
          />
          <VisitorCalibrationEditor bgKey="studio_in_workshop_bg" title="M06 Rack (Tool A)" visitors={[
            { id: 'm06_extra_rack', img: m06RackImg, label: 'מתלה (כלי A)' },
          ]} />
        </>
      );
    }
    if (mission.mission_id === 'studio_10') {
      return (
        <>
          <ToolCalibrationEditor
            mission={mission}
            currentBgKey={lockedBgKey}
            onNextMission={onEditorNextMission}
            sceneExtras={sceneExtras}
            onExtraPositionChange={(extraId, x, y, scale) => {
              setExtraOverrides(prev => ({ ...prev, [extraId]: { x, y, scale } }));
            }}
          />
          <VisitorCalibrationEditor bgKey="gallery_mission10_bg" title="M10 Staff" visitors={[
            { id: 'm10_extra_staff', img: femaleStaffSittingImg, label: 'יושבת (כלי A)' },
            { id: 'm10_extra_staff_b', img: femaleStaffStandingImg, label: 'עומדת (כלי B)' },
          ]} />
        </>
      );
    }
    if (mission.mission_id === 'studio_08') {
      return (
        <>
          <ToolCalibrationEditor
            mission={mission}
            currentBgKey={lockedBgKey}
            onNextMission={onEditorNextMission}
            sceneExtras={sceneExtras}
            onExtraPositionChange={(extraId, x, y, scale) => {
              setExtraOverrides(prev => ({ ...prev, [extraId]: { x, y, scale } }));
            }}
          />
          <VisitorCalibrationEditor bgKey={lockedBgKey} title="M08 Visitors" visitors={[
            { id: 'm08_visitor_01', img: visitorM08_01, label: 'מבקר 1' },
            { id: 'm08_visitor_02', img: visitorM08_02, label: 'מבקרת 2' },
            { id: 'm08_visitor_03', img: visitorM08_03, label: 'מבקרת 3' },
            ...(avatarImage ? [{ id: 'm08_avatar', img: avatarImage, label: 'אווטר' }] : []),
          ]} />
        </>
      );
    }
    if (mission.mission_id === 'studio_03') {
      const toolBImg = getToolImage('studio_03_b');
      return (
        <>
          <ToolCalibrationEditor
            mission={mission}
            currentBgKey={lockedBgKey}
            onNextMission={onEditorNextMission}
            sceneExtras={sceneExtras}
            enabledTools={['a']}
            onExtraPositionChange={(extraId, x, y, scale) => {
              setExtraOverrides(prev => ({ ...prev, [extraId]: { x, y, scale } }));
            }}
          />
          {toolBImg && (
            <VisitorCalibrationEditor bgKey={lockedBgKey} title="M03 Bar Tables (B)" panelClassName="top-[290px] right-4" visitors={[
              { id: 'm03_tool_b_1', img: toolBImg, label: 'שולחן 1' },
              { id: 'm03_tool_b_2', img: toolBImg, label: 'שולחן 2' },
              { id: 'm03_tool_b_3', img: toolBImg, label: 'שולחן 3' },
            ]} />
          )}
          <VisitorCalibrationEditor bgKey={lockedBgKey} title="M03 Visitors (B)" panelClassName="top-[520px] right-4" visitors={[
            { id: 'm03_visitor_01', img: visitorM03_01, label: 'מבקר 1' },
            { id: 'm03_visitor_02', img: visitorM03_02, label: 'מבקרת 2' },
            { id: 'm03_visitor_03', img: visitorM03_03, label: 'מבקר 3' },
            { id: 'm03_visitor_04', img: visitorM03_04, label: 'מבקרת 4' },
          ]} />
        </>
      );
    }
    if (mission.mission_id === 'studio_05') {
      return (
        <>
          <ToolCalibrationEditor
            mission={mission}
            currentBgKey={lockedBgKey}
            onNextMission={onEditorNextMission}
            sceneExtras={sceneExtras}
            onExtraPositionChange={(extraId, x, y, scale) => {
              setExtraOverrides(prev => ({ ...prev, [extraId]: { x, y, scale } }));
            }}
          />
          <VisitorCalibrationEditor bgKey={lockedBgKey} title="M05 Visitors" visitors={[
            { id: 'm05_visitor_01', img: visitorM05_01, label: 'עובדת 1' },
            { id: 'm05_visitor_02', img: visitorM05_02, label: 'עובד 2' },
            { id: 'm05_visitor_03', img: visitorM05_03, label: 'מבקר 3' },
          ]} />
        </>
      );
    }
    const optA = mission.options.find(o => o.key === 'a');
    const optB = mission.options.find(o => o.key === 'b');
    const isBranching = mission.phase === 'tb' && optA?.next_bg_override && optB?.next_bg_override && optA.next_bg_override !== optB.next_bg_override;
    if (isBranching) {
      return (
        <BranchingCalibrationEditor
          mission={mission}
          bgKeyA={optA!.next_bg_override!}
          bgKeyB={optB!.next_bg_override!}
          onBackgroundChange={handleM7BackgroundChange}
        />
      );
    }
    return (
      <ToolCalibrationEditor
        mission={mission}
        currentBgKey={lockedBgKey}
        onNextMission={onEditorNextMission}
        sceneExtras={sceneExtras}
        onExtraPositionChange={(extraId, x, y, scale) => {
          setExtraOverrides(prev => ({ ...prev, [extraId]: { x, y, scale } }));
        }}
      />
    );
  }, [toolEditMode, mission, lockedBgKey, sceneExtras, onEditorNextMission, handleM7BackgroundChange]);

  return (
    <>
      <MissionLayout
        stageRef={stageRef}
        onStagePointerDown={handleStagePointerDown}
        onStagePointerMove={handleStagePointerMove}
        onStagePointerUp={handleStagePointerUp}
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
          isMobile && isPanoramic && edgeProximity.edge ? (
            <EdgePanIndicators 
              activeEdge={edgeProximity.edge} 
              intensity={edgeProximity.intensity} 
            />
          ) : null
        }
        isCarryMode={!!carryModeTool}
        isDragging={!!draggingTool}
        onCancelCarry={handleCancelCarry}
        isPanoramic={isPanoramic}
        calibrationOverlay={calibrationOverlayElement}
      />
    </>
  );
}

interface ClickableToolTileProps {
  image: string | undefined;
  onClick: (e: React.MouseEvent) => void;
  onInfoClick: () => void;
  variant: 'a' | 'b';
  isInfoActive: boolean;
  tooltipText: string;
}

const ClickableToolTile = React.forwardRef<HTMLDivElement, ClickableToolTileProps>(function ClickableToolTile({ 
  image, 
  onClick, 
  onInfoClick, 
  variant, 
  isInfoActive,
  tooltipText,
}, ref) {
  return (
    <div ref={ref} className="relative">
      {/* Tool tile - click to select and place */}
      <button
        onClick={onClick}
        className="clickable-tool group relative overflow-visible transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer tool-tile"
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
      </button>

      {/* Info button with tooltip - CSS hover for all devices */}
      <div className="tool-info-wrapper">
        <button 
          className={`tool-info-btn ${isInfoActive ? 'is-active' : ''}`}
          aria-label="מידע על הכלי"
          onClick={(e) => { e.stopPropagation(); onInfoClick(); }}
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
