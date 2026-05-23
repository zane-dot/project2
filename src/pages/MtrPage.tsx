import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/PageHeader';
import { LoadingCard, ErrorCard } from '@/components/AsyncStates';
import { useMtrLines, useMtrStatus } from '@/lib/hooks';
import type { MtrLine, MtrServiceState } from '@/lib/api/mtr';
import type { MtrLineDetail } from '@/lib/api/mtrLines';

const STATE_BG: Record<MtrServiceState, string> = {
  normal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  delayed: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  disrupted: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200',
};

export default function MtrPage() {
  const { t, i18n } = useTranslation();
  const status = useMtrStatus();
  const catalogue = useMtrLines();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const detailsByCode = useMemo(() => {
    const map = new Map<string, MtrLineDetail>();
    for (const line of catalogue.data ?? []) map.set(line.code, line);
    return map;
  }, [catalogue.data]);

  if (status.isLoading) return <LoadingCard />;
  if (status.isError || !status.data) return <ErrorCard onRetry={() => status.refetch()} />;

  const selected = selectedCode ? detailsByCode.get(selectedCode) ?? null : null;
  const selectedLine = selectedCode
    ? status.data.lines.find((l) => l.code === selectedCode) ?? null
    : null;

  return (
    <div>
      <PageHeader
        title={t('mtr.title')}
        subtitle={t('mtr.description')}
        updatedAt={status.data.updatedAt}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {status.data.lines.map((line) => (
            <LineCard
              key={line.code}
              line={line}
              active={line.code === selectedCode}
              onSelect={() => setSelectedCode(line.code)}
            />
          ))}
        </div>
        <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
          {selectedLine ? (
            <LineDetailPanel
              line={selectedLine}
              detail={selected}
              loading={catalogue.isLoading}
              language={i18n.language}
              onClose={() => setSelectedCode(null)}
            />
          ) : (
            <EmptyDetail />
          )}
        </aside>
      </div>
    </div>
  );
}

function LineCard({
  line,
  active,
  onSelect,
}: {
  line: MtrLine;
  active: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`card card-hover border-l-4 text-left transition ${
        active ? 'ring-2 ring-brand-500' : ''
      }`}
      style={{ borderLeftColor: line.color }}
      aria-pressed={active}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {line.code}
          </p>
          <h3 className="mt-0.5 text-base font-medium">{line.name}</h3>
        </div>
        <span className={`badge ${STATE_BG[line.state]}`}>{t(`mtr.${line.state}`)}</span>
      </div>
      {line.message && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{line.message}</p>
      )}
    </button>
  );
}

function EmptyDetail() {
  const { t } = useTranslation();
  return (
    <div className="card text-sm text-slate-500 dark:text-slate-400">
      {t('mtr.detail.empty')}
    </div>
  );
}

function LineDetailPanel({
  line,
  detail,
  loading,
  language,
  onClose,
}: {
  line: MtrLine;
  detail: MtrLineDetail | null;
  loading: boolean;
  language: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="card" style={{ borderTop: `4px solid ${line.color}` }}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {line.code}
          </p>
          <h2 className="text-lg font-semibold">
            {language === 'zh' && detail?.nameZh ? detail.nameZh : line.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="btn-ghost text-xs"
          aria-label={t('common.close')}
        >
          ✕
        </button>
      </div>
      {loading && !detail ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.loading')}</p>
      ) : detail ? (
        <>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <Stat label={t('mtr.detail.firstTrain')} value={detail.firstTrain} />
            <Stat label={t('mtr.detail.lastTrain')} value={detail.lastTrain} />
            <Stat
              label={t('mtr.detail.headway')}
              value={t('mtr.detail.minutes', { count: detail.headwayMinutes })}
            />
            <Stat
              label={t('mtr.detail.stationCount')}
              value={String(detail.stationCount)}
            />
          </dl>
          {detail.note && (
            <p className="mt-3 rounded-md bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              {detail.note}
            </p>
          )}
          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('mtr.detail.stations')}
          </h3>
          <ol className="mt-2 space-y-1.5">
            {detail.stations.map((stop, i) => (
              <li key={stop} className="flex items-center gap-3 text-sm">
                <span
                  className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: line.color }}
                >
                  {i + 1}
                </span>
                <span>{stop}</span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.noData')}</p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}
