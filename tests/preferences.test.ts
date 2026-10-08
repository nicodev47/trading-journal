import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LEGACY_PREFERENCES,
  addAsset,
  addSetup,
  capitalizeSetup,
  getMenuOptions,
  resolveInitialPreferences,
} from '../src/lib/preferences.ts';

test('capitalizeSetup mette la maiuscola a ogni parola e pulisce gli spazi', () => {
  assert.equal(capitalizeSetup('  reversal   sequence '), 'Reversal Sequence');
  assert.equal(capitalizeSetup('breakout'), 'Breakout');
  assert.equal(capitalizeSetup('ORB 5m'), 'ORB 5m');
});

test('addSetup ignora vuoti e duplicati senza distinguere le maiuscole', () => {
  assert.deepEqual(addSetup(['Breakout'], 'breakout'), ['Breakout']);
  assert.deepEqual(addSetup(['Breakout'], '   '), ['Breakout']);
  assert.deepEqual(addSetup(['Breakout'], 'pullback'), ['Breakout', 'Pullback']);
});

test('addAsset normalizza in maiuscolo e ignora i duplicati', () => {
  assert.deepEqual(addAsset(['NQ'], 'mnq'), ['NQ', 'MNQ']);
  assert.deepEqual(addAsset(['NQ'], 'nq'), ['NQ']);
});

test('chi ha già dati salta l\'onboarding e riceve i valori legacy', () => {
  const result = resolveInitialPreferences(null, true);
  assert.equal(result.needsOnboarding, false);
  assert.deepEqual(result.preferences.assets, ['NQ', 'MNQ']);
  assert.deepEqual(result.preferences.setups, [
    'Continuation',
    'Reversal Sequence',
    'Reversal Sequence Failed',
  ]);
  assert.equal(result.preferences.windows.length, 4);
  assert.equal(result.preferences.onboardingCompleted, true);
});

test('chi non ha dati né preferenze deve fare l\'onboarding', () => {
  const result = resolveInitialPreferences(null, false);
  assert.equal(result.needsOnboarding, true);
});

test('preferenze salvate e complete non richiedono onboarding', () => {
  const stored = { ...LEGACY_PREFERENCES, assets: ['ES'] };
  const result = resolveInitialPreferences(stored, false);
  assert.equal(result.needsOnboarding, false);
  assert.deepEqual(result.preferences.assets, ['ES']);
});

test('getMenuOptions aggiunge il valore attuale solo se non è più nella lista', () => {
  assert.deepEqual(getMenuOptions(['A', 'B'], 'B'), [
    { value: 'A', orphan: false },
    { value: 'B', orphan: false },
  ]);
  assert.deepEqual(getMenuOptions(['A'], 'Vecchio'), [
    { value: 'A', orphan: false },
    { value: 'Vecchio', orphan: true },
  ]);
  assert.deepEqual(getMenuOptions(['A'], ''), [{ value: 'A', orphan: false }]);
});
