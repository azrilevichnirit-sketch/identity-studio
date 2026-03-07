// Asset utilities for loading backgrounds, tools, and avatars

import type { AvatarGender, Mission } from '@/types/identity';

// Background imports - 6 backgrounds used:
// 1. Mission 01 STARTING: cracked walls (before paint) - gallery_main_stylized_v3
// 2. Mission 01 Tool A result / Mission 02 (if A chosen): white walls - gallery_main_stylized_white_v1
// 3. Mission 01 Tool B result / Mission 02+ (if B chosen) / M09, M12: main studio - gallery_main_stylized
// 4. Mission 03, 04, 06, 07, 08, 10, 11: workshop - studio_in_workshop_v3
// 5. Mission 05: exterior park - studio_exterior_park_stylized_v3
// 6. Mission 07 entrance view: gallery looking outside - studio_entrance_view_stylized_v7
// IMPORTANT: Mission 1 starts with CRACKED WALLS (v5), not the finished studio!
import galleryCrackedWalls from '@/assets/backgrounds/gallery_main_stylized_v5.webp';
import galleryBoxesBg from '@/assets/backgrounds/gallery_main_boxes_v1.webp';
import galleryMainStylized from '@/assets/backgrounds/gallery_main_stylized.webp';
import galleryMainStylizedWhite from '@/assets/backgrounds/gallery_main_stylized_white_v1.webp';
import studioWorkshopBg from '@/assets/backgrounds/studio_in_workshop_v3.webp';
import studioExteriorBg from '@/assets/backgrounds/studio_exterior_park_stylized_v3.webp';
import studioEntranceViewBg from '@/assets/backgrounds/studio_entrance_view_stylized_v8.webp';
import studioStorageBg from '@/assets/backgrounds/studio_in_storage_v3.webp';
import studioDoorwayParkBg from '@/assets/backgrounds/studio_doorway_park_view_v5.webp';
import galleryMission4Bg from '@/assets/backgrounds/gallery_mission4_bg.webp';
import galleryMission6Bg from '@/assets/backgrounds/gallery_mission6_bg.webp';
import galleryMission8Bg from '@/assets/backgrounds/gallery_mission8_bg.webp';
import galleryMission10Bg from '@/assets/backgrounds/gallery_mission10_bg.webp';
import galleryMission10aBg from '@/assets/backgrounds/gallery_mission10a_bg.webp';
import galleryMission10bBg from '@/assets/backgrounds/gallery_mission10b_bg.webp';
import galleryMission11aBg from '@/assets/backgrounds/gallery_mission11a_bg.webp';
import galleryMission11bBg from '@/assets/backgrounds/gallery_mission11b_bg.webp';
import galleryMission13aBg from '@/assets/backgrounds/gallery_mission13a_bg.webp';
import galleryMission13bBg from '@/assets/backgrounds/gallery_mission13b_bg.webp';
// Mission 13 mobile baked backgrounds
import galleryMission13MobileBg from '@/assets/backgrounds/gallery_mission13_mobile_bg.webp';
import galleryMission13aMobileBg from '@/assets/backgrounds/gallery_mission13a_mobile_bg.webp';
import galleryMission13bMobileBg from '@/assets/backgrounds/gallery_mission13b_mobile_bg.webp';
// Mission 14 desktop baked backgrounds
import galleryMission14aDeskBg from '@/assets/backgrounds/gallery_mission14a_desk_bg.webp';
import galleryMission14bDeskBg from '@/assets/backgrounds/gallery_mission14b_desk_bg.webp';
// Mission 14 mobile baked backgrounds
import galleryMission14MobileBg from '@/assets/backgrounds/gallery_mission14_mobile_bg.webp';
import galleryMission14aMobileBg from '@/assets/backgrounds/gallery_mission14a_mobile_bg.webp';
import galleryMission14bMobileBg from '@/assets/backgrounds/gallery_mission14b_mobile_bg.webp';
import galleryMainStylizedV4 from '@/assets/backgrounds/gallery_main_stylized_v4.webp';
// Tie-breaker T1 baked backgrounds (mobile only for now, desktop uses existing bg)
import galleryTie01MobileBg from '@/assets/backgrounds/gallery_tie01_mobile_bg.webp';
import galleryTie01aMobileBg from '@/assets/backgrounds/gallery_tie01a_mobile_bg.webp';
import galleryTie01bMobileBg from '@/assets/backgrounds/gallery_tie01b_mobile_bg.webp';
const galleryTie01DeskBg = studioStorageBg;
const galleryTie01aDeskBg = studioStorageBg;
const galleryTie01bDeskBg = studioStorageBg;
// Tie-breaker T2 baked backgrounds (mobile only for now)
import galleryTie02MobileBg from '@/assets/backgrounds/gallery_tie02_mobile_bg.webp';
import galleryTie02aMobileBg from '@/assets/backgrounds/gallery_tie02a_mobile_bg.webp';
import galleryTie02bMobileBg from '@/assets/backgrounds/gallery_tie02b_mobile_bg.webp';
const galleryTie02DeskBg = galleryMainStylizedWhite;
const galleryTie02aDeskBg = galleryMainStylizedWhite;
const galleryTie02bDeskBg = galleryMainStylizedWhite;
// Tie-breaker T3 baked backgrounds (mobile only for now)
import galleryTie03MobileBg from '@/assets/backgrounds/gallery_tie03_mobile_bg.webp';
import galleryTie03aMobileBg from '@/assets/backgrounds/gallery_tie03a_mobile_bg.webp';
import galleryTie03bMobileBg from '@/assets/backgrounds/gallery_tie03b_mobile_bg.webp';
const galleryTie03DeskBg = galleryMainStylizedWhite;
const galleryTie03aDeskBg = galleryMainStylizedWhite;
const galleryTie03bDeskBg = galleryMainStylizedWhite;
// Tie-breaker T4 baked backgrounds
import galleryTie04MobileBg from '@/assets/backgrounds/gallery_tie04_mobile_bg.webp';
import galleryTie04aMobileBg from '@/assets/backgrounds/gallery_tie04a_mobile_bg.webp';
import galleryTie04bMobileBg from '@/assets/backgrounds/gallery_tie04b_mobile_bg.webp';
const galleryTie04DeskBg = galleryMainStylizedWhite;
const galleryTie04aDeskBg = galleryMainStylizedWhite;
const galleryTie04bDeskBg = galleryMainStylizedWhite;
// Tie-breaker T5 baked backgrounds (mobile only for now)
import galleryTie05MobileBg from '@/assets/backgrounds/gallery_tie05_mobile_bg.webp';
import galleryTie05aMobileBg from '@/assets/backgrounds/gallery_tie05a_mobile_bg.webp';
import galleryTie05bMobileBg from '@/assets/backgrounds/gallery_tie05b_mobile_bg.webp';
const galleryTie05DeskBg = galleryMainStylizedWhite;
const galleryTie05aDeskBg = galleryMainStylizedWhite;
const galleryTie05bDeskBg = galleryMainStylizedWhite;
// Tie-breaker T6 baked backgrounds (mobile only for now)
import galleryTie06MobileBg from '@/assets/backgrounds/gallery_tie06_mobile_bg.webp';
import galleryTie06aMobileBg from '@/assets/backgrounds/gallery_tie06a_mobile_bg.webp';
import galleryTie06bMobileBg from '@/assets/backgrounds/gallery_tie06b_mobile_bg.webp';
const galleryTie06DeskBg = galleryMainStylizedWhite;
const galleryTie06aDeskBg = galleryMainStylizedWhite;
const galleryTie06bDeskBg = galleryMainStylizedWhite;
// Tie-breaker T7 baked backgrounds
import galleryTie07MobileBg from '@/assets/backgrounds/gallery_tie07_mobile_bg.webp';
import galleryTie07aMobileBg from '@/assets/backgrounds/gallery_tie07a_mobile_bg.webp';
import galleryTie07bMobileBg from '@/assets/backgrounds/gallery_tie07b_mobile_bg.webp';
const galleryTie07DeskBg = galleryMainStylizedWhite;
const galleryTie07aDeskBg = galleryMainStylizedWhite;
const galleryTie07bDeskBg = galleryMainStylizedWhite;
// Tie-breaker T8 baked backgrounds (mobile only)
import galleryTie08MobileBg from '@/assets/backgrounds/gallery_tie08_mobile_bg.webp';
import galleryTie08aMobileBg from '@/assets/backgrounds/gallery_tie08a_mobile_bg.webp';
import galleryTie08bMobileBg from '@/assets/backgrounds/gallery_tie08b_mobile_bg.webp';
const galleryTie08DeskBg = galleryMainStylizedWhite;
const galleryTie08aDeskBg = galleryMainStylizedWhite;
const galleryTie08bDeskBg = galleryMainStylizedWhite;
// Tie-breaker T9 baked backgrounds (mobile only)
import galleryTie09MobileBg from '@/assets/backgrounds/gallery_tie09_mobile_bg.webp';
import galleryTie09aMobileBg from '@/assets/backgrounds/gallery_tie09a_mobile_bg.webp';
import galleryTie09bMobileBg from '@/assets/backgrounds/gallery_tie09b_mobile_bg.webp';
const galleryTie09DeskBg = studioStorageBg;
const galleryTie09aDeskBg = studioStorageBg;
const galleryTie09bDeskBg = studioStorageBg;
// Tie-breaker T10 baked backgrounds (mobile only)
import galleryTie10MobileBg from '@/assets/backgrounds/gallery_tie10_mobile_bg.webp';
import galleryTie10aMobileBg from '@/assets/backgrounds/gallery_tie10a_mobile_bg.webp';
import galleryTie10bMobileBg from '@/assets/backgrounds/gallery_tie10b_mobile_bg.webp';
const galleryTie10DeskBg = galleryMainStylized;
const galleryTie10aDeskBg = galleryMainStylized;
const galleryTie10bDeskBg = galleryMainStylized;
// Tie-breaker T14 baked backgrounds – placeholder aliases until real assets are uploaded
// TODO: Replace these with actual T14 background imports once files are provided
const galleryTie14DeskBg = studioDoorwayParkBg;
const galleryTie14aDeskBg = studioDoorwayParkBg;
const galleryTie14bDeskBg = studioDoorwayParkBg;
const galleryTie14MobileBg = studioDoorwayParkBg;
const galleryTie14aMobileBg = studioDoorwayParkBg;
const galleryTie14bMobileBg = studioDoorwayParkBg;
// Tie-breaker T15 baked backgrounds – placeholder aliases until real assets are uploaded
const galleryTie15DeskBg = galleryMainStylizedWhite;
const galleryTie15aDeskBg = galleryMainStylizedWhite;
const galleryTie15bDeskBg = galleryMainStylizedWhite;
const galleryTie15MobileBg = galleryMainStylizedWhite;
const galleryTie15aMobileBg = galleryMainStylizedWhite;
const galleryTie15bMobileBg = galleryMainStylizedWhite;
import galleryMission15aBg from '@/assets/backgrounds/gallery_mission15a_bg.webp';
import galleryMission15bBg from '@/assets/backgrounds/gallery_mission15b_bg.webp';
// Mission 15 mobile baked backgrounds
import galleryMission15MobileBg from '@/assets/backgrounds/gallery_mission15_mobile_bg.webp';
import galleryMission15aMobileBg from '@/assets/backgrounds/gallery_mission15a_mobile_bg.webp';
import galleryMission15bMobileBg from '@/assets/backgrounds/gallery_mission15b_mobile_bg.webp';
import galleryMobileWideBg from '@/assets/backgrounds/gallery_main_mobile_wide.webp';
import galleryMainDesktopBg from '@/assets/backgrounds/gallery_main_desktop.webp';

