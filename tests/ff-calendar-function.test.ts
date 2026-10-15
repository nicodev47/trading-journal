import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error plain JS module for Netlify
import handler, { config } from '../netlify/functions/ff-calendar.mjs';

const original = globalThis.fetch;

test('espone il feed con cache condivisa', async () => {
  globalThis.fetch = (async () => new Response('[{"title":"x"}]', { status: 200 })) as typeof fetch;

  try {
    const response = await handler();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('netlify-cdn-cache-control') ?? '', /s-maxage=600/);
    assert.equal(await response.text(), '[{"title":"x"}]');
    assert.equal(config.path, '/api/ff-calendar');
  } finally {
    globalThis.fetch = original;
  }
});

test('se il feed risponde 429 o fallisce, restituisce 502 senza cache', async () => {
  for (const failing of [
    async () => new Response('slow down', { status: 429 }),
    async () => {
      throw new Error('offline');
    },
  ]) {
    globalThis.fetch = failing as unknown as typeof fetch;

    try {
      const response = await handler();

      assert.equal(response.status, 502);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    } finally {
      globalThis.fetch = original;
    }
  }
});
