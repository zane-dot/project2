import { ReactNode } from 'react';

type Props = {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'default' | 'good' | 'warn' | 'bad';
};

const TONE: Record<NonNullable<Props['tone']>, string> = {
  default: 'border-slate-200 dark:border-slate-800',
  good: 'border-emerald-300 dark:border-emerald-700',
  warn: 'border-amber-300 dark:border-amber-700',
  bad: 'border-red-300 dark:border-red-700',
};

export default function KpiCard({ label, value, hint, tone = 'default' }: Props) {
  return (
    <div className={`card card-hover ${TONE[tone]}`}>
      <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      {hint && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      )}
    </div>
  );
}
