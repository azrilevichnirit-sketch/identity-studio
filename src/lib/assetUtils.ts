// Asset utilities for loading backgrounds, tools, and avatars

import type { AvatarGender, Mission } from '@/types/identity';

// Background imports
import studioFrontBg from '@/assets/backgrounds/studio_front_stylized_v3.webp';
import studioEntranceViewBg from '@/assets/backgrounds/studio_in_entrance_view_bg.webp';
import studioGalleryBg from '@/assets/backgrounds/studio_in_gallery_bg.webp';
import studioGalleryWallBg from '@/assets/backgrounds/studio_in_gallery_wall_bg.webp';
import studioStorageBg from '@/assets/backgrounds/studio_in_storage_v2.webp';
import studioWorkshopBg from '@/assets/backgrounds/studio_in_workshop_v2.webp';
import studioEntryInsideBg from '@/assets/backgrounds/studio_entry_inside_bg.png';
import galleryMainStylized from '@/assets/backgrounds/gallery_main_stylized_v3.webp';

// Avatar imports
import femaleIdle from '@/assets/avatars/studio_avatar_female_idle.webp';
import femaleWalk from '@/assets/avatars/studio_avatar_female_walk.webp';
import maleIdle from '@/assets/avatars/studio_avatar_male_idle.webp';
import maleWalk from '@/assets/avatars/studio_avatar_male_walk.webp';

// Tool imports - Main missions
import studio01a from '@/assets/tools/studio_01_a.webp';
import studio01b from '@/assets/tools/studio_01_b.webp';
import studio02a from '@/assets/tools/studio_02_a.webp';
import studio02b from '@/assets/tools/studio_02_b.webp';
import studio03a from '@/assets/tools/studio_03_a.webp';
import studio03b from '@/assets/tools/studio_03_b.webp';
import studio04a from '@/assets/tools/studio_04_a.webp';
import studio04b from '@/assets/tools/studio_04_b.webp';
import studio05a from '@/assets/tools/studio_05_a.webp';
import studio05b from '@/assets/tools/studio_05_b.webp';
import studio06a from '@/assets/tools/studio_06_a.webp';
import studio06b from '@/assets/tools/studio_06_b.webp';
import studio07a from '@/assets/tools/studio_07_a.webp';
import studio07b from '@/assets/tools/studio_07_b.webp';
import studio08a from '@/assets/tools/studio_08_a.webp';
import studio08b from '@/assets/tools/studio_08_b.webp';
import studio09a from '@/assets/tools/studio_09_a.webp';
import studio09b from '@/assets/tools/studio_09_b.webp';
import studio10a from '@/assets/tools/studio_10_a.webp';
import studio10b from '@/assets/tools/studio_10_b.webp';
import studio11a from '@/assets/tools/studio_11_a.webp';
import studio11b from '@/assets/tools/studio_11_b.webp';
import studio12a from '@/assets/tools/studio_12_a.webp';
import studio12b from '@/assets/tools/studio_12_b.webp';

// Tool imports - Tie-breaker missions
import studioTie01a from '@/assets/tools/studio_tie_01_a.webp';
import studioTie01b from '@/assets/tools/studio_tie_01_b.webp';
import studioTie02a from '@/assets/tools/studio_tie_02_a.webp';
import studioTie02b from '@/assets/tools/studio_tie_02_b.webp';
import studioTie03a from '@/assets/tools/studio_tie_03_a.webp';
import studioTie03b from '@/assets/tools/studio_tie_03_b.webp';
import studioTie04a from '@/assets/tools/studio_tie_04_a.webp';
import studioTie04b from '@/assets/tools/studio_tie_04_b.webp';
import studioTie05a from '@/assets/tools/studio_tie_05_a.webp';
import studioTie05b from '@/assets/tools/studio_tie_05_b.webp';
import studioTie06a from '@/assets/tools/studio_tie_06_a.webp';
import studioTie06b from '@/assets/tools/studio_tie_06_b.webp';
import studioTie07a from '@/assets/tools/studio_tie_07_a.webp';
import studioTie07b from '@/assets/tools/studio_tie_07_b.webp';
import studioTie08a from '@/assets/tools/studio_tie_08_a.webp';
import studioTie08b from '@/assets/tools/studio_tie_08_b.webp';
import studioTie09a from '@/assets/tools/studio_tie_09_a.webp';
import studioTie09b from '@/assets/tools/studio_tie_09_b.webp';
import studioTie10a from '@/assets/tools/studio_tie_10_a.webp';
import studioTie10b from '@/assets/tools/studio_tie_10_b.webp';
import studioTie11a from '@/assets/tools/studio_tie_11_a.webp';
import studioTie11b from '@/assets/tools/studio_tie_11_b.webp';
import studioTie12a from '@/assets/tools/studio_tie_12_a.webp';
import studioTie12b from '@/assets/tools/studio_tie_12_b.webp';
import studioTie13a from '@/assets/tools/studio_tie_13_a.webp';
import studioTie13b from '@/assets/tools/studio_tie_13_b.webp';
import studioTie14a from '@/assets/tools/studio_tie_14_a.webp';
import studioTie14b from '@/assets/tools/studio_tie_14_b.webp';
import studioTie15a from '@/assets/tools/studio_tie_15_a.webp';
import studioTie15b from '@/assets/tools/studio_tie_15_b.webp';

