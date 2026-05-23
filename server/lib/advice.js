'use strict';

/**
 * AI Advice generator.
 *
 * Returns Hong-Kong-specific interview-prep advice for a tracked job. Designed
 * with two providers:
 *
 *   1. `openai`  — calls OpenAI Chat Completions if OPENAI_API_KEY is set.
 *   2. `local`   — deterministic template-based fallback. Always available,
 *                  CI-safe, no external network. Good enough to demo the UX.
 *
 * The selection is driven by env so the same code runs in dev, CI and prod.
 */

const HK_TIPS = [
  'In Hong Kong tech interviews, expect a mix of English and Cantonese small-talk; lead in English unless invited otherwise.',
  'Bring a 60-second "self-intro" tuned to the role — HK interviewers often open with it.',
  'Salary negotiation in HK is direct; have a HKD monthly base number ready, not annual.',
  'For banking / finance IT roles, expect questions on threading, latency and regulated-environment SDLC.',
  'For startups in Cyberport / Science Park, expect product thinking + speed-of-shipping questions.',
];

function pickTip(seed) {
  const idx = Math.abs(hash(seed)) % HK_TIPS.length;
  return HK_TIPS[idx];
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h;
}

/**
 * Build the prompt sent to the LLM. Exported for testing.
 * @param {{company:string, role:string, location:string, status:string, notes?:string}} job
 */
function buildPrompt(job) {
  return [
    'You are a career coach helping a fresh graduate prepare for a job interview in Hong Kong.',
    'Be concrete, concise, and reference Hong Kong market norms where relevant.',
    'Reply in 4 short sections: 1) Likely interview focus 2) Top 3 questions to rehearse 3) Red flags / things to clarify 4) One HK-specific tip.',
    '',
    `Job: ${job.role} at ${job.company} (${job.location || 'Hong Kong'}).`,
    `Current status: ${job.status}.`,
    job.notes ? `User notes: ${job.notes}` : 'User notes: (none)',
  ].join('\n');
}

/**
 * Local deterministic advice — no network. Format mirrors the LLM output so
 * the frontend doesn't care which provider answered.
 */
function localAdvice(job) {
  const seed = `${job.company}|${job.role}|${job.status}`;
  const tip = pickTip(seed);
  const roleLower = job.role.toLowerCase();
  const isEng = /(engineer|developer|backend|frontend|full.?stack|data|ml|swe)/i.test(roleLower);

  const focus = isEng
    ? 'Expect a coding screen (1–2 medium LeetCode-style problems), a system-design discussion scaled to your years of experience, and behavioural questions on collaboration.'
    : 'Expect a structured behavioural round (STAR format), a domain case study, and questions probing your reason for choosing Hong Kong.';

  const questions = isEng
    ? [
      `Walk me through a project you shipped end-to-end — why ${job.company} should care.`,
      'Design a service that scales to 10x traffic during a market open / product launch.',
      'Tell me about a bug that took you more than a day to find. What did you change afterwards?',
    ]
    : [
      `Why ${job.company}, and why this role specifically?`,
      'Describe a time you handled conflicting priorities from two stakeholders.',
      'What would your first 30 days here look like?',
    ];

  const redFlags = [
    'Clarify visa sponsorship if you are not a HK permanent resident — ask early, politely.',
    'Confirm the team size and reporting line; "we are agile" sometimes means "we have no PM".',
    'Ask about on-call expectations and the on-call rotation size.',
  ];

  return {
    provider: 'local',
    sections: {
      focus,
      questions,
      redFlags,
      hkTip: tip,
    },
  };
}

/**
 * Call OpenAI. Kept dependency-free (uses global fetch from Node 18+).
 * Falls back to localAdvice on any failure so the UX never breaks.
 */
async function openAiAdvice(job, { apiKey, model = 'gpt-4o-mini', fetchImpl = globalThis.fetch, timeoutMs = 8_000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a Hong Kong career coach.' },
          { role: 'user', content: buildPrompt(job) },
        ],
        temperature: 0.4,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('Empty completion');
    return { provider: 'openai', model, text };
  } finally {
    clearTimeout(t);
  }
}

async function getAdvice(job, env = process.env) {
  if (env.OPENAI_API_KEY && env.AI_PROVIDER !== 'local') {
    try {
      return await openAiAdvice(job, { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL });
    } catch (err) {
      // graceful fallback — never fail the request
      const fallback = localAdvice(job);
      fallback.provider = 'local-fallback';
      fallback.fallbackReason = err.message;
      return fallback;
    }
  }
  return localAdvice(job);
}

module.exports = { getAdvice, localAdvice, openAiAdvice, buildPrompt };
