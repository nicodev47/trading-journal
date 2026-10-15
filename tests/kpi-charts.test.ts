import assert from 'node:assert/strict';
import test from 'node:test';
import { toArcSegments, toShares } from '../src/lib/kpi-charts.ts';

test('le quote sommano a uno', () => {
  const shares = toShares([14, 2, 19]);

  assert.ok(Math.abs(shares.reduce((a, b) => a + b, 0) - 1) < 1e-9);
});

test('valori nulli o negativi non producono archi', () => {
  assert.deepEqual(toShares([0, 0]), [0, 0]);
  assert.deepEqual(toShares([-5, 5]), [0, 1]);
});

test('gli archi sono consecutivi', () => {
  const [a, b] = toArcSegments([1, 3], 100);

  assert.equal(a.dash, 25);
  assert.equal(a.offset, -0);
  assert.equal(b.dash, 75);
  assert.equal(b.offset, -25);
});
