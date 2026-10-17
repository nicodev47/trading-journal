import type { DailyAnalysis, Trade } from './types/trade';

export const MAX_LEVEL = 3;

const hasText = (value: string | undefined) => (value ?? '').trim().length > 0;

/** How many of the three parts of a day were filled in (analysis, notes, files): 0 to 3. */
export function getDayLevel(entry: DailyAnalysis | undefined): number {
  return (
    Number(hasText(entry?.analysis)) +
    Number(hasText(entry?.observations)) +
    Number((entry?.attachments?.length ?? 0) > 0)
  );
}

export const CASE_STUDY_LEVEL = 1;
export const LOSS_LEVEL = 2;
export const TRADE_LEVEL = 3;

/**
 * Activity per YYYY-MM-DD for the Progress Tracker: a day with a trade (3, brightest),
 * a day closed in loss (2), a day with only an analysis or files, i.e. a case study (1).
 * Days with nothing are left out.
 */
export function getActivityLevels(entries: DailyAnalysis[], trades: Trade[]): Map<string, number> {
  const levels = new Map<string, number>();
  const pnlByDate = new Map<string, number>();

  trades.forEach(trade => {
    const date = (trade.exitDate || trade.entryDate || '').split('T')[0];

    if (!date) return;

    pnlByDate.set(date, (pnlByDate.get(date) ?? 0) + trade.pnl - (trade.commission || 0));
  });

  entries.forEach(entry => {
    if (getDayLevel(entry) > 0) levels.set(entry.date, CASE_STUDY_LEVEL);
  });

  pnlByDate.forEach((pnl, date) => levels.set(date, pnl < 0 ? LOSS_LEVEL : TRADE_LEVEL));

  return levels;
}

export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const fromDateKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);

  return new Date(year, month - 1, day, 12);
};

const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

export interface HeatmapCell {
  date: string;
  level: number;
  /** Day belongs to the requested year. */
  inYear: boolean;
}

/** Weeks as columns (Monday first), like the GitHub contribution graph. */
export function buildHeatmap(year: number, levels: Map<string, number>): HeatmapCell[][] {
  const first = new Date(year, 0, 1, 12);
  const start = new Date(first);

  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));

  const last = new Date(year, 11, 31, 12);
  const weeks: HeatmapCell[][] = [];
  const cursor = new Date(start);

  while (cursor <= last) {
    const week: HeatmapCell[] = [];

    for (let day = 0; day < 7; day += 1) {
      const key = toDateKey(cursor);

      week.push({
        date: key,
        level: levels.get(key) ?? 0,
        inYear: cursor.getFullYear() === year,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    weeks.push(week);
  }

  return weeks;
}

/**
 * One quarter as a rectangle: weeks as columns (Monday first), every week with all
 * seven days. Days of the neighbouring quarters fill the corners and are not `inYear`.
 */
export function buildQuarterHeatmap(
  year: number,
  quarter: number,
  levels: Map<string, number>
): HeatmapCell[][] {
  const first = new Date(year, quarter * 3, 1, 12);
  const last = new Date(year, quarter * 3 + 3, 0, 12);
  const cursor = new Date(first);

  cursor.setDate(first.getDate() - ((first.getDay() + 6) % 7));

  const weeks: HeatmapCell[][] = [];

  while (cursor <= last) {
    const week: HeatmapCell[] = [];

    for (let day = 0; day < 7; day += 1) {
      const key = toDateKey(cursor);

      week.push({
        date: key,
        level: levels.get(key) ?? 0,
        inYear: cursor >= first && cursor <= last,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    weeks.push(week);
  }

  return weeks;
}

export interface Streaks {
  current: number;
  longest: number;
}

/**
 * Consecutive weekdays with an entry. Weekends never break a streak, and a
 * missing entry for today does not either (the day is not over yet).
 */
export function computeStreaks(levels: Map<string, number>, today: Date): Streaks {
  const filled = Array.from(levels.keys()).sort();

  if (filled.length === 0) return { current: 0, longest: 0 };

  const has = (date: Date) => (levels.get(toDateKey(date)) ?? 0) > 0;
  const previousWeekday = (date: Date) => {
    const result = new Date(date);

    do {
      result.setDate(result.getDate() - 1);
    } while (isWeekend(result));

    return result;
  };

  let current = 0;
  let cursor = new Date(today);
  cursor.setHours(12);

  while (isWeekend(cursor)) cursor = previousWeekday(cursor);
  if (!has(cursor)) cursor = previousWeekday(cursor);

  while (has(cursor)) {
    current += 1;
    cursor = previousWeekday(cursor);
  }

  // Longest run, walking weekdays from the first to the last entry.
  let longest = 0;
  let run = 0;
  const walker = fromDateKey(filled[0]);
  const end = fromDateKey(filled[filled.length - 1]);

  while (walker <= end) {
    if (!isWeekend(walker)) {
      if (has(walker)) {
        run += 1;
        longest = Math.max(longest, run);
      } else {
        run = 0;
      }
    }

    walker.setDate(walker.getDate() + 1);
  }

  // A weekend entry still counts for the day itself.
  return { current, longest: Math.max(longest, current) };
}

export interface YearSummary {
  daysWithEntry: number;
  /** Average share of the three parts filled on days with an entry, 0–100. */
  completion: number;
}

export function summarizeYear(year: number, levels: Map<string, number>): YearSummary {
  const inYear = Array.from(levels.entries()).filter(([date]) => date.startsWith(`${year}-`));

  if (inYear.length === 0) return { daysWithEntry: 0, completion: 0 };

  const total = inYear.reduce((sum, [, level]) => sum + level, 0);

  return {
    daysWithEntry: inYear.length,
    completion: Math.round((total / (inYear.length * MAX_LEVEL)) * 100),
  };
}
