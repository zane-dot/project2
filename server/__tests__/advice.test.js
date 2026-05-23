'use strict';

const { localAdvice, buildPrompt, openAiAdvice, getAdvice } = require('../lib/advice');

const sampleJob = {
  id: 1,
  company: 'HSBC',
  role: 'Backend Engineer',
  location: 'Hong Kong',
  status: 'Interview',
  notes: 'second round next week',
};

describe('localAdvice', () => {
  test('returns 4 sections including hkTip', () => {
    const a = localAdvice(sampleJob);
    expect(a.provider).toBe('local');
    expect(a.sections).toEqual(
      expect.objectContaining({
        focus: expect.any(String),
        questions: expect.any(Array),
        redFlags: expect.any(Array),
        hkTip: expect.any(String),
      }),
    );
    expect(a.sections.questions).toHaveLength(3);
  });

  test('engineer roles get coding-screen focus', () => {
    const a = localAdvice({ ...sampleJob, role: 'Frontend Developer' });
    expect(a.sections.focus.toLowerCase()).toMatch(/coding|system/);
  });

  test('non-engineer roles get behavioural focus', () => {
    const a = localAdvice({ ...sampleJob, role: 'Business Analyst' });
    expect(a.sections.focus.toLowerCase()).toMatch(/behavioural|case|star/);
  });

  test('is deterministic for the same job', () => {
    expect(localAdvice(sampleJob)).toEqual(localAdvice(sampleJob));
  });
});

describe('buildPrompt', () => {
  test('includes role, company and notes', () => {
    const p = buildPrompt(sampleJob);
    expect(p).toMatch(/HSBC/);
    expect(p).toMatch(/Backend Engineer/);
    expect(p).toMatch(/second round/);
  });
});

describe('openAiAdvice', () => {
  test('parses a successful response', async () => {
    const fakeFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'Hello HK' } }] }),
    });
    const r = await openAiAdvice(sampleJob, { apiKey: 'x', fetchImpl: fakeFetch });
    expect(r.provider).toBe('openai');
    expect(r.text).toBe('Hello HK');
  });

  test('throws on non-OK response', async () => {
    const fakeFetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
    await expect(openAiAdvice(sampleJob, { apiKey: 'x', fetchImpl: fakeFetch })).rejects.toThrow(/500/);
  });
});

describe('getAdvice', () => {
  test('falls back to local when API key missing', async () => {
    const r = await getAdvice(sampleJob, {});
    expect(r.provider).toBe('local');
  });

  test('falls back to local when AI_PROVIDER=local even with key', async () => {
    const r = await getAdvice(sampleJob, { OPENAI_API_KEY: 'x', AI_PROVIDER: 'local' });
    expect(r.provider).toBe('local');
  });
});
