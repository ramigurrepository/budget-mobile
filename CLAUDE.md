# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Always read the exact versioned Expo docs before writing Expo-related code: https://docs.expo.dev/versions/v56.0.0/

## Development Commands

```bash
# Start dev server (shows QR code for Expo Go / dev builds)
npx expo start

# Start with cleared cache (needed after dependency changes or bundler issues)
npx expo start --clear

# Web only
npx expo start --web
```

## Deployment Rules — חובה לקרוא לפני כל שינוי קוד

> **חוק ברזל: כל שינוי עובר דרך PR ל-`master` בלבד.**
> אסור בהחלט להשתמש בפקודות הבאות:
> - ❌ `git push origin master` ישירות — master מוגן, הפוש ייחסם
> - ❌ `vercel --prod` / `npx vercel --prod` — עוקף את git
> - ❌ `eas update` / `npx eas-cli update` — **EAS OTA לא בשימוש בפרויקט זה בכלל**
>
> **למה:** PR מתעד מה השתנה בכל גרסה ומאפשר rollback מדויק.

### זרימת עבודה — PR Workflow

```bash
# 1. תמיד התחל מ-master מעודכן
git checkout master && git pull

# 2. צור branch חדש לכל פיצ'ר / תיקון
git checkout -b fix/שם-קצר          # לבאג
git checkout -b feat/שם-קצר         # לפיצ'ר חדש

# 3. בצע שינויים ו-commit
git add <files>
git commit -m "תיאור קצר של השינוי"

# 4. דחוף את ה-branch
git push origin <branch-name>

# 5. פתח PR עם כותרת ותיאור מלא
gh pr create --title "כותרת קצרה" --body "$(cat <<'EOF'
## מה השתנה?
תיאור מה השתנה ולמה.

## סוג השינוי
- [x] תיקון באג / פיצ'ר חדש / שיפור

## צ'קליסט
- [ ] בדקתי ב-Web
- [ ] בדקתי ב-Android
EOF
)"

# 6. בדוק את ה-Vercel Preview URL שנוצר אוטומטית ל-PR
# 7. מזג ← Vercel מפיץ לפרודקשן אוטומטית (~1 דקה)
gh pr merge --squash

# 8. חזור ל-master ומשוך
git checkout master && git pull
```

> **Rollback אם יש בעיה:** vercel.com/ramigur/budget-mobile/deployments → בחר דיפלוי ישן → "Promote to Production"

### הוראות ל-Claude Code — חובה לפני כל שינוי קוד

**לפני כתיבת קוד:**
1. `git checkout master && git pull` — תמיד מ-master מעודכן
2. `git checkout -b feat/שם` — branch חדש לכל משימה

**אחרי סיום:**
1. `git add` + `git commit` + `git push origin <branch>`
2. `gh pr create` עם כותרת ותיאור ברור של מה השתנה ולמה
3. לא למזג לבד — להציג ל-user את לינק ה-PR ולחכות לאישור

## Deployment Architecture

| Mechanism | What it updates | Speed | User action needed |
|-----------|----------------|-------|--------------------|
| Vercel (auto, GitHub-connected) | Web app | ~1 min | Hard refresh (Ctrl+Shift+R) |
| Native EAS build (manual) | New APK to install | ~22 min | Install APK from EAS link |

> ❌ **EAS OTA — לא בשימוש.** אינו אמין בפרויקט זה. עדכון לטלפון = APK חדש בלבד.

### APK — הדרך היחידה לעדכן את הטלפון

```powershell
npx eas-cli build --profile preview --platform android --non-interactive
```

The build runs on EAS servers (~22 min). The local CLI may time out — that is normal. Check completion at:
`https://expo.dev/accounts/ramigur/projects/budget-mobile/builds`

**Installing on a device** — the APK is internal distribution, not on the Play Store:
1. Go to `https://expo.dev/accounts/ramigur/projects/budget-mobile/builds`
2. Click the latest **preview** build with `Channel: production` → **Install** → scan the QR code with the phone camera (not Expo Go)
3. Tap the notification → follow the Android install prompt

There is also an older separate app called `budget-app` on some devices — it is a different codebase and does not receive updates from this project.

### Vercel (Web)

