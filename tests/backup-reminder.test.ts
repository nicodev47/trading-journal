import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldRemindBackup } from '../src/lib/backup-reminder.ts';

test('nessun promemoria con meno di 3 operazioni nuove', () => {
  assert.equal(shouldRemindBackup({ totalTrades: 2, baseline: null }), false);
  assert.equal(shouldRemindBackup({ totalTrades: 12, baseline: 10 }), false);
});

test('promemoria dopo 3 operazioni dall’ultimo backup', () => {
  assert.equal(shouldRemindBackup({ totalTrades: 13, baseline: 10 }), true);
  assert.equal(shouldRemindBackup({ totalTrades: 20, baseline: 10 }), true);
});

test('senza backup precedente si parte da zero operazioni', () => {
  assert.equal(shouldRemindBackup({ totalTrades: 3, baseline: null }), true);
});

test('eliminare operazioni non fa scattare il promemoria', () => {
  assert.equal(shouldRemindBackup({ totalTrades: 5, baseline: 10 }), false);
});
