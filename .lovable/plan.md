
מעדכן תכנית קצרה ומדויקת ל‑T14 לפי מה שנבדק בקוד כרגע:

1) מצב נוכחי (מה כבר נכון)
- הטקסט בבועה ב‑`studio_tie_v6.json` כבר עודכן בדיוק לנוסח שביקשת.
- הטולטיפים של כלי A/B כבר מעודכנים:
  - A: "משחק כדורגל לצוות"
  - B: "מערכת צ'קליסט"
- הוגדרו גם `next_bg_override_a/b` ל‑T14.
- הכפילות של אובייקט שולחן קפה ב‑T14 כבר הוסרה מ‑`studio_scene_extras.json`.

2) הבעיות שעדיין חוסמות
- Build נכשל בגלל סדר CSS: ב‑`src/index.css` ה‑`@import` של Google Fonts נמצא אחרי `@tailwind` (צריך להיות לפני).
- Build נכשל כי חסרים פיזית קבצי רקע T14 תחת `src/assets/backgrounds`:
  - `gallery_tie14_desk_bg.webp`
  - `gallery_tie14_mobile_bg.webp`
  - `gallery_tie14a_desk_bg.webp`
  - `gallery_tie14a_mobile_bg.webp`
  - `gallery_tie14b_desk_bg.webp`
  - `gallery_tie14b_mobile_bg.webp`
- בנוסף, יש אי־התאמה לוגית קלה: ל‑T14 כבר הוגדר base platform-aware ב‑`previousBgOverride`, אבל `lockedBgKey/lockedBg` ב‑tie-break עדיין ננעלים על `mission.bg_override`, מה שעלול לבטל את רקע הבסיס החדש לפני בחירת כלי.

3) תכנית ביצוע
- `src/index.css`
  - להעביר את שורת `@import` לראש הקובץ, לפני כל `@tailwind`.
- `src/assets/backgrounds`
  - להוסיף/להעתיק את 6 קבצי T14 החסרים לשמות המדויקים לעיל.
- `src/components/VisualPlayScreen.tsx`
  - בתנאי tie-break של `lockedBgKey` ו‑`lockedBg`:
    - להשתמש קודם ב‑`previousBgOverride` (או `currentBgKey`) לפני fallback ל‑`mission.bg_override`.
    - כך רקע הבסיס של T14 יוצג נכון לפני בחירת כלי, ובחירת A/B תמשיך להחליף ל‑`next_bg_override` platform-aware שכבר קיים.
- `src/lib/assetUtils.ts` ו‑`src/lib/jsonDataLoader.ts`
  - להשאיר את מיפויי T14 כפי שהוגדרו, רק לוודא התאמה מלאה לשמות הקבצים שהועלו.

4) בדיקות אחרי תיקון
- להריץ `build:dev` ולאשר שאין שגיאות asset/css.
- בדיקת T14 מקצה לקצה בדסקטופ:
  - פתיחת המשימה עם רקע בסיס נכון
  - hover טולטיפים נכונים לכלי A/B
  - בחירת A מחליפה לרקע A
  - בחירת B מחליפה לרקע B
- אותה בדיקה במובייל (portrait), כולל התאמת רקעים ל‑mobile variants.

פרטים טכניים
- קבצים לעדכון:  
  - `src/index.css`  
  - `src/components/VisualPlayScreen.tsx`  
  - (וידוא בלבד) `src/lib/assetUtils.ts`, `src/lib/jsonDataLoader.ts`, `src/data/studio_tie_v6.json`, `src/data/studio_scene_extras.json`
- אין צורך בשינויי backend/auth/db; הכל בצד Frontend וניהול assets.
