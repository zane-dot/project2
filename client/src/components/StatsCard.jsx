export default function StatsCard({ label, value, accent = 'slate' }) {
  const accents = {
    slate: 'border-slate-200',
    blue: 'border-blue-300',
    amber: 'border-amber-300',
    emerald: 'border-emerald-300',
    rose: 'border-rose-300',
  };
  return (
    <div className={`rounded-lg border-2 ${accents[accent]} bg-white p-4 shadow-sm`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
