export type HollandCode = 'r' | 'i' | 'a' | 's' | 'e' | 'c';

export type AvatarGender = 'female' | 'male' | null;

export type Phase = 'avatar' | 'intro' | 'main' | 'tie' | 'lead' | 'summary';

export interface MissionOption {
  key: 'a' | 'b';
  holland_code: HollandCode;
  asset: string;
  tooltip_heb: string;
  view: string;
}

export interface Mission {
  world: string;
  phase: 'main' | 'tb';
  mission_id: string;
  sequence: number;
  view: string;
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
}

export interface GameState {
  phase: Phase;
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
