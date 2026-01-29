import { useMemo } from 'react';
import type { PickRecord, AnchorRef } from '@/types/identity';
import sceneExtrasData from '@/data/studio_scene_extras.json';

// NPC avatar assets available in the project
import femaleStaff from '@/assets/avatars/studio_01_female_staff_walk.webp';
import femaleVisitor1 from '@/assets/avatars/studio_01_female_visitor_walk.webp';
import maleStaff from '@/assets/avatars/studio_01_male_staff_walk.webp';
import maleVisitor1 from '@/assets/avatars/studio_01_male_visitor_walk.webp';
import femaleVisitor2 from '@/assets/avatars/studio_02_female_visitor_walk.webp';
import maleVisitor2 from '@/assets/avatars/studio_02_male_visitor_walk.webp';

// Map abstract asset keys to actual NPC images
const extraAssetMap: Record<string, string> = {
  studio_extra_asset_01: femaleStaff,
  studio_extra_asset_02: maleStaff,
  studio_extra_asset_03: femaleVisitor1,
  studio_extra_asset_04: maleVisitor1,
  studio_extra_asset_05: femaleVisitor2,
  studio_extra_asset_06: maleVisitor2,
  studio_extra_asset_07: maleStaff, // Fallback for additional keys
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
        
        // Generate spawned extras with slight position variations
        const count = Math.min(rule.spawn_count, 3); // Cap at 3 for performance
        for (let i = 0; i < count; i++) {
          extras.push({
            id: `${rule.mission_id}-${rule.order}-${i}`,
            image,
            anchorRef: rule.anchor_ref as AnchorRef,
            offsetX: getSpreadOffset(i, count),
            offsetY: 0,
            scale: 0.6 + Math.random() * 0.2,
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
