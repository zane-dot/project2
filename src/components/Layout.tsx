import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUiStore } from '@/store/ui';
import { classNames } from '@/lib/format';

const NAV = [
  { to: '/overview', key: 'nav.overview', icon: '🏙️' },
  { to: '/weather', key: 'nav.weather', icon: '⛅' },
  { to: '/air', key: 'nav.air', icon: '🌫️' },
  { to: '/mtr', key: 'nav.mtr', icon: '🚇' },
  { to: '/bus', key: 'nav.bus', icon: '🚌' },
  { to: '/assistant', key: 'nav.assistant', icon: '🤖' },
] as const;

export default function Layout() {
  const { t, i18n } = useTranslation();
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  const setLang = (lng: 'en' | 'zh') => void i18n.changeLanguage(lng);

  return (
    <div className="flex min-h-screen">
      <aside
        aria-label="Primary navigation"
        className={classNames(
          'sticky top-0 flex h-screen flex-col gap-2 border-r border-slate-200 bg-white p-4 transition-all dark:border-slate-800 dark:bg-slate-900',
          sidebarOpen ? 'w-60' : 'w-16',
        )}
      >
        <div className="mb-4 flex items-center gap-2 px-1">
          <span className="text-2xl" aria-hidden>
            📊
          </span>
          {sidebarOpen && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">{t('app.title')}</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('app.subtitle')}
              </span>
            </div>
          )}
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                classNames(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )
              }
            >
              <span aria-hidden>{item.icon}</span>
              {sidebarOpen && <span>{t(item.key)}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
          <button
            type="button"
            onClick={toggleSidebar}
            className="btn-ghost justify-start"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? '⟨ Collapse' : '⟩'}
          </button>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-end gap-2 border-b border-slate-200 bg-white/70 px-6 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
          <div className="mr-auto text-xs text-slate-500 dark:text-slate-400">
            {new Date().toLocaleDateString(i18n.language === 'zh' ? 'zh-HK' : 'en-HK', {
              weekday: 'long',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </div>
          <div
            role="group"
            aria-label="Language switcher"
            className="flex overflow-hidden rounded-md border border-slate-200 text-xs dark:border-slate-700"
          >
            {(['en', 'zh'] as const).map((lng) => (
              <button
                key={lng}
                type="button"
                onClick={() => setLang(lng)}
                className={classNames(
                  'px-2 py-1',
                  i18n.language === lng
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )}
              >
                {lng.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="btn-ghost"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </header>
        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>
        <footer className="border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {t('footer.built')}
        </footer>
      </div>
    </div>
  );
}
