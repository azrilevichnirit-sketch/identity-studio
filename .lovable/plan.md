

# Fix Tie-Breaking Logic -- Corrected Plan

## Summary

Rewrite the tournament resolution logic so that:
1. Step 2.5 (adjacent sum) ONLY narrows 3+ candidates down to 2 -- never decides between exactly 2
2. Tie-breaker missions ALWAYS resolve exactly-2 ties for Rank 1 and Rank 2
3. The loser of any tie-breaker mission automatically gets the next rank (loser of Rank 1 tie = Rank 2; loser of Rank 2 tie = Rank 3)
4. Rank 3 is resolved mathematically only (adjacent sum, then default order R>I>A>S>E>C) -- no Prediger axis
5. A score display screen is shown after the 12 missions for internal testing

## Corrected Rules

```text
STEP 2 - Rank 1:
  1 code highest         --> Rank 1. Go to Step 3.
  Exactly 2 tied         --> Mission. Winner=R1, Loser=R2. Go to Step 4.
  3+ tied                --> Adjacent sum narrows to 2. Mission. Winner=R1, Loser=R2, Eliminated=R3. Done.

STEP 3 - Rank 2 (only if Rank 2 not already assigned):
  1 code next highest    --> Rank 2. Go to Step 4.
  Exactly 2 tied         --> Mission. Winner=R2, Loser=R3. Done.
  3+ tied                --> Adjacent sum narrows to 2. Mission. Winner=R2, Loser=R3. Done.

STEP 4 - Rank 3 (only if Rank 3 not already assigned):
  1 code next highest    --> Rank 3. Done.
  2+ tied                --> Adjacent sum. If still tied, default order R>I>A>S>E>C. Done.
```

Key difference from previous plan: No Prediger axis. Rank 3 ties use adjacent sum + default order fallback.

## Changes

### 1. `src/hooks/useFullTournament.ts` -- Core Logic Rewrite

**`tryResolveByAdjacentSum` function (lines 85-118):**
- Add guard: if `candidates.length === 2`, return `{ narrowedCandidates: candidates }` (force mission, never decide silently)
- Keep existing behavior for 3+ candidates (narrow to top scorers)

**New `resolveRank3ByAdjacentSum` function:**
- Takes candidates and countsFinal
- Calculates adjacent sums for each candidate
- Picks the one with highest adjacent sum
- If still tied, uses default order (R>I>A>S>E>C) as final fallback
- Always returns a single winner (no missions)

**`startTournament` (lines 519-544):**
- When exactly 2 candidates: skip Step 2.5 entirely, go straight to mission
- When 3+ candidates: run Step 2.5 to narrow to 2, then start mission

**`handleRankResolved` (lines 350-511) -- Major restructure:**
- When Rank 1 resolves from mission: track the loser as Rank 2 automatically. Then determine Rank 3 only (Step 4).
- When Rank 2 resolves from mission: track the loser as Rank 3. Mark complete immediately.
- When 3+ tie for Rank 1 narrows to 2 via Step 2.5: the eliminated codes become Rank 3 candidates. After mission resolves (winner=R1, loser=R2), pick Rank 3 from eliminated codes using `resolveRank3ByAdjacentSum`.
- Remove all Rank 3 tournament mission logic -- Rank 3 never triggers a mission.

**`startFromRank2` (lines 549-642):**
- When exactly 2 candidates for Rank 2: skip Step 2.5, go straight to mission. Loser = Rank 3. Done.
- When 3+ candidates: run Step 2.5 to narrow to 2, then mission. Winner=R2, Loser=R3. Done.
- Remove Rank 3 tournament start calls.

**`processChoice` (lines 647-702):**
- When a mission resolves (1 candidate left): 
  - For Rank 1: winner=R1, loser (from last comparison)=R2. Then resolve Rank 3 mathematically.
  - For Rank 2: winner=R2, loser=R3. Done.
  - Remove Rank 3 mission handling.

**`checkNeedsTournament` (lines 707-739):**
- `needsRank3` should always return `false` (Rank 3 never needs a mission)

### 2. `src/types/identity.ts`

- Add `'scores'` to the `Phase` type union

### 3. New file: `src/components/ScoreDisplay.tsx`

- Shows the 6 Holland code scores (R=2, I=1, etc.) after 12 missions
- Internal testing overlay with a "Continue" button
- Styled to match the existing game UI (Hebrew labels)

### 4. `src/pages/Index.tsx` -- Phase Transitions

- After main missions complete, transition to `'scores'` phase first
- From `'scores'` phase, trigger the tie-breaking logic (existing flow)
- Remove `'tie3'` phase handling from the rendering (Rank 3 never shows a mission)
- When tournament completes with Rank 1 winner from 2-way tie, ensure loser is tracked as Rank 2
- Update the rendering section to include the ScoreDisplay component

### 5. `src/components/TieBreakDebugPanel.tsx`

- Update to reflect that Rank 3 is always resolved mathematically
- Remove references to Rank 3 tournament missions

## Example Walkthrough: R=2, I=1, A=1, S=3, E=2, C=3

1. Scores displayed on ScoreDisplay screen
2. S=3, C=3 tied for Rank 1 (exactly 2) --> tie-breaker mission S vs C
3. Player picks S --> S=Rank 1, C=Rank 2 (loser auto-assigned)
4. Rank 3: remaining highest are R=2, E=2 (tied)
5. Adjacent sum: R neighbors are I(1)+C(3)=4, E neighbors are S(3)+C(3)=6 --> E wins Rank 3
6. Final: S, C, E

