

# תוכנית איפוס וניקוי: כלים בלבד (שלב 1)

## מה המצב הנוכחי?

המערכת מורכבת מדי עם 3 מנגנונים שמתנגשים:

1. **`calculateFixedPlacement`** (שורות 368-404) - מנסה לחזות קואורדינטות לרקע הבא
2. **`displayedPlacement`** (שורות 671-729) - קוראת מ-`fixedPlacement` השמור ב-`placedProps`
3. **`isSameZone`** (שורות 643-668) - מחליטה אם להציג כלי לפי "אזור"

הבעיה: כשהכלי נשמר, הוא שומר קואורדינטות לפי רקע אחד, אבל מוצג ברקע אחר - וקופץ.

---

## פתרון: מקור אמת יחיד + עדכון ידני

### עיקרון חדש

1. **ה-anchor map הוא מקור האמת היחיד** - כל כלי מקבל מיקום רק משם
2. **אין חיזוי של `next_bg_override`** - המיקום נקבע לפי הרקע הנוכחי
3. **`persist: 'keep'` = את אומרת לי מה להשאיר** - במקום שהמערכת תחליט, את תגידי לי בכל משימה מה נשאר

---

## שינויים בקוד

### 1. הסרת `calculateFixedPlacement` המורכב

**קובץ:** `src/components/VisualPlayScreen.tsx`

פונקציה חדשה פשוטה במקום הישנה:

```typescript
// לפני: לוגיקה מורכבת עם next_bg_override
// אחרי: פשוט קורא מה-anchor map לפי הרקע הנוכחי
const getToolPlacement = (missionId: string, key: 'a' | 'b') => {
  const anchorRef = `m${missionId.replace('studio_', '').padStart(2, '0')}_tool_${key}`;
  const anchorPos = getAnchorPosition(currentBgKey, anchorRef);
  return anchorPos || null;
};
```

### 2. הסרת שמירה ל-`fixedPlacement`

**קובץ:** `src/components/VisualPlayScreen.tsx`

ב-`completePlacement` (שורה 415-422):
- הסרת `calculateFixedPlacement` 
- הסרת `optionWithPlacement`
- פשוט קריאה ל-`onSelect` בלי fixedPlacement

### 3. שינוי `displayedPlacement`

**קובץ:** `src/components/VisualPlayScreen.tsx`

במקום לקרוא מ-`prop.fixedPlacement`, לקרוא מה-anchor map לפי הרקע הנוכחי:

```typescript
placedProps.forEach((prop) => {
  if (prop.persist === 'keep') {
    const anchorRef = `m${prop.missionId.replace('studio_', '').padStart(2, '0')}_tool_${prop.key}`;
    const placement = getAnchorPosition(currentBgKey, anchorRef);
    if (placement) {
      placements.push({...prop, fixedPlacement: placement});
    }
  }
});
```

### 4. Debug נפרד לכלים (שלב 2)

**קובץ:** `src/components/DraggableNpcEditor.tsx`

בהמשך נפריד את ה-debug לשני מצבים:
- **Tool Mode** - רק כלים
- **NPC Mode** - רק דמויות

כרגע נשאיר את ה-editor כמו שהוא, רק נוודא שהכלים עובדים.

---

## התהליך המעודכן

```text
את גוררת כלי במשימה 1
    ↓
כלי ננעל במיקום לפי anchor map של currentBgKey
    ↓
עוברים למשימה 2
    ↓
אם persist='keep':
    → המערכת מחפשת אנקר ב-anchor map של הרקע החדש
    → אם יש - הכלי מוצג במיקום החדש
    → אם אין - הכלי לא מוצג (ואת יכולה לומר לי להוסיף אנקר)
```

---

## סיכום השינויים

| קובץ | מה מוסר | מה נשאר |
|------|---------|---------|
| `VisualPlayScreen.tsx` | `calculateFixedPlacement`, לוגיקת `next_bg_override`, שמירת `fixedPlacement` | קריאה ישירה מ-anchor map |
| `studio_anchor_map.json` | כפילויות ואי-עקביות | אנקרים ברורים לכל רקע |
| `DraggableNpcEditor.tsx` | (ללא שינוי כרגע) | ישאר כמו שהוא |

---

## הצעד הבא

אחרי האישור:
1. אני אנקה את הקוד
2. את תבדקי משימה 1 → משימה 2
3. אם הכלי קופץ - את תגידי לי ואני אוסיף את האנקר החסר ל-anchor map
4. אחרי שכלים עובדים - נעבור לדמויות

