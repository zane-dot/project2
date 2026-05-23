import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/PageHeader';
import { LoadingCard, ErrorCard } from '@/components/AsyncStates';
import {
  useGmbRouteDetail,
  useGmbSummary,
  useKmbRouteDetail,
  useKmbRoutes,
} from '@/lib/hooks';
import type { KmbRoute, GmbRegionSummary } from '@/lib/api/bus';

type Tab = 'kmb' | 'gmb';

export default function BusPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('kmb');

  return (
    <div>
      <PageHeader title={t('bus.title')} subtitle={t('bus.description')} />
      <div className="mb-4 flex gap-2">
        <TabButton active={tab === 'kmb'} onClick={() => setTab('kmb')}>
          🚌 {t('bus.kmb')}
        </TabButton>
        <TabButton active={tab === 'gmb'} onClick={() => setTab('gmb')}>
          🚐 {t('bus.gmb')}
        </TabButton>
      </div>
      {tab === 'kmb' ? <KmbView /> : <GmbView />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm transition ${
        active
          ? 'bg-brand-600 text-white'
          : 'border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------- KMB ----------------------------

type KmbSelection = { route: string; bound: string; serviceType: number } | null;

function KmbView() {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError, refetch } = useKmbRoutes();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<KmbSelection>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const rows = data.routes;
    if (!q) return rows.slice(0, 200);
    return rows
      .filter(
        (r) =>
          r.route.toLowerCase().includes(q) ||
          r.origin.toLowerCase().includes(q) ||
          r.destination.toLowerCase().includes(q) ||
          r.originZh.includes(q) ||
          r.destinationZh.includes(q),
      )
      .slice(0, 200);
  }, [data, query]);

  if (isLoading) return <LoadingCard />;
  if (isError || !data) return <ErrorCard onRetry={() => refetch()} />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
      <div>
        <div className="mb-3 flex items-center gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('bus.searchPlaceholder') ?? ''}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
            {t('bus.total', { count: data.count })}
          </span>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">{t('bus.route')}</th>
                <th className="px-3 py-2">{t('bus.origin')}</th>
                <th className="px-3 py-2">{t('bus.destination')}</th>
                <th className="px-3 py-2">{t('bus.bound')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <KmbRow
                  key={`${r.route}-${r.bound}-${r.serviceType}`}
                  row={r}
                  active={
                    !!selected &&
                    selected.route === r.route &&
                    selected.bound === r.bound &&
                    selected.serviceType === r.serviceType
                  }
                  onSelect={() =>
                    setSelected({ route: r.route, bound: r.bound, serviceType: r.serviceType })
                  }
                  language={i18n.language}
                />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-xs text-slate-500">
                    {t('common.noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data.routes.length > filtered.length && filtered.length === 200 && (
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            {t('bus.truncated', { shown: filtered.length, total: data.routes.length })}
          </p>
        )}
      </div>
      <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
        {selected ? (
          <KmbDetailPanel selection={selected} onClose={() => setSelected(null)} />
        ) : (
          <div className="card text-sm text-slate-500 dark:text-slate-400">
            {t('bus.selectHint')}
          </div>
        )}
      </aside>
    </div>
  );
}

