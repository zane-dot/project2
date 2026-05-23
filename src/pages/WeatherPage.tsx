import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PageHeader from '@/components/PageHeader';
import KpiCard from '@/components/KpiCard';
import { LoadingCard, ErrorCard } from '@/components/AsyncStates';
import { useWeather } from '@/lib/hooks';

function colorForTemp(value: number): string {
  if (value < 15) return '#60a5fa';
  if (value < 22) return '#34d399';
  if (value < 28) return '#fbbf24';
  if (value < 32) return '#f97316';
  return '#ef4444';
}

export default function WeatherPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useWeather();

  const sorted = useMemo(
    () => (data ? [...data.temperature].sort((a, b) => b.value - a.value) : []),
    [data],
  );

  if (isLoading) return <LoadingCard />;
  if (isError || !data) return <ErrorCard onRetry={() => refetch()} />;

  return (
    <div>
      <PageHeader
        title={t('weather.title')}
        subtitle={t('weather.description', { count: data.temperature.length })}
        updatedAt={data.updatedAt}
      />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label={t('weather.humidity')}
          value={`${data.humidity}%`}
          tone={data.humidity > 80 ? 'warn' : 'default'}
        />
        <KpiCard
          label={t('weather.uvIndex')}
          value={data.uvIndex}
          tone={data.uvIndex >= 8 ? 'bad' : data.uvIndex >= 6 ? 'warn' : 'good'}
        />
        <KpiCard
          label={t('common.source')}
          value={data.source === 'hko' ? 'HKO live' : 'fallback'}
        />
      </div>
      <div className="card">
        <h2 className="mb-3 text-sm font-medium text-slate-600 dark:text-slate-300">
          {t('weather.stationTemp')}
        </h2>
        <div className="h-[420px] w-full">
          <ResponsiveContainer>
            <BarChart
              data={sorted}
              layout="vertical"
              margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                type="number"
                domain={[(dataMin: number) => Math.floor(dataMin - 1), (dataMax: number) => Math.ceil(dataMax + 1)]}
                tick={{ fontSize: 12 }}
                unit="°"
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="station"
                width={110}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(v: number) => [`${v} °C`, '']}
                cursor={{ fill: 'rgba(148,163,184,0.15)' }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {sorted.map((s) => (
                  <Cell key={s.station} fill={colorForTemp(s.value)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