// Mobile portrait backgrounds (3072x4096)
import galleryCrackedWallsMobile from '@/assets/backgrounds/gallery_main_stylized_v5_mobile.webp';
// Mission 01 mobile baked backgrounds
import galleryMission1MobileBg from '@/assets/backgrounds/gallery_mission1_mobile_bg.webp';
import galleryMission1aMobileBg from '@/assets/backgrounds/gallery_mission1a_mobile_bg.webp';
import galleryMission1bMobileBg from '@/assets/backgrounds/gallery_mission1b_mobile_bg.webp';
// Mission 01 desktop baked backgrounds
import galleryMission1aDeskBg from '@/assets/backgrounds/gallery_mission1a_desk_bg.webp';
import galleryMission1bDeskBg from '@/assets/backgrounds/gallery_mission1b_desk_bg.webp';
// Mission 02 baked backgrounds
import galleryMission2aDeskBg from '@/assets/backgrounds/gallery_mission2a_desk_bg.webp';
import galleryMission2bDeskBg from '@/assets/backgrounds/gallery_mission2b_desk_bg.webp';
import galleryMission2aMobileBg from '@/assets/backgrounds/gallery_mission2a_mobile_bg.webp';
import galleryMission2bMobileBg from '@/assets/backgrounds/gallery_mission2b_mobile_bg.webp';
import galleryBoxesMobile from '@/assets/backgrounds/gallery_main_boxes_v1_mobile.webp';
import galleryMission3MobileBg from '@/assets/backgrounds/gallery_mission3_mobile_bg.webp';
import galleryMission3aMobileBg from '@/assets/backgrounds/gallery_mission3a_mobile_bg.webp';
import galleryMission3bMobileBg from '@/assets/backgrounds/gallery_mission3b_mobile_bg.webp';
import galleryMission4MobileBg from '@/assets/backgrounds/gallery_mission4_mobile_bg.webp';
import galleryMission4aMobileBg from '@/assets/backgrounds/gallery_mission4a_mobile_bg.webp';
import galleryMission4bMMobileBg from '@/assets/backgrounds/gallery_mission4b_m_mobile_bg.webp';
import galleryMission4bFMobileBg from '@/assets/backgrounds/gallery_mission4b_f_mobile_bg.webp';
import galleryMission5MobileBg from '@/assets/backgrounds/gallery_mission5_mobile_bg.webp';
import galleryMission5bMobileBg from '@/assets/backgrounds/gallery_mission5b_mobile_bg.webp';
import galleryMission5bDeskBg from '@/assets/backgrounds/gallery_mission5b_desk_bg.webp';
import galleryMission6MobileBg from '@/assets/backgrounds/gallery_mission6_mobile_bg.webp';
import galleryMission6aMobileBg from '@/assets/backgrounds/gallery_mission6a_mobile_bg.webp';
import galleryMission6bMobileBg from '@/assets/backgrounds/gallery_mission6b_mobile_bg.webp';
// Mission 07 mobile portrait backgrounds
import galleryMission7MobileBg from '@/assets/backgrounds/gallery_mission7_mobile_bg.webp';
import galleryMission7aMobileBg from '@/assets/backgrounds/gallery_mission7a_mobile_bg.webp';
import galleryMission7bMobileBg from '@/assets/backgrounds/gallery_mission7b_mobile_bg.webp';
// Mission 07 desktop baked backgrounds
import galleryMission7aBg from '@/assets/backgrounds/gallery_mission7a_bg.webp';
import galleryMission7bBg from '@/assets/backgrounds/gallery_mission7b_bg.webp';
// Mission 08 mobile baked backgrounds
import galleryMission8MobileBg from '@/assets/backgrounds/gallery_mission8_mobile_bg.webp';
import galleryMission8aMMobileBg from '@/assets/backgrounds/gallery_mission8a_m_mobile_bg.webp';
import galleryMission8aFMobileBg from '@/assets/backgrounds/gallery_mission8a_f_mobile_bg.webp';
import galleryMission8bMMobileBg from '@/assets/backgrounds/gallery_mission8b_m_mobile_bg.webp';
import galleryMission8bFMobileBg from '@/assets/backgrounds/gallery_mission8b_f_mobile_bg.webp';
// Mission 09 mobile baked backgrounds
import galleryMission9MobileBg from '@/assets/backgrounds/gallery_mission9_mobile_bg.webp';
import galleryMission9aMobileBg from '@/assets/backgrounds/gallery_mission9a_mobile_bg.webp';
import galleryMission9bMobileBg from '@/assets/backgrounds/gallery_mission9b_mobile_bg.webp';
// Mission 10 mobile baked backgrounds
import galleryMission10MobileBg from '@/assets/backgrounds/gallery_mission10_mobile_bg.webp';
import galleryMission10aMobileBg from '@/assets/backgrounds/gallery_mission10a_mobile_bg.webp';
import galleryMission10bMobileBg from '@/assets/backgrounds/gallery_mission10b_mobile_bg.webp';
// Mission 10 desktop baked backgrounds
import galleryMission10aDeskBg from '@/assets/backgrounds/gallery_mission10a_desk_bg.webp';
import galleryMission10bDeskBg from '@/assets/backgrounds/gallery_mission10b_desk_bg.webp';
// Mission 11 desktop baked backgrounds (Tool A gender-specific, Tool B platform-specific)
import galleryMission11bDeskBg from '@/assets/backgrounds/gallery_mission11b_desk_bg.webp';
import galleryMission11aFDeskBg from '@/assets/backgrounds/gallery_mission11a_f_desk_bg.webp';
import galleryMission11aMDeskBg from '@/assets/backgrounds/gallery_mission11a_m_desk_bg.webp';
// Mission 11 mobile baked backgrounds
import galleryMission11aFMobileBg from '@/assets/backgrounds/gallery_mission11a_f_mobile_bg.webp';
import galleryMission11aMMobileBg from '@/assets/backgrounds/gallery_mission11a_m_mobile_bg.webp';
import galleryMission11bMobileBg from '@/assets/backgrounds/gallery_mission11b_mobile_bg.webp';
// Mission 12 mobile baked backgrounds
import galleryMission12MobileBg from '@/assets/backgrounds/gallery_mission12_mobile_bg.webp';
import galleryMission12aMobileBg from '@/assets/backgrounds/gallery_mission12a_mobile_bg.webp';
import galleryMission12bMobileBg from '@/assets/backgrounds/gallery_mission12b_mobile_bg.webp';
// Mission 12 desktop baked backgrounds
import galleryMission12aDeskBg from '@/assets/backgrounds/gallery_mission12a_desk_bg.webp';
import galleryMission12bDeskBg from '@/assets/backgrounds/gallery_mission12b_desk_bg.webp';
// Mission 08 desktop baked backgrounds
import galleryMission8DeskBg from '@/assets/backgrounds/gallery_mission8_desk_bg.webp';
import galleryMission8aMDeskBg from '@/assets/backgrounds/gallery_mission8a_m_desk_bg.webp';
import galleryMission8aFDeskBg from '@/assets/backgrounds/gallery_mission8a_f_desk_bg.webp';
import galleryMission8bMDeskBg from '@/assets/backgrounds/gallery_mission8b_m_desk_bg.webp';
import galleryMission8bFDeskBg from '@/assets/backgrounds/gallery_mission8b_f_desk_bg.webp';
// Mission 03 desktop baked backgrounds
import galleryMission3aDeskBg from '@/assets/backgrounds/gallery_mission3a_desk_bg.webp';
import galleryMission3bDeskBg from '@/assets/backgrounds/gallery_mission3b_desk_bg.webp';
// Mission 04 desktop baked backgrounds
import galleryMission4aDeskBg from '@/assets/backgrounds/gallery_mission4a_desk_bg.webp';
import galleryMission4bMDeskBg from '@/assets/backgrounds/gallery_mission4b_m_desk_bg.webp';
import galleryMission4bFDeskBg from '@/assets/backgrounds/gallery_mission4b_f_desk_bg.webp';
// Mission 06 desktop baked backgrounds
import galleryMission6aDeskBg from '@/assets/backgrounds/gallery_mission6a_desk_bg.webp';
import galleryMission6bDeskBg from '@/assets/backgrounds/gallery_mission6b_desk_bg.webp';
// Mission 09 desktop baked backgrounds
import galleryMission9aDeskBg from '@/assets/backgrounds/gallery_mission9a_desk_bg.webp';
import galleryMission9bDeskBg from '@/assets/backgrounds/gallery_mission9b_desk_bg.webp';

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
import studio03b from '@/assets/tools/studio_03_b_v2.webp';
import studio04a from '@/assets/tools/studio_04_a.webp';
import studio04b from '@/assets/tools/studio_04_b.webp';
import studio05a from '@/assets/tools/studio_05_a.webp';
import studio05aAnimated from '@/assets/tools/studio_05_a_animated.gif';
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
import studio13a from '@/assets/tools/studio_13_a.webp';
import studio13b from '@/assets/tools/studio_13_b.webp';
import studio14a from '@/assets/tools/studio_14_a.webp';
import studio14b from '@/assets/tools/studio_14_b.webp';
import studio15a from '@/assets/tools/studio_15_a.webp';
import studio15b from '@/assets/tools/studio_15_b.webp';

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
  studio_05_a_animated: studio05aAnimated,
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
  studio_13_a: studio13a,
  studio_13_b: studio13b,
  studio_14_a: studio14a,
  studio_14_b: studio14b,
  studio_15_a: studio15a,
  studio_15_b: studio15b,
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

