import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldRemindBackup } from '../src/lib/backup-reminder.ts';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 9, 8);

test('nessun promemoria se non ci sono dati', () => {
  assert.equal(
    shouldRemindBackup({ hasData: false, lastBackupAt: null, snoozedAt: null, now }),
    false
  );
});

test('promemoria se ci sono dati e nessun backup', () => {
  assert.equal(
    shouldRemindBackup({ hasData: true, lastBackupAt: null, snoozedAt: null, now }),
    true
  );
});

test('nessun promemoria con backup recente', () => {
  assert.equal(
    shouldRemindBackup({ hasData: true, lastBackupAt: now - 3 * DAY, snoozedAt: null, now }),
    false
  );
});

test('promemoria con backup più vecchio di 14 giorni', () => {
  assert.equal(
    shouldRemindBackup({ hasData: true, lastBackupAt: now - 15 * DAY, snoozedAt: null, now }),
    true
  );
});

test('il promemoria rimandato non ricompare per 7 giorni', () => {
  const base = { hasData: true, lastBackupAt: null, now };

  assert.equal(shouldRemindBackup({ ...base, snoozedAt: now - 2 * DAY }), false);
  assert.equal(shouldRemindBackup({ ...base, snoozedAt: now - 8 * DAY }), true);
});
