

# Plan: Update T14 Tie-Breaker with Baked Backgrounds

## Changes

### 1. Asset files
- Replace `src/assets/tools/studio_tie_14_a.webp` and `studio_tie_14_b.webp` with uploaded tool designs
- Add 6 backgrounds to `src/assets/backgrounds/`:
  - `gallery_tie14_desk_bg.webp` / `gallery_tie14_mobile_bg.webp` (base)
  - `gallery_tie14a_desk_bg.webp` / `gallery_tie14a_mobile_bg.webp` (after Tool A)
  - `gallery_tie14b_desk_bg.webp` / `gallery_tie14b_mobile_bg.webp` (after Tool B)

### 2. `studio_tie_v6.json` — T14 entry
- `task_heb` → `"עוד שעתיים יוצאים לסופ\"ש ארוך. מה עושים עד אז?"`
- `option_a_tooltip_heb` → `"משחק כדורגל לצוות"`
- `option_b_tooltip_heb` → `"מערכת צ'קליסט"`
- Add `"next_bg_override_a": "gallery_tie14a_bg"`, `"next_bg_override_b": "gallery_tie14b_bg"`

### 3. `assetUtils.ts`
- Import 6 new backgrounds
- Register in `backgroundAssets`: `gallery_tie14_desk_bg`, `gallery_tie14a_desk_bg`, `gallery_tie14b_desk_bg`
- Register in `mobilePortraitBackgrounds`: `gallery_tie14_mobile_bg`, `gallery_tie14a_mobile_bg`, `gallery_tie14b_mobile_bg`

### 4. `VisualPlayScreen.tsx`
- `previousBgOverride` TB block: for `studio_tie_14`, return platform-aware base bg
- `getTargetBgForOption` TB block: when option has `next_bg_override`, resolve to platform-aware variant (desk/mobile suffix)

### 5. `jsonDataLoader.ts`
- Add `BG_KEY_ALIASES`: `gallery_tie14a_bg` → `gallery_tie14a_desk_bg`, `gallery_tie14b_bg` → `gallery_tie14b_desk_bg`

### 6. Scene extras cleanup
- Review `studio_scene_extras.json` — remove T14 coffee table extra if now baked into backgrounds

