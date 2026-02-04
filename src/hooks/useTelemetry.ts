import { useRef, useCallback } from "react";
import type { HollandCode, CountsFinal, LeadFormData, PickRecord, UndoEvent, AnalysisResponse } from "@/types/identity";

// Event types for the events[] log
export type TelemetryEventType =
  | "RUN_STARTED"
  | "AVATAR_SELECTED"
  | "MISSION_SHOWN"
  | "MISSION_PICKED"
  | "UNDO"
  | "TIE_SHOWN"
  | "TIE_PICKED"
  | "LEAD_SUBMITTED"
  | "RUN_ENDED";

export interface TelemetryEvent {
  type: TelemetryEventType;
  timestampMs: number;
  missionId?: string;
  pickKey?: "a" | "b";
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
  deviceType: "mobile" | "tablet" | "desktop";
}

// Calculate counts from picks
function calculateCounts(picks: Record<string, PickRecord>): CountsFinal {
  const counts: CountsFinal = { r: 0, i: 0, a: 0, s: 0, e: 0, c: 0 };
  Object.values(picks).forEach((pick) => {
    if (pick.hollandCode && counts.hasOwnProperty(pick.hollandCode)) {
      counts[pick.hollandCode]++;
    }
  });
  return counts;
}

// Payload sent BEFORE lead form (gameplay data only)
export interface GameplayPayload {
  runId: string;
  stage: "gameplay";
  dimension: "studio";
  avatarGender: "female" | "male" | null;
  gameStartedAt: number;
  gameplayEndedAt: number;
  missionShownAtById: Record<string, number>;
  missionAnsweredAtById: Record<string, number>;
  firstPicksByMissionId: Record<string, PickRecord>;
  finalPicksByMissionId: Record<string, PickRecord>;
  undoEvents: Array<{ missionId: string; prevTrait: HollandCode; newTrait: HollandCode; timestampMs: number }>;
  tie: TieState;
  countsFirst: CountsFinal; // Counts from first picks (before any undos)
  countsFinal: CountsFinal; // Counts from final picks (after all undos)
  leaders: HollandCode[];
  clientContext: ClientContext;
  events: TelemetryEvent[];
}

// Payload sent AFTER lead form submission (completion + lead data)
export interface CompletionPayload {
  runId: string;
  stage: "completion";
  gameEndedAt: number;
  leadForm: { fullName: string; email: string; phone: string };
  events: TelemetryEvent[];
}

// Generate UUID v4
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Detect device type
function getDeviceType(): "mobile" | "tablet" | "desktop" {
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

const MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/l8gqka3bd96cskfglmeaulfm5motsrnu";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

// Retry with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries: number = MAX_RETRIES): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // If successful or client error (4xx), don't retry
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // Server error (5xx) - retry
      console.warn(`[Telemetry] Attempt ${attempt + 1} failed with status ${response.status}, retrying...`);
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      // Network error - retry
      console.warn(`[Telemetry] Attempt ${attempt + 1} failed:`, error);
      lastError = error as Error;
    }

    // Wait before next retry (exponential backoff: 1s, 2s, 4s)
    if (attempt < maxRetries - 1) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

