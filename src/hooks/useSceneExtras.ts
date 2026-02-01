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

// Map asset keys to actual images
const extraAssetMap: Record<string, string> = {
  studio_floor_artworks_01: floorArtworks01,
  studio_floor_artworks_02: floorArtworks02,
  studio_floor_artworks_03: floorArtworks03,
  studio_crate_01: crate01,
  studio_crate_02: crate02,
  studio_extra_asset_02: extra02,
  studio_extra_asset_03: extra03,
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
    
    // PRODUCT RULE: Mission 7 is a "clean slate" scene.
    // Only show extras that are SPECIFICALLY defined for studio_07.
    // Do NOT carry over persisted extras from earlier missions.
    const isMission07 = currentMissionId === 'studio_07';
    
    for (const rule of rules) {
      // Mission 7 filter: only show M07-specific extras
      if (isMission07 && rule.mission_id !== 'studio_07') {
        continue;
      }
      
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
        
        // Mission 7 is curated: single instance per rule (no spreading)
        const count = 1;
        
        for (let i = 0; i < count; i++) {
          const isFloorArtwork = rule.spawn_asset_key.includes('floor_artworks');
          const isCrate = rule.spawn_asset_key.includes('crate');
          const baseScale = isFloorArtwork ? 1.0 : isCrate ? 0.9 : 0.85;
          
          extras.push({
            id: `${rule.mission_id}-${rule.order}-${i}`,
            image,
            anchorRef: rule.anchor_ref as AnchorRef,
            offsetX: 0,
            offsetY: 0,
            scale: baseScale,
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
