// JSON data loader for mission and scene data
import type { Mission, MissionOption, HollandCode, PlacementMode, AnchorRef, SceneExtra } from '@/types/identity';

// Import JSON files directly
import studioQuestsData from '@/data/studio_quests_v5.json';
import studioTieData from '@/data/studio_tie_v6.json';
import studioExtrasData from '@/data/studio_scene_extras.json';
import studioAnchorMapData from '@/data/studio_anchor_map.json';

// Anchor coordinate type
export interface AnchorCoordinate {
  background_asset_key: string;
  anchor_ref: AnchorRef;
  x_pct: number;
  y_pct: number;
  scale: number;
  z_layer: 'back' | 'mid' | 'front';
  flipX?: boolean;
}

// Parse a raw quest row into MissionOption
function parseOption(row: Record<string, unknown>, variant: 'a' | 'b'): MissionOption {
  const suffix = variant;
  
  return {
    key: variant,
    holland_code: String(row[`option_${suffix}_code`] || '') as HollandCode,
    asset: String(row[`option_${suffix}_asset`] || ''),
    tooltip_heb: String(row[`option_${suffix}_tooltip_heb`] || '').replace(/^"|"$/g, ''),
    view: String(row[`option_${suffix}_view`] || ''),
    next_bg_override: row[`next_bg_override_${suffix}`] ? String(row[`next_bg_override_${suffix}`]) : undefined,
    placement_mode: (String(row[`placement_mode_${suffix}`]) || 'floor') as PlacementMode,
    anchor_ref: (String(row[`anchor_ref_${suffix}`]) || 'floor') as AnchorRef,
    offset_x: Number(row[`offset_x_${suffix}`]) || 0,
    offset_y: Number(row[`offset_y_${suffix}`]) || 0,
    scale: Number(row[`scale_${suffix}`]) || 1.0,
    persist: (row[`persist_${suffix}`] === 'keep' ? 'keep' : 'temp') as 'keep' | 'temp',
  };
}

// Parse main quests from JSON
export function parseStudioQuests(): Mission[] {
  const rows = studioQuestsData as Record<string, unknown>[];
  
  return rows.map((row) => ({
    world: String(row.world || 'studio'),
    phase: 'main' as const,
    mission_id: String(row.quest_id || ''),
    sequence: Number(row.order) || 0,
    view: String(row.view || 'in'),
    bg_override: row.bg_override ? String(row.bg_override) : undefined,
    task_heb: String(row.task_heb || '').replace(/^"|"$/g, ''),
    options: [
      parseOption(row, 'a'),
      parseOption(row, 'b'),
    ],
  }));
}

// Parse tie-breaker missions from JSON
export function parseStudioTie(): Mission[] {
  const rows = studioTieData as Record<string, unknown>[];
  
  return rows.map((row) => ({
    world: String(row.world || 'studio'),
    phase: 'tb' as const,
    mission_id: String(row.quest_id || ''),
    sequence: Number(row.sequence) || 0,
    view: String(row.view || 'in'),
    bg_override: row.bg_override ? String(row.bg_override) : undefined,
    task_heb: String(row.task_heb || '').replace(/^"|"$/g, ''),
    pair_key: String(row.pair_codes || ''),
    options: [
      parseOption(row, 'a'),
      parseOption(row, 'b'),
    ],
  }));
}

// Parse scene extras from JSON
export function parseSceneExtras(): SceneExtra[] {
  const rows = studioExtrasData as Record<string, unknown>[];
  
  return rows.map((row) => ({
    world: String(row.world || 'studio'),
    phase: String(row.phase || 'main'),
    order: Number(row.order) || 0,
    mission_id: String(row.mission_id || ''),
    trigger_when: (row.trigger_when === 'before' ? 'before' : 'after') as 'before' | 'after',
    trigger_tool_ids: String(row.trigger_tool_ids || '').split(';').map((id: string) => id.trim()).filter(Boolean),
    spawn_asset_key: String(row.spawn_asset_key || ''),
    spawn_count: Number(row.spawn_count) || 1,
    placement_mode: (String(row.placement_mode) || 'floor') as PlacementMode,
    anchor_ref: (String(row.anchor_ref) || 'floor') as AnchorRef,
    note: row.note ? String(row.note) : undefined,
    despawn_mode: (row.despawn_mode || 'keep') as 'keep' | 'until_mission_order' | 'remove_after_mission_id',
    despawn_value: String(row.despawn_value || 'end'),
  }));
}

// Parse anchor map from JSON
export function parseAnchorMap(): AnchorCoordinate[] {
  const rows = studioAnchorMapData as Record<string, unknown>[];
  
  // Filter out _comment marker objects that have no real anchor data
  return rows
    .filter((row) => row.background_asset_key && row.anchor_ref && !('_comment' in row && !row.background_asset_key))
    .filter((row) => String(row.background_asset_key || '') !== '' && String(row.background_asset_key || '') !== '_mobile_overrides_marker')
    .map((row) => ({
    background_asset_key: String(row.background_asset_key || ''),
    anchor_ref: String(row.anchor_ref || 'floor') as AnchorRef,
    x_pct: Number(row.x_pct) || 0.5,
    y_pct: Number(row.y_pct) || 0.5,
    scale: Number(row.scale) || 1.0,
    z_layer: (row.z_layer || 'mid') as 'back' | 'mid' | 'front',
    flipX: row.flipX === true,
  }));
}