// Background asset lookup - 6 backgrounds used:
// 1. Mission 01 STARTING: cracked walls (v3) - galleryCrackedWalls
// 2. Mission 01 Tool A result / Mission 02 (if A): white walls - galleryMainStylizedWhite  
// 3. Mission 01 Tool B result / Mission 02 (if B) / M09, M12: main studio - galleryMainStylized
// 4. Mission 03, 04, 06, 07, 08, 10, 11: workshop - studioWorkshopBg
// 5. Mission 05: exterior park - studioExteriorBg
// 6. Mission 07 entrance: gallery looking outside - studioEntranceViewBg
const backgroundAssets: Record<string, string> = {
  // Mission 01 starting bg -> CRACKED WALLS (v3)
  studio_front_bg: galleryCrackedWalls,
  studio_in_gallery_bg: galleryCrackedWalls,
  studio_entry_inside_bg: galleryCrackedWalls,
  gallery_main_stylized_v3: galleryCrackedWalls,
  
  // Mission 02: boxes/moving scene
  gallery_main_boxes_v1: galleryBoxesBg,
  
  // Mission 01 Tool B result / Mission 02 (if B chosen) / M09, M12: main studio (finished)
  gallery_main_stylized: galleryMainStylized,
  gallery_main_stylized_v4: galleryMainStylizedV4,
  gallery_mission15a_bg: galleryMission15aBg,
  gallery_mission15b_bg: galleryMission15bBg,
  // Mission 15 mobile baked backgrounds
  gallery_mission15_mobile_bg: galleryMission15MobileBg,
  gallery_mission15a_mobile_bg: galleryMission15aMobileBg,
  gallery_mission15b_mobile_bg: galleryMission15bMobileBg,
  
  // Mission 01 Tool A result / Mission 02 (if A chosen): white walls (after paint)
  studio_in_gallery_wall_bg: galleryMainStylizedWhite,
  gallery_main_stylized_white: galleryMainStylizedWhite,
  gallery_main_stylized_white_v1: galleryMainStylizedWhite,
  
  // Storage room (Mission 07 Tool A destination, Mission 14 base)
  studio_in_storage_bg: studioStorageBg,
  // Mission 14 desktop baked backgrounds
  gallery_mission14a_desk_bg: galleryMission14aDeskBg,
  gallery_mission14b_desk_bg: galleryMission14bDeskBg,
  // Mission 14 mobile baked backgrounds
  gallery_mission14_mobile_bg: galleryMission14MobileBg,
  gallery_mission14a_mobile_bg: galleryMission14aMobileBg,
  gallery_mission14b_mobile_bg: galleryMission14bMobileBg,
  
  // Mission 07: gallery looking outside
  studio_in_entrance_view_bg: studioEntranceViewBg,

  // Workshop (Mission 03, 04, 06, 07, 08, 10, 11)
  studio_in_workshop_bg: studioWorkshopBg,
  
  // Exterior (Mission 05)
  studio_exterior_bg: studioExteriorBg,
  studio_exterior_park_bg: studioExteriorBg,
  studio_exterior: studioExteriorBg,
  
  // Doorway park view (Mission 03, Tie-breaker T14)
  studio_doorway_park_view_bg: studioDoorwayParkBg,
  studio_doorway_park_view_v5: studioDoorwayParkBg,
  // Tie-breaker T1 baked backgrounds
  gallery_tie01_desk_bg: galleryTie01DeskBg,
  gallery_tie01a_desk_bg: galleryTie01aDeskBg,
  gallery_tie01b_desk_bg: galleryTie01bDeskBg,
  gallery_tie01a_bg: galleryTie01aDeskBg,
  gallery_tie01b_bg: galleryTie01bDeskBg,
  gallery_tie01_mobile_bg: galleryTie01MobileBg,
  gallery_tie01a_mobile_bg: galleryTie01aMobileBg,
  gallery_tie01b_mobile_bg: galleryTie01bMobileBg,
  // Tie-breaker T2 baked backgrounds
  gallery_tie02_desk_bg: galleryTie02DeskBg,
  gallery_tie02a_desk_bg: galleryTie02aDeskBg,
  gallery_tie02b_desk_bg: galleryTie02bDeskBg,
  gallery_tie02a_bg: galleryTie02aDeskBg,
  gallery_tie02b_bg: galleryTie02bDeskBg,
  gallery_tie02_mobile_bg: galleryTie02MobileBg,
  gallery_tie02a_mobile_bg: galleryTie02aMobileBg,
  gallery_tie02b_mobile_bg: galleryTie02bMobileBg,
  // Tie-breaker T3 baked backgrounds
  gallery_tie03_desk_bg: galleryTie03DeskBg,
  gallery_tie03a_desk_bg: galleryTie03aDeskBg,
  gallery_tie03b_desk_bg: galleryTie03bDeskBg,
  gallery_tie03a_bg: galleryTie03aDeskBg,
  gallery_tie03b_bg: galleryTie03bDeskBg,
  gallery_tie03_mobile_bg: galleryTie03MobileBg,
  gallery_tie03a_mobile_bg: galleryTie03aMobileBg,
  gallery_tie03b_mobile_bg: galleryTie03bMobileBg,
  // Tie-breaker T4 baked backgrounds
  gallery_tie04_desk_bg: galleryTie04DeskBg,
  gallery_tie04a_desk_bg: galleryTie04aDeskBg,
  gallery_tie04b_desk_bg: galleryTie04bDeskBg,
  gallery_tie04a_bg: galleryTie04aDeskBg,
  gallery_tie04b_bg: galleryTie04bDeskBg,
  gallery_tie04_mobile_bg: galleryTie04MobileBg,
  gallery_tie04a_mobile_bg: galleryTie04aMobileBg,
  gallery_tie04b_mobile_bg: galleryTie04bMobileBg,
  // Tie-breaker T5 baked backgrounds
  gallery_tie05_desk_bg: galleryTie05DeskBg,
  gallery_tie05a_desk_bg: galleryTie05aDeskBg,
  gallery_tie05b_desk_bg: galleryTie05bDeskBg,
  gallery_tie05a_bg: galleryTie05aDeskBg,
  gallery_tie05b_bg: galleryTie05bDeskBg,
  gallery_tie05_mobile_bg: galleryTie05MobileBg,
  gallery_tie05a_mobile_bg: galleryTie05aMobileBg,
  gallery_tie05b_mobile_bg: galleryTie05bMobileBg,
  // Tie-breaker T6 baked backgrounds
  gallery_tie06_desk_bg: galleryTie06DeskBg,
  gallery_tie06a_desk_bg: galleryTie06aDeskBg,
  gallery_tie06b_desk_bg: galleryTie06bDeskBg,
  gallery_tie06a_bg: galleryTie06aDeskBg,
  gallery_tie06b_bg: galleryTie06bDeskBg,
  gallery_tie06_mobile_bg: galleryTie06MobileBg,
  gallery_tie06a_mobile_bg: galleryTie06aMobileBg,
  gallery_tie06b_mobile_bg: galleryTie06bMobileBg,
  // Tie-breaker T7 baked backgrounds
  gallery_tie07_desk_bg: galleryTie07DeskBg,
  gallery_tie07a_desk_bg: galleryTie07aDeskBg,
  gallery_tie07b_desk_bg: galleryTie07bDeskBg,
  gallery_tie07a_bg: galleryTie07aDeskBg,
  gallery_tie07b_bg: galleryTie07bDeskBg,
  gallery_tie07_mobile_bg: galleryTie07MobileBg,
  gallery_tie07a_mobile_bg: galleryTie07aMobileBg,
  gallery_tie07b_mobile_bg: galleryTie07bMobileBg,
  // Tie-breaker T14 baked backgrounds
  gallery_tie14_desk_bg: galleryTie14DeskBg,
  gallery_tie14a_desk_bg: galleryTie14aDeskBg,
  gallery_tie14b_desk_bg: galleryTie14bDeskBg,
  gallery_tie14a_bg: galleryTie14aDeskBg,
  gallery_tie14b_bg: galleryTie14bDeskBg,
  gallery_tie14_mobile_bg: galleryTie14MobileBg,
  gallery_tie14a_mobile_bg: galleryTie14aMobileBg,
  gallery_tie14b_mobile_bg: galleryTie14bMobileBg,
  // Tie-breaker T15 baked backgrounds
  gallery_tie15_desk_bg: galleryTie15DeskBg,
  gallery_tie15a_desk_bg: galleryTie15aDeskBg,
  gallery_tie15b_desk_bg: galleryTie15bDeskBg,
  gallery_tie15a_bg: galleryTie15aDeskBg,
  gallery_tie15b_bg: galleryTie15bDeskBg,
  gallery_tie15_mobile_bg: galleryTie15MobileBg,
  gallery_tie15a_mobile_bg: galleryTie15aMobileBg,
  gallery_tie15b_mobile_bg: galleryTie15bMobileBg,
  
  // Mission 04 background
  gallery_mission4_bg: galleryMission4Bg,
  
  // Mission 06 background
  gallery_mission6_bg: galleryMission6Bg,
  
  // Mission 08 background
  gallery_mission8_bg: galleryMission8Bg,
  gallery_mission8_desk_bg: galleryMission8DeskBg,
  gallery_mission8a_m_desk_bg: galleryMission8aMDeskBg,
  gallery_mission8a_f_desk_bg: galleryMission8aFDeskBg,
  gallery_mission8b_m_desk_bg: galleryMission8bMDeskBg,
  gallery_mission8b_f_desk_bg: galleryMission8bFDeskBg,
  
  // Mission 10 backgrounds
  gallery_mission10_bg: galleryMission10Bg,
  gallery_mission10a_bg: galleryMission10aBg,
  gallery_mission10b_bg: galleryMission10bBg,
  gallery_mission10a_desk_bg: galleryMission10aDeskBg,
  gallery_mission10b_desk_bg: galleryMission10bDeskBg,
  
  // Mission 11 backgrounds
  gallery_mission11a_bg: galleryMission11aBg,
  gallery_mission11b_bg: galleryMission11bBg,
  gallery_mission11b_desk_bg: galleryMission11bDeskBg,
  gallery_mission11a_f_desk_bg: galleryMission11aFDeskBg,
  gallery_mission11a_m_desk_bg: galleryMission11aMDeskBg,
  gallery_mission11a_f_mobile_bg: galleryMission11aFMobileBg,
  gallery_mission11a_m_mobile_bg: galleryMission11aMMobileBg,
  gallery_mission11b_mobile_bg: galleryMission11bMobileBg,
  // Mission 12 mobile baked
  gallery_mission12_mobile_bg: galleryMission12MobileBg,
  gallery_mission12a_mobile_bg: galleryMission12aMobileBg,
  gallery_mission12b_mobile_bg: galleryMission12bMobileBg,
  // Mission 12 desktop baked
  gallery_mission12a_desk_bg: galleryMission12aDeskBg,
  gallery_mission12b_desk_bg: galleryMission12bDeskBg,
  
  // Gallery mobile wide (Mission 11 Tool B destination)
  gallery_main_mobile_wide: galleryMobileWideBg,
  
  // Gallery main desktop (Mission 12)
  gallery_main_desktop: galleryMainDesktopBg,
  
  // Mission 13 backgrounds
  gallery_mission13a_bg: galleryMission13aBg,
  gallery_mission13b_bg: galleryMission13bBg,
  gallery_mission13_mobile_bg: galleryMission13MobileBg,
  gallery_mission13a_mobile_bg: galleryMission13aMobileBg,
  gallery_mission13b_mobile_bg: galleryMission13bMobileBg,
  
  // Mission 03 mobile baked backgrounds (portrait, mobile-only)
  gallery_mission3a_mobile_bg: galleryMission3aMobileBg,
  gallery_mission3b_mobile_bg: galleryMission3bMobileBg,
  
  // Mission 04 mobile baked backgrounds (portrait, mobile-only)
  gallery_mission4_mobile_bg: galleryMission4MobileBg,
  gallery_mission4a_mobile_bg: galleryMission4aMobileBg,
  gallery_mission4b_m_mobile_bg: galleryMission4bMMobileBg,
  gallery_mission4b_f_mobile_bg: galleryMission4bFMobileBg,
  // Mission 05 baked backgrounds
  gallery_mission5b_mobile_bg: galleryMission5bMobileBg,
  gallery_mission5b_desk_bg: galleryMission5bDeskBg,
  // Mission 06 mobile baked backgrounds
  gallery_mission6_mobile_bg: galleryMission6MobileBg,
   gallery_mission6a_mobile_bg: galleryMission6aMobileBg,
   gallery_mission6b_mobile_bg: galleryMission6bMobileBg,
   // Mission 07 mobile baked backgrounds
   gallery_mission7_mobile_bg: galleryMission7MobileBg,
   gallery_mission7a_mobile_bg: galleryMission7aMobileBg,
   gallery_mission7b_mobile_bg: galleryMission7bMobileBg,
   // Mission 07 desktop baked backgrounds
   gallery_mission7a_bg: galleryMission7aBg,
   gallery_mission7b_bg: galleryMission7bBg,
   // Mission 08 mobile baked backgrounds
   gallery_mission8_mobile_bg: galleryMission8MobileBg,
   gallery_mission8a_m_mobile_bg: galleryMission8aMMobileBg,
   gallery_mission8a_f_mobile_bg: galleryMission8aFMobileBg,
   gallery_mission8b_m_mobile_bg: galleryMission8bMMobileBg,
    gallery_mission8b_f_mobile_bg: galleryMission8bFMobileBg,
   // Mission 09 mobile baked backgrounds
   gallery_mission9_mobile_bg: galleryMission9MobileBg,
   gallery_mission9a_mobile_bg: galleryMission9aMobileBg,
   gallery_mission9b_mobile_bg: galleryMission9bMobileBg,
   // Mission 03 desktop baked backgrounds
   gallery_mission3a_desk_bg: galleryMission3aDeskBg,
   gallery_mission3b_desk_bg: galleryMission3bDeskBg,
   // Mission 04 desktop baked backgrounds
   gallery_mission4a_desk_bg: galleryMission4aDeskBg,
   gallery_mission4b_m_desk_bg: galleryMission4bMDeskBg,
   gallery_mission4b_f_desk_bg: galleryMission4bFDeskBg,
   // Mission 06 desktop baked backgrounds
   gallery_mission6a_desk_bg: galleryMission6aDeskBg,
   gallery_mission6b_desk_bg: galleryMission6bDeskBg,
   // Mission 09 desktop baked backgrounds
   gallery_mission9a_desk_bg: galleryMission9aDeskBg,
   gallery_mission9b_desk_bg: galleryMission9bDeskBg,
   // Mission 10 mobile baked backgrounds
   gallery_mission10_mobile_bg: galleryMission10MobileBg,
   gallery_mission10a_mobile_bg: galleryMission10aMobileBg,
   gallery_mission10b_mobile_bg: galleryMission10bMobileBg,
   // Mission 01 mobile baked backgrounds
   gallery_mission1_mobile_bg: galleryMission1MobileBg,
   gallery_mission1a_mobile_bg: galleryMission1aMobileBg,
   gallery_mission1b_mobile_bg: galleryMission1bMobileBg,
   // Mission 01 desktop baked backgrounds
   gallery_mission1a_desk_bg: galleryMission1aDeskBg,
   gallery_mission1b_desk_bg: galleryMission1bDeskBg,
   // Mission 02 baked backgrounds
   gallery_mission2a_desk_bg: galleryMission2aDeskBg,
   gallery_mission2b_desk_bg: galleryMission2bDeskBg,
   gallery_mission2a_mobile_bg: galleryMission2aMobileBg,
   gallery_mission2b_mobile_bg: galleryMission2bMobileBg,
};

