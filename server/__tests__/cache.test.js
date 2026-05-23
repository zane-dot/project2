import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCache } from '../lib/cache.js';

describe('cache', () => {
  it('serves cached values within TTL', async () => {
    const cache = createCache(1000);
    let calls = 0;
    const loader = async () => {
      calls += 1;
      return { n: calls };
    };
    const a = await cache.get('k', loader);
    const b = await cache.get('k', loader);
    assert.equal(a.cached, false);
    assert.equal(b.cached, true);
    assert.equal(calls, 1);
    assert.deepEqual(a.value, b.value);
  });

  it('re-loads after invalidate()', async () => {
    const cache = createCache(60_000);
    let calls = 0;
    const loader = async () => ({ n: ++calls });
    await cache.get('k', loader);
    cache.invalidate('k');
    await cache.get('k', loader);
    assert.equal(calls, 2);
  });
});
