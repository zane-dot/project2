const STYLES = {
  Applied: 'bg-blue-100 text-blue-800 ring-blue-200',
  Interview: 'bg-amber-100 text-amber-800 ring-amber-200',
  Offer: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  Rejected: 'bg-rose-100 text-rose-700 ring-rose-200',
};

export default function StatusBadge({ status }) {
  const cls = STYLES[status] || 'bg-slate-100 text-slate-700 ring-slate-200';
  return (
    <span
      data-testid="status-badge"
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      {status}
    </span>
  );
}
