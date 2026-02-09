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
  
  return rows.map((row) => ({
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

// Helper to get anchor coordinates for a specific background and anchor_ref
export function getAnchorPosition(bgKey: string, anchorRef: AnchorRef): { x: number; y: number; scale: number; z_layer: string; flipX: boolean } | null {
  const anchors = getAnchorMap();
  const match = anchors.find(a => a.background_asset_key === bgKey && a.anchor_ref === anchorRef);
  
  if (match) {
    return {
      x: match.x_pct * 100,
      y: match.y_pct * 100,
      scale: match.scale,
      z_layer: match.z_layer,
      flipX: match.flipX || false,
    };
  }
  
  // Fallback defaults
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
