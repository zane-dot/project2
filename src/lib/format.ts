import type { AqhiBand } from '@/lib/api/airQuality';

export const AQHI_COLOR: Record<AqhiBand, string> = {
  low: '#22c55e',
  moderate: '#facc15',
  high: '#fb923c',
  veryHigh: '#ef4444',
  serious: '#7f1d1d',
};

export function formatTime(iso: string, locale = 'en-HK'): string {
  try {
    return new Date(iso).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