// Cached data
let _studioQuests: Mission[] | null = null;
let _studioTie: Mission[] | null = null;
let _sceneExtras: SceneExtra[] | null = null;
let _anchorMap: AnchorCoordinate[] | null = null;

export function getStudioQuests(): Mission[] {
  if (!_studioQuests) {
    _studioQuests = parseStudioQuests();
  }
  return _studioQuests;
}

export function getStudioTie(): Mission[] {
  if (!_studioTie) {
    _studioTie = parseStudioTie();
  }
  return _studioTie;
}

export function getSceneExtras(): SceneExtra[] {
  if (!_sceneExtras) {
    _sceneExtras = parseSceneExtras();
  }
  return _sceneExtras;
}

export function getAnchorMap(): AnchorCoordinate[] {
  if (!_anchorMap) {
    _anchorMap = parseAnchorMap();
  }
  return _anchorMap;
}

const BG_KEY_ALIASES: Record<string, string[]> = {
  studio_doorway_park_view_bg: ['studio_doorway_park_view_v5'],
  studio_doorway_park_view_v5: ['studio_doorway_park_view_bg'],
  studio_in_storage_bg: ['studio_in_storage_v2'],
  studio_in_storage_v2: ['studio_in_storage_bg'],
  studio_in_workshop_bg: ['studio_in_workshop_v3'],
  studio_in_workshop_v3: ['studio_in_workshop_bg'],
  studio_in_entrance_view_bg: ['studio_entrance_view_stylized_v7'],
  studio_entrance_view_stylized_v7: ['studio_in_entrance_view_bg'],
  studio_exterior_bg: ['studio_exterior_park_bg', 'studio_exterior_park_stylized_v3', 'studio_exterior'],
  studio_exterior_park_bg: ['studio_exterior_bg', 'studio_exterior_park_stylized_v3', 'studio_exterior'],
  studio_exterior_park_stylized_v3: ['studio_exterior_bg', 'studio_exterior_park_bg', 'studio_exterior'],
  studio_entry_inside_bg: ['gallery_main_stylized_v3'],
  gallery_main_stylized_v3: ['studio_entry_inside_bg', 'studio_front_bg', 'studio_in_gallery_bg'],
  studio_in_gallery_wall_bg: ['gallery_main_stylized_white_v1'],
  gallery_main_stylized_white_v1: ['studio_in_gallery_wall_bg'],
};

function getBgKeyCandidates(bgKey: string): string[] {
  const variants = BG_KEY_ALIASES[bgKey] ?? [];
  return [bgKey, ...variants];
}

function getMobileFallbackScale(_anchorRef: AnchorRef, scale: number): number {
  // Deep parity fix: do not auto-compress mobile scales.
  // If a _mobile override exists, it is used as-is.
  // If no _mobile override exists, desktop scale is preserved.
  return scale;
}

// Helper to get anchor coordinates for a specific background and anchor_ref.
// On mobile, checks for a mobile-specific override first (anchor_ref + "_mobile").
// This allows per-mission mobile calibration without affecting desktop at all.
export function getAnchorPosition(
  bgKey: string,
  anchorRef: AnchorRef,
  options?: { isMobile?: boolean }
): { x: number; y: number; scale: number; z_layer: string; flipX: boolean } | null {
  const anchors = getAnchorMap();
  const bgCandidates = getBgKeyCandidates(bgKey);

  const toAnchorPosition = (row: AnchorCoordinate) => ({
    x: row.x_pct * 100,
    y: row.y_pct * 100,
    scale: row.scale,
    z_layer: row.z_layer,
    flipX: row.flipX || false,
  });

  // On mobile, try mobile-specific override first (e.g., "m06_tool_a_mobile")
  if (options?.isMobile) {
    const mobileRef = `${anchorRef}_mobile`;
    for (const key of bgCandidates) {
      const mobileMatch = anchors.find(a => a.background_asset_key === key && a.anchor_ref === mobileRef);
      if (mobileMatch) return toAnchorPosition(mobileMatch);
    }
  }

  for (const key of bgCandidates) {
    const match = anchors.find(a => a.background_asset_key === key && a.anchor_ref === anchorRef);
    if (match) {
      const resolved = toAnchorPosition(match);
      if (options?.isMobile) {
        return {
          ...resolved,
          scale: getMobileFallbackScale(anchorRef, resolved.scale),
        };
      }
      return resolved;
    }
  }

  // Fallback defaults - ONLY for generic/structural anchors, NOT mission-specific tool anchors.
  // Mission-specific anchors (m##_tool_*, tie_##_tool_*, *_extra_*) must be explicitly
  // defined in the anchor map. Returning a fallback for them causes tools to appear
  // at wrong positions on backgrounds where they aren't calibrated.
  const isMissionSpecificAnchor = /^(m\d|tie_\d|.*_extra_|.*_desk)/.test(anchorRef);
  if (isMissionSpecificAnchor) {
    return null;
  }

  const fallbacks: Record<string, { x: number; y: number }> = {
    wall_back: { x: 50, y: 40 },
    wall_left: { x: 22, y: 43 },
    wall_right: { x: 78, y: 43 },
    floor: { x: 50, y: 88 },
    center: { x: 50, y: 60 },
    ceiling: { x: 50, y: 14 },
    table_center: { x: 52, y: 74 },
    avatar_hand: { x: 82, y: 55 },
  };

  const fb = fallbacks[anchorRef] || { x: 50, y: 60 };
  return { x: fb.x, y: fb.y, scale: 1, z_layer: 'mid', flipX: false };
}
