export const LAST_BACKUP_KEY = 'eclipse-last-backup-at';
export const BACKUP_SNOOZE_KEY = 'eclipse-backup-reminder-snoozed-at';

export const BACKUP_INTERVAL_DAYS = 14;
export const SNOOZE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

const daysSince = (timestamp: number | null, now: number) =>
  timestamp === null ? Infinity : (now - timestamp) / DAY_MS;

/**
 * A reminder is due when the journal holds data, the last backup is older than
 * BACKUP_INTERVAL_DAYS (or missing) and the reminder was not snoozed recently.
 */
export function shouldRemindBackup({
  hasData,
  lastBackupAt,
  snoozedAt,
  now,
}: {
  hasData: boolean;
  lastBackupAt: number | null;
  snoozedAt: number | null;
  now: number;
}) {
  if (!hasData) return false;
  if (daysSince(lastBackupAt, now) < BACKUP_INTERVAL_DAYS) return false;

  return daysSince(snoozedAt, now) >= SNOOZE_DAYS;
}

const readTimestamp = (key: string) => {
  try {
    const value = Number(localStorage.getItem(key));

    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};

const writeTimestamp = (key: string, value: number) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Storage unavailable: the reminder simply stays active.
  }
};

export const getLastBackupAt = () => readTimestamp(LAST_BACKUP_KEY);
export const getBackupSnoozedAt = () => readTimestamp(BACKUP_SNOOZE_KEY);
export const markBackupDone = (now = Date.now()) => writeTimestamp(LAST_BACKUP_KEY, now);
export const snoozeBackupReminder = (now = Date.now()) => writeTimestamp(BACKUP_SNOOZE_KEY, now);
