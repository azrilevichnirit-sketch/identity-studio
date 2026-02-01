import { useRef, useCallback } from 'react';
import type { HollandCode, CountsFinal, LeadFormData, PickRecord, UndoEvent } from '@/types/identity';

// Event types for the events[] log
export type TelemetryEventType = 
  | 'RUN_STARTED'
  | 'AVATAR_SELECTED'
  | 'MISSION_SHOWN'
  | 'MISSION_PICKED'
  | 'UNDO'
  | 'TIE_SHOWN'
  | 'TIE_PICKED'
  | 'LEAD_SUBMITTED'
  | 'RUN_ENDED';

export interface TelemetryEvent {
  type: TelemetryEventType;
  timestampMs: number;
  missionId?: string;
  pickKey?: 'a' | 'b';
}

export interface TieState {
  triggered: boolean;
  missionId: string | null;
  choiceMade: boolean;
  locked: boolean;
}

export interface ClientContext {
  timezoneOffsetMinutes: number;
  locale: string;
  screenW: number;
  screenH: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

export interface RunPayload {
  runId: string;
  dimension: 'studio';
  avatarGender: 'female' | 'male' | null;
  gameStartedAt: number;
  gameEndedAt: number;
  missionShownAtById: Record<string, number>;
  missionAnsweredAtById: Record<string, number>;
  firstPicksByMissionId: Record<string, PickRecord>;
  finalPicksByMissionId: Record<string, PickRecord>;
  undoEvents: Array<{ missionId: string; prevTrait: HollandCode; newTrait: HollandCode; timestampMs: number }>;
  tie: TieState;
  countsFinal: CountsFinal;
  leaders: HollandCode[];
  leadForm: { fullName: string; email: string; phone: string };
  clientContext: ClientContext;
  events: TelemetryEvent[];
}

// Generate UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Detect device type
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export function useTelemetry() {
  // Stable refs for tracking data
  const runIdRef = useRef<string>(generateUUID());
  const gameStartedAtRef = useRef<number>(Date.now());
  const missionShownAtByIdRef = useRef<Record<string, number>>({});
  const missionAnsweredAtByIdRef = useRef<Record<string, number>>({});
  const eventsRef = useRef<TelemetryEvent[]>([]);

  // Add event to log
  const logEvent = useCallback((type: TelemetryEventType, missionId?: string, pickKey?: 'a' | 'b') => {
    eventsRef.current.push({
      type,
      timestampMs: Date.now(),
      missionId,
      pickKey,
    });
  }, []);

  // Track run start (call once on mount)
  const trackRunStarted = useCallback(() => {
    runIdRef.current = generateUUID();
    gameStartedAtRef.current = Date.now();
    missionShownAtByIdRef.current = {};
    missionAnsweredAtByIdRef.current = {};
    eventsRef.current = [];
    logEvent('RUN_STARTED');
  }, [logEvent]);

  // Track avatar selection
  const trackAvatarSelected = useCallback(() => {
    logEvent('AVATAR_SELECTED');
  }, [logEvent]);

  // Track mission shown
  const trackMissionShown = useCallback((missionId: string, isTie: boolean = false) => {
    if (!missionShownAtByIdRef.current[missionId]) {
      missionShownAtByIdRef.current[missionId] = Date.now();
    }
    logEvent(isTie ? 'TIE_SHOWN' : 'MISSION_SHOWN', missionId);
  }, [logEvent]);

  // Track mission pick
  const trackMissionPicked = useCallback((missionId: string, pickKey: 'a' | 'b', isTie: boolean = false) => {
    missionAnsweredAtByIdRef.current[missionId] = Date.now();
    logEvent(isTie ? 'TIE_PICKED' : 'MISSION_PICKED', missionId, pickKey);
  }, [logEvent]);

  // Track undo
  const trackUndo = useCallback((missionId: string) => {
    logEvent('UNDO', missionId);
  }, [logEvent]);

  // Build and send final payload
  const sendPayload = useCallback(async (
    avatarGender: 'female' | 'male' | null,
    firstPicksByMissionId: Record<string, PickRecord>,
    finalPicksByMissionId: Record<string, PickRecord>,
    undoEvents: UndoEvent[],
    tieState: TieState,
    countsFinal: CountsFinal,
    leaders: HollandCode[],
    leadForm: LeadFormData,
  ): Promise<boolean> => {
    const gameEndedAt = Date.now();
    
    // Log final events
    logEvent('LEAD_SUBMITTED');
    logEvent('RUN_ENDED');

    const clientContext: ClientContext = {
      timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      locale: navigator.language || 'he-IL',
      screenW: window.innerWidth,
      screenH: window.innerHeight,
      deviceType: getDeviceType(),
    };

    const payload: RunPayload = {
      runId: runIdRef.current,
      dimension: 'studio',
      avatarGender,
      gameStartedAt: gameStartedAtRef.current,
      gameEndedAt,
      missionShownAtById: { ...missionShownAtByIdRef.current },
      missionAnsweredAtById: { ...missionAnsweredAtByIdRef.current },
      firstPicksByMissionId,
      finalPicksByMissionId,
      undoEvents: undoEvents.map(e => ({
        missionId: e.missionId,
        prevTrait: e.prevTrait,
        newTrait: e.newTrait,
        timestampMs: e.timestamp,
      })),
      tie: tieState,
      countsFinal,
      leaders,
      leadForm: {
        fullName: leadForm.fullName,
        email: leadForm.email,
        phone: leadForm.phone,
      },
      clientContext,
      events: [...eventsRef.current],
    };

    const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/vop2b94lihlqx1uez8pjs1bjgxnthj25';

    try {
      const response = await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      console.log('[Telemetry] Payload sent, status:', response.status);
      return response.ok;
    } catch (error) {
      console.error('[Telemetry] Failed to send payload:', error);
      return false;
    }
  }, [logEvent]);

  return {
    trackRunStarted,
    trackAvatarSelected,
    trackMissionShown,
    trackMissionPicked,
    trackUndo,
    sendPayload,
  };
}