function KmbRow({
  row,
  active,
  onSelect,
  language,
}: {
  row: KmbRoute;
  active: boolean;
  onSelect: () => void;
  language: string;
}) {
  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer border-t border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60 ${
        active ? 'bg-brand-50 dark:bg-brand-900/20' : ''
      }`}
    >
      <td className="px-3 py-2 font-mono font-semibold text-brand-700 dark:text-brand-300">
        {row.route}
      </td>
      <td className="px-3 py-2">{language === 'zh' ? row.originZh : row.origin}</td>
      <td className="px-3 py-2">{language === 'zh' ? row.destinationZh : row.destination}</td>
      <td className="px-3 py-2 text-xs uppercase tracking-wider text-slate-500">
        {row.bound === 'O' ? '→' : '←'}
      </td>
    </tr>
  );
}

function KmbDetailPanel({
  selection,
  onClose,
}: {
  selection: { route: string; bound: string; serviceType: number };
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError, refetch } = useKmbRouteDetail(
    selection.route,
    selection.bound,
    selection.serviceType,
  );

  return (
    <div className="card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            KMB · {selection.bound === 'O' ? 'Outbound' : 'Inbound'}
          </p>
          <h2 className="text-lg font-semibold">
            {t('bus.route')} {selection.route}
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
      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.loading')}</p>
      ) : isError || !data ? (
        <ErrorCard onRetry={() => refetch()} />
      ) : (
        <>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            {t('bus.stopCount', { count: data.stopCount })}
          </p>
          <ol className="space-y-1.5">
            {data.stops.map((s) => (
              <li key={s.stopId} className="flex items-center gap-3 text-sm">
                <span className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-600 text-[10px] font-semibold text-white">
                  {s.seq}
                </span>
                <span>{i18n.language === 'zh' && s.nameZh ? s.nameZh : s.name}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

// ---------------------------- GMB ----------------------------

function GmbView() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useGmbSummary();
  const [region, setRegion] = useState<GmbRegionSummary | null>(null);
  const [route, setRoute] = useState<string | null>(null);

  if (isLoading) return <LoadingCard />;
  if (isError || !data) return <ErrorCard onRetry={() => refetch()} />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
      <div>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          {t('bus.gmbTotal', { count: data.total })}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {data.regions.map((r) => (
            <button
              key={r.region}
              type="button"
              onClick={() => {
                setRegion(r);
                setRoute(null);
              }}
              className={`card card-hover text-left transition ${
                region?.region === r.region ? 'ring-2 ring-brand-500' : ''
              }`}
            >
              <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {r.region}
              </p>
              <h3 className="mt-0.5 text-base font-medium">{r.label}</h3>
              <p className="mt-2 text-2xl font-semibold text-brand-700 dark:text-brand-300">
                {r.count}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('bus.routes')}</p>
            </button>
          ))}
        </div>
        {region && (
          <div className="mt-6">
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
              {region.label} · {t('bus.routesAvailable', { count: region.count })}
            </p>
            <div className="flex max-h-[60vh] flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              {region.routes.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setRoute(code)}
                  className={`inline-flex items-center rounded-md px-2 py-1 font-mono text-xs transition ${
                    route === code
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-brand-100 hover:text-brand-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-brand-900/40 dark:hover:text-brand-200'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
        {region && route ? (
          <GmbDetailPanel
            region={region.region}
            regionLabel={region.label}
            route={route}
            onClose={() => setRoute(null)}
          />
        ) : (
          <div className="card text-sm text-slate-500 dark:text-slate-400">
            {region ? t('bus.selectRoute') : t('bus.selectRegion')}
          </div>
        )}
      </aside>
    </div>
  );
}

function GmbDetailPanel({
  region,
  regionLabel,
  route,
  onClose,
}: {
  region: string;
  regionLabel: string;
  route: string;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError, refetch } = useGmbRouteDetail(region, route);
  const zh = i18n.language === 'zh';

  return (
    <div className="card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            GMB · {region} · {regionLabel}
          </p>
          <h2 className="text-lg font-semibold">
            {t('bus.route')} {route}
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
      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.loading')}</p>
      ) : isError || !data ? (
        <ErrorCard onRetry={() => refetch()} />
      ) : (
        <div className="space-y-5">
          {data.variants.map((v) =>
            v.directions.map((d) => (
              <section key={`${v.routeId}-${d.routeSeq}`}>
                <header className="mb-2">
                  <p className="text-sm font-semibold">
                    {zh && d.originZh ? d.originZh : d.origin}{' '}
                    <span className="text-slate-400">→</span>{' '}
                    {zh && d.destinationZh ? d.destinationZh : d.destination}
                  </p>
                  {(zh ? d.remarksZh : d.remarks) && (
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {zh ? d.remarksZh : d.remarks}
                    </p>
                  )}
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {t('bus.stopCount', { count: d.stopCount })}
                  </p>
                </header>
                <ol className="space-y-1.5">
                  {d.stops.map((s) => (
                    <li key={s.stopId} className="flex items-center gap-3 text-sm">
                      <span className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-600 text-[10px] font-semibold text-white">
                        {s.seq}
                      </span>
                      <span>{zh && s.nameZh ? s.nameZh : s.name || s.nameZh}</span>
                    </li>
                  ))}
                  {d.stops.length === 0 && (
                    <li className="text-xs text-slate-500 dark:text-slate-400">
                      {t('common.noData')}
                    </li>
                  )}
                </ol>
              </section>
            )),
          )}
        </div>
      )}
    </div>
  );
}
