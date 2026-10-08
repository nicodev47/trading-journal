import assert from 'node:assert/strict';
import test from 'node:test';
import { getRomeUtcLabel } from '../src/lib/timezone.ts';

test('in estate Roma è UTC+2', () => {
  assert.equal(getRomeUtcLabel(new Date('2026-07-15T12:00:00Z')), 'UTC+2');
});

test('in inverno Roma è UTC+1', () => {
  assert.equal(getRomeUtcLabel(new Date('2026-01-15T12:00:00Z')), 'UTC+1');
});

test('il passaggio all\'ora legale è gestito: 28 marzo 2026 UTC+1, 30 marzo UTC+2', () => {
  assert.equal(getRomeUtcLabel(new Date('2026-03-28T12:00:00Z')), 'UTC+1');
  assert.equal(getRomeUtcLabel(new Date('2026-03-30T12:00:00Z')), 'UTC+2');
});
