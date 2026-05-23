/**
 * MTR service status — front-end client.
 *
 * The upstream JSON endpoint at
 *   https://tnews.mtr.com.hk/alert/getAlertMsg.php
 * does not send CORS headers. The BFF at `/api/mtr` proxies it (60 s TTL).
 * Falls back to a deterministic snapshot if the BFF is unreachable.
 */

export type MtrServiceState = 'normal' | 'delayed' | 'disrupted';

export type MtrLine = {
  code: string;
  name: string;
  color: string;
  state: MtrServiceState;
  message?: string;
};

export type MtrSnapshot = {
  lines: MtrLine[];
  updatedAt: string;
};

type Envelope<T> = { ok: true; cached: boolean; ageMs: number; data: T };

const LINES: Omit<MtrLine, 'state' | 'message'>[] = [
  { code: 'ISL', name: 'Island Line', color: '#0070b9' },
  { code: 'TWL', name: 'Tsuen Wan Line', color: '#e2231a' },
  { code: 'KTL', name: 'Kwun Tong Line', color: '#00a040' },
  { code: 'TKL', name: 'Tseung Kwan O Line', color: '#7d499d' },
  { code: 'EAL', name: 'East Rail Line', color: '#5eb6e4' },
  { code: 'TML', name: 'Tuen Ma Line', color: '#9a3b26' },
  { code: 'TCL', name: 'Tung Chung Line', color: '#f7943e' },
  { code: 'AEL', name: 'Airport Express', color: '#1c7670' },
  { code: 'SIL', name: 'South Island Line', color: '#bac429' },
  { code: 'DRL', name: 'Disneyland Resort Line', color: '#f173ac' },
];

export async function fetchMtrStatus(signal?: AbortSignal): Promise<MtrSnapshot> {
  try {
    const res = await fetch('/api/mtr', { signal });
    if (!res.ok) throw new Error(`bff ${res.status}`);
    const env = (await res.json()) as Envelope<MtrSnapshot>;
    return env.data;
  } catch {
    return fallbackMtr();
  }
}

export function fallbackMtr(now: Date = new Date()): MtrSnapshot {
  const hour = now.getUTCHours();
  const delayedIdx = hour % LINES.length;
  const disruptedIdx = (hour * 3 + 5) % LINES.length;
  const lines: MtrLine[] = LINES.map((line, i) => {
    if (i === disruptedIdx && i !== delayedIdx) {
      return {
        ...line,
        state: 'disrupted',
        message: `Signal failure between two stations on ${line.name}.`,
      };
    }
    if (i === delayedIdx) {
      return {
        ...line,
        state: 'delayed',
        message: `Train service on ${line.name} is approximately 5 minutes late.`,
      };
    }
    return { ...line, state: 'normal' };
  });
  return { lines, updatedAt: now.toISOString() };
}