// Wide panoramic backgrounds for mobile panning (key -> asset)
const panoramicBackgrounds: Record<string, string> = {
  // Mission 01: cracked walls
  studio_front_bg: galleryCrackedWalls,
  studio_in_gallery_bg: galleryCrackedWalls,
  studio_entry_inside_bg: galleryCrackedWalls,
  gallery_main_stylized_v3: galleryCrackedWalls,
  gallery_main_boxes_v1: galleryBoxesBg,
  // Main studio (finished)
  gallery_main_stylized: galleryMainStylized,
  gallery_main_stylized_v4: galleryMainStylizedV4,
  gallery_mission15a_bg: galleryMission15aBg,
  gallery_mission15b_bg: galleryMission15bBg,
  // White walls (Mission 02 if Tool A was chosen)
  studio_in_gallery_wall_bg: galleryMainStylizedWhite,
  gallery_main_stylized_white: galleryMainStylizedWhite,
  gallery_main_stylized_white_v1: galleryMainStylizedWhite,
  // Other rooms
  studio_in_entrance_view_bg: studioEntranceViewBg,
  studio_in_workshop_bg: studioWorkshopBg,
  studio_in_storage_bg: studioStorageBg,
  studio_exterior_bg: studioExteriorBg,
  studio_exterior_park_bg: studioExteriorBg,
  studio_doorway_park_view_bg: studioDoorwayParkBg,
  studio_doorway_park_view_v5: studioDoorwayParkBg,
  gallery_mission4_bg: galleryMission4Bg,
  gallery_mission6_bg: galleryMission6Bg,
  gallery_mission8_bg: galleryMission8Bg,
  gallery_mission10_bg: galleryMission10Bg,
  gallery_mission10a_bg: galleryMission10aBg,
  gallery_mission10b_bg: galleryMission10bBg,
  gallery_main_mobile_wide: galleryMobileWideBg,
  gallery_main_desktop: galleryMainDesktopBg,
  gallery_mission13a_bg: galleryMission13aBg,
  gallery_mission13b_bg: galleryMission13bBg,
  gallery_mission4_mobile_bg: galleryMission4MobileBg,
  gallery_mission4a_mobile_bg: galleryMission4aMobileBg,
  gallery_mission4b_m_mobile_bg: galleryMission4bMMobileBg,
  gallery_mission4b_f_mobile_bg: galleryMission4bFMobileBg,
};

