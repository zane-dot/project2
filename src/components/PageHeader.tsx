import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  title: string;
  subtitle?: string;
  updatedAt?: string;
  actions?: ReactNode;
};

export default function PageHeader({ title, subtitle, updatedAt, actions }: Props) {
  const { t, i18n } = useTranslation();
  return (
    <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {updatedAt && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t('common.updatedAt', {
              time: new Date(updatedAt).toLocaleTimeString(
                i18n.language === 'zh' ? 'zh-HK' : 'en-HK',
                { hour: '2-digit', minute: '2-digit' },
              ),
            })}
          </span>
        )}
        {actions}
      </div>
    </header>
  );
}
