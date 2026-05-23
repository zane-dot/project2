import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/PageHeader';
import KpiCard from '@/components/KpiCard';
import { LoadingCard, ErrorCard } from '@/components/AsyncStates';
import { useAqhi, useMtrStatus, useWeather } from '@/lib/hooks';

export default function OverviewPage() {
  const { t } = useTranslation();
  const weather = useWeather();
  const aqhi = useAqhi();
  const mtr = useMtrStatus();

  const loading = weather.isLoading || aqhi.isLoading || mtr.isLoading;
  const errored = weather.isError && aqhi.isError && mtr.isError;

  if (loading) return <LoadingCard />;
  if (errored) return <ErrorCard onRetry={() => weather.refetch()} />;

  const avgTemp =
    weather.data && weather.data.temperature.length > 0
      ? weather.data.temperature.reduce((a, b) => a + b.value, 0) /
        weather.data.temperature.length
      : 0;
  const peakAqhi = aqhi.data
    ? aqhi.data.stations.reduce((m, s) => Math.max(m, s.aqhi), 0)
    : 0;
  const activeAlerts =
    mtr.data?.lines.filter((l) => l.state !== 'normal').length ?? 0;

  return (
    <div>
      <PageHeader
        title={t('overview.heroTitle')}
        subtitle={t('overview.heroBody')}
        updatedAt={weather.data?.updatedAt}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t('overview.kpiTemperature')}
          value={`${avgTemp.toFixed(1)} °C`}
          hint={`${weather.data?.temperature.length ?? 0} stations`}
          tone="good"
        />
        <KpiCard
          label={t('overview.kpiHumidity')}
          value={`${weather.data?.humidity ?? 0}%`}
          tone="default"
        />
        <KpiCard
          label={t('overview.kpiAqhiPeak')}
          value={peakAqhi}
          hint={peakAqhi > 7 ? 'sensitive groups' : 'safe for most people'}
          tone={peakAqhi > 7 ? 'bad' : peakAqhi > 6 ? 'warn' : 'good'}
        />
        <KpiCard
          label={t('overview.kpiAlerts')}
          value={activeAlerts}
          hint={activeAlerts > 0 ? 'See MTR Status' : 'all lines normal'}
          tone={activeAlerts > 0 ? 'warn' : 'good'}
        />
      </div>
    </div>
  );
}
