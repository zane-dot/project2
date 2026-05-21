import { useState } from 'react';
import StatusBadge from './StatusBadge.jsx';

const STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected'];

function salaryLabel(min, max) {
  if (min == null && max == null) return '—';
  if (min != null && max != null) return `HKD ${min.toLocaleString()}–${max.toLocaleString()}/mo`;
  if (min != null) return `from HKD ${min.toLocaleString()}/mo`;
  return `up to HKD ${max.toLocaleString()}/mo`;
}

export default function JobList({ jobs, onStatusChange, onDelete, onAdvice }) {
  const [busyId, setBusyId] = useState(null);

  if (jobs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
        No applications yet — add your first above.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {jobs.map((j) => (
        <li
          key={j.id}
          data-testid={`job-${j.id}`}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-slate-900">
                {j.role} <span className="text-slate-500">·</span>{' '}
                <span className="text-slate-700">{j.company}</span>
              </div>
              <div className="text-sm text-slate-500">
                {j.location} · {salaryLabel(j.salary_min, j.salary_max)} · applied {j.applied_at?.slice(0, 10)}
              </div>
              {j.notes && <p className="mt-2 text-sm text-slate-600">{j.notes}</p>}
            </div>
            <StatusBadge status={j.status} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              aria-label={`status-for-${j.id}`}
              value={j.status}
              onChange={(e) => onStatusChange(j.id, e.target.value)}
              className="rounded border border-slate-300 px-2 py-1 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={async () => {
                setBusyId(j.id);
                try {
                  await onAdvice(j);
                } finally {
                  setBusyId(null);
                }
              }}
              disabled={busyId === j.id}
              className="rounded bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {busyId === j.id ? 'Thinking…' : '✨ AI interview prep'}
            </button>
            <button
              type="button"
              onClick={() => onDelete(j.id)}
              className="ml-auto rounded border border-rose-300 px-3 py-1 text-sm text-rose-700 hover:bg-rose-50"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
