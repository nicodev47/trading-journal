import assert from 'node:assert/strict';
import test from 'node:test';
import { getTradeSharePresentation } from '../src/lib/trade-share-outcome.ts';

test('Trade Recap usa gli accenti profit per un P&L positivo', () => {
  const presentation = getTradeSharePresentation(125.5);

  assert.equal(presentation.outcome, 'profit');
  assert.equal(presentation.badgeLabel, 'PROFIT');
  assert.equal(presentation.accent, '#00d68f');
});

test('Trade Recap usa gli accenti loss per un P&L negativo', () => {
  const presentation = getTradeSharePresentation(-125.5);

  assert.equal(presentation.outcome, 'loss');
  assert.equal(presentation.badgeLabel, 'LOSS');
  assert.equal(presentation.accent, '#ff4d70');
});

test('Trade Recap usa gli accenti neutri per zero e meno zero', () => {
  for (const pnl of [0, -0]) {
    const presentation = getTradeSharePresentation(pnl);

    assert.equal(presentation.outcome, 'missed');
    assert.equal(presentation.badgeLabel, 'MISSED');
    assert.equal(presentation.accent, '#e5e7eb');
  }
});
