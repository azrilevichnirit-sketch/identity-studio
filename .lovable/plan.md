

## Replace Mission 5 Tool A Placed Prop with Animated GIF

### What will change
When playing Mission 5, the tool selection tray will continue showing the static image of the inflatable tube man. However, once a player selects tool "a" and it gets placed on the scene, the placed version will display the animated GIF (wiggling tube man) instead of the static image.

### Technical Steps

1. **Copy the uploaded GIF** to `src/assets/tools/studio_05_a_animated.gif`

2. **Update `src/lib/assetUtils.ts`**
   - Import the GIF as a new asset (e.g., `studio_05_a_animated`)
   - Add it to the `toolAssets` map under the key `studio_05_a_animated`
   - The original `studio_05_a` static entry stays unchanged (used by the tray)

3. **Update `src/components/VisualPlayScreen.tsx`** (placed props rendering)
   - In the `placedPropsElement` section (~line 1553), after resolving `toolImg`, add a check:
     - If `assetName === 'studio_05_a'`, override `toolImg` with the animated GIF asset (`getToolImage('studio_05_a_animated')`)
   - This ensures only the placed prop uses the GIF; the tray continues using the static image

### What stays the same
- Tool tray shows the original static image for both options
- All other missions are unaffected
- No changes to anchor positions or layout

