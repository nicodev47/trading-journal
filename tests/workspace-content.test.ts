import assert from 'node:assert/strict';
import test from 'node:test';
import { hasWorkspaceContent } from '../src/lib/workspace-content.ts';

const emptyWorkspace = {
  trades: [],
  missedTrades: [],
  weeklyPlans: [],
};

test('un workspace vuoto non contiene dati consultabili', () => {
  assert.equal(hasWorkspaceContent(emptyWorkspace), false);
  assert.equal(hasWorkspaceContent(null), false);
});

test('impostazioni e metadata non rendono visibile Preview', () => {
  const metadataOnly = {
    ...emptyWorkspace,
    tags: ['tag-importato'],
    strategies: ['setup-importato'],
    settings: { currency: 'EUR' },
  };

  assert.equal(hasWorkspaceContent(metadataOnly), false);
});

test('la presenza di trade rende Preview visibile', () => {
  assert.equal(
    hasWorkspaceContent({
      ...emptyWorkspace,
      trades: [{ exitDate: '2026-07-15T10:00:00' } as never],
    }),
    true
  );
});

test('missed trade e piani settimanali sono contenuti consultabili', () => {
  assert.equal(
    hasWorkspaceContent({
      ...emptyWorkspace,
      missedTrades: [{ date: '2026-07-15' } as never],
    }),
    true
  );
  assert.equal(
    hasWorkspaceContent({
      ...emptyWorkspace,
      weeklyPlans: [
        { weekKey: '2026-W29', notes: 'Piano importato' } as never,
      ],
    }),
    true
  );
});

test('array con elementi privi di dati reali non mostrano Preview', () => {
  assert.equal(
    hasWorkspaceContent({
      trades: [{} as never],
      missedTrades: [{} as never],
      weeklyPlans: [{} as never],
    }),
    false
  );
});
