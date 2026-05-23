/**
 * HKO open-data — Real-time hourly readings.
 *   https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread
 *
 * The HKO endpoint already sends CORS headers, but we route it through this
 * proxy anyway so all three feeds share the same caching + fallback contract.
 */
const HKO_URL =
  'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=en';

export async function fetchWeather() {
  const res = await fetch(HKO_URL);
  if (!res.ok) throw new Error(`HKO upstream ${res.status}`);
  const raw = await res.json();
  return normalise(raw);
}

function normalise(raw) {
  const temp = raw?.temperature?.data ?? [];
  const humid = raw?.humidity?.data?.[0]?.value ?? 0;
  const uv =
    raw?.uvindex && typeof raw.uvindex === 'object'
      ? (raw.uvindex.data?.[0]?.value ?? 0)
      : 0;
  return {
    temperature: temp.map((d) => ({ station: d.place, value: d.value })),
    humidity: humid,
    uvIndex: uv,
    updatedAt: raw?.temperature?.recordTime ?? new Date().toISOString(),
    source: 'hko',
  };
}
