# Beam Restyling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle EclipseJournal in the Beam / b-r.io Apple-like dark style without changing any function or layout.

**Architecture:** Most styling flows from CSS variables in `src/styles.css` (Tailwind v4 `@theme inline`), so tokens change first and cascade everywhere. Then hardcoded colors, radii and `font-mono` usages in components are tuned file by file. This is a visual change: verification is visual (dev server at http://127.0.0.1:5173/) plus `npm run build` and `npm test`, not TDD.

**Tech Stack:** React 19, Vite, Tailwind v4, Radix UI, Recharts, lucide-react.

**Spec:** `docs/superpowers/specs/2026-10-08-beam-restyling-design.md`

## Global Constraints

- Dark theme only (`<html class="dark">`); keep `:root` and `.dark` token sets identical.
- Background `#0a0a0b`; card `#111113`; secondary surface `#1a1a1d`; border `rgba(255,255,255,0.08)`.
- Text `#f5f5f7`; muted text `#8e8e93`; accent/primary/ring `#0a84ff`.
- `--profit: #30d158`, `--loss: #ff453a` (functional colors only).
- `--radius: 1rem` (16px); cards/dialogs 20px; buttons/inputs 12px; pills fully round.
- Font: Inter for all text; numbers use `tabular-nums`, no monospace look.
- No logic, layout, copy or data changes. Work only on branch `redesign`; never push or publish.

## Review Focus

- Text on `--primary` blue (white vs dark) stays readable on buttons and badges.
- Profit/loss colors remain distinguishable in calendar cells, tables and charts.
- Tag colors (`src/lib/tag-colors.ts`) still readable on the new card background.
- Share cards (`profile-share-card.tsx`, `trade-share-card.tsx`) export correctly via html-to-image (fonts and colors rendered).
- Mobile width (375px) shows no overflow after bigger radii/padding.

---

### Task 1: Global tokens and font

**Files:**
- Modify: `index.html` (add Inter `<link>` from Google Fonts, weights 400-700)
- Modify: `src/styles.css` (`:root`, `.dark`, `@theme inline`, `@layer base`)

- [ ] **Step 1:** Add preconnect + Inter stylesheet link in `index.html` head.
- [ ] **Step 2:** In both `:root` and `.dark`, set the Global Constraints values for `--background`, `--foreground`, `--card`, `--popover`, `--secondary`, `--muted`, `--muted-foreground`, `--border`, `--input`, `--primary`, `--accent`, `--ring`, `--radius`, `--profit`, `--loss`, `--sidebar*` (same values as their non-sidebar twins). `--primary-foreground` is `#ffffff`.
- [ ] **Step 3:** In `@theme inline` set `--font-sans: 'Inter', system-ui, -apple-system, sans-serif` and `--font-mono` to the same stack; raise `--radius-xl` to `calc(var(--radius) + 4px)` (already) and keep sm/md/lg derived.
- [ ] **Step 4:** In `@layer base` add `body { font-feature-settings: 'cv11','ss01'; -webkit-font-smoothing: antialiased; letter-spacing: -0.01em }` and `.font-mono, [class*='tabular'] { font-variant-numeric: tabular-nums }`.
- [ ] **Step 5:** Verify in preview: app loads, background/accents/font changed, no console errors. Run `npm run build` (expect success).
- [ ] **Step 6:** Commit `style: apply Beam tokens and Inter font`.

### Task 2: Base UI components (src/components/ui)

**Files:**
- Modify: `src/components/ui/button.tsx`, `card.tsx`, `input.tsx`, `select.tsx`, `dialog.tsx`, `tabs.tsx`, `popover.tsx`, `badge.tsx` (only those that exist; check with `ls src/components/ui`)

- [ ] **Step 1:** Button: primary blue pill-ish (`rounded-xl`), secondary `bg-secondary`, ghost transparent; hover brightness, no heavy shadows.
- [ ] **Step 2:** Card/dialog/popover: `rounded-[20px]`, 1px border `border-border`, no drop shadow; dialog overlay `bg-black/60 backdrop-blur-sm`.
- [ ] **Step 3:** Input/select/textarea: `rounded-xl`, `bg-secondary`, focus ring blue (`ring-primary/40`).
- [ ] **Step 4:** Tabs: pill-style list with soft active background.
- [ ] **Step 5:** Verify by opening a dialog, a select and tabs in the preview. `npm run build`.
- [ ] **Step 6:** Commit `style: restyle base UI components`.

### Task 3: Navigation header

**Files:**
- Modify: `src/components/trading-journal/nav-header.tsx`, `account-selector.tsx`, `src/App.tsx` (header/banner classes only)

- [ ] **Step 1:** Nav: compact rounded-full container with subtle border and blur; active tab as pill with `bg-white/10`.
- [ ] **Step 2:** Update banner ("whats-new") and account selector to the new radius/colors.
- [ ] **Step 3:** Verify desktop and 375px width in preview. Commit `style: restyle navigation`.

### Task 4: Calendar, stats and cards

**Files:**
- Modify: `trading-calendar.tsx`, `calendar-day.tsx`, `week-summary.tsx`, `weekly-plan-cell.tsx`, `stats-card.tsx`, `stats-grid.tsx`, `statistics-card-grid.tsx`, `advanced-stats-grid.tsx`, `profit-factor-card.tsx`, `trade-list.tsx`

- [ ] **Step 1:** Cards `rounded-[20px]`, more padding, headings larger with tight tracking, labels `text-muted-foreground` (drop uppercase+mono labels where they look "terminal").
- [ ] **Step 2:** Calendar cells: softer borders, today highlighted with blue ring, profit/loss tints from `--profit-muted`/`--loss-muted`.
- [ ] **Step 3:** Replace hardcoded hex/green/emerald with tokens (`text-profit`, `text-loss`, `text-primary`).
- [ ] **Step 4:** Verify in preview with tutorial demo data (month view + stats). Commit `style: restyle calendar and stats`.

### Task 5: Charts and analysis

**Files:**
- Modify: `equity-curve.tsx`, `execution-map.tsx`, `monthly-analysis.tsx`, `analysis-diagnostics.tsx`, `src/components/ui/chart.tsx`

- [ ] **Step 1:** Chart palette: blue `#0a84ff` main line, profit/loss from tokens, grid lines `rgba(255,255,255,0.06)`, tooltips as cards.
- [ ] **Step 2:** In `analysis-diagnostics.tsx` (36 hex) and `monthly-analysis.tsx` map hardcoded colors to tokens or the new palette; keep semantic meaning (good/bad/neutral).
- [ ] **Step 3:** Verify Analisi tab fully. Commit `style: restyle charts and analysis`.

### Task 6: Dialogs, forms and sharing

**Files:**
- Modify: `day-editor-dialog.tsx`, `trade-form.tsx`, `trade-detail-dialog.tsx`, `trade-group-detail-dialog.tsx`, `import-export-dialog.tsx`, `profile-dialog.tsx`, `weekly-plan-dialog.tsx`, `tag-input.tsx`, `src/lib/tag-colors.ts`, `profile-share-card.tsx`, `trade-share-card.tsx`, `share-card-preview.tsx`, tutorial files, `whats-new-dialog.tsx`

- [ ] **Step 1:** Apply radii, borders, input styles and tokens as in Tasks 2 and 4; remove leftover `font-mono` look on labels (numbers keep `tabular-nums`).
- [ ] **Step 2:** Tag colors: adjust palette in `tag-colors.ts` for contrast on `#111113`.
- [ ] **Step 3:** Share cards: restyle to the new palette; verify image export still renders (open share dialog and export).
- [ ] **Step 4:** Verify each dialog in preview. Commit `style: restyle dialogs, forms and share cards`.

### Task 7: Final verification

- [ ] **Step 1:** Run `npm run build` (expect success) and `npm test` (expect all pass).
- [ ] **Step 2:** `grep -rn "font-mono" src | wc -l` just to record; visually walk all screens at desktop and 375px; fix leftovers (old green `#00f0a8`/`oklch(0.7 0.15 160)` should no longer appear: `grep -rn "00f0a8\|0.15 160" src` expect no output).
- [ ] **Step 3:** Report to user with screenshots; do not merge or publish without explicit approval.
