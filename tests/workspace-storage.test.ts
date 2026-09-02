import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getWorkspaceStorageKey,
  keepLegacyWorkspaceFirst,
  LEGACY_PRIMARY_WORKSPACES,
} from '../src/lib/workspace-storage.ts';

test('il vecchio Personale mantiene ID, chiave dati e prima posizione nei conti', () => {
  assert.deepEqual(LEGACY_PRIMARY_WORKSPACES.personal, {
    id: 'personal',
    displayName: 'Personale',
    storageKey: 'eclipse-trading-journal-data-personal',
    group: 'account',
    position: 0,
  });
  assert.equal(
    getWorkspaceStorageKey(LEGACY_PRIMARY_WORKSPACES.personal.id),
    'eclipse-trading-journal-data-personal'
  );
});

test('il vecchio Backtest diventa Sessione 1 senza cambiare la chiave dati', () => {
  assert.deepEqual(LEGACY_PRIMARY_WORKSPACES.backtest, {
    id: 'backtest',
    displayName: 'Sessione 1',
    storageKey: 'eclipse-trading-journal-data-backtest',
    group: 'backtest',
    position: 0,
  });
  assert.equal(
    getWorkspaceStorageKey(LEGACY_PRIMARY_WORKSPACES.backtest.id),
    'eclipse-trading-journal-data-backtest'
  );
});

test('i nuovi workspace continuano a usare chiavi isolate', () => {
  assert.equal(
    getWorkspaceStorageKey('custom-example'),
    'eclipse-trading-journal-data-custom-example'
  );
  assert.equal(
    getWorkspaceStorageKey('backtest-example'),
    'eclipse-trading-journal-data-backtest-example'
  );
});

test('Personale e Sessione 1 restano primi anche se i metadati arrivano riordinati', () => {
  const accounts = keepLegacyWorkspaceFirst(
    [{ id: 'custom-one' }, { id: 'personal' }, { id: 'secondary' }],
    LEGACY_PRIMARY_WORKSPACES.personal.id
  );
  const backtests = keepLegacyWorkspaceFirst(
    [{ id: 'backtest-2' }, { id: 'backtest-custom' }, { id: 'backtest' }],
    LEGACY_PRIMARY_WORKSPACES.backtest.id
  );

  assert.deepEqual(accounts.map((workspace) => workspace.id), [
    'personal',
    'custom-one',
    'secondary',
  ]);
  assert.deepEqual(backtests.map((workspace) => workspace.id), [
    'backtest',
    'backtest-2',
    'backtest-custom',
  ]);
});
