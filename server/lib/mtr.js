/**
 * MTR heavy-rail line status.
 *   https://www.mtr.com.hk/alert/ryg_line_status.xml
 *
 * The "RYG" feed exposes a status color per line:
 *   green  → normal
 *   yellow → minor delay
 *   red    → major disruption
 *   grey   → outside service hours or no signal
 *
 * Sample payload:
 *   <ryg_status>
 *     <lastBuildDate>Sun, 24 May 2026 01:29:01 GMT</lastBuildDate>
 *     <refreshInterval>180000</refreshInterval>
 *     <line>
 *       <line_code>TWL</line_code>
 *       <url_en></url_en>
 *       <status>green</status>
 *     </line>
 *     ...
 *   </ryg_status>
 */
import { XMLParser } from 'fast-xml-parser';

const MTR_URL = 'https://www.mtr.com.hk/alert/ryg_line_status.xml';

const LINE_META = {
  ISL: { name: 'Island Line', color: '#0070b9' },
  TWL: { name: 'Tsuen Wan Line', color: '#e2231a' },
  KTL: { name: 'Kwun Tong Line', color: '#00a040' },
  TKL: { name: 'Tseung Kwan O Line', color: '#7d499d' },
  EAL: { name: 'East Rail Line', color: '#5eb6e4' },
  TML: { name: 'Tuen Ma Line', color: '#9a3b26' },
  TCL: { name: 'Tung Chung Line', color: '#f7943e' },
  AEL: { name: 'Airport Express', color: '#1c7670' },
  SIL: { name: 'South Island Line', color: '#bac429' },
  DRL: { name: 'Disneyland Resort Line', color: '#f173ac' },
};

const parser = new XMLParser({ ignoreAttributes: true, trimValues: true });

export async function fetchMtrStatus() {
  const res = await fetch(MTR_URL, { headers: { 'User-Agent': 'hk-pulse/0.1' } });
  if (!res.ok) throw new Error(`MTR upstream ${res.status}`);
  const xml = await res.text();
  return parseMtrXml(xml);
}

export function parseMtrXml(xml) {
  const doc = parser.parse(xml);
  const root = doc?.ryg_status ?? {};
  const lineNodes = root?.line ?? [];
  const list = Array.isArray(lineNodes) ? lineNodes : [lineNodes];

  const seen = new Map();
  for (const node of list) {
    const code = String(node?.line_code ?? '').trim().toUpperCase();
    if (!code || !LINE_META[code]) continue;
    seen.set(code, {
      color: String(node?.status ?? 'green').toLowerCase(),
      url: String(node?.url_en ?? '').trim() || undefined,
    });
  }

  const lines = Object.keys(LINE_META).map((code) => {
    const meta = LINE_META[code];
    const upstream = seen.get(code);
    const state = mapColor(upstream?.color);
    return {
      code,
      name: meta.name,
      color: meta.color,
      state,
      message: state !== 'normal' && upstream?.url ? `Details: ${upstream.url}` : undefined,
    };
  });

  const builtAt = root?.lastBuildDate ? new Date(root.lastBuildDate) : new Date();
  return {
    lines,
    updatedAt: Number.isNaN(builtAt.getTime()) ? new Date().toISOString() : builtAt.toISOString(),
  };
}

export function mapColor(color) {
  switch (color) {
    case 'green':
    case 'grey':
    case 'gray':
    case undefined:
      return 'normal';
    case 'yellow':
      return 'delayed';
    case 'red':
      return 'disrupted';
    default:
      return 'normal';
  }
}

// Back-compat alias for older tests.
export const normaliseMtr = parseMtrXml;
