/**
 * Tiny TTL cache. Single-process, in-memory — perfect for a personal
 * dashboard whose upstream feeds only refresh every 60 s.
 */
export function createCache(ttlMs) {
  const store = new Map();
  return {
    async get(key, loader) {
      const hit = store.get(key);
      const now = Date.now();
      if (hit && hit.expires > now) {
        return { value: hit.value, cached: true, age: now - hit.created };
      }
      const value = await loader();
      store.set(key, { value, created: now, expires: now + ttlMs });
      return { value, cached: false, age: 0 };
    },
    invalidate(key) {
      if (key) store.delete(key);
      else store.clear();
    },
  };
}
