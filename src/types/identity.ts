export type HollandCode = 'r' | 'i' | 'a' | 's' | 'e' | 'c';

export type AvatarGender = 'female' | 'male' | null;

export type Dimension = 'studio' | 'farm' | 'surprise' | null;

export type Phase = 'dimension' | 'avatar' | 'intro' | 'main' | 'tie' | 'lead' | 'summary' | 'coming-soon';

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
  | 'm01_tool_b';

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
}

export interface LeadFormData {
  fullName: string;
  email: string;
  phone: string;
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
