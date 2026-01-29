// Scene extras layer component - renders team, visitors, and extras based on CSV
import { useMemo } from 'react';
import type { SceneExtra, PickRecord } from '@/types/identity';
import { getSceneExtras } from '@/lib/csvParser';

interface SceneExtrasLayerProps {
  currentMissionId: string;
  currentMissionOrder: number;
  finalPicks: Record<string, PickRecord>;
}

// Anchor positions for extras (same as tool placement)
const ANCHOR_POSITIONS: Record<string, { x: number; y: number }> = {
  wall_back: { x: 50, y: 30 },
  wall_left: { x: 15, y: 45 },
  wall_right: { x: 85, y: 45 },
  floor: { x: 50, y: 75 },
  center: { x: 50, y: 55 },
  ceiling: { x: 50, y: 15 },
};

// Placeholder for scene extra assets (would need actual imports)
// For now, render placeholder divs since we don't have the actual extra assets
function getExtraAsset(_key: string): string | null {
  // These would be actual asset imports like:
  // studio_extra_asset_02, studio_extra_asset_03, etc.
  // For now, return null to skip rendering until assets are added
  return null;
}

export function SceneExtrasLayer({ 
  currentMissionId, 
  currentMissionOrder,
  finalPicks 
}: SceneExtrasLayerProps) {
  const allExtras = useMemo(() => getSceneExtras(), []);

  // Calculate which extras should be visible
  const visibleExtras = useMemo(() => {
    const result: Array<{ extra: SceneExtra; instances: number[] }> = [];
    
    allExtras.forEach(extra => {
      let shouldShow = false;
      
      // Check trigger condition
      if (extra.trigger_when === 'before') {
        // Show if we're at or past this mission
        if (currentMissionOrder >= extra.order) {
          shouldShow = true;
        }
      } else if (extra.trigger_when === 'after') {
        // Show if the specified tool was chosen
        const missionPick = finalPicks[extra.mission_id];
        if (missionPick) {
          const chosenAsset = `${extra.mission_id}_${missionPick.key}`;
          if (extra.trigger_tool_ids.includes(chosenAsset)) {
            shouldShow = true;
          }
        }
      }
      
      // Check despawn condition
      if (shouldShow) {
        if (extra.despawn_mode === 'until_mission_order') {
          const despawnOrder = parseInt(extra.despawn_value, 10);
          if (currentMissionOrder >= despawnOrder) {
            shouldShow = false;
          }
        } else if (extra.despawn_mode === 'remove_after_mission_id') {
          // Check if we've passed this mission
          const despawnMissionPick = finalPicks[extra.despawn_value];
          if (despawnMissionPick) {
            shouldShow = false;
          }
        }
        // 'keep' mode = always visible once triggered (until end)
      }
      
      if (shouldShow) {
        // Create instances based on spawn_count
        const instances = Array.from({ length: extra.spawn_count }, (_, i) => i);
        result.push({ extra, instances });
      }
    });
    
    return result;
  }, [allExtras, currentMissionId, currentMissionOrder, finalPicks]);

  // Don't render if no visible extras
  if (visibleExtras.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-5">
      {visibleExtras.map(({ extra, instances }) => {
        const asset = getExtraAsset(extra.spawn_asset_key);
        const anchor = ANCHOR_POSITIONS[extra.anchor_ref] || ANCHOR_POSITIONS.floor;
        
        // Skip if no asset found
        if (!asset) return null;
        
        return instances.map((idx) => {
          // Spread instances slightly to avoid overlap
          const spreadX = (idx - (instances.length - 1) / 2) * 8;
          const spreadY = (idx % 2) * 3;
          
          return (
            <div
              key={`${extra.mission_id}-${extra.spawn_asset_key}-${idx}`}
              className="absolute animate-fade-in"
              style={{
                left: `${anchor.x + spreadX}%`,
                top: `${anchor.y + spreadY}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <img 
                src={asset}
                alt=""
                className="w-16 h-16 object-contain drop-shadow-md"
              />
            </div>
          );
        });
      })}
    </div>
  );
}
