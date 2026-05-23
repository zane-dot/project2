'use strict';

/**
 * Tiny in-memory cache with TTL + size cap.
 *
 * Used to memoise the dashboard `/api/jobs/stats` aggregate, which is the
 * hottest read endpoint. A single-row mutation invalidates the whole cache
 * — exact freshness without coordination, while still cutting P95 latency
 * by ~30x under read-heavy load (see `scripts/bench.js`).
 */
class TTLCache {
  /**
   * @param {{ttlMs?: number, maxEntries?: number}} [opts]
   */
  constructor(opts = {}) {
    this.ttlMs = opts.ttlMs ?? 5_000;
    this.maxEntries = opts.maxEntries ?? 128;
    /** @type {Map<string, {value: unknown, expiresAt: number}>} */
    this.store = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      this.misses += 1;
      return undefined;
    }
    // refresh LRU position
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits += 1;
    return entry.value;
  }

  set(key, value) {
    if (this.store.size >= this.maxEntries) {
      // evict oldest
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  invalidate() {
    this.store.clear();
  }

  stats() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.store.size,
      hitRate: total === 0 ? 0 : this.hits / total,
    };
  }
}

module.exports = { TTLCache };
