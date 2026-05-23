import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { createCache } from './lib/cache.js';
import { fetchWeather } from './lib/weather.js';
import { fetchAqhi } from './lib/aqhi.js';
import { fetchMtrStatus } from './lib/mtr.js';
import { listMtrLineDetails, getMtrLineDetails } from './lib/mtrLines.js';
import {
  fetchKmbRoutes,
  fetchKmbRouteDetail,
  fetchGmbSummary,
  fetchGmbRouteDetail,
} from './lib/bus.js';
import { getTravelAdvice } from './lib/ai.js';

const PORT = Number(process.env.PORT ?? 8787);
const TTL_MS = Number(process.env.CACHE_TTL_MS ?? 60_000);
const BUS_TTL_MS = 10 * 60_000; // route catalogues change rarely

const app = express();
app.use(cors());
app.use(express.json({ limit: '8kb' }));

const cache = createCache(TTL_MS);
const busCache = createCache(BUS_TTL_MS);

/**
 * Wraps a loader with cache + uniform JSON envelope so the front-end can
 * surface "fresh / cached / stale-fallback" badges if desired.
 */
function endpoint(name, loader) {
  return async (_req, res) => {
    try {
      const { value, cached, age } = await cache.get(name, loader);
      res.set('Cache-Control', `public, max-age=${Math.floor(TTL_MS / 1000)}`);
      res.json({ ok: true, cached, ageMs: age, data: value });
    } catch (err) {
      console.error(`[${name}] upstream failed:`, err.message);
      res.status(502).json({ ok: false, error: 'upstream_failed', name });
    }
  };
}

function busEndpoint(name, loader) {
  return async (_req, res) => {
    try {
      const { value, cached, age } = await busCache.get(name, loader);
      res.set('Cache-Control', `public, max-age=${Math.floor(BUS_TTL_MS / 1000)}`);
      res.json({ ok: true, cached, ageMs: age, data: value });
    } catch (err) {
      console.error(`[${name}] upstream failed:`, err.message);
      res.status(502).json({ ok: false, error: 'upstream_failed', name });
    }
  };
}

app.get('/api/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));
app.get('/api/weather', endpoint('weather', fetchWeather));
app.get('/api/aqhi', endpoint('aqhi', fetchAqhi));
app.get('/api/mtr', endpoint('mtr', fetchMtrStatus));

// ---- MTR static catalogue ----
app.get('/api/mtr/lines', (_req, res) => {
  res.json({ ok: true, cached: false, ageMs: 0, data: { lines: listMtrLineDetails() } });
});
app.get('/api/mtr/lines/:code', (req, res) => {
  const line = getMtrLineDetails(req.params.code);
  if (!line) return res.status(404).json({ ok: false, error: 'unknown_line' });
  res.json({ ok: true, cached: false, ageMs: 0, data: line });
});

// ---- Bus / Minibus ----
app.get('/api/bus/routes', busEndpoint('kmb:routes', fetchKmbRoutes));
app.get('/api/minibus/routes', busEndpoint('gmb:summary', fetchGmbSummary));
app.get('/api/bus/routes/:route/:bound/:serviceType', async (req, res) => {
  const { route, bound, serviceType } = req.params;
  const key = `kmb:detail:${route}:${bound}:${serviceType}`;
  try {
    const { value, cached, age } = await busCache.get(key, () =>
      fetchKmbRouteDetail({ route, bound, serviceType: Number(serviceType) }),
    );
    res.json({ ok: true, cached, ageMs: age, data: value });
  } catch (err) {
    console.error(`[${key}] upstream failed:`, err.message);
    res.status(502).json({ ok: false, error: 'upstream_failed' });
  }
});

app.get('/api/minibus/routes/:region/:route', async (req, res) => {
  const region = String(req.params.region).toUpperCase();
  const route = req.params.route;
  const key = `gmb:detail:${region}:${route}`;
  try {
    const { value, cached, age } = await busCache.get(key, () =>
      fetchGmbRouteDetail({ region, route }),
    );
    res.json({ ok: true, cached, ageMs: age, data: value });
  } catch (err) {
    const status = err.code === 'not_found' ? 404 : err.message === 'invalid_region' ? 400 : 502;
    console.error(`[${key}] failed:`, err.message);
    res.status(status).json({ ok: false, error: err.code || err.message || 'upstream_failed' });
  }
});

// ---- AI assistant ----
app.post('/api/ai/advice', async (req, res) => {
  const from = String(req.body?.from ?? '').trim();
  const to = String(req.body?.to ?? '').trim();
  if (!from || !to) {
    return res.status(400).json({ ok: false, error: 'missing_fields' });
  }
  if (from.length > 120 || to.length > 120) {
    return res.status(400).json({ ok: false, error: 'fields_too_long' });
  }
  if (!process.env.DEEPSEEK_API_KEY) {
    return res.status(503).json({ ok: false, error: 'ai_unavailable' });
  }
  try {
    // Reuse the shared cache so the AI sees the same data the UI sees.
    const [weather, aqhi, mtr, kmb, gmb] = await Promise.all([
      cache.get('weather', fetchWeather).then((r) => r.value).catch(() => null),
      cache.get('aqhi', fetchAqhi).then((r) => r.value).catch(() => null),
      cache.get('mtr', fetchMtrStatus).then((r) => r.value).catch(() => null),
      busCache.get('kmb:routes', fetchKmbRoutes).then((r) => r.value).catch(() => null),
      busCache.get('gmb:summary', fetchGmbSummary).then((r) => r.value).catch(() => null),
    ]);
    const result = await getTravelAdvice({ from, to, weather, aqhi, mtr, bus: { kmb, gmb } });
    res.json({ ok: true, data: result });
  } catch (err) {
    console.error('[ai/advice] failed:', err.code || err.message, err.detail || '');
    const status = err.code === 'missing_api_key' ? 503 : 502;
    res.status(status).json({ ok: false, error: err.code || 'ai_failed' });
  }
});

app.listen(PORT, () => {
  console.log(`[hk-pulse-bff] listening on http://localhost:${PORT}`);
  console.log(`  GET  /api/weather           →  HKO`);
  console.log(`  GET  /api/aqhi              →  EPD AQHI RSS`);
  console.log(`  GET  /api/mtr               →  MTR alert feed`);
  console.log(`  GET  /api/mtr/lines[/:code] →  static line catalogue`);
  console.log(`  GET  /api/bus/routes        →  KMB route list`);
  console.log(`  GET  /api/bus/routes/:r/:b/:s →  KMB route stops`);
  console.log(`  GET  /api/minibus/routes    →  GMB route summary`);
  console.log(`  POST /api/ai/advice         →  DeepSeek travel assistant`);
});

// ---- Serve the built SPA in production (single-service deploy) ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist');
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  // SPA fallback: any non-API route returns index.html
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
  console.log(`[hk-pulse-bff] serving SPA from ${distDir}`);
}
