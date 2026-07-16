import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createFullBackupExportData,
  createWorkspaceExportData,
  getAppendImportTargetMonth,
  parseJournalExport,
} from '../src/lib/journal-export.ts';
import type { JournalState } from '../src/lib/types/trade.ts';

const makeJournal = (id: string): JournalState => ({
  trades: [
    {
      id,
      pair: 'NQ',
      direction: 'long',
      entryPrice: 0,
      exitPrice: 0,
      lotSize: 1,
      stopLoss: 0,
      takeProfit: 0,
      entryDate: '2026-07-15T09:00:00',
      exitDate: '2026-07-15T10:00:00',
      pips: 0,
      pnl: 100,
      commission: 0,
      riskReward: 0,
      screenshots: [],
      tags: [],
      isFavorite: false,
      strategy: '',
      notes: '',
      emotionalState: 'neutral',
      setupRating: 0,
      createdAt: '2026-07-15T10:00:00',
      updatedAt: '2026-07-15T10:00:00',
    },
  ],
  missedTrades: [],
  tags: [],
  tagsInitialized: true,
  strategies: [],
  customTags: [`custom:${id}`],
  weeklyPlans: [],
  settings: { currency: 'USD', defaultLotSize: 1 },
});

test('un export singolo mantiene il journal alla radice e identifica la sorgente', () => {
  const parsed = JSON.parse(
    createWorkspaceExportData(
      'personal',
      makeJournal('personal-trade'),
      new Date('2026-07-15T12:00:00.000Z')
    )
  );

  assert.equal(parsed.trades[0].id, 'personal-trade');
  assert.equal(parsed.exportMetadata.exportType, 'workspace');
  assert.equal(parsed.exportMetadata.sourceWorkspace, 'personal');
  assert.equal(parseJournalExport(JSON.stringify(parsed))?.kind, 'workspace');
});

test('il backup completo separa i workspace senza duplicare i trade', () => {
  const personal = makeJournal('personal-trade');
  const backtest = makeJournal('backtest-trade');
  const json = createFullBackupExportData(
    { personal, backtest },
    [
      { id: 'personal', name: 'Personale', type: 'system' },
      { id: 'backtest', name: 'Backtest', type: 'system' },
      { id: 'student', name: 'Preview', type: 'system' },
    ],
    new Date('2026-07-15T12:00:00.000Z')
  );
  const parsed = parseJournalExport(json);

  assert.equal(parsed?.kind, 'full-backup');
  if (parsed?.kind !== 'full-backup') return;

  assert.equal(parsed.data.workspaces.personal?.trades[0].id, 'personal-trade');
  assert.equal(parsed.data.workspaces.backtest?.trades[0].id, 'backtest-trade');
  assert.equal(parsed.data.workspaces.student, undefined);
  assert.deepEqual(
    parsed.data.workspaceOptions.map((workspace) => workspace.id),
    ['personal', 'backtest']
  );
});

test('i vecchi file con trades alla radice restano riconosciuti', () => {
  assert.equal(
    parseJournalExport(JSON.stringify(makeJournal('legacy-trade')))?.kind,
    'workspace'
  );
});

test('un JSON estraneo al journal viene rifiutato', () => {
  assert.equal(parseJournalExport('{"hello":"world"}'), null);
});

test('append con trade precedenti apre il mese del primo trade importato', () => {
  const existing = makeJournal('existing');
  const imported = makeJournal('older');

  existing.trades[0].entryDate = '2026-07-15T09:00:00';
  existing.trades[0].exitDate = '2026-07-15T10:00:00';
  imported.trades[0].entryDate = '2026-03-04T09:00:00';
  imported.trades[0].exitDate = '2026-03-04T10:00:00';

  const target = getAppendImportTargetMonth(
    JSON.stringify(imported),
    existing.trades
  );

  assert.equal(target?.getFullYear(), 2026);
  assert.equal(target?.getMonth(), 2);
});

test('append con trade successivi apre il mese dell’ultimo trade importato', () => {
  const existing = makeJournal('existing');
  const imported = makeJournal('newer');

  existing.trades[0].entryDate = '2026-03-04T09:00:00';
  existing.trades[0].exitDate = '2026-03-04T10:00:00';
  imported.trades[0].entryDate = '2026-11-20T09:00:00';
  imported.trades[0].exitDate = '2026-11-20T10:00:00';

  const target = getAppendImportTargetMonth(
    JSON.stringify(imported),
    existing.trades
  );

  assert.equal(target?.getFullYear(), 2026);
  assert.equal(target?.getMonth(), 10);
});

test('append in un workspace vuoto apre il mese del primo trade importato', () => {
  const imported = makeJournal('first');
  imported.trades[0].entryDate = '2025-12-02T09:00:00';
  imported.trades[0].exitDate = '2025-12-02T10:00:00';

  const target = getAppendImportTargetMonth(JSON.stringify(imported), []);

  assert.equal(target?.getFullYear(), 2025);
  assert.equal(target?.getMonth(), 11);
});
