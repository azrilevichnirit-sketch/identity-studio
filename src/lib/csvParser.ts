// CSV parsing utilities for mission and scene data
import type { Mission, MissionOption, HollandCode, PlacementMode, AnchorRef, SceneExtra } from '@/types/identity';

// Import CSV files as raw text
import studioQuestsCSV from '@/data/studio_quests_v5.csv?raw';
import studioTieCSV from '@/data/studio_tie_v5.csv?raw';
import studioExtrasCSV from '@/data/studio_scene_extras.csv?raw';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

function parseCSV(csv: string): Record<string, string>[] {
  // Remove BOM if present
  const cleanCSV = csv.replace(/^\uFEFF/, '');
  const lines = cleanCSV.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }
  
  return rows;
}

function parseFloat0(val: string): number {
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
}

function parseOption(row: Record<string, string>, variant: 'a' | 'b'): MissionOption {
  const suffix = variant;
  const upperSuffix = variant.toUpperCase();
  
  return {
    key: variant,
    holland_code: row[`option_${suffix}_code`] as HollandCode,
    asset: row[`option_${suffix}_asset`],
    tooltip_heb: row[`option_${suffix}_tooltip_heb`]?.replace(/^"|"$/g, '') || '',
    view: row[`option_${suffix}_view`],
    placement_mode: (row[`placement_mode_${suffix}`] || 'floor') as PlacementMode,
    anchor_ref: (row[`anchor_ref_${suffix}`] || 'floor') as AnchorRef,
    offset_x: parseFloat0(row[`offset_x_${suffix}`]),
    offset_y: parseFloat0(row[`offset_y_${suffix}`]),
    scale: parseFloat0(row[`scale_${suffix}`]) || 1.0,
    persist: (row[`persist_${suffix}`] === 'keep' ? 'keep' : 'temp') as 'keep' | 'temp',
  };
}

export function parseStudioQuests(): Mission[] {
  const rows = parseCSV(studioQuestsCSV);
  
  return rows.map((row) => ({
    world: row.world,
    phase: 'main' as const,
    mission_id: row.quest_id,
    sequence: parseInt(row.order, 10),
    view: row.view,
    bg_override: row.bg_override || undefined,
    task_heb: row.task_heb?.replace(/^"|"$/g, '') || '',
    options: [
      parseOption(row, 'a'),
      parseOption(row, 'b'),
    ],
  }));
}

export function parseStudioTie(): Mission[] {
  const rows = parseCSV(studioTieCSV);
  
  return rows.map((row) => ({
    world: row.world,
    phase: 'tb' as const,
    mission_id: row.quest_id,
    sequence: parseInt(row.sequence, 10),
    view: row.view,
    bg_override: row.bg_override || undefined,
    task_heb: row.task_heb?.replace(/^"|"$/g, '') || '',
    pair_key: row.pair_codes,
    options: [
      parseOption(row, 'a'),
      parseOption(row, 'b'),
    ],
  }));
}

export function parseSceneExtras(): SceneExtra[] {
  const rows = parseCSV(studioExtrasCSV);
  
  return rows.map((row) => ({
    world: row.world,
    phase: row.phase,
    order: parseInt(row.order, 10),
    mission_id: row.mission_id,
    trigger_when: row.trigger_when as 'before' | 'after',
    trigger_tool_ids: row.trigger_tool_ids?.split(';').map(id => id.trim()) || [],
    spawn_asset_key: row.spawn_asset_key,
    spawn_count: parseInt(row.spawn_count, 10) || 1,
    placement_mode: (row.placement_mode || 'floor') as PlacementMode,
    anchor_ref: (row.anchor_ref || 'floor') as AnchorRef,
    note: row.note,
    despawn_mode: row.despawn_mode as 'keep' | 'until_mission_order' | 'remove_after_mission_id',
    despawn_value: row.despawn_value,
  }));
}

// Parsed mission data (cached)
let _studioQuests: Mission[] | null = null;
let _studioTie: Mission[] | null = null;
let _sceneExtras: SceneExtra[] | null = null;

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
