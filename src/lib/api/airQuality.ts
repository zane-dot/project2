/**
 * AQHI (Air Quality Health Index) — front-end client.
 *
 * The official EPD XML feed at
 *   https://www.aqhi.gov.hk/epd/ddata/html/out/aqhi_ind_rss_Eng.xml
 * does not send CORS headers, so the browser cannot fetch it directly.
 * The BFF at `/api/aqhi` proxies it and caches for 60 s. We fall back to
 * a small deterministic dataset so the UI is always renderable.
 */

export type AqhiBand = 'low' | 'moderate' | 'high' | 'veryHigh' | 'serious';

export type AqhiStation = {
  station: string;
  district: string;
  type: 'general' | 'roadside';
  aqhi: number; // 1-10+
  band: AqhiBand;
};

export type AqhiSnapshot = {
  stations: AqhiStation[];
  updatedAt: string;
};

type Envelope<T> = { ok: true; cached: boolean; ageMs: number; data: T };

export function bandFor(aqhi: number): AqhiBand {
  if (aqhi <= 3) return 'low';
  if (aqhi <= 6) return 'moderate';
  if (aqhi <= 7) return 'high';
  if (aqhi <= 10) return 'veryHigh';
  return 'serious';
}

export async function fetchAqhi(signal?: AbortSignal): Promise<AqhiSnapshot> {
  try {
    const res = await fetch('/api/aqhi', { signal });
    if (!res.ok) throw new Error(`bff ${res.status}`);
    const env = (await res.json()) as Envelope<AqhiSnapshot>;
    return env.data;
  } catch {
    return fallbackAqhi();
  }
}

const FALLBACK_STATIONS: Omit<AqhiStation, 'aqhi' | 'band'>[] = [
  { station: 'Central/Western', district: 'Central & Western', type: 'general' },
  { station: 'Eastern', district: 'Eastern', type: 'general' },
  { station: 'Sha Tin', district: 'Sha Tin', type: 'general' },
  { station: 'Tsuen Wan', district: 'Tsuen Wan', type: 'general' },
  { station: 'Tung Chung', district: 'Islands', type: 'general' },
  { station: 'Causeway Bay', district: 'Wan Chai', type: 'roadside' },
  { station: 'Central', district: 'Central & Western', type: 'roadside' },
  { station: 'Mong Kok', district: 'Yau Tsim Mong', type: 'roadside' },
];

export function fallbackAqhi(now: Date = new Date()): AqhiSnapshot {
  const hour = now.getUTCHours();
  const stations: AqhiStation[] = FALLBACK_STATIONS.map((s, i) => {
    const base = 3 + ((hour + i) % 6);
    const aqhi = s.type === 'roadside' ? Math.min(11, base + 2) : base;
    return { ...s, aqhi, band: bandFor(aqhi) };
  });
  return { stations, updatedAt: now.toISOString() };
}
