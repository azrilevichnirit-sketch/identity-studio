

# Fix: Step 2.5 Must Always Narrow to Exactly 2 Candidates

## The Bug

When 4 codes tie for Rank 2 (I=2, A=2, S=2, E=2 with R=3, C=1), the adjacent sum calculation produces a single winner (I with sum 5), silently assigning Rank 2 without showing the player a tie-breaker mission.

## The Rule

Step 2.5 exists ONLY to narrow 3+ candidates down to exactly 2. It should NEVER resolve to a single winner. The player must always make the final choice via a mission.

## The Fix

**File: `src/hooks/useFullTournament.ts`** -- `tryResolveByAdjacentSum` function (lines 77-111)

Change the logic so that when 3+ candidates enter Step 2.5:
1. Calculate adjacent sums for all candidates
2. Sort by adjacent sum (descending), then by default order (R>I>A>S>E>C) as tiebreaker
3. Always return the top 2 as `{ narrowedCandidates: [first, second] }`
4. Never return `{ winner }` from this function when starting with 3+ candidates

The callers in `startTournament` and `startFromRank2` that currently handle the `'winner' in step25Result` branch for 3+ candidates can be simplified since Step 2.5 will always return exactly 2 narrowed candidates. But keeping those branches as fallback safety is fine -- they just won't be reached.

Additionally, track the eliminated candidates (those not in the top 2) so they can be considered for Rank 3 assignment.

### Technical Detail

Current code (lines 100-106):
```typescript
const maxSum = Math.max(...adjacentSums.map(x => x.sum));
const winners = adjacentSums.filter(x => x.sum === maxSum);
if (winners.length === 1) {
  return { winner: winners[0].code };  // BUG: silently decides
}
```

New logic:
```typescript
// Sort by sum descending, then default order as tiebreaker
adjacentSums.sort((a, b) => {
  if (b.sum !== a.sum) return b.sum - a.sum;
  return DEFAULT_ORDER.indexOf(a.code) - DEFAULT_ORDER.indexOf(b.code);
});
// Always return top 2
const narrowed = [adjacentSums[0].code, adjacentSums[1].code];
return { narrowedCandidates: narrowed };
```

This ensures a mission is always shown when there are ties for Rank 1 or Rank 2.

