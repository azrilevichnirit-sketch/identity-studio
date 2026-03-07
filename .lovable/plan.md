

# Fix: Trailing Comma in JSON + T15 Confirmation

## Problem
Build fails because `src/data/studio_scene_extras.json` has a trailing comma on line 113 (after the last object, before `]`). This is invalid JSON.

## Fix
**`src/data/studio_scene_extras.json`** — Remove the trailing comma on line 113:
```json
    "despawn_value": ""
  }
]
```
(Change `,` → nothing after the closing `}` on line 113.)

## T15 Status
T15 configuration is already complete — bubble text, tooltips, background overrides, asset registrations, and logic are all in place from previous edits. No additional changes needed beyond this JSON fix.

## Required Assets (still pending upload)
Once the build passes, upload these files to complete T15 visually:
- **Backgrounds** (`src/assets/backgrounds/`): `gallery_tie15_desk_bg.webp`, `gallery_tie15_mobile_bg.webp`, `gallery_tie15a_desk_bg.webp`, `gallery_tie15a_mobile_bg.webp`, `gallery_tie15b_desk_bg.webp`, `gallery_tie15b_mobile_bg.webp`
- **Tools** (`src/assets/tools/`): `studio_tie_15_a.webp`, `studio_tie_15_b.webp`

