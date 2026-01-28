// Asset utilities for loading backgrounds, tools, and avatars

import type { AvatarGender, Mission } from '@/types/identity';

// Background imports
import studioFrontBg from '@/assets/backgrounds/studio_front_bg.webp';
import studioEntranceViewBg from '@/assets/backgrounds/studio_in_entrance_view_bg.webp';
import studioGalleryBg from '@/assets/backgrounds/studio_in_gallery_bg.webp';
import studioGalleryWallBg from '@/assets/backgrounds/studio_in_gallery_wall_bg.webp';
import studioStorageBg from '@/assets/backgrounds/studio_in_storage_bg.webp';
import studioWorkshopBg from '@/assets/backgrounds/studio_in_workshop_bg.webp';
import studioEntryInsideBg from '@/assets/backgrounds/studio_entry_inside_bg.png';

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

// Background mapping based on mission sequence
const backgroundsBySequence: Record<number, string> = {
  1: studioEntryInsideBg,
  2: studioEntryInsideBg,
  3: studioEntryInsideBg,
  4: studioGalleryWallBg,
  5: studioFrontBg,
  6: studioGalleryWallBg,
  7: studioFrontBg,
  8: studioGalleryBg,
  9: studioStorageBg,
  10: studioWorkshopBg,
  11: studioFrontBg,
  12: studioGalleryBg,
};

export function getToolImage(assetName: string): string | null {
  return toolAssets[assetName] || null;
}

export function getBackgroundForMission(mission: Mission): string {
  // Use sequence for main missions, default for tie-breakers
  if (mission.phase === 'main' && mission.sequence in backgroundsBySequence) {
    return backgroundsBySequence[mission.sequence];
  }
  // Tie-breaker default background
  return studioGalleryBg;
}

export function getAvatarImage(gender: AvatarGender, state: 'idle' | 'walk' = 'idle'): string | null {
  if (!gender) return null;
  
  if (gender === 'female') {
    return state === 'walk' ? femaleWalk : femaleIdle;
  }
  return state === 'walk' ? maleWalk : maleIdle;
}
