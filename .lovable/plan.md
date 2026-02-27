

## Problem Diagnosis

The core issue is that `getMobileFallbackScale` was disabled (now returns raw desktop scale), but there are NOT enough `_mobile` overrides in the anchor map to compensate. This means on mobile, tools render at full desktop scale (e.g., 3.3x) inside a portrait viewport where they appear massively oversized.

The previous fallback compression was a band-aid. The real fix requires a fundamentally different approach.

## Root Cause

On desktop (landscape ~16:9), the background fills the viewport via `background-size: cover`. The same background on mobile (portrait ~9:16) also uses `cover`, which means it crops heavily on the sides and shows more vertical space. But the anchor coordinates (percentage-based) map to different physical pixel areas. A tool at scale 3.3 that looks correct on a 1366px-wide screen looks 3x too large on a 360px-wide screen because the sprite base size is fixed at 128px regardless of viewport.

**The sprite base is 128px on both desktop AND mobile.** A scale of 3.3 means 422px -- which is 31% of a 1366px screen but 117% of a 360px screen.

## Solution: Viewport-Relative Sprite Base Size

Instead of maintaining TWO sets of anchor data (desktop + _mobile overrides for every single anchor), make the sprite base size proportional to viewport width. This way the SAME scale values produce proportionally identical visual results on both desktop and mobile.

### The Math

On desktop at 1366px, a 128px base = ~9.4% of viewport width.
On mobile at 360px, to get the same 9.4% ratio: 360 * 0.094 = ~33.8px.

So the fix is: `spriteBasePx = viewportWidth * 0.094` (or use `vw` units).

This single change eliminates the need for ANY `_mobile` overrides in the anchor map, because the same percentage coordinates AND scale values will produce identical proportional results.

### Implementation Steps

1. **Change sprite sizing from fixed px to viewport-relative units**
   - In `getSpriteBasePx()`, return a value proportional to viewport width
   - Formula: `Math.round(window.innerWidth * 0.094)` for normal, proportionally for large/xlarge
   - Alternative: use CSS `vw` units directly (e.g., `9.4vw` instead of `128px`)

2. **Restore `getMobileFallbackScale` to passthrough**
   - Keep the current disabled state (return raw scale) -- this is now CORRECT because viewport-relative sizing handles proportionality automatically

3. **Remove all `_mobile` overrides from anchor map**
   - They become unnecessary since proportional sizing handles everything
   - Keep only if position (x_pct, y_pct) needs adjustment for cropping differences

4. **Handle background cropping differences**
   - On portrait mobile, `cover` crops sides heavily. Some tools near edges (x < 15% or x > 85%) may be cropped off-screen
   - For those specific anchors, keep `_mobile` overrides that ONLY adjust x_pct (not scale)
   - This is a much smaller set (~5-10 anchors vs 100+)

5. **Update tests**
   - Remove scale-ratio tests (no longer relevant)
   - Keep X-bounds safety tests
   - Add new test: verify sprite base is viewport-proportional

### Files to Modify

- **`src/components/VisualPlayScreen.tsx`**: Change `getSpriteBasePx` to return viewport-proportional value
- **`src/lib/jsonDataLoader.ts`**: Keep `getMobileFallbackScale` as passthrough (already done)
- **`src/data/studio_anchor_map.json`**: Remove scale-only `_mobile` overrides, keep position-only ones for edge-cropped anchors
- **`src/test/mobileAnchorCoverage.test.ts`**: Update to only check position overrides
- **`src/test/mobileDesktopParity.test.ts`**: Replace scale-ratio checks with proportionality checks
- **`src/test/mobileComprehensiveAudit.test.ts`**: Simplify to check only edge-position issues

### Risk Mitigation

- The change is mathematically guaranteed to produce proportional parity
- Desktop behavior is 100% unchanged (128px base at 1366px = 9.37vw ≈ 128px)
- Mobile gets automatic proportional scaling without any per-anchor tuning
- Edge-case anchors near viewport borders still need position-only overrides (much simpler)

