import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App.jsx';

const job = {
  id: 1,
  company: 'JPM',
  role: 'SWE Intern',
  location: 'Hong Kong',
  salary_min: 25000,
  salary_max: 30000,
  status: 'Applied',
  applied_at: '2026-02-01T00:00:00',
  notes: null,
};

describe('App integration', () => {
  beforeEach(() => {
    let storedJobs = [job];
    let stats = { total: 1, byStatus: { Applied: 1, Interview: 0, Offer: 0, Rejected: 0 } };
    global.fetch = vi.fn(async (url, opts = {}) => {
      const u = String(url);
      const method = opts.method || 'GET';
      if (u.endsWith('/api/jobs/stats')) {
        return jsonRes(stats);
      }
      if (u.includes('/api/jobs/1/advice') && method === 'POST') {
        return jsonRes({
          provider: 'local',
          sections: {
            focus: 'Coding screen + system design.',
            questions: ['q1', 'q2', 'q3'],
            redFlags: ['rf1'],
            hkTip: 'Bring a 60-second self-intro.',
          },
        });
      }
      if (u.includes('/api/jobs') && method === 'GET') {
        return jsonRes(storedJobs);
      }
      if (u.endsWith('/api/jobs') && method === 'POST') {
        const body = JSON.parse(opts.body);
        const created = { ...job, ...body, id: 2 };
        storedJobs = [created, ...storedJobs];
        stats = { total: 2, byStatus: { ...stats.byStatus, Applied: 2 } };
        return jsonRes(created, 201);
      }
      return jsonRes({}, 404);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders stats and existing job, then adds a new one', async () => {
    render(<App />);
    expect(await screen.findByText(/SWE Intern/)).toBeInTheDocument();
    // total stat (the '1' may also appear in 'Applied'; we just assert title is present)
    expect(screen.getByText('Total')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('company'), { target: { value: 'Google' } });
    fireEvent.change(screen.getByLabelText('role'), { target: { value: 'SRE' } });
    fireEvent.click(screen.getByRole('button', { name: /add application/i }));

    await waitFor(() => expect(screen.getByText('SRE')).toBeInTheDocument());
  });

  test('opens AI advice modal', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /ai interview prep/i }));
    expect(await screen.findByRole('dialog', { name: /ai interview prep/i })).toBeInTheDocument();
    expect(await screen.findByText('Coding screen + system design.')).toBeInTheDocument();
    expect(screen.getByText(/HK-specific tip/)).toBeInTheDocument();
  });
});

function jsonRes(body, status = 200) {
  return {
    ok: status < 400,
    status,
    statusText: 'ok',
    json: async () => body,
  };
}
