import { useRef, useCallback } from "react";
import type { HollandCode, CountsFinal, LeadFormData, PickRecord, UndoEvent } from "@/types/identity";

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

// Tie flags structure for payload
export interface TieFlags {
  rank1_triggered: boolean;
  rank2_triggered: boolean;
  rank2_candidates: HollandCode[];
  rank3_triggered: boolean;
  rank3_candidates: HollandCode[];
}

// Resolved scores with fractional bonuses for tie-breaker winners
export type ResolvedScores = Record<HollandCode, number>;

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
  undoEvents: Array<{ missionId: string; prevTrait: HollandCode; newTrait: HollandCode; timestampMs: number; phase: string }>;
  tie: TieState;
  tie_state: TieState; // Duplicate with snake_case for Make compatibility
  countsFirst: CountsFinal;
  countsFinal: CountsFinal;
  base_scores: CountsFinal; // Snake_case alias for countsFinal
  resolved_scores: ResolvedScores; // Scores with fractional bonuses: +0.5 for rank1, +0.3 for rank2, +0.1 for rank3
  leaders: HollandCode[];
  clientContext: ClientContext;
  events: TelemetryEvent[];
  // Tie-breaker fields
  rank1_code: string;
  rank2_code: string;
  rank3_code: string;
  tie_flags: TieFlags;
  tie_trace: Array<{ round: string; pair: string; winner: string }>; // Rank 1 tie-breaker trace
  rank23_tie_trace: Array<{ round: string; pair: string; winner: string; loser: string }>; // Rank 2/3 tournament trace
}

// Payload sent AFTER lead form submission (completion + lead data)
export interface CompletionPayload {
  runId: string;
  stage: "completion";
  gameEndedAt: number;
  // Included in multiple formats for maximum compatibility with Make.com
  leadForm?: any;
  lead_form?: any;
  fullName?: string;
  email?: string;
  phone?: string;
  events: TelemetryEvent[];
}

// Generate UUID v4
function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

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
const MAKE_COMPLETION_WEBHOOK_URL = "https://hook.eu1.make.com/gar4d5mve52lhn3mkpm8rmq8siy2tro5";
const MAKE_BEHAVIORAL_WEBHOOK_URL = "https://hook.eu1.make.com/pihalccdvzzknt0igejgtju26kbptrtj";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
type TelemetrySendResult = { success: boolean; resultText?: string };

