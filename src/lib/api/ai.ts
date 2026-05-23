/**
 * DeepSeek-powered travel advice (proxied through /api/ai/advice).
 */

export type AdviceRequest = { from: string; to: string };

export type AdviceResponse = {
  advice: string;
  model: string;
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
  context: {
    weather: { avgTemperatureC: number | null; humidity: number | null; uvIndex: number | null } | null;
    aqhi: Array<{ station: string; aqhi: number; band: string }> | null;
    mtrIncidents: string[];
  };
};

type Envelope<T> = { ok: true; data: T };

export async function requestAdvice(payload: AdviceRequest, signal?: AbortSignal): Promise<AdviceResponse> {
  const res = await fetch('/api/ai/advice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) {
    let code = `bff_${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) code = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(code);
  }
  const env = (await res.json()) as Envelope<AdviceResponse>;
  return env.data;
}
