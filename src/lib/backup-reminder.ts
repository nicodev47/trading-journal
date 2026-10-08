export const BACKUP_BASELINE_KEY = 'eclipse-backup-trades-baseline';

/** New trades since the last backup (or the last reminder) that trigger a reminder. */
export const TRADES_BEFORE_REMINDER = 3;

export function shouldRemindBackup({
  totalTrades,
  baseline,
}: {
  totalTrades: number;
  baseline: number | null;
}) {
  // Without a baseline nothing has been backed up yet: count from zero.
  return totalTrades - (baseline ?? 0) >= TRADES_BEFORE_REMINDER;
}

export const getBackupBaseline = (): number | null => {
  try {
    const raw = localStorage.getItem(BACKUP_BASELINE_KEY);
    const value = raw === null ? NaN : Number(raw);

    return Number.isFinite(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
};

/** Records the trade count at the moment of a backup, or when a reminder was shown. */
export const setBackupBaseline = (totalTrades: number) => {
  try {
    localStorage.setItem(BACKUP_BASELINE_KEY, String(totalTrades));
  } catch {
    // Storage unavailable: the reminder simply stays active.
  }
};
