export type HollandCode = 'r' | 'i' | 'a' | 's' | 'e' | 'c';

export type AvatarGender = 'female' | 'male' | null;

export type Dimension = 'studio' | 'farm' | 'surprise' | null;

export type Phase = 'dimension' | 'avatar' | 'intro' | 'main' | 'tie' | 'tie1' | 'tie2' | 'tie3' | 'lead' | 'processing' | 'summary' | 'coming-soon';

// Placement modes for tool rendering
export type PlacementMode = 
  | 'wall_full' 
  | 'wall' 
  | 'floor_near_wall' 
  | 'floor' 
  | 'center' 
  | 'ceiling'
  | 'handheld'  // for avatar_hand anchor
  | 'table';     // for table_center anchor

// Anchor references for placement
export type AnchorRef = 
  | 'wall_back' 
  | 'wall_left' 
  | 'wall_right' 
  | 'floor' 
  | 'floor_left'
  | 'floor_left_npc'
  | 'floor_right_npc'
  | 'floor_right_npc_2'
  | 'center' 
  | 'ceiling'
  | 'avatar_hand'
  | 'table_center'
  | 'm01_tool_a'
  | 'm01_tool_b'
  | 'm02_tool_a'
  | 'm02_tool_b'
  | 'm03_tool_a'
  | 'm03_tool_b'
  | 'm04_tool_a'
  | 'm04_tool_b'
  | 'm05_tool_a'
  | 'm05_tool_b'
  | 'm06_tool_a'
  | 'm06_tool_b'
  | 'm07_tool_a'
  | 'm07_tool_b'
  | 'm08_tool_a'
  | 'm08_tool_b'
  | 'm09_tool_a'
  | 'm09_tool_b'
  | 'm10_tool_a'
  | 'm10_tool_b'
  | 'm11_tool_a'
  | 'm11_tool_b'
  | 'm12_tool_a'
  | 'm12_tool_b'
  | `tie_${string}_tool_a`
  | `tie_${string}_tool_b`
  | 'm01_npc_female'
  | 'm02_npc_male_a'
  | 'm02_npc_male_b'
  | 'm03_npc_male'
  | 'm03_npc_female'
  | 'm05_npc_entrance'
  | 'm05_npc_entrance_2'
  | 'm06_npc_male'
  | 'm06_npc_female';

export interface MissionOption {
  key: 'a' | 'b';
  holland_code: HollandCode;
  asset: string;
  tooltip_heb: string;
  view: string;
  // Background for next mission after this option is chosen
  next_bg_override?: string;
  // Placement fields from CSV
  placement_mode?: PlacementMode;
  anchor_ref?: AnchorRef;
  offset_x?: number;
  offset_y?: number;
  scale?: number;
  persist?: 'keep' | 'temp';
  // Fixed placement coordinates (added at placement time for persisted tools)
  fixedPlacement?: {
    x: number;
    y: number;
    scale: number;
    flipX?: boolean;
    wallMount?: boolean;
    bgKey?: string; // background key where tool was placed
  };
}

export interface Mission {
  world: string;
  phase: 'main' | 'tb';
  mission_id: string;
  sequence: number;
  view: string;
  bg_override?: string;  // Background override from CSV
  task_heb: string;
  options: MissionOption[];
  pair_key?: string;
}

export interface UndoEvent {
  missionId: string;
  prevTrait: HollandCode;
  newTrait: HollandCode;
  timestamp: number;
}

export interface PickRecord {
  missionId: string;
  key: 'a' | 'b';
  hollandCode: HollandCode;
  // Asset name for rendering
  assetName?: string;
  // Background override for the next mission
  nextBgOverride?: string;
  // Placement info for rendering
  placementMode?: PlacementMode;
  anchorRef?: AnchorRef;
  offsetX?: number;
  offsetY?: number;
  scale?: number;
  persist?: 'keep' | 'temp';
  // FIXED placement coordinates - stored when tool is placed, used in subsequent missions
  // This ensures persisted tools stay in their original position
  fixedPlacement?: {
    x: number;      // percentage from left
    y: number;      // percentage from top
    scale: number;  // final scale applied
    flipX?: boolean;
    wallMount?: boolean;
    bgKey?: string; // background key where tool was placed - only show when this bg is active
  };
}

export interface GameState {
  phase: Phase;
  dimension: Dimension;
  avatarGender: AvatarGender;
  mainIndex: number;
  firstPicksByMissionId: Record<string, PickRecord>;
  finalPicksByMissionId: Record<string, PickRecord>;
  undoEvents: UndoEvent[];
  tieMissionUsed: Mission | null;
  tieChoiceMade: boolean;
  leadForm: LeadFormData | null;
  // Rank 2/3 tournament results
  rank1Code: HollandCode | null;
  rank2Code: HollandCode | null;
  rank3Code: HollandCode | null;
  // Trace of Rank 2/3 comparisons for telemetry
  rank23TieTrace: Array<{
    pairCodes: string;
    winner: HollandCode;
    loser: HollandCode;
    timestamp: number;
  }>;
}

export interface LeadFormData {
  fullName: string;
  email: string;
  phone: string;
  wantsUpdates: boolean;
}

// Analysis response from Make webhook
export interface AnalysisResponse {
  summary?: string;
  recommendations?: string[];
  traits?: string[];
  personalityType?: string;
  // Allow any additional fields Make might return
  [key: string]: unknown;
}

export interface CountsFinal {
  r: number;
  i: number;
  a: number;
  s: number;
  e: number;
  c: number;
}

// Scene extras types for rendering additional assets
export interface SceneExtra {
  world: string;
  phase: string;
  order: number;
  mission_id: string;
  trigger_when: 'before' | 'after';
  trigger_tool_ids: string[];
  spawn_asset_key: string;
  spawn_count: number;
  placement_mode: PlacementMode;
  anchor_ref: AnchorRef;
  note?: string;
  despawn_mode: 'keep' | 'until_mission_order' | 'remove_after_mission_id';
  despawn_value: string;
}
