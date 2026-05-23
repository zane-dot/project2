import { useTranslation } from 'react-i18next';

type Props = {
  message?: string;
};

export function LoadingCard({ message }: Props) {
  const { t } = useTranslation();
  return (
    <div className="card animate-pulse text-sm text-slate-500 dark:text-slate-400">
      {message ?? t('common.loading')}
    </div>
  );
}

export function ErrorCard({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="card border-red-200 bg-red-50 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
      <p className="font-medium">{message ?? t('common.error')}</p>
      {onRetry && (
        <button type="button" className="btn-ghost mt-2" onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}
