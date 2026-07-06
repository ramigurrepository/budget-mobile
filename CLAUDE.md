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

## Deployment Architecture

| Mechanism | What it updates | Speed | User action needed |
|-----------|----------------|-------|--------------------|
| Vercel (auto, GitHub-connected) | Web app | ~1 min | Hard refresh (Ctrl+Shift+R) |
| Native EAS build (manual) | New APK to install | ~22 min | Install APK from EAS link |
| GitHub Actions → EAS OTA | JS bundle on installed apps | ~3 min | ⚠️ See note below |

> ⚠️ **OTA אינו אמין בפרויקט זה.** על אף שהשרת מחזיר עדכונים תקינים, האפליקציה המותקנת אינה מקבלת אותם באופן עקבי. **כל שינוי קוד שצריך להגיע לטלפון דורש APK חדש.** OTA פועל רק לווב.

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

### EAS OTA (לווב בלבד — אינו אמין לנייד)

```powershell
# Manual OTA on PowerShell
$env:CI = "1"; npx eas-cli update --channel production --message "description" --environment production
```

- **Account**: `ramigur`, **Project**: `budget-mobile`, **EAS Project ID**: `8a224645-99a8-4e1c-8e2b-8499abfc39a8`
- **GitHub Actions** runs OTA automatically on every push to master — requires `EXPO_TOKEN` secret.
- OTA verification: `npx eas-cli update:list --branch production --limit 1`
- After OTA, report: ✅ OTA confirmed (Group ID: `...`) | 🌐 Web: `https://budget-mobile-rosy.vercel.app`

### Vercel (Web)

- **Stable production URL**: `https://budget-mobile-rosy.vercel.app` — always points to the latest production deployment. Individual deployment URLs (e.g. `budget-mobile-3c7mh7mb6-....vercel.app`) go stale.
- There are 3 Vercel projects in this account: `budget-mobile` (this app), `budget-app` (old/separate), `project-scale`. Always deploy to `budget-mobile`.
- Manual deploy: `npx vercel --prod --yes`
- Force rebuild without cache: `npx vercel --prod --yes --force`
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
- `expenses` / `incomes` — transactions; support `is_recurring` flag
- `recurring_exceptions` — overrides for specific months of a recurring item
- `payment_methods` — cash, card, transfer, etc.

### Recurring Items Logic
`lib/supabase/queries.ts` handles the complexity:
- `getExpensesForMonth()` / `getIncomesForMonth()` fetch both one-off entries for the month AND recurring entries that started on or before the month, minus any exceptions
- Delete on a recurring item: past months get a `recurring_exception`, future months get a hard delete

### Component Patterns
- **CategoryCard** (`components/expenses/CategoryCard.tsx`) — the main expandable list item used on both Expenses and Income screens. Shows budget vs. actual, expands to show `EntryList` + `EntryForm`.
- **MonthSelector** (`components/layout/MonthSelector.tsx`) — shared header for Expenses, Income, and Reports. Tapping the month label resets to current month.
- **Modal** (`components/ui/Modal.tsx`) — bottom-sheet style modal used throughout for forms.
- Screens query Supabase directly in a `loadData()` function called on mount and whenever `month`/`year` context changes.

### Styling Conventions
- Use **NativeWind** (`className`) for simple styles; use `StyleSheet.create` for complex or performance-sensitive layouts (FlatList items, animated components).
- Primary green: `#386A20`. Background: `#F7FBEF`. Pill/card background: `#EEF1E4`.
- Text alignment: use `textAlign: 'right'` for Hebrew content displayed in a LTR context; avoid `textAlign: 'left'` since it reads as "start" in RTL.
- `start`/`end` (logical properties) are preferred over `left`/`right` in styles for RTL correctness.
