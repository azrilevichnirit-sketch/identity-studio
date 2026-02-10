import { useMemo } from 'react';
import type { PickRecord, AnchorRef } from '@/types/identity';
import sceneExtrasData from '@/data/studio_scene_extras.json';

// Mission 7 floor clutter assets (existing transparent WEBPs)
import floorArtworks01 from '@/assets/extras/studio_floor_artworks_01.webp';
import floorArtworks02 from '@/assets/extras/studio_floor_artworks_02.webp';
import floorArtworks03 from '@/assets/extras/studio_floor_artworks_03.webp';
import crate01 from '@/assets/extras/studio_crate_01.webp';
import crate02 from '@/assets/extras/studio_crate_02.webp';
import extra02 from '@/assets/extras/studio_extra_asset_02.webp';
import extra03 from '@/assets/extras/studio_extra_asset_03.webp';
import workDesk01 from '@/assets/extras/studio_work_desk_01.webp';
import cncMachine01 from '@/assets/extras/studio_cnc_machine_01.webp';
import coffeeTable01 from '@/assets/extras/studio_coffee_table_01.webp';

// Map asset keys to actual images
const extraAssetMap: Record<string, string> = {
  studio_floor_artworks_01: floorArtworks01,
  studio_floor_artworks_02: floorArtworks02,
  studio_floor_artworks_03: floorArtworks03,
  studio_crate_01: crate01,
  studio_crate_02: crate02,
  studio_extra_asset_02: extra02,
  studio_extra_asset_03: extra03,
  studio_work_desk_01: workDesk01,
  studio_cnc_machine_01: cncMachine01,
  studio_coffee_table_01: coffeeTable01,
};

export interface SpawnedExtra {
  id: string;
  image: string;
  anchorRef: AnchorRef;
  offsetX: number;
  offsetY: number;
  scale: number;
  zLayer: 'back' | 'mid' | 'front';
}

interface SceneExtraRule {
  world: string;
  phase: string;
  order: number;
  mission_id: string;
  trigger_when: 'before' | 'after';
  trigger_tool_ids: string;
  spawn_asset_key: string;
  spawn_count: number;
  placement_mode: string;
  anchor_ref: string;
  despawn_mode: string;
  despawn_value: string;
}

/**
 * Determines which scene extras should be visible based on current mission and picks
 */
export function useSceneExtras(
  currentMissionId: string,
  currentMissionIndex: number,
  placedProps: PickRecord[]
): SpawnedExtra[] {
  return useMemo(() => {
    const extras: SpawnedExtra[] = [];
    const rules = sceneExtrasData as SceneExtraRule[];
    
    // Get list of picked tool IDs
    const pickedToolIds = placedProps.map(p => p.assetName).filter(Boolean);
    
    // Process all rules - Mission 7 now continues the workshop zone
    // and shows extras from earlier missions
    for (const rule of rules) {
      
      // Check if this extra should spawn
      const shouldSpawn = checkShouldSpawn(
        rule,
        currentMissionId,
        currentMissionIndex,
        pickedToolIds as string[]
      );
      
      // Check if this extra should despawn
      const shouldDespawn = checkShouldDespawn(
        rule,
        currentMissionId,
        currentMissionIndex
      );
      
      if (shouldSpawn && !shouldDespawn) {
        const image = extraAssetMap[rule.spawn_asset_key];
        if (!image) continue;
        
        // Single instance per rule
        const count = 1;
        
        for (let i = 0; i < count; i++) {
          // Use scale from anchor map (will be applied in render) - just pass 1.0 here
          // The actual scale comes from getAnchorPosition in the renderer
          extras.push({
            id: `${rule.mission_id}-${rule.order}-${i}`,
            image,
            anchorRef: rule.anchor_ref as AnchorRef,
            offsetX: 0,
            offsetY: 0,
            scale: 1.0, // Base scale - anchor map scale is multiplied in renderer
            zLayer: getZLayerForPlacement(rule.placement_mode),
          });
        }
      }
    }
    
    return extras;
  }, [currentMissionId, currentMissionIndex, placedProps]);
}

function checkShouldSpawn(
  rule: SceneExtraRule,
  currentMissionId: string,
  currentMissionIndex: number,
  pickedToolIds: string[]
): boolean {
  const triggerTools = rule.trigger_tool_ids.split(';').map(s => s.trim());
  
  if (rule.trigger_when === 'before') {
    // For tie-breaker missions, match by exact mission_id only (clean scene per tie-breaker)
    if (rule.mission_id.startsWith('studio_tie_')) {
      return currentMissionId === rule.mission_id;
    }
    // Spawn before the mission - show if we're at or past this mission
    const missionOrder = parseInt(rule.mission_id.replace('studio_', ''), 10);
    return currentMissionIndex + 1 >= missionOrder;
  } else {
    // Spawn after picking specific tools
    return triggerTools.some(toolId => pickedToolIds.includes(toolId));
  }
}

function checkShouldDespawn(
  rule: SceneExtraRule,
  currentMissionId: string,
  currentMissionIndex: number
): boolean {
  if (rule.despawn_mode === 'keep') {
    return false;
  }
  
  if (rule.despawn_mode === 'until_mission_order') {
    const despawnOrder = parseInt(rule.despawn_value, 10);
    return currentMissionIndex + 1 >= despawnOrder;
  }
  
  if (rule.despawn_mode === 'remove_after_mission_id') {
    const despawnMissionOrder = parseInt(
      rule.despawn_value.replace('studio_', ''),
      10
    );
    return currentMissionIndex + 1 > despawnMissionOrder;
  }
  
  return false;
}

function getSpreadOffset(index: number, total: number): number {
  if (total === 1) return 0;
  // Spread NPCs horizontally
  const spread = 15; // percentage spread
  const start = -spread / 2;
  const step = spread / (total - 1);
  return start + step * index;
}

function getZLayerForPlacement(placementMode: string): 'back' | 'mid' | 'front' {
  switch (placementMode) {
    case 'wall':
    case 'wall_full':
    case 'ceiling':
      return 'back';
    case 'floor_near_wall':
      return 'mid';
    case 'floor':
    case 'center':
    default:
      return 'front';
  }
}

export function getExtraImage(assetKey: string): string | null {
  return extraAssetMap[assetKey] || null;
}
