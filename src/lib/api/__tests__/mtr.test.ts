import { describe, expect, it, vi, afterEach } from 'vitest';
import { fallbackMtr, fetchMtrStatus } from '@/lib/api/mtr';

describe('mtr/fallbackMtr', () => {
  it('returns a snapshot for every line', () => {
    const snap = fallbackMtr(new Date('2025-05-01T10:00:00Z'));
    expect(snap.lines.length).toBeGreaterThanOrEqual(10);
    expect(snap.lines.every((l) => l.code.length === 3)).toBe(true);
  });

  it('always includes at least one non-normal alert across 24 hours', () => {
    let sawAlert = false;
    for (let h = 0; h < 24; h += 1) {
      const snap = fallbackMtr(new Date(Date.UTC(2025, 4, 1, h, 0)));
      if (snap.lines.some((l) => l.state !== 'normal')) {
        sawAlert = true;
        break;
      }
    }
    expect(sawAlert).toBe(true);
  });
});

describe('mtr/fetchMtrStatus', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('unwraps the BFF envelope on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        cached: true,
        ageMs: 1234,
        data: {
          lines: [
            { code: 'ISL', name: 'Island Line', color: '#0070b9', state: 'delayed', message: 'x' },
          ],
          updatedAt: '2025-05-01T10:00:00Z',
        },
      }),
    }) as never;

    const snap = await fetchMtrStatus();
    expect(snap.lines).toHaveLength(1);
    expect(snap.lines[0].state).toBe('delayed');
  });

  it('falls back when the BFF errors', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline')) as never;
    const snap = await fetchMtrStatus();
    expect(snap.lines.length).toBeGreaterThanOrEqual(10);
  });
});