- **Stable production URL**: `https://budget-mobile-rosy.vercel.app` — always points to the latest production deployment. Individual deployment URLs (e.g. `budget-mobile-3c7mh7mb6-....vercel.app`) go stale.
- There are 3 Vercel projects in this account: `budget-mobile` (this app), `budget-app` (old/separate), `project-scale`. Always deploy to `budget-mobile`.
- Vercel runs `npx expo export --platform web` on each deploy. `dist/` is in `.gitignore` and always rebuilt fresh.
- Users may see a cached old version even after a new deploy due to service worker caching — they need Ctrl+Shift+R or an incognito window.

### Supabase Auth & OAuth

Google OAuth redirect URLs must be registered in the Supabase dashboard under **Authentication → URL Configuration**:
- **Site URL**: `https://budget-mobile-rosy.vercel.app`
- **Redirect URLs** (allow list):
  - `budgetmobile://` — mobile deep link for the native app
  - `https://budget-mobile-rosy.vercel.app/**` — web app

If after Google login the user lands on the wrong app/URL, check this list first. Supabase ignores the `redirectTo` parameter if the destination isn't in the allow list and falls back to Site URL.

- Web OAuth uses `window.location.origin` as `redirectTo` (`app/login.tsx`) — always redirects back to whatever domain the user loaded from.
- Mobile OAuth uses `skipBrowserRedirect: true` with `expo-web-browser`, returning via the `budgetmobile://` deep link.
- Sessions are persisted via `AsyncStorage` on native; on web, Supabase reads the session from the URL hash after OAuth redirect.

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_TOKEN=   # only needed for EAS CLI commands
```

**Vercel-only env vars** (not in `.env.local`, set via Vercel dashboard or `vercel env add`):
```
GOOGLE_CLIENT_ID            # Google OAuth app client ID
GOOGLE_CLIENT_SECRET        # Google OAuth app client secret
GOOGLE_DRIVE_REFRESH_TOKEN  # Long-lived refresh token for uploading CSVs to Drive folder 1eSBgREJLGlQVMHiygIi2ZHWIHpofuQYe
```
The refresh token was obtained once via `/api/setup-drive` → `/api/setup-drive-callback` (one-time OAuth flow). It does not expire unless revoked. To regenerate: visit `https://budget-mobile-rosy.vercel.app/api/setup-drive`.

## Architecture

### Stack
- **Expo SDK 56** with **Expo Router** (file-based routing)
- **React Native 0.85** + **React 19**
- **Supabase** — auth (email + Google OAuth) and PostgreSQL database
- **NativeWind** (Tailwind CSS for React Native) + lucide-react-native icons
- **Heebo** font (Google Fonts) for Hebrew text

### RTL (Right-to-Left)
The app is fully Hebrew/RTL. Two mechanisms work together:
- **Native**: `I18nManager.forceRTL(true)` in `app/_layout.tsx` — makes `flexDirection: 'row'` mirror automatically on iOS/Android
- **Web**: `direction: rtl` in `global.css` on `html, body, #root` — same effect for the browser

When adding new layouts, be aware that `flexDirection: 'row'` renders right-to-left on both platforms. The first child in code appears on the **right** side visually.

### Vercel Serverless Functions (`/api/`)

The root-level `api/` directory contains Vercel serverless functions using `VercelRequest`/`VercelResponse` from `@vercel/node`. These are **not** Expo Router API routes — Expo Router's `app/api/+api.ts` pattern is silently ignored with static export (`npx expo export --platform web`).

Current functions:
- `api/save-csv.ts` — builds and uploads a monthly expense CSV to Google Drive
- `api/setup-drive.ts` — one-time endpoint to start OAuth flow for refresh token
- `api/setup-drive-callback.ts` — receives OAuth code and returns the refresh token

`vercel.json` has a catch-all rewrite routing everything to the SPA. Root `/api/` functions bypass this automatically because Vercel matches them before the catch-all.

**Important**: avoid `googleapis` npm package in these functions — it's too large and causes cold start timeouts. Use direct `fetch` calls to Google REST APIs instead.

### Routing & Auth Flow
```
app/_layout.tsx         ← Root: loads fonts, forces RTL, wraps all providers
  AuthProvider          ← Supabase session + user_profiles table
  MonthProvider         ← Current month/year filter (global state)
  ToastContextProvider  ← Toast notifications

app/login.tsx           ← Email/password + Google OAuth
app/(tabs)/_layout.tsx  ← Bottom tab navigation (4 tabs)
app/(tabs)/expenses/    ← Expenses screen
app/(tabs)/income/      ← Income screen
app/(tabs)/reports/     ← Charts and reports
app/(tabs)/settings/    ← Categories, payment methods, household members
```