// Tool asset lookup map
const toolAssets: Record<string, string> = {
  studio_01_a: studio01a,
  studio_01_b: studio01b,
  studio_02_a: studio02a,
  studio_02_b: studio02b,
  studio_03_a: studio03a,
  studio_03_b: studio03b,
  studio_04_a: studio04a,
  studio_04_b: studio04b,
  studio_05_a: studio05a,
  studio_05_b: studio05b,
  studio_06_a: studio06a,
  studio_06_b: studio06b,
  studio_07_a: studio07a,
  studio_07_b: studio07b,
  studio_08_a: studio08a,
  studio_08_b: studio08b,
  studio_09_a: studio09a,
  studio_09_b: studio09b,
  studio_10_a: studio10a,
  studio_10_b: studio10b,
  studio_11_a: studio11a,
  studio_11_b: studio11b,
  studio_12_a: studio12a,
  studio_12_b: studio12b,
  studio_tie_01_a: studioTie01a,
  studio_tie_01_b: studioTie01b,
  studio_tie_02_a: studioTie02a,
  studio_tie_02_b: studioTie02b,
  studio_tie_03_a: studioTie03a,
  studio_tie_03_b: studioTie03b,
  studio_tie_04_a: studioTie04a,
  studio_tie_04_b: studioTie04b,
  studio_tie_05_a: studioTie05a,
  studio_tie_05_b: studioTie05b,
  studio_tie_06_a: studioTie06a,
  studio_tie_06_b: studioTie06b,
  studio_tie_07_a: studioTie07a,
  studio_tie_07_b: studioTie07b,
  studio_tie_08_a: studioTie08a,
  studio_tie_08_b: studioTie08b,
  studio_tie_09_a: studioTie09a,
  studio_tie_09_b: studioTie09b,
  studio_tie_10_a: studioTie10a,
  studio_tie_10_b: studioTie10b,
  studio_tie_11_a: studioTie11a,
  studio_tie_11_b: studioTie11b,
  studio_tie_12_a: studioTie12a,
  studio_tie_12_b: studioTie12b,
  studio_tie_13_a: studioTie13a,
  studio_tie_13_b: studioTie13b,
  studio_tie_14_a: studioTie14a,
  studio_tie_14_b: studioTie14b,
  studio_tie_15_a: studioTie15a,
  studio_tie_15_b: studioTie15b,
};

// Background asset lookup by CSV bg_override name
const backgroundAssets: Record<string, string> = {
  studio_front_bg: studioFrontBg,
  studio_in_entrance_view_bg: studioEntranceViewBg,
  studio_in_gallery_bg: galleryMainStylized, // Use new stylized background
  studio_in_gallery_wall_bg: studioGalleryWallBg,
  studio_in_storage_bg: studioStorageBg,
  studio_in_workshop_bg: studioWorkshopBg,
  studio_entry_inside_bg: galleryMainStylized, // Use new stylized background
  gallery_main_stylized: galleryMainStylized,
};

// Wide panoramic backgrounds for mobile panning (key -> asset)
const panoramicBackgrounds: Record<string, string> = {
  studio_in_gallery_bg: galleryMainStylized,
  studio_entry_inside_bg: galleryMainStylized,
};

export function getPanoramicBackground(bgKey: string): string | null {
  return panoramicBackgrounds[bgKey] || null;
}

// Fallback background mapping by (world, view)
const backgroundFallback: Record<string, string> = {
  'studio_in': studioEntryInsideBg,
  'studio_front': studioFrontBg,
  'studio_out': studioFrontBg,
};

export function getToolImage(assetName: string): string | null {
  return toolAssets[assetName] || null;
}

export function getBackgroundForMission(mission: Mission, previousPickBgOverride?: string): string {
  // Priority 1: Use next_bg_override from previous pick if available
  if (previousPickBgOverride && backgroundAssets[previousPickBgOverride]) {
    return backgroundAssets[previousPickBgOverride];
  }
  
  // Priority 2: Use bg_override from current mission if present
  if (mission.bg_override && backgroundAssets[mission.bg_override]) {
    return backgroundAssets[mission.bg_override];
  }
  
  // Priority 3: Fallback by (world, view)
  const fallbackKey = `${mission.world}_${mission.view}`;
  if (backgroundFallback[fallbackKey]) {
    return backgroundFallback[fallbackKey];
  }
  
  // Default fallback
  return studioEntryInsideBg;
}

// Get the background key (for anchor map lookups)
export function getBackgroundKey(mission: Mission, previousPickBgOverride?: string): string {
  // Priority 1: Use next_bg_override from previous pick if available
  if (previousPickBgOverride) {
    return previousPickBgOverride;
  }
  
  // Priority 2: Use bg_override from current mission if present
  if (mission.bg_override) {
    return mission.bg_override;
  }
  
  // Priority 3: Return default key based on view
  const fallbackKey = `${mission.world}_${mission.view}`;
  const keyMap: Record<string, string> = {
    'studio_in': 'studio_entry_inside_bg',
    'studio_front': 'studio_front_bg',
    'studio_out': 'studio_front_bg',
  };
  
  return keyMap[fallbackKey] || 'studio_entry_inside_bg';
}

export function getBackgroundByName(bgName: string): string | null {
  return backgroundAssets[bgName] || null;
}

export function getAvatarImage(gender: AvatarGender, state: 'idle' | 'walk' = 'idle'): string | null {
  if (!gender) return null;
  
  if (gender === 'female') {
    return state === 'walk' ? femaleWalk : femaleIdle;
  }
  return state === 'walk' ? maleWalk : maleIdle;
}

// Preload backgrounds for smooth transitions
export function preloadBackground(bgName: string): void {
  const bg = backgroundAssets[bgName];
  if (bg) {
    const img = new Image();
    img.src = bg;
  }
}

export function preloadAllBackgrounds(): void {
  Object.values(backgroundAssets).forEach(src => {
    const img = new Image();
    img.src = src;
  });
}
