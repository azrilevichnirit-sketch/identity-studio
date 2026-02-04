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
  // Now returns the analysis data from Make webhook response
  const sendCompletionPayload = useCallback(
    async (
      leadForm: LeadFormData,
      avatarGender: "female" | "male" | null,
      countsFinal: CountsFinal,
      leaders: HollandCode[],
      firstPicksByMissionId: Record<string, PickRecord>,
      finalPicksByMissionId: Record<string, PickRecord>,
      undoEvents: UndoEvent[],
      tieState: TieState,
      // Rank 2/3 results
      rank1Code?: HollandCode | null,
      rank2Code?: HollandCode | null,
      rank3Code?: HollandCode | null,
      rank23TieTrace?: Array<{
        pairCodes: string;
        winner: HollandCode;
        loser: HollandCode;
        timestamp: number;
      }>,
      // NEW: Additional tie info for enhanced payload
      rank2Candidates?: HollandCode[],
      rank3Candidates?: HollandCode[],
    ): Promise<{ success: boolean; analysis: AnalysisResponse | null }> => {
      const gameEndedAt = Date.now();

      // Log final events
      logEvent("LEAD_SUBMITTED");
      logEvent("RUN_ENDED");

      // Calculate counts from first picks for comparison
      const countsFirst = calculateCounts(firstPicksByMissionId);

      // === NEW FIELDS (append only, no existing fields modified) ===

      // 1) base_scores - the original scores from 12 missions, unchanged
      const base_scores: CountsFinal = { ...countsFinal };

      // 2) tie_flags - explicitly indicate where ties happened
      const tieRank1 = leaders.length >= 2;
      const tieRank2 = (rank2Candidates?.length ?? 0) >= 2;
      const tieRank3 = (rank3Candidates?.length ?? 0) >= 2;

      const tie_flags = {
        rank1_tie: tieRank1,
        rank2_tie: tieRank2,
        rank3_tie: tieRank3,
        rank1_candidates: leaders,
        rank2_candidates: rank2Candidates ?? [],
        rank3_candidates: rank3Candidates ?? [],
      };

      // 3) resolved_scores - base + bonus for tie resolution visualization
      // Winner gets +0.5, Runner-up gets +0.3, Third gets +0.1
      const resolved_scores: Record<HollandCode, number> = { ...countsFinal };

      // Apply bonuses based on tie-breaker trace
      // Group trace by rank phase and apply bonuses
      const traceByRank: Record<string, Array<{ winner: HollandCode; loser: HollandCode }>> = {
        rank1: [],
        rank2: [],
        rank3: [],
      };

      // Rank1 tie was resolved by the original tie mission (state.tieMissionUsed)
      if (tieRank1 && rank1Code) {
        // The rank1 winner gets bonus, others in tie get less
        const rank1Losers = leaders.filter((c) => c !== rank1Code);
        resolved_scores[rank1Code] += 0.5;
        rank1Losers.forEach((loser, idx) => {
          resolved_scores[loser] += idx === 0 ? 0.3 : 0.1;
        });
      }

      // Rank2/3 tie trace processing
      if (rank23TieTrace && rank23TieTrace.length > 0) {
        // Determine which traces belong to rank2 vs rank3
        // The trace is sequential: first resolve rank2, then rank3
        const r2Candidates = rank2Candidates ?? [];
        const r3Candidates = rank3Candidates ?? [];

        // Track winners to determine rank assignment
        let rank2Resolved = !tieRank2;

        rank23TieTrace.forEach((t) => {
          if (!rank2Resolved && r2Candidates.includes(t.winner)) {
            traceByRank.rank2.push({ winner: t.winner, loser: t.loser });
            if (t.winner === rank2Code) {
              rank2Resolved = true;
            }
          } else {
            traceByRank.rank3.push({ winner: t.winner, loser: t.loser });
          }
        });

        // Apply rank2 bonuses
        if (tieRank2 && rank2Code) {
          resolved_scores[rank2Code] += 0.5;
          const r2Losers = r2Candidates.filter((c) => c !== rank2Code);
          r2Losers.forEach((loser, idx) => {
            resolved_scores[loser] += idx === 0 ? 0.3 : 0.1;
          });
        }

        // Apply rank3 bonuses
        if (tieRank3 && rank3Code) {
          resolved_scores[rank3Code] += 0.5;
          const r3Losers = r3Candidates.filter((c) => c !== rank3Code);
          r3Losers.forEach((loser, idx) => {
            resolved_scores[loser] += idx === 0 ? 0.3 : 0.1;
          });
        }
      }

      // 4) tie_trace - minimal readable log of tie-breaker matches
      const tie_trace: string[] = [];

      // Add rank1 tie if it happened
      if (tieRank1 && rank1Code) {
        tie_trace.push(`rank1: ${leaders.join(" vs ")} -> ${rank1Code}`);
      }

      // Add rank2/3 traces from the tournament
      if (rank23TieTrace && rank23TieTrace.length > 0) {
        let currentRank = tieRank2 ? "rank2" : "rank3";
        let rank2Done = !tieRank2;

        rank23TieTrace.forEach((t) => {
          tie_trace.push(`${currentRank}: ${t.winner} vs ${t.loser} -> ${t.winner}`);
          if (!rank2Done && t.winner === rank2Code) {
            rank2Done = true;
            currentRank = "rank3";
          }
        });
      }

      // Send full payload including all game data for analysis
      // All field names are lowercase/snake_case for Make.com compatibility
      const payload = {
        run_id: runIdRef.current,
        stage: "completion",
        dimension: "studio",
        avatar_gender: avatarGender,
        game_started_at: gameStartedAtRef.current,
        game_ended_at: gameEndedAt,
        mission_shown_at_by_id: { ...missionShownAtByIdRef.current },
        mission_answered_at_by_id: { ...missionAnsweredAtByIdRef.current },
        first_picks_by_mission_id: firstPicksByMissionId,
        final_picks_by_mission_id: finalPicksByMissionId,
        undo_events: undoEvents.map((e) => ({
          mission_id: e.missionId,
          prev_trait: e.prevTrait,
          new_trait: e.newTrait,
          timestamp_ms: e.timestamp,
        })),
        tie: tieState,
        counts_first: countsFirst,
        counts_final: countsFinal,
        leaders,
        // Rank 2/3 final results
        rank1_code: rank1Code || leaders[0] || null,
        rank2_code: rank2Code || null,
        rank3_code: rank3Code || null,
        rank23_tie_trace: rank23TieTrace || [],
        lead_form: {
          full_name: leadForm.fullName,
          first_name: leadForm.fullName.trim().split(/\s+/)[0] || "",
          last_name: leadForm.fullName.trim().split(/\s+/).slice(1).join(" ") || "",
          email: leadForm.email,
          phone: leadForm.phone,
          wants_updates: leadForm.wantsUpdates,
        },
        client_context: {
          timezone_offset_minutes: new Date().getTimezoneOffset(),
          locale: navigator.language || "he-IL",
          screen_w: window.innerWidth,
          screen_h: window.innerHeight,
          device_type: getDeviceType(),
        },
        events: [...eventsRef.current],
        // === NEW APPENDED FIELDS ===
        base_scores,
        resolved_scores,
        tie_flags,
        tie_trace,
      };

      // Log full payload for debugging
      console.log("[Telemetry] Full completion payload:", JSON.stringify(payload, null, 2));

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
          return { success: true, analysis: null };
        }

        return { success: false, analysis: null };
      } catch (error) {
        console.error("[Telemetry] Failed to send completion payload after retries:", error);
        return { success: false, analysis: null };
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
