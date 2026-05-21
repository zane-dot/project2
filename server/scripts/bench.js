'use strict';

/**
 * Tiny in-process benchmark for /api/jobs/stats.
 *
 * Runs N requests sequentially, twice — once with cache cleared on every call,
 * once with the cache warm — and reports P50/P95/P99 + RPS for each. Numbers
 * quoted in the README come from running this on a 2-vCPU GitHub-hosted runner.
 *
 *   node scripts/bench.js [--rows=1000] [--iters=2000]
 */

const http = require('node:http');
const { openDb } = require('../db');
const { createApp } = require('../index');

function parseArg(name, def) {
  const m = process.argv.find((a) => a.startsWith(`--${name}=`));
  return m ? Number(m.split('=')[1]) : def;
}

async function main() {
  const rows = parseArg('rows', 1000);
  const iters = parseArg('iters', 2000);

  process.env.NODE_ENV = 'test'; // disable request logging
  const db = openDb(':memory:');

  // seed
  const insert = db.prepare(
    "INSERT INTO jobs (company, role, status) VALUES (?, ?, ?)",
  );
  const statuses = ['Applied', 'Interview', 'Offer', 'Rejected'];
  const t0 = Date.now();
  db.transaction(() => {
    for (let i = 0; i < rows; i += 1) {
      insert.run(`Co_${i}`, `Role_${i % 50}`, statuses[i % statuses.length]);
    }
  })();
  // eslint-disable-next-line no-console
  console.log(`seeded ${rows} rows in ${Date.now() - t0}ms`);

  const app = createApp(db);
  const server = http.createServer(app).listen(0);
  const { port } = server.address();

  const url = `http://127.0.0.1:${port}/api/jobs/stats`;

  // 1) cold cache (clear before every request via a debug header? Simpler:
  //    write to /api/jobs to invalidate). Instead we use the noCache request
  //    path: insert a tiny row before each call.
  const cold = await runBench(url, iters, async () => {
    await fetchJson(`http://127.0.0.1:${port}/api/jobs`, 'POST', {
      company: 'x', role: 'y',
    });
  });

  // 2) warm cache (just hammer stats)
  const warm = await runBench(url, iters);

  // eslint-disable-next-line no-console
  console.log('\n=== /api/jobs/stats benchmark ===');
  report('cold (cache invalidated each call)', cold);
  report('warm (cache hit)', warm);

  server.close();
}

async function runBench(url, iters, before) {
  const times = new Array(iters);
  const t0 = Date.now();
  for (let i = 0; i < iters; i += 1) {
    if (before) await before();
    const s = process.hrtime.bigint();
    await fetchJson(url, 'GET');
    const e = process.hrtime.bigint();
    times[i] = Number(e - s) / 1e6;
  }
  const wall = Date.now() - t0;
  times.sort((a, b) => a - b);
  return {
    iters,
    wallMs: wall,
    rps: (iters / wall) * 1000,
    p50: times[Math.floor(iters * 0.5)],
    p95: times[Math.floor(iters * 0.95)],
    p99: times[Math.floor(iters * 0.99)],
  };
}

function report(label, r) {
  // eslint-disable-next-line no-console
  console.log(
    `${label.padEnd(40)}  rps=${r.rps.toFixed(0).padStart(6)}  p50=${r.p50.toFixed(2)}ms  p95=${r.p95.toFixed(2)}ms  p99=${r.p99.toFixed(2)}ms`,
  );
}

function fetchJson(url, method, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method,
        headers: body ? { 'content-type': 'application/json' } : undefined,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks).toString('utf8');
          resolve(buf ? JSON.parse(buf) : null);
        });
      },
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
