/**
 * DeepSeek-powered travel assistant.
 * Uses the OpenAI-compatible chat-completions endpoint.
 * API key is read from process.env.DEEPSEEK_API_KEY (loaded via --env-file).
 */

import { listMtrLineDetails } from './mtrLines.js';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

function summariseConditions({ weather, aqhi, mtr }) {
  const temps = weather?.temperature ?? [];
  const avgTemp = temps.length
    ? Math.round((temps.reduce((s, t) => s + Number(t.value || 0), 0) / temps.length) * 10) / 10
    : null;
  const sampleTemp = temps.slice(0, 3).map((t) => `${t.station} ${t.value}°C`).join(', ');
  const rh = weather?.humidity ?? null;
  const uv = weather?.uvIndex ?? null;
  const aqhiTop = (aqhi?.stations ?? [])
    .slice(0, 5)
    .map((s) => `${s.station}=${s.aqhi}(${s.band})`)
    .join(', ');
  const mtrLines = (mtr?.lines ?? []).map((l) => `${l.code}:${l.state}`).join(', ');
  return { avgTemp, sampleTemp, rh, uv, aqhiTop, mtrLines };
}

export function buildTravelPrompt({ from, to, weather, aqhi, mtr, bus }) {
  const { avgTemp, sampleTemp, rh, uv, aqhiTop, mtrLines } = summariseConditions({
    weather,
    aqhi,
    mtr,
  });

  const lineCatalogue = listMtrLineDetails()
    .map((l) => `${l.code} (${l.name}): ${l.stations[0]} ↔ ${l.stations[l.stations.length - 1]}`)
    .join('\n');

  const kmbMatches = pickRelevantKmbRoutes(bus?.kmb, from, to, 12);
  const kmbBlock = kmbMatches.length
    ? kmbMatches
        .map(
          (r) =>
            `${r.route} (${r.bound === 'O' ? 'outbound' : 'inbound'}): ${r.origin} → ${r.destination}`,
        )
        .join('\n')
    : `(No KMB routes matched "${from}"/"${to}" by name; mention that the user can search the Bus page for nearby stops.)`;

  const gmbBlock = bus?.gmb?.regions?.length
    ? bus.gmb.regions
        .map((r) => `${r.region} (${r.label}): ${r.count} green-minibus routes`)
        .join('\n')
    : 'GMB data unavailable.';

  const system = `You are HK Pulse, a concise bilingual Hong Kong travel and transit assistant.
Reply in BOTH English and 繁體中文 (English first, then Chinese), using short sections and bullet points.
Always include three sections, in this exact order, with these headings:
1. **Route 路線**
2. **Why 理由**
3. **Travel tips 出行建議** (weather-driven: umbrella / clothing / sunscreen / hydration as appropriate)

Use only the live data provided. If the origin or destination is ambiguous, pick the most likely Hong Kong location and state your assumption.
Recommend the best mode for the trip:
 - MTR for fast cross-district trips (mention specific lines + interchange stations).
 - KMB franchised bus when a direct route from the matched list below covers the trip — quote the exact route number.
 - GMB green minibus for short hops or hilly / first-last-mile segments — quote a route number only if one is in the matched list, otherwise say "check the Bus page for local minibus routes in <region>".
Never invent a bus or minibus number that is not in the provided list.`;

  const user = `Origin: ${from}
Destination: ${to}

Live Hong Kong conditions:
- Average temperature: ${avgTemp ?? 'n/a'}°C (sample: ${sampleTemp || 'n/a'})
- Humidity: ${rh ?? 'n/a'}%, UV index: ${uv ?? 'n/a'}
- AQHI sample: ${aqhiTop || 'n/a'}
- MTR status: ${mtrLines || 'n/a'}

MTR line reference (terminus ↔ terminus):
${lineCatalogue}

KMB routes that match the origin/destination by name (use these exact numbers if relevant):
${kmbBlock}

GMB green-minibus coverage by region:
${gmbBlock}

Give the user the best route from origin to destination and weather-driven travel tips.`;

  return { system, user };
}

/**
 * Pick KMB routes whose origin or destination contains a keyword from `from` or `to`.
 * Routes whose origin matches `from` AND destination matches `to` (or the reverse) rank highest.
 */
function pickRelevantKmbRoutes(kmb, from, to, limit) {
  if (!kmb?.routes?.length) return [];
  const fromKeys = tokenise(from);
  const toKeys = tokenise(to);
  if (!fromKeys.length || !toKeys.length) return [];
  const scored = [];
  for (const r of kmb.routes) {
    const o = `${r.origin} ${r.originZh}`.toLowerCase();
    const d = `${r.destination} ${r.destinationZh}`.toLowerCase();
    const oFromHit = fromKeys.some((k) => o.includes(k));
    const oToHit = toKeys.some((k) => o.includes(k));
    const dFromHit = fromKeys.some((k) => d.includes(k));
    const dToHit = toKeys.some((k) => d.includes(k));
    let score = 0;
    if (oFromHit && dToHit) score = 3;
    else if (oToHit && dFromHit) score = 3;
    else if (oFromHit || dToHit || oToHit || dFromHit) score = 1;
    if (score > 0) scored.push({ score, r });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.r);
}

function tokenise(s) {
  return String(s ?? '')
    .toLowerCase()
    .split(/[\s,/、，]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

export async function getTravelAdvice({ from, to, weather, aqhi, mtr, bus }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    const err = new Error('missing_api_key');
    err.code = 'missing_api_key';
    throw err;
  }
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  const { system, user } = buildTravelPrompt({ from, to, weather, aqhi, mtr, bus });
  const summary = summariseConditions({ weather, aqhi, mtr });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        max_tokens: 700,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`deepseek_${res.status}`);
      err.code = `deepseek_${res.status}`;
      err.detail = text.slice(0, 400);
      throw err;
    }
    const json = await res.json();
    const advice = json?.choices?.[0]?.message?.content?.trim() ?? '';
    return {
      advice,
      model: json?.model ?? model,
      usage: json?.usage ?? null,
      context: {
        weather: weather
          ? { avgTemperatureC: summary.avgTemp, humidity: summary.rh, uvIndex: summary.uv }
          : null,
        aqhi: aqhi?.stations?.slice(0, 3) ?? null,
        mtrIncidents: (mtr?.lines ?? []).filter((l) => l.state !== 'normal').map((l) => l.code),
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}
