import { describe, expect, it, vi, afterEach } from 'vitest';
import { bandFor, fallbackAqhi, fetchAqhi } from '@/lib/api/airQuality';

describe('aqhi/bandFor', () => {
  it.each([
    [1, 'low'],
    [3, 'low'],
    [4, 'moderate'],
    [6, 'moderate'],
    [7, 'high'],
    [8, 'veryHigh'],
    [10, 'veryHigh'],
    [11, 'serious'],
  ])('classifies %i as %s', (value, expected) => {
    expect(bandFor(value)).toBe(expected);
  });
});

describe('aqhi/fallbackAqhi', () => {
  it('returns a populated, consistently-banded snapshot', () => {
    const snap = fallbackAqhi(new Date('2025-05-01T10:00:00Z'));
    expect(snap.stations.length).toBeGreaterThan(0);
    for (const s of snap.stations) {
      expect(s.aqhi).toBeGreaterThanOrEqual(1);
      expect(s.band).toBe(bandFor(s.aqhi));
    }
  });
});

describe('aqhi/fetchAqhi', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('unwraps the BFF envelope on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        cached: false,
        ageMs: 0,
        data: {
          stations: [
            {
              station: 'Central/Western',
              district: 'Central & Western',
              type: 'general',
              aqhi: 4,
              band: 'moderate',
            },
          ],
          updatedAt: '2025-05-01T10:00:00Z',
        },
      }),
    }) as never;

    const snap = await fetchAqhi();
    expect(snap.stations).toHaveLength(1);
    expect(snap.stations[0].aqhi).toBe(4);
  });

  it('falls back when the BFF errors', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline')) as never;
    const snap = await fetchAqhi();
    expect(snap.stations.length).toBeGreaterThan(0);
  });
});
