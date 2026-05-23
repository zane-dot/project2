import { describe, expect, it, vi, afterEach } from 'vitest';
import { fallbackWeather, fetchWeather } from '@/lib/api/weather';

describe('weather/fallbackWeather', () => {
  it('produces a deterministic, populated snapshot', () => {
    const fixed = new Date('2025-04-15T03:00:00Z');
    const snap = fallbackWeather(fixed);
    expect(snap.source).toBe('fallback');
    expect(snap.temperature.length).toBeGreaterThan(10);
    expect(snap.humidity).toBeGreaterThan(0);
    expect(snap.uvIndex).toBeGreaterThanOrEqual(0);
    // Deterministic: same date in → same value out.
    expect(fallbackWeather(fixed)).toEqual(snap);
  });
});

describe('weather/fetchWeather', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('parses the BFF envelope when the network succeeds', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        cached: false,
        ageMs: 0,
        data: {
          temperature: [
            { station: 'Central', value: 23 },
            { station: 'Sha Tin', value: 21 },
          ],
          humidity: 72,
          uvIndex: 5,
          updatedAt: '2025-04-15T03:00:00+08:00',
          source: 'hko',
        },
      }),
    }) as never;

    const snap = await fetchWeather();
    expect(snap.source).toBe('hko');
    expect(snap.temperature).toHaveLength(2);
    expect(snap.humidity).toBe(72);
    expect(snap.uvIndex).toBe(5);
  });

  it('falls back gracefully when the network throws', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline')) as never;
    const snap = await fetchWeather();
    expect(snap.source).toBe('fallback');
    expect(snap.temperature.length).toBeGreaterThan(0);
  });

  it('falls back when the upstream returns a non-2xx', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 }) as never;
    const snap = await fetchWeather();
    expect(snap.source).toBe('fallback');
  });
});
