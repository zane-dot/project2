/**
 * Front-end weather client.
 *
 * Calls the BFF at `/api/weather`, which proxies the Hong Kong Observatory
 * `rhrread` feed and adds 60-second caching. Falls back to a deterministic
 * dataset so the UI is always renderable (offline demos, CI, BFF down).
 */

export type WeatherStationReading = {
  station: string;
  value: number;
};

export type WeatherSnapshot = {
  temperature: WeatherStationReading[];
  humidity: number; // percent
  uvIndex: number;
  updatedAt: string; // ISO timestamp
  source: 'hko' | 'fallback';
};

type Envelope<T> = { ok: true; cached: boolean; ageMs: number; data: T };

export async function fetchWeather(signal?: AbortSignal): Promise<WeatherSnapshot> {
  try {
    const res = await fetch('/api/weather', { signal });
    if (!res.ok) throw new Error(`bff ${res.status}`);
    const env = (await res.json()) as Envelope<WeatherSnapshot>;
    return env.data;
  } catch {
    return fallbackWeather();
  }
}

/**
 * Deterministic fallback so the UI is always usable. Uses a simple
 * sine wave seeded on the day of year so the values look "alive" but
 * remain stable enough for snapshot tests.
 */
export function fallbackWeather(now: Date = new Date()): WeatherSnapshot {
  const stations = [
    'Central',
    'Tsim Sha Tsui',
    'Sha Tin',
    'Tuen Mun',
    'Tai Po',
    'Kwun Tong',
    'Kai Tak',
    'Tseung Kwan O',
    'Sai Kung',
    'Lau Fau Shan',
    'Stanley',
    'Cheung Chau',
  ];
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  const base = 22 + 7 * Math.sin((dayOfYear / 365) * Math.PI * 2);
  return {
    temperature: stations.map((s, i) => ({
      station: s,
      value: Math.round((base + Math.sin(i) * 2 + (i % 3)) * 10) / 10,
    })),
    humidity: 65 + Math.round(Math.sin(dayOfYear) * 10),
    uvIndex: 6 + (dayOfYear % 4),
    updatedAt: now.toISOString(),
    source: 'fallback',
  };
}
