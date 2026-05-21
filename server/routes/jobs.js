'use strict';

const express = require('express');
const { TTLCache } = require('../lib/cache');
const { getAdvice } = require('../lib/advice');

const ALLOWED_STATUSES = new Set(['Applied', 'Interview', 'Offer', 'Rejected']);

/**
 * Build a router with the database injected — keeps tests fast & isolated.
 * @param {import('better-sqlite3').Database} db
 */
function jobsRouter(db) {
  const router = express.Router();
  const statsCache = new TTLCache({ ttlMs: 5_000, maxEntries: 4 });

  // ── Prepared statements (parameterised → no SQL injection) ────────────
  const stmts = {
    listAll: db.prepare(`
      SELECT * FROM jobs
      ORDER BY datetime(applied_at) DESC
    `),
    listByStatus: db.prepare(`
      SELECT * FROM jobs WHERE status = ?
      ORDER BY datetime(applied_at) DESC
    `),
    search: db.prepare(`
      SELECT * FROM jobs
      WHERE company LIKE @q OR role LIKE @q
      ORDER BY datetime(applied_at) DESC
    `),
    getById: db.prepare('SELECT * FROM jobs WHERE id = ?'),
    insert: db.prepare(`
      INSERT INTO jobs (company, role, location, salary_min, salary_max, status, notes)
      VALUES (@company, @role, @location, @salary_min, @salary_max, @status, @notes)
    `),
    update: db.prepare(`
      UPDATE jobs SET
        company    = @company,
        role       = @role,
        location   = @location,
        salary_min = @salary_min,
        salary_max = @salary_max,
        status     = @status,
        notes      = @notes,
        updated_at = datetime('now')
      WHERE id = @id
    `),
    remove: db.prepare('DELETE FROM jobs WHERE id = ?'),
    stats: db.prepare(`
      SELECT status, COUNT(*) AS n FROM jobs GROUP BY status
    `),
    total: db.prepare('SELECT COUNT(*) AS n FROM jobs'),
  };

  /**
   * Validate & normalise an incoming job payload. Returns either
   * { ok: true, value } or { ok: false, error }.
   */
  function normalise(body, { partial = false } = {}) {
    if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be an object' };

    const out = {
      company: trim(body.company),
      role: trim(body.role),
      location: trim(body.location) || 'Hong Kong',
      salary_min: nullableInt(body.salary_min),
      salary_max: nullableInt(body.salary_max),
      status: trim(body.status) || 'Applied',
      notes: body.notes == null ? null : String(body.notes).slice(0, 2000),
    };

    if (!partial) {
      if (!out.company) return { ok: false, error: 'company is required' };
      if (!out.role) return { ok: false, error: 'role is required' };
    }
    if (!ALLOWED_STATUSES.has(out.status)) {
      return { ok: false, error: `status must be one of ${[...ALLOWED_STATUSES].join(', ')}` };
    }
    if (out.salary_min != null && out.salary_max != null && out.salary_min > out.salary_max) {
      return { ok: false, error: 'salary_min cannot exceed salary_max' };
    }
    return { ok: true, value: out };
  }

  // ── Routes ────────────────────────────────────────────────────────────

  // GET /api/jobs/stats  (registered before /:id so it isn't shadowed)
  router.get('/stats', (_req, res) => {
    const cached = statsCache.get('stats');
    if (cached) {
      res.set('x-cache', 'HIT');
      return res.json(cached);
    }
    const byStatus = { Applied: 0, Interview: 0, Offer: 0, Rejected: 0 };
    for (const row of stmts.stats.all()) byStatus[row.status] = row.n;
    const total = stmts.total.get().n;
    const payload = { total, byStatus, cache: statsCache.stats() };
    statsCache.set('stats', payload);
    res.set('x-cache', 'MISS');
    return res.json(payload);
  });

  // GET /api/jobs?status=&q=
  router.get('/', (req, res) => {
    const { status, q } = req.query;
    if (q) return res.json(stmts.search.all({ q: `%${q}%` }));
    if (status) {
      if (!ALLOWED_STATUSES.has(status)) return res.status(400).json({ error: 'invalid status' });
      return res.json(stmts.listByStatus.all(status));
    }
    return res.json(stmts.listAll.all());
  });

  // GET /api/jobs/:id
  router.get('/:id', (req, res) => {
    const job = stmts.getById.get(numId(req.params.id));
    if (!job) return res.status(404).json({ error: 'not found' });
    return res.json(job);
  });

  // POST /api/jobs
  router.post('/', (req, res) => {
    const v = normalise(req.body);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const info = stmts.insert.run(v.value);
    statsCache.invalidate();
    return res.status(201).json(stmts.getById.get(info.lastInsertRowid));
  });

  // PUT /api/jobs/:id
  router.put('/:id', (req, res) => {
    const id = numId(req.params.id);
    const existing = stmts.getById.get(id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    const merged = { ...existing, ...req.body };
    const v = normalise(merged);
    if (!v.ok) return res.status(400).json({ error: v.error });
    stmts.update.run({ ...v.value, id });
    statsCache.invalidate();
    return res.json(stmts.getById.get(id));
  });

  // DELETE /api/jobs/:id
  router.delete('/:id', (req, res) => {
    const id = numId(req.params.id);
    const info = stmts.remove.run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'not found' });
    statsCache.invalidate();
    return res.status(204).end();
  });

  // POST /api/jobs/:id/advice — LLM-powered interview prep
  router.post('/:id/advice', async (req, res, next) => {
    try {
      const job = stmts.getById.get(numId(req.params.id));
      if (!job) return res.status(404).json({ error: 'not found' });
      const advice = await getAdvice(job);
      return res.json(advice);
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

function trim(v) {
  return v == null ? '' : String(v).trim();
}
function numId(v) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : -1;
}
function nullableInt(v) {
  if (v == null || v === '') return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

module.exports = { jobsRouter, ALLOWED_STATUSES };
