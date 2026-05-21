import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import StatsCard from './components/StatsCard.jsx';
import JobForm from './components/JobForm.jsx';
import JobList from './components/JobList.jsx';
import AdviceModal from './components/AdviceModal.jsx';

const STATUS_FILTERS = ['All', 'Applied', 'Interview', 'Offer', 'Rejected'];

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({ total: 0, byStatus: {} });
  const [filter, setFilter] = useState('All');
  const [q, setQ] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [adviceJob, setAdviceJob] = useState(null);
  const [advice, setAdvice] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [list, st] = await Promise.all([
        api.listJobs({ status: filter === 'All' ? undefined : filter, q: q || undefined }),
        api.getStats(),
      ]);
      setJobs(list);
      setStats(st);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [filter, q]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleCreate(data) {
    setSubmitting(true);
    try {
      await api.createJob(data);
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatus(id, status) {
    await api.updateJob(id, { status });
    await refresh();
  }

  async function handleDelete(id) {
    await api.deleteJob(id);
    await refresh();
  }

  async function handleAdvice(job) {
    setAdviceJob(job);
    setAdvice(null);
    const a = await api.getAdvice(job.id);
    setAdvice(a);
  }

  const headerStats = useMemo(
    () => [
      { label: 'Total', value: stats.total, accent: 'slate' },
      { label: 'Applied', value: stats.byStatus.Applied ?? 0, accent: 'blue' },
      { label: 'Interview', value: stats.byStatus.Interview ?? 0, accent: 'amber' },
      { label: 'Offer', value: stats.byStatus.Offer ?? 0, accent: 'emerald' },
      { label: 'Rejected', value: stats.byStatus.Rejected ?? 0, accent: 'rose' },
    ],
    [stats],
  );

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">🇭🇰 JobTrack HK</h1>
        <p className="text-sm text-slate-600">
          Track every Hong Kong application, interview and offer in one place.
        </p>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {headerStats.map((s) => (
          <StatsCard key={s.label} {...s} />
        ))}
      </section>

      <section className="mb-6">
        <JobForm onSubmit={handleCreate} submitting={submitting} />
      </section>

      <section className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
                filter === s
                  ? 'bg-slate-900 text-white ring-slate-900'
                  : 'bg-white text-slate-700 ring-slate-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          aria-label="search"
          placeholder="Search company or role…"
          className="ml-auto w-64 rounded border border-slate-300 px-3 py-1 text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </section>

      {error && (
        <div className="mb-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <JobList
        jobs={jobs}
        onStatusChange={handleStatus}
        onDelete={handleDelete}
        onAdvice={handleAdvice}
      />

      <AdviceModal
        job={adviceJob}
        advice={advice}
        onClose={() => {
          setAdviceJob(null);
          setAdvice(null);
        }}
      />

      <footer className="mt-10 text-center text-xs text-slate-400">
        Built with React, Express &amp; SQLite. Source on GitHub.
      </footer>
    </div>
  );
}
