import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/PageHeader';
import { LoadingCard, ErrorCard } from '@/components/AsyncStates';
import { useAqhi } from '@/lib/hooks';
import { AQHI_COLOR } from '@/lib/format';
import type { AqhiStation } from '@/lib/api/airQuality';

type Filter = 'all' | 'general' | 'roadside';

export default function AirQualityPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useAqhi();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo<AqhiStation[]>(() => {
    if (!data) return [];
    if (filter === 'all') return data.stations;
    return data.stations.filter((s) => s.type === filter);
  }, [data, filter]);

  if (isLoading) return <LoadingCard />;
  if (isError || !data) return <ErrorCard onRetry={() => refetch()} />;

  return (
    <div>
      <PageHeader
        title={t('air.title')}
        subtitle={t('air.description')}
        updatedAt={data.updatedAt}
        actions={
          <div className="flex overflow-hidden rounded-md border border-slate-200 text-xs dark:border-slate-700">
            {(['all', 'general', 'roadside'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={
                  filter === f
                    ? 'bg-brand-600 px-3 py-1.5 text-white'
                    : 'px-3 py-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }
              >
                {f === 'all'
                  ? 'All'
                  : f === 'general'
                    ? t('air.general')
                    : t('air.roadside')}
              </button>
            ))}
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((s) => (
          <StationCard key={`${s.type}-${s.station}`} station={s} />
        ))}
      </div>
      <Legend />
    </div>
  );
}

function StationCard({ station }: { station: AqhiStation }) {
  const { t } = useTranslation();
  return (
    <div
      className="card card-hover relative overflow-hidden"
      style={{ borderTopColor: AQHI_COLOR[station.band], borderTopWidth: 4 }}
    >
      <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {station.district}
      </p>
      <h3 className="mt-1 text-base font-medium">{station.station}</h3>
      <div className="mt-3 flex items-end justify-between">
        <span
          className="text-3xl font-semibold"
          style={{ color: AQHI_COLOR[station.band] }}
        >
          {station.aqhi}
        </span>
        <span
          className="badge"
          style={{
            backgroundColor: `${AQHI_COLOR[station.band]}22`,
            color: AQHI_COLOR[station.band],
          }}
        >
          {t(`air.risk.${station.band}`)}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
        {station.type === 'roadside' ? t('air.roadside') : t('air.general')}
      </p>
    </div>
  );
}

function Legend() {
  const { t } = useTranslation();
  const bands: { band: keyof typeof AQHI_COLOR; range: string }[] = [
    { band: 'low', range: '1–3' },
    { band: 'moderate', range: '4–6' },
    { band: 'high', range: '7' },
    { band: 'veryHigh', range: '8–10' },
    { band: 'serious', range: '10+' },
  ];
  return (
    <div className="card mt-6 flex flex-wrap items-center gap-3 text-xs">
      <span className="font-medium text-slate-600 dark:text-slate-300">Legend</span>
      {bands.map(({ band, range }) => (
        <span key={band} className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: AQHI_COLOR[band] }}
          />
          {t(`air.risk.${band}`)} ({range})
        </span>
      ))}
    </div>
  );
}
