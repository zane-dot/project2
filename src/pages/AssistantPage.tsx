import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/PageHeader';
import { useAqhi, useMtrStatus, useTravelAdvice, useWeather } from '@/lib/hooks';

export default function AssistantPage() {
  const { t } = useTranslation();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const mutation = useTravelAdvice();
  const weather = useWeather();
  const aqhi = useAqhi();
  const mtr = useMtrStatus();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!from.trim() || !to.trim()) return;
    mutation.mutate({ from: from.trim(), to: to.trim() });
  };

  const avgTemp =
    weather.data && weather.data.temperature.length
      ? Math.round(
          (weather.data.temperature.reduce((s, t) => s + Number(t.value || 0), 0) /
            weather.data.temperature.length) *
            10,
        ) / 10
      : null;
  const incidents = (mtr.data?.lines ?? []).filter((l) => l.state !== 'normal');
  const aqhiPeak = (aqhi.data?.stations ?? []).reduce(
    (m, s) => (s.aqhi > m ? s.aqhi : m),
    0,
  );

  return (
    <div>
      <PageHeader title={t('assistant.title')} subtitle={t('assistant.description')} />

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <Chip label={t('assistant.chip.temp', { value: avgTemp ?? '—' })} />
        <Chip label={t('assistant.chip.humidity', { value: weather.data?.humidity ?? '—' })} />
        <Chip label={t('assistant.chip.uv', { value: weather.data?.uvIndex ?? '—' })} />
        <Chip label={t('assistant.chip.aqhi', { value: aqhiPeak || '—' })} />
        <Chip
          label={
            incidents.length
              ? t('assistant.chip.mtrIncidents', {
                  count: incidents.length,
                  lines: incidents.map((l) => l.code).join(', '),
                })
              : t('assistant.chip.mtrOk')
          }
        />
      </div>

      <form
        onSubmit={onSubmit}
        className="card mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]"
      >
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-slate-500 dark:text-slate-400">{t('assistant.from')}</span>
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder={t('assistant.fromPlaceholder') ?? ''}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            maxLength={120}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-slate-500 dark:text-slate-400">{t('assistant.to')}</span>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={t('assistant.toPlaceholder') ?? ''}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            maxLength={120}
            required
          />
        </label>
        <button
          type="submit"
          disabled={mutation.isPending || !from.trim() || !to.trim()}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 sm:self-end"
        >
          {mutation.isPending ? t('assistant.thinking') : t('assistant.submit')}
        </button>
      </form>

      {mutation.isError && (
        <div className="card border-red-200 bg-red-50 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          <p className="font-medium">{t('assistant.errorTitle')}</p>
          <p className="mt-1 text-xs">
            {String((mutation.error as Error)?.message ?? 'unknown')}
          </p>
        </div>
      )}

      {mutation.data && (
        <article className="card">
          <h2 className="mb-4 text-lg font-semibold">{t('assistant.resultTitle')}</h2>
          <FormattedAdvice text={mutation.data.advice} />
        </article>
      )}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
      {label}
    </span>
  );
}

/** Renders the model's markdown-ish advice as clean HTML sections, headings, and bullet lists. */
function FormattedAdvice({ text }: { text: string }) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  type Block =
    | { kind: 'heading'; text: string }
    | { kind: 'list'; items: string[] }
    | { kind: 'para'; text: string };

  const blocks: Block[] = [];
  for (const line of lines) {
    const headingMatch = line.match(/^\*\*(.+?)\*\*:?$/);
    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    if (headingMatch) {
      blocks.push({ kind: 'heading', text: headingMatch[1] });
    } else if (bulletMatch) {
      const last = blocks[blocks.length - 1];
      if (last?.kind === 'list') last.items.push(bulletMatch[1]);
      else blocks.push({ kind: 'list', items: [bulletMatch[1]] });
    } else {
      blocks.push({ kind: 'para', text: line });
    }
  }

  return (
    <div className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
      {blocks.map((b, i) => {
        if (b.kind === 'heading') {
          return (
            <h3
              key={i}
              className="text-base font-semibold text-slate-900 dark:text-slate-50"
            >
              {b.text}
            </h3>
          );
        }
        if (b.kind === 'list') {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-brand-500">
              {b.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {renderInline(b.text)}
          </p>
        );
      })}
    </div>
  );
}

/** Render **bold** segments inside a single line. */
function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const m = part.match(/^\*\*(.+)\*\*$/);
    if (m) {
      return (
        <strong key={i} className="font-semibold text-slate-900 dark:text-slate-50">
          {m[1]}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