export function getPanoramicBackground(bgKey: string): string | null {
  return panoramicBackgrounds[bgKey] || null;
}

// Portrait mobile backgrounds (3072x4096) — used instead of panoramic on mobile
// When a portrait version exists, the mobile view uses it directly (no panning needed)
const mobilePortraitBackgrounds: Record<string, string> = {
   // Mission 01: base portrait + baked results
   gallery_main_stylized_v3: galleryCrackedWallsMobile,
   gallery_main_stylized_v5: galleryCrackedWallsMobile,
   studio_entry_inside_bg: galleryCrackedWallsMobile,
   studio_front_bg: galleryCrackedWallsMobile,
   studio_in_gallery_bg: galleryCrackedWallsMobile,
   gallery_mission1_mobile_bg: galleryMission1MobileBg,
   gallery_mission1a_mobile_bg: galleryMission1aMobileBg,
   gallery_mission1b_mobile_bg: galleryMission1bMobileBg,
   // Mission 02: base portrait + baked results
   gallery_main_boxes_v1: galleryBoxesMobile,
   gallery_mission2a_mobile_bg: galleryMission2aMobileBg,
   gallery_mission2b_mobile_bg: galleryMission2bMobileBg,
  // Mission 03: doorway park view
  studio_doorway_park_view_bg: galleryMission3MobileBg,
  studio_doorway_park_view_v5: galleryMission3MobileBg,
  // Mission 03 baked results (mobile only)
  gallery_mission3a_mobile_bg: galleryMission3aMobileBg,
  gallery_mission3b_mobile_bg: galleryMission3bMobileBg,
  // Mission 04: base portrait + baked results (mobile only)
  gallery_mission4_bg: galleryMission4MobileBg,
  gallery_mission4a_mobile_bg: galleryMission4aMobileBg,
  gallery_mission4b_m_mobile_bg: galleryMission4bMMobileBg,
  gallery_mission4b_f_mobile_bg: galleryMission4bFMobileBg,
  // Mission 05: base portrait + baked Tool B result (mobile only)
  studio_exterior_bg: galleryMission5MobileBg,
  studio_exterior_park_bg: galleryMission5MobileBg,
  gallery_mission5b_mobile_bg: galleryMission5bMobileBg,
  // Mission 06: base portrait + baked results (mobile only)
  gallery_mission6_bg: galleryMission6MobileBg,
  gallery_mission6_mobile_bg: galleryMission6MobileBg,
  gallery_mission6a_mobile_bg: galleryMission6aMobileBg,
  gallery_mission6b_mobile_bg: galleryMission6bMobileBg,
   // Mission 07: base portrait + baked results (mobile only)
   studio_in_entrance_view_bg: galleryMission7MobileBg,
   gallery_mission7_mobile_bg: galleryMission7MobileBg,
   gallery_mission7a_mobile_bg: galleryMission7aMobileBg,
   gallery_mission7b_mobile_bg: galleryMission7bMobileBg,
   // Mission 08: base portrait + gender-specific baked results (mobile only)
   gallery_mission8_bg: galleryMission8MobileBg,
   gallery_mission8_mobile_bg: galleryMission8MobileBg,
   gallery_mission8a_m_mobile_bg: galleryMission8aMMobileBg,
   gallery_mission8a_f_mobile_bg: galleryMission8aFMobileBg,
   gallery_mission8b_m_mobile_bg: galleryMission8bMMobileBg,
    gallery_mission8b_f_mobile_bg: galleryMission8bFMobileBg,
   // Mission 09: base portrait + baked results (mobile only)
   gallery_mission9_mobile_bg: galleryMission9MobileBg,
   gallery_mission9a_mobile_bg: galleryMission9aMobileBg,
   gallery_mission9b_mobile_bg: galleryMission9bMobileBg,
   // Mission 10: base portrait + baked results (mobile only)
   gallery_mission10_bg: galleryMission10MobileBg,
   gallery_mission10_mobile_bg: galleryMission10MobileBg,
   gallery_mission10a_bg: galleryMission10aMobileBg,
   gallery_mission10a_mobile_bg: galleryMission10aMobileBg,
   gallery_mission10b_bg: galleryMission10bMobileBg,
   gallery_mission10b_mobile_bg: galleryMission10bMobileBg,
   // Mission 11: gender-specific Tool A + Tool B (mobile only)
   gallery_mission11a_f_mobile_bg: galleryMission11aFMobileBg,
   gallery_mission11a_m_mobile_bg: galleryMission11aMMobileBg,
   gallery_mission11b_mobile_bg: galleryMission11bMobileBg,
   // Mission 12
   gallery_mission12_mobile_bg: galleryMission12MobileBg,
   gallery_mission12a_mobile_bg: galleryMission12aMobileBg,
   gallery_mission12b_mobile_bg: galleryMission12bMobileBg,
   // Mission 13
   gallery_mission13_mobile_bg: galleryMission13MobileBg,
   gallery_mission13a_mobile_bg: galleryMission13aMobileBg,
   gallery_mission13b_mobile_bg: galleryMission13bMobileBg,
   // Mission 14
   gallery_mission14_mobile_bg: galleryMission14MobileBg,
   gallery_mission14a_mobile_bg: galleryMission14aMobileBg,
   gallery_mission14b_mobile_bg: galleryMission14bMobileBg,
   // Mission 15
   gallery_mission15_mobile_bg: galleryMission15MobileBg,
   gallery_mission15a_mobile_bg: galleryMission15aMobileBg,
   gallery_mission15b_mobile_bg: galleryMission15bMobileBg,
   // Tie-breaker T1
   gallery_tie01_desk_bg: galleryTie01MobileBg,
   gallery_tie01_mobile_bg: galleryTie01MobileBg,
   gallery_tie01a_mobile_bg: galleryTie01aMobileBg,
   gallery_tie01b_mobile_bg: galleryTie01bMobileBg,
   gallery_tie01a_bg: galleryTie01aMobileBg,
   gallery_tie01b_bg: galleryTie01bMobileBg,
   // Tie-breaker T2
   gallery_tie02_desk_bg: galleryTie02MobileBg,
   gallery_tie02_mobile_bg: galleryTie02MobileBg,
   gallery_tie02a_mobile_bg: galleryTie02aMobileBg,
   gallery_tie02b_mobile_bg: galleryTie02bMobileBg,
   gallery_tie02a_bg: galleryTie02aMobileBg,
   gallery_tie02b_bg: galleryTie02bMobileBg,
   // Tie-breaker T3
   gallery_tie03_desk_bg: galleryTie03MobileBg,
   gallery_tie03_mobile_bg: galleryTie03MobileBg,
   gallery_tie03a_mobile_bg: galleryTie03aMobileBg,
   gallery_tie03b_mobile_bg: galleryTie03bMobileBg,
   gallery_tie03a_bg: galleryTie03aMobileBg,
   gallery_tie03b_bg: galleryTie03bMobileBg,
   // Tie-breaker T4
   gallery_tie04_desk_bg: galleryTie04MobileBg,
   gallery_tie04_mobile_bg: galleryTie04MobileBg,
   gallery_tie04a_mobile_bg: galleryTie04aMobileBg,
   gallery_tie04b_mobile_bg: galleryTie04bMobileBg,
   gallery_tie04a_bg: galleryTie04aMobileBg,
   gallery_tie04b_bg: galleryTie04bMobileBg,
   // Tie-breaker T5
   gallery_tie05_desk_bg: galleryTie05MobileBg,
   gallery_tie05_mobile_bg: galleryTie05MobileBg,
   gallery_tie05a_mobile_bg: galleryTie05aMobileBg,
   gallery_tie05b_mobile_bg: galleryTie05bMobileBg,
   gallery_tie05a_bg: galleryTie05aMobileBg,
   gallery_tie05b_bg: galleryTie05bMobileBg,
   // Tie-breaker T6
   gallery_tie06_desk_bg: galleryTie06MobileBg,
   gallery_tie06_mobile_bg: galleryTie06MobileBg,
   gallery_tie06a_mobile_bg: galleryTie06aMobileBg,
   gallery_tie06b_mobile_bg: galleryTie06bMobileBg,
   gallery_tie06a_bg: galleryTie06aMobileBg,
   gallery_tie06b_bg: galleryTie06bMobileBg,
   // Tie-breaker T7
   gallery_tie07_desk_bg: galleryTie07MobileBg,
   gallery_tie07_mobile_bg: galleryTie07MobileBg,
   gallery_tie07a_mobile_bg: galleryTie07aMobileBg,
   gallery_tie07b_mobile_bg: galleryTie07bMobileBg,
   gallery_tie07a_bg: galleryTie07aMobileBg,
   gallery_tie07b_bg: galleryTie07bMobileBg,
   // Tie-breaker T14
   gallery_tie14_desk_bg: galleryTie14MobileBg,
   gallery_tie14_mobile_bg: galleryTie14MobileBg,
   gallery_tie14a_mobile_bg: galleryTie14aMobileBg,
   gallery_tie14b_mobile_bg: galleryTie14bMobileBg,
   gallery_tie14a_bg: galleryTie14aMobileBg,
   gallery_tie14b_bg: galleryTie14bMobileBg,
   // Tie-breaker T15
   gallery_tie15_desk_bg: galleryTie15MobileBg,
   gallery_tie15_mobile_bg: galleryTie15MobileBg,
   gallery_tie15a_mobile_bg: galleryTie15aMobileBg,
   gallery_tie15b_mobile_bg: galleryTie15bMobileBg,
   gallery_tie15a_bg: galleryTie15aMobileBg,
   gallery_tie15b_bg: galleryTie15bMobileBg,
};

