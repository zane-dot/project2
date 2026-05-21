'use strict';

const request = require('supertest');
const { openDb } = require('../db');
const { createApp } = require('../index');

process.env.NODE_ENV = 'test';

function makeApp() {
  const db = openDb(':memory:');
  return { app: createApp(db), db };
}

describe('JobTrack HK API', () => {
  describe('health', () => {
    test('GET /api/health returns ok', async () => {
      const { app } = makeApp();
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('jobs CRUD', () => {
    test('lifecycle: create → list → update → delete', async () => {
      const { app } = makeApp();

      // create
      const created = await request(app)
        .post('/api/jobs')
        .send({ company: 'HSBC', role: 'Backend Engineer', salary_min: 35000, salary_max: 45000 });
      expect(created.status).toBe(201);
      expect(created.body.id).toBeGreaterThan(0);
      expect(created.body.location).toBe('Hong Kong');
      expect(created.body.status).toBe('Applied');

      // list
      const list = await request(app).get('/api/jobs');
      expect(list.status).toBe(200);
      expect(list.body).toHaveLength(1);

      // update status
      const upd = await request(app)
        .put(`/api/jobs/${created.body.id}`)
        .send({ status: 'Interview' });
      expect(upd.status).toBe(200);
      expect(upd.body.status).toBe('Interview');

      // filter by status
      const byStatus = await request(app).get('/api/jobs?status=Interview');
      expect(byStatus.body).toHaveLength(1);

      // search
      const search = await request(app).get('/api/jobs?q=HSB');
      expect(search.body).toHaveLength(1);

      // delete
      const del = await request(app).delete(`/api/jobs/${created.body.id}`);
      expect(del.status).toBe(204);

      // gone
      const gone = await request(app).get(`/api/jobs/${created.body.id}`);
      expect(gone.status).toBe(404);
    });

    test('rejects missing required fields', async () => {
      const { app } = makeApp();
      const r = await request(app).post('/api/jobs').send({ role: 'Dev' });
      expect(r.status).toBe(400);
      expect(r.body.error).toMatch(/company/);
    });

    test('rejects invalid status', async () => {
      const { app } = makeApp();
      const r = await request(app)
        .post('/api/jobs')
        .send({ company: 'X', role: 'Y', status: 'BOGUS' });
      expect(r.status).toBe(400);
    });

    test('rejects salary_min > salary_max', async () => {
      const { app } = makeApp();
      const r = await request(app)
        .post('/api/jobs')
        .send({ company: 'X', role: 'Y', salary_min: 50000, salary_max: 10000 });
      expect(r.status).toBe(400);
      expect(r.body.error).toMatch(/salary/);
    });

    test('rejects invalid status query', async () => {
      const { app } = makeApp();
      const r = await request(app).get('/api/jobs?status=BAD');
      expect(r.status).toBe(400);
    });

    test('update of non-existing job returns 404', async () => {
      const { app } = makeApp();
      const r = await request(app).put('/api/jobs/999').send({ status: 'Offer' });
      expect(r.status).toBe(404);
    });

    test('delete of non-existing job returns 404', async () => {
      const { app } = makeApp();
      const r = await request(app).delete('/api/jobs/999');
      expect(r.status).toBe(404);
    });
  });

  describe('stats endpoint', () => {
    test('aggregates by status and caches', async () => {
      const { app } = makeApp();
      await request(app).post('/api/jobs').send({ company: 'A', role: 'r' });
      await request(app).post('/api/jobs').send({ company: 'B', role: 'r', status: 'Interview' });
      await request(app).post('/api/jobs').send({ company: 'C', role: 'r', status: 'Offer' });

      const first = await request(app).get('/api/jobs/stats');
      expect(first.status).toBe(200);
      expect(first.headers['x-cache']).toBe('MISS');
      expect(first.body.total).toBe(3);
      expect(first.body.byStatus).toEqual({ Applied: 1, Interview: 1, Offer: 1, Rejected: 0 });

      // second call within TTL → HIT
      const second = await request(app).get('/api/jobs/stats');
      expect(second.headers['x-cache']).toBe('HIT');

      // mutation invalidates cache
      await request(app).post('/api/jobs').send({ company: 'D', role: 'r', status: 'Rejected' });
      const third = await request(app).get('/api/jobs/stats');
      expect(third.headers['x-cache']).toBe('MISS');
      expect(third.body.total).toBe(4);
    });
  });

  describe('AI advice', () => {
    test('POST /api/jobs/:id/advice returns local advice without API key', async () => {
      const { app } = makeApp();
      const created = await request(app)
        .post('/api/jobs')
        .send({ company: 'JPM', role: 'SWE Intern' });
      const advice = await request(app).post(`/api/jobs/${created.body.id}/advice`);
      expect(advice.status).toBe(200);
      expect(advice.body.provider).toBe('local');
      expect(advice.body.sections.questions).toHaveLength(3);
      expect(advice.body.sections.hkTip).toMatch(/[A-Z]/);
    });

    test('advice on missing job is 404', async () => {
      const { app } = makeApp();
      const r = await request(app).post('/api/jobs/123/advice');
      expect(r.status).toBe(404);
    });
  });

  describe('404 fallback', () => {
    test('unknown route returns json 404', async () => {
      const { app } = makeApp();
      const r = await request(app).get('/api/nope');
      expect(r.status).toBe(404);
      expect(r.body.error).toMatch(/not found/);
    });
  });
});