export function useTelemetry() {
  // Stable refs for tracking data
  const runIdRef = useRef<string>(generateUUID());
  const gameStartedAtRef = useRef<number>(Date.now());
  const missionShownAtByIdRef = useRef<Record<string, number>>({});
  const missionAnsweredAtByIdRef = useRef<Record<string, number>>({});
  const eventsRef = useRef<TelemetryEvent[]>([]);

  // Add event to log
  const logEvent = useCallback((type: TelemetryEventType, missionId?: string, pickKey?: "a" | "b") => {
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
    logEvent("RUN_STARTED");
  }, [logEvent]);

  // Track avatar selection
  const trackAvatarSelected = useCallback(() => {
    logEvent("AVATAR_SELECTED");
  }, [logEvent]);

  // Track mission shown
  const trackMissionShown = useCallback(
    (missionId: string, isTie: boolean = false) => {
      if (!missionShownAtByIdRef.current[missionId]) {
        missionShownAtByIdRef.current[missionId] = Date.now();
      }
      logEvent(isTie ? "TIE_SHOWN" : "MISSION_SHOWN", missionId);
    },
    [logEvent],
  );

  // Track mission pick
  const trackMissionPicked = useCallback(
    (missionId: string, pickKey: "a" | "b", isTie: boolean = false) => {
      missionAnsweredAtByIdRef.current[missionId] = Date.now();
      logEvent(isTie ? "TIE_PICKED" : "MISSION_PICKED", missionId, pickKey);
    },
    [logEvent],
  );

  // Track undo
  const trackUndo = useCallback(
    (missionId: string) => {
      logEvent("UNDO", missionId);
    },
    [logEvent],
  );

  // Send gameplay payload (BEFORE lead form)
  const sendGameplayPayload = useCallback(
    async (
      avatarGender: "female" | "male" | null,
      firstPicksByMissionId: Record<string, PickRecord>,
      finalPicksByMissionId: Record<string, PickRecord>,
      undoEvents: UndoEvent[],
      tieState: TieState,
      countsFinal: CountsFinal,
      leaders: HollandCode[],
    ): Promise<boolean> => {
      const gameplayEndedAt = Date.now();

      const clientContext: ClientContext = {
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        locale: navigator.language || "he-IL",
        screenW: window.innerWidth,
        screenH: window.innerHeight,
        deviceType: getDeviceType(),
      };

      const countsFirst = calculateCounts(firstPicksByMissionId);

      const payload: GameplayPayload = {
        runId: runIdRef.current,
        stage: "gameplay",
        dimension: "studio",
        avatarGender,
        gameStartedAt: gameStartedAtRef.current,
        gameplayEndedAt,
        missionShownAtById: { ...missionShownAtByIdRef.current },
        missionAnsweredAtById: { ...missionAnsweredAtByIdRef.current },
        firstPicksByMissionId,
        finalPicksByMissionId,
        undoEvents: undoEvents.map((e) => ({
          missionId: e.missionId,
          prevTrait: e.prevTrait,
          newTrait: e.newTrait,
          timestampMs: e.timestamp,
        })),
        tie: tieState,
        countsFirst,
        countsFinal,
        leaders,
        clientContext,
        events: [...eventsRef.current],
      };

      console.log("[Telemetry] Sending gameplay payload:", JSON.stringify(payload, null, 2));

      try {
        const response = await fetchWithRetry(MAKE_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        console.log("[Telemetry] Gameplay payload sent, status:", response.status);
        return response.ok;
      } catch (error) {
        console.error("[Telemetry] Failed to send gameplay payload after retries:", error);
        return false;
      }
    },
    [],
  );

  // Send completion payload (AFTER lead form submission)
  // Only sends lead form data - all game data was already sent in gameplay payload
  const sendCompletionPayload = useCallback(
    async (leadForm: LeadFormData): Promise<{ success: boolean }> => {
      const gameEndedAt = Date.now();

      // Log final events
      logEvent("LEAD_SUBMITTED");
      logEvent("RUN_ENDED");

      // Simple payload with only lead form data
      const payload = {
        run_id: runIdRef.current,
        stage: "completion",
        game_ended_at: gameEndedAt,
        lead_form: {
          full_name: leadForm.fullName,
          first_name: leadForm.fullName.trim().split(/\s+/)[0] || "",
          last_name: leadForm.fullName.trim().split(/\s+/).slice(1).join(" ") || "",
          email: leadForm.email,
          phone: leadForm.phone,
          wants_updates: leadForm.wantsUpdates,
        },
        events: [...eventsRef.current],
      };

      console.log("[Telemetry] Sending completion payload:", JSON.stringify(payload, null, 2));

      try {
        const response = await fetchWithRetry(MAKE_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        console.log("[Telemetry] Completion payload sent, status:", response.status);

        if (response.ok) {
          console.log("[Telemetry] Completion payload sent successfully");
          return { success: true };
        }

        return { success: false };
      } catch (error) {
        console.error("[Telemetry] Failed to send completion payload after retries:", error);
        return { success: false };
      }
    },
    [logEvent],
  );

  return {
    trackRunStarted,
    trackAvatarSelected,
    trackMissionShown,
    trackMissionPicked,
    trackUndo,
    sendGameplayPayload,
    sendCompletionPayload,
  };
}