// Retry with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries: number = MAX_RETRIES): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // IMPORTANT: Never retry when we already got an HTTP response.
      // Retrying 5xx can create duplicate webhook executions in Make.
      return response;
    } catch (error) {
      // Retry only for network-level failures (no HTTP response received)
      console.warn(`[Telemetry] Network failure on attempt ${attempt + 1}, retrying...`, error);
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

  // Idempotency guards per stage (prevents duplicate webhook submissions per run)
  const gameplaySentRef = useRef<boolean>(false);
  const completionSentRef = useRef<boolean>(false);
  const behavioralSentRef = useRef<boolean>(false);

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

    // Reset stage-level send guards for a fresh playthrough
    gameplaySentRef.current = false;
    completionSentRef.current = false;
    behavioralSentRef.current = false;

    console.log("[Telemetry] New run started:", runIdRef.current);
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

  const sendGameplayPayload = useCallback(
    async (
      avatarGender: "female" | "male" | null,
      firstPicksByMissionId: Record<string, PickRecord>,
      finalPicksByMissionId: Record<string, PickRecord>,
      undoEvents: UndoEvent[],
      tieState: TieState,
      countsFinal: CountsFinal,
      leaders: HollandCode[],
      rank1Code: HollandCode | null,
      rank2Code: HollandCode | null,
      rank3Code: HollandCode | null,
      tieFlags: TieFlags,
      tieTrace: Array<{ round: string; pair: string; winner: string }>,
      rank23TieTrace: Array<{ round: string; pair: string; winner: string; loser: string }>,
    ): Promise<{ success: boolean; resultText?: string }> => {
      const answeredCount = Object.keys(finalPicksByMissionId).length;
      if (answeredCount < 15) {
        console.warn(`[Telemetry] Only ${answeredCount}/15 missions answered — blocking gameplay webhook send`);
        return { success: false };
      }

      if (gameplaySentRef.current) {
        console.log("[Telemetry] Gameplay already sent for this run, skipping duplicate send");
        return { success: true };
      }

      const gameplayEndedAt = Date.now();

      const clientContext: ClientContext = {
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        locale: navigator.language || "he-IL",
        screenW: window.innerWidth,
        screenH: window.innerHeight,
        deviceType: getDeviceType(),
      };

      const countsFirst = calculateCounts(firstPicksByMissionId);

      const resolvedScores: ResolvedScores = { ...countsFinal };
      if (rank1Code) {
        resolvedScores[rank1Code] = (resolvedScores[rank1Code] || 0) + 0.5;
      }
      if (rank2Code) {
        resolvedScores[rank2Code] = (resolvedScores[rank2Code] || 0) + 0.3;
      }
      if (rank3Code) {
        resolvedScores[rank3Code] = (resolvedScores[rank3Code] || 0) + 0.1;
      }

      console.log("[Telemetry] Resolved scores with bonuses:", resolvedScores);

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
          phase: e.phase || "main",
        })),
        tie: tieState,
        tie_state: tieState,
        countsFirst,
        countsFinal,
        base_scores: countsFinal,
        resolved_scores: resolvedScores,
        leaders,
        clientContext,
        events: [...eventsRef.current],
        rank1_code: rank1Code?.toLowerCase() || "",
        rank2_code: rank2Code?.toLowerCase() || "",
        rank3_code: rank3Code?.toLowerCase() || "",
        tie_flags: tieFlags,
        tie_trace: tieTrace,
        rank23_tie_trace: rank23TieTrace,
      };

      console.log("[Telemetry] Sending gameplay payload:", JSON.stringify(payload, null, 2));

      try {
        const response = await fetchWithRetry(MAKE_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        console.log("[Telemetry] Gameplay payload sent, status:", response.status);

        if (response.ok) {
          gameplaySentRef.current = true;
          const resultText = await response.text();
          console.log("[Telemetry] Gameplay response text:", resultText);
          return { success: true, resultText };
        }

        return { success: false };
      } catch (error) {
        console.error("[Telemetry] Failed to send gameplay payload after retries:", error);
        return { success: false };
      }
    },
    [],
  );

  const sendCompletionPayload = useCallback(
    async (leadForm: LeadFormData): Promise<{ success: boolean; resultText?: string }> => {
      const answeredCount = Object.keys(missionAnsweredAtByIdRef.current).length;
      if (answeredCount < 15) {
        console.warn(`[Telemetry] Only ${answeredCount}/15 missions answered — blocking completion webhook send`);
        return { success: false };
      }

      if (completionSentRef.current) {
        console.log("[Telemetry] Completion already sent for this run, skipping duplicate send");
        return { success: true };
      }

      const gameEndedAt = Date.now();

      logEvent("LEAD_SUBMITTED");
      logEvent("RUN_ENDED");

      const payload: CompletionPayload = {
        runId: runIdRef.current,
        stage: "completion",
        gameEndedAt,
        fullName: leadForm.fullName,
        email: leadForm.email,
        phone: leadForm.phone,
        leadForm: {
          fullName: leadForm.fullName,
          email: leadForm.email,
          phone: leadForm.phone,
          wantsUpdates: leadForm.wantsUpdates,
        },
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
        const response = await fetchWithRetry(MAKE_COMPLETION_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        console.log("[Telemetry] Completion payload sent, status:", response.status);

        if (response.ok) {
          completionSentRef.current = true;
          const resultText = await response.text();
          console.log("[Telemetry] Completion response text:", resultText);
          return { success: true, resultText };
        }

        return { success: false };
      } catch (error) {
        console.error("[Telemetry] Failed to send completion payload after retries:", error);
        return { success: false };
      }
    },
    [logEvent],
  );

  const sendBehavioralPayload = useCallback(
    async (
      undoEvents: UndoEvent[],
      identityCode: string,
      tieBreakersPlayed: number,
    ): Promise<{ success: boolean }> => {
      if (behavioralSentRef.current) {
        console.log("[Telemetry] Behavioral already sent for this run, skipping duplicate send");
        return { success: true };
      }

      const payload = {
        runId: runIdRef.current,
        type: "behavioral",
        timestamp: new Date().toISOString(),
        missionShownAtById: { ...missionShownAtByIdRef.current },
        missionAnsweredAtById: { ...missionAnsweredAtByIdRef.current },
        undoEvents: undoEvents.map((e) => ({
          missionId: e.missionId,
          prevTrait: e.prevTrait,
          newTrait: e.newTrait,
          timestampMs: e.timestamp,
          phase: e.phase || "main",
        })),
        totalMissions: 15,
        totalUndos: undoEvents.length,
        identityCode,
        tieBreakersPlayed,
      };

      console.log("[Telemetry] Sending behavioral payload:", JSON.stringify(payload, null, 2));

      try {
        const response = await fetchWithRetry(MAKE_BEHAVIORAL_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        console.log("[Telemetry] Behavioral payload sent, status:", response.status);
        if (response.ok) {
          behavioralSentRef.current = true;
        }
        return { success: response.ok };
      } catch (error) {
        console.error("[Telemetry] Failed to send behavioral payload:", error);
        return { success: false };
      }
    },
    [],
  );

  return {
    trackRunStarted,
    trackAvatarSelected,
    trackMissionShown,
    trackMissionPicked,
    trackUndo,
    sendGameplayPayload,
    sendCompletionPayload,
    sendBehavioralPayload,
  };
}
