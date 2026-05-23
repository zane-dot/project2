/**
 * Static MTR line catalogue — first/last train, station list.
 * Powered by the BFF at /api/mtr/lines.
 */

export type MtrLineDetail = {
  code: string;
  name: string;
  nameZh: string;
  color: string;
  firstTrain: string;
  lastTrain: string;
  headwayMinutes: number;
  stations: string[];
  stationCount: number;
  note?: string;
};

type Envelope<T> = { ok: true; data: T };

export async function fetchMtrLines(signal?: AbortSignal): Promise<MtrLineDetail[]> {
  const res = await fetch('/api/mtr/lines', { signal });
  if (!res.ok) throw new Error(`bff ${res.status}`);
  const env = (await res.json()) as Envelope<{ lines: MtrLineDetail[] }>;
  return env.data.lines;
}
