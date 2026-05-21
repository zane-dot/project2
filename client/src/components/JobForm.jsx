import { useState } from 'react';

const EMPTY = {
  company: '',
  role: '',
  location: 'Hong Kong',
  salary_min: '',
  salary_max: '',
  status: 'Applied',
  notes: '',
};

export default function JobForm({ onSubmit, submitting }) {
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState(null);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    try {
      await onSubmit({
        ...form,
        salary_min: form.salary_min === '' ? null : Number(form.salary_min),
        salary_max: form.salary_max === '' ? null : Number(form.salary_max),
      });
      setForm(EMPTY);
    } catch (e2) {
      setErr(e2.message);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2"
    >
      <h2 className="sm:col-span-2 text-lg font-semibold text-slate-900">Add an application</h2>
      <input
        aria-label="company"
        placeholder="Company (e.g. HSBC)"
        className="rounded border border-slate-300 px-3 py-2"
        value={form.company}
        onChange={(e) => set('company', e.target.value)}
        required
      />
      <input
        aria-label="role"
        placeholder="Role (e.g. Backend Engineer)"
        className="rounded border border-slate-300 px-3 py-2"
        value={form.role}
        onChange={(e) => set('role', e.target.value)}
        required
      />
      <input
        aria-label="location"
        placeholder="Location"
        className="rounded border border-slate-300 px-3 py-2"
        value={form.location}
        onChange={(e) => set('location', e.target.value)}
      />
      <select
        aria-label="status"
        className="rounded border border-slate-300 px-3 py-2"
        value={form.status}
        onChange={(e) => set('status', e.target.value)}
      >
        <option>Applied</option>
        <option>Interview</option>
        <option>Offer</option>
        <option>Rejected</option>
      </select>
      <input
        aria-label="salary_min"
        type="number"
        placeholder="Salary min (HKD/mo)"
        className="rounded border border-slate-300 px-3 py-2"
        value={form.salary_min}
        onChange={(e) => set('salary_min', e.target.value)}
      />
      <input
        aria-label="salary_max"
        type="number"
        placeholder="Salary max (HKD/mo)"
        className="rounded border border-slate-300 px-3 py-2"
        value={form.salary_max}
        onChange={(e) => set('salary_max', e.target.value)}
      />
      <textarea
        aria-label="notes"
        placeholder="Notes (recruiter, timeline, prep…)"
        className="sm:col-span-2 rounded border border-slate-300 px-3 py-2"
        rows={2}
        value={form.notes}
        onChange={(e) => set('notes', e.target.value)}
      />
      {err && <div className="sm:col-span-2 text-sm text-rose-600">{err}</div>}
      <button
        type="submit"
        disabled={submitting}
        className="sm:col-span-2 rounded bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {submitting ? 'Saving…' : 'Add application'}
      </button>
    </form>
  );
}
