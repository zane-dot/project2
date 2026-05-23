'use strict';

const { TTLCache } = require('../lib/cache');

describe('TTLCache', () => {
  test('get returns undefined for missing key and tracks miss', () => {
    const c = new TTLCache();
    expect(c.get('x')).toBeUndefined();
    expect(c.stats().misses).toBe(1);
  });

  test('set/get within TTL returns value and tracks hit', () => {
    const c = new TTLCache({ ttlMs: 1000 });
    c.set('k', 42);
    expect(c.get('k')).toBe(42);
    expect(c.stats().hits).toBe(1);
  });

  test('expires entries after TTL', async () => {
    const c = new TTLCache({ ttlMs: 10 });
    c.set('k', 1);
    await new Promise((r) => setTimeout(r, 25));
    expect(c.get('k')).toBeUndefined();
  });

  test('evicts oldest entry when full', () => {
    const c = new TTLCache({ maxEntries: 2, ttlMs: 1000 });
    c.set('a', 1);
    c.set('b', 2);
    c.set('c', 3);
    expect(c.get('a')).toBeUndefined();
    expect(c.get('b')).toBe(2);
    expect(c.get('c')).toBe(3);
  });

  test('invalidate clears all entries', () => {
    const c = new TTLCache();
    c.set('a', 1);
    c.invalidate();
    expect(c.get('a')).toBeUndefined();
  });
});
