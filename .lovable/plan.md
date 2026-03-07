

## Deleting Unused Background Assets

To reduce the application bundle size, we need to identify which background images are actually referenced in the code and data, then safely remove the rest.

### Current Situation

The project has ~120+ background images in `src/assets/backgrounds/`. Many are older versions (v1, v2, v3...) where only the latest version is actually used. The app bundles ALL imported images, so unused imports add significant weight.

### Approach

1. **Audit all references** — scan every file that imports or references backgrounds:
   - `src/lib/assetUtils.ts` (main asset registry)
   - `src/data/studio_anchor_map.json` (anchor positioning)
   - `src/data/studio_quests_v5.json` and `studio_tie_v6.json` (mission data)
   - `src/components/VisualPlayScreen.tsx` (hardcoded references)
   - `src/pages/BackgroundPreview.tsx` (preview page)
   - `src/components/BackgroundCrossfade.tsx`

2. **Build a "used" list** — every background filename that appears in any import or string reference.

3. **Identify safe deletions** — files in `src/assets/backgrounds/` NOT in the used list. Likely candidates:
   - Old versions superseded by newer ones (e.g., `studio_in_workshop_v2.webp` if only `v3` is used)
   - Preview-only variants not used in gameplay
   - Stylized variants that were试 but replaced

4. **Delete files and clean imports** — remove the files and any leftover import statements (especially in `BackgroundPreview.tsx` which imports many unused variants).

### How to Execute

Since file deletion isn't something I can do directly through code edits, there are two paths:

**Option A — I prepare the cleanup for you:**
- I'll audit all references and produce a concrete list of files safe to delete
- I'll update all source files to remove dead imports
- You manually delete the listed files from the file browser (right-click → Delete)

**Option B — You delete from the file browser:**
- In the code editor, navigate to `src/assets/backgrounds/`
- Right-click any file you want to remove and select "Delete"
- I then clean up any broken imports

I recommend **Option A** — I'll do the full audit and give you a definitive safe-to-delete list, then clean up all code references.

