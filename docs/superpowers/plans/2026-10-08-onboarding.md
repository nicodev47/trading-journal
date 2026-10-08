# Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement task-by-task. Steps use checkbox syntax.

**Goal:** Onboarding on first open + profile "Operatività" tab to personalize assets, setups and operating windows; the app adapts to them.

**Architecture:** A global `JournalPreferences` object (localStorage) exposed through a React context. Pure logic lives in `src/lib` (tested with `node --test`); UI pieces are shared between the onboarding and the profile tab.

**Tech Stack:** React 19, Vite, Tailwind v4, Radix, lucide-react, node:test.

**Spec:** `docs/superpowers/specs/2026-10-08-onboarding-design.md`

## Global Constraints
- Users with existing data skip onboarding; preferences are created silently with legacy defaults (assets NQ, MNQ; setups Continuation, Reversal Sequence, Reversal Sequence Failed; the four legacy windows).
- Setup names: first letter of each word uppercased on submit, duplicates ignored case-insensitively.
- A value used by a trade is always offered in that trade's menu (with note "non più nelle preferenze"), never in other trades' menus; statistics always include it.
- Windows empty → automatic 1-hour buckets.
- No visual regression: existing palette/typography; tests stay green (`npm test`, `npm run build`).

## Review Focus
- Existing journal data (trades with NQ/MNQ and legacy setups) loads untouched and onboarding does not show.
- A trade whose setup/asset was removed still saves without losing the value.
- Custom windows that don't cover a trade's time: the trade is ignored by window stats, no crash.
- Onboarding at 375px width: preview above, buttons reachable.
- Photo upload of a large or non-image file is rejected or downscaled, never breaks localStorage.

---

### Task 1: Preferences logic (`src/lib/preferences.ts`)
**Files:** Create `src/lib/preferences.ts`, `tests/preferences.test.ts`
**Produces:** `JournalPreferences`, `OperatingWindowConfig {id,name,start,end}`, `LEGACY_PREFERENCES`, `capitalizeSetup(raw): string`, `addSetup(list, raw): string[]`, `addAsset(list, raw)`, `resolveInitialPreferences(stored, hasExistingData): {preferences, needsOnboarding}`, `getMenuOptions(list, current): {value, orphan}[]`, `loadPreferences()/savePreferences(p)`.
- [ ] Write failing tests: capitalize ("reversal  sequence"→"Reversal Sequence"), duplicates ignored case-insensitively, legacy migration when data exists, onboarding when empty, `getMenuOptions` appends orphan current value only.
- [ ] Implement; run `npm test` (all pass); commit.

### Task 2: Asset catalog (`src/lib/asset-catalog.ts`)
- [ ] Create grouped catalog `ASSET_CATALOG: {group, items: string[]}[]` (Futures, Forex, Crypto, Indici/Azioni); test: no duplicates, includes NQ and MNQ. Commit.

### Task 3: Operating windows with custom config (`src/lib/operating-windows.ts`)
**Interfaces:** `getOperatingWindowName(trade, windows)`, `getBestOperatingWindow(trades, windows)` where `windows: OperatingWindowConfig[]`; empty → hourly buckets; names are `string`.
- [ ] Tests: custom window match; trade outside → null; empty windows → hour bucket name `"15:00–16:00"`; best window picks highest pnl.
- [ ] Implement, keep `LEGACY_WINDOWS` exported for migration; commit.

### Task 4: Context and app gate
**Files:** Create `src/contexts/preferences-context.tsx`; modify `src/App.tsx`.
- [ ] `PreferencesProvider` + `usePreferences()` (`preferences`, `update(patch)`, `needsOnboarding`, `completeOnboarding(p)`), initial resolution via `resolveInitialPreferences` using `hasStoredWorkspaceContent` over all workspaces.
- [ ] Wrap app; render `<OnboardingScreen />` instead of the journal when `needsOnboarding`. Build, commit.

### Task 5: Shared editors (`src/components/preferences/`)
- [ ] `profile-fields.tsx` (name input; photo upload: image types only, ≤5MB, resized to 256px JPEG via canvas), `asset-picker.tsx` (search + grouped multi-select chips, ≥1), `setup-input.tsx` (Enter to add, × to remove, capitalization), `windows-editor.tsx` (rows name/start/end, add/remove). Build, commit.

### Task 6: Onboarding screen (`src/components/onboarding/`)
- [ ] `onboarding-screen.tsx` split layout, 4 steps with Indietro/Avanti/Fine, `onboarding-preview.tsx` live preview (profile card + mini calendar); mobile: preview on top. Verify in preview at 1280 and 375. Commit.

### Task 7: Profile with tabs
- [ ] Refactor `profile-dialog.tsx` into tabs Profilo / Operatività / Dati; Operatività reuses Task 5 editors and writes through context. Verify; commit.

### Task 8: Integrate preferences in the app
- [ ] Day editor and trade detail: Simbolo/Setup menus via `getMenuOptions`; analysis asset filter + setup chart from preferences ∪ trade values; replace `isValidTradeSetup` usage by non-empty check; stats/analysis pass `preferences.windows`; calendar setup labels fall back to truncated name; share cards use photo if present. Build, `npm test`, verify in preview; commit.

### Task 9: Export/import
- [ ] "Esporta tutto" includes `preferences`; import applies them when present. Commit.

### Task 10: Final verification
- [ ] `npm run build` and `npm test`; walk through: new user flow (clear storage), existing-data user (no onboarding), edit from profile, removed-setup trade, 375px width. Report.
