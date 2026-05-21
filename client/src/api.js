const BASE = import.meta.env?.VITE_API_BASE ?? '';

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { 'content-type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  listJobs: ({ status, q } = {}) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    const qs = params.toString();
    return req(`/jobs${qs ? `?${qs}` : ''}`);
  },
  createJob: (data) => req('/jobs', { method: 'POST', body: data }),
  updateJob: (id, data) => req(`/jobs/${id}`, { method: 'PUT', body: data }),
  deleteJob: (id) => req(`/jobs/${id}`, { method: 'DELETE' }),
  getStats: () => req('/jobs/stats'),
  getAdvice: (id) => req(`/jobs/${id}/advice`, { method: 'POST' }),
};