export function getMobilePortraitBackground(bgKey: string): string | null {
  return mobilePortraitBackgrounds[bgKey] || null;
}

// Fallback background mapping - Mission 01 uses CRACKED WALLS, exterior for "out" view
const backgroundFallback: Record<string, string> = {
  'studio_in': galleryCrackedWalls,
  'studio_front': galleryCrackedWalls,
  'studio_out': studioExteriorBg,
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
  
  // Default fallback - use stylized (Mission 01 default)
  return galleryMainStylized;
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
    img.onload = () => {
      import('@/components/BackgroundCrossfade').then(({ markPreloaded }) => {
        markPreloaded(bg);
      }).catch(() => {});
    };
    img.src = bg;
    if (img.complete && img.naturalWidth > 0) {
      import('@/components/BackgroundCrossfade').then(({ markPreloaded }) => {
        markPreloaded(bg);
      }).catch(() => {});
    }
  }
}

export function preloadAllBackgrounds(): void {
  // Dynamically import markPreloaded to register with BackgroundCrossfade's cache
  import('@/components/BackgroundCrossfade').then(({ markPreloaded }) => {
    Object.entries(backgroundAssets).forEach(([_key, src]) => {
      const img = new Image();
      img.onload = () => markPreloaded(src);
      img.src = src;
      if (img.complete) markPreloaded(src);
    });
  }).catch(() => {
    // Fallback: just preload into browser cache
    Object.values(backgroundAssets).forEach(src => {
      const img = new Image();
      img.src = src;
    });
  });
}
