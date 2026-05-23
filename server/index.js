'use strict';

const express = require('express');
const cors = require('cors');
const { openDb } = require('./db');
const { jobsRouter } = require('./routes/jobs');

function createApp(db) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '256kb' }));

  // tiny request logger (skipped during tests to keep output clean)
  if (process.env.NODE_ENV !== 'test') {
    app.use((req, _res, next) => {
      // eslint-disable-next-line no-console
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
      next();
    });
  }

  app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
  app.use('/api/jobs', jobsRouter(db));

  // 404
  app.use((req, res) => res.status(404).json({ error: `route not found: ${req.method} ${req.url}` }));

  // central error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV !== 'test') console.error(err);
    res.status(500).json({ error: 'internal server error' });
  });

  return app;
}

if (require.main === module) {
  const port = Number.parseInt(process.env.PORT, 10) || 3001;
  const db = openDb();
  const app = createApp(db);
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`JobTrack HK API listening on http://localhost:${port}`);
  });
}

module.exports = { createApp };