Auth redirect is handled in `app/_layout.tsx`: unauthenticated → `/login`, authenticated → `/(tabs)/expenses`.

### Data Model (Supabase)
Key tables:
- `households` — shared budget entity; all data is scoped by `household_id`
- `user_profiles` — linked to Supabase auth users, belongs to a household
- `categories` — expense or income categories (`type: 'expense' | 'income'`)
- `category_budgets` — monthly budget targets per category (year + month)
- `expenses` — transactions; `is_recurring`, `recurring_start_month/year`, `recurring_end_month/year` (installments only), `is_active`
- `incomes` — same as expenses but without `recurring_end_month/year`
- `recurring_exceptions` — rows that suppress a recurring entry for a specific month (used instead of deletion for past months)
- `payment_methods` — cash, card, transfer, etc.

### Recurring Items Logic
`lib/supabase/queries.ts` handles the complexity:
- `getExpensesForMonth()` / `getIncomesForMonth()` fetch both one-off entries for the month AND recurring entries that started on or before the month, minus any exceptions
- Delete on a recurring item: past months get a `recurring_exception`, future months set `is_active = false`

### Installments (תשלומים) vs Recurring (קבועה) — critical distinction

These are two separate concepts sharing `is_recurring = true` in the DB but with different behavior:

| | תשלומים (installments) | קבועה (recurring) |
|--|--|--|
| DB | `is_recurring=true`, `recurring_end_month/year` set, amount = total÷n | `is_recurring=true`, no end date, full amount each month |
| UI entry | `EntryForm` installment dropdown (2–12 payments) | `EntryForm` "קבועה?" switch |
| Edit | Read-only — opens with banner "הוצאה בתשלומים — לצפייה בלבד", only Close button | Fully editable |
| Badge | X/Y badge in `EntryList` (e.g. "3/12") | RefreshCw icon |
| Delete | Sets `recurring_end_month/year` to previous month (preserves past) | Future: `is_active=false`; past: `recurring_exception` row |

`getInstallmentInfo()` in `lib/utils.ts` computes `{ current, total }` from start/end month+year and the viewed month. Returns `null` for non-installment recurring entries.

### Component Patterns
- **CategoryCard** (`components/expenses/CategoryCard.tsx`) — the main expandable list item used on both Expenses and Income screens. Shows budget vs. actual, expands to show `EntryList` + `EntryForm`.
- **EntryForm** (`components/expenses/EntryForm.tsx`) — handles both add and edit. Accepts `readOnly` prop for installment entries (all fields disabled, only Close button shown). The installment dropdown and recurring switch are mutually exclusive.
- **MonthSelector** (`components/layout/MonthSelector.tsx`) — shared header for Expenses, Income, and Reports. Tapping the month label resets to current month.
- **Modal** (`components/ui/Modal.tsx`) — bottom-sheet style modal used throughout for forms.
- **Select** (`components/ui/Select.tsx`) — custom bottom-sheet picker; accepts `disabled` prop.
- Screens query Supabase directly in a `loadData()` function wrapped in `try/finally` to ensure `setLoading(false)` always runs.

### Reports Screen
`app/(tabs)/reports/index.tsx` renders four sub-tabs with local state (not router tabs):
- **חודשי** — `MonthlyReport`: expense rows (red header) then income rows (green header), uses global `MonthContext`
- **מעקב** — `TrackingReport`: per-category drill-down, uses global `MonthContext`
- **שנתי** — `AnnualReport`: `react-native-chart-kit` LineChart + monthly table. The chart library uses `react-native-svg` and produces `transform-origin` console warnings on web — this is a library limitation, the chart still renders correctly.
- **ייצוא** — `ExpensesExportReport`: calls `POST /api/save-csv` (Vercel serverless function) which builds a UTF-8 CSV with BOM and uploads it to Google Drive folder `1eSBgREJLGlQVMHiygIi2ZHWIHpofuQYe` via OAuth refresh token. Returns a Drive link. Uses **local** month state (not global `MonthContext`).

### Styling Conventions
- Use **NativeWind** (`className`) for simple styles; use `StyleSheet.create` for complex or performance-sensitive layouts (FlatList items, animated components).
- Primary green: `#386A20`. Background: `#F7FBEF`. Pill/card background: `#EEF1E4`.
- Text alignment: use `textAlign: 'right'` for Hebrew content displayed in a LTR context; avoid `textAlign: 'left'` since it reads as "start" in RTL.
- `start`/`end` (logical properties) are preferred over `left`/`right` in styles for RTL correctness.
