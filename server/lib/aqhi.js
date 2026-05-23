/**
 * AQHI — Environmental Protection Department
 *   https://www.aqhi.gov.hk/epd/ddata/html/out/aqhi_ind_rss_Eng.xml
 *
 * The RSS feed exposes one <item> per Air Quality Monitoring Station.
 * The numeric reading lives in <description>, e.g.:
 *
 *   "Central/Western - General Stations: 2 Low - Sun, 24 May 2026 03:30"
 *   "Causeway Bay - Roadside Stations: 4 Moderate - Sun, 24 May 2026 03:30"
 *
 * "10+" is the EPD convention for the top "Serious" band; we map it to 11.
 */
import { XMLParser } from 'fast-xml-parser';

const AQHI_URL = 'https://www.aqhi.gov.hk/epd/ddata/html/out/aqhi_ind_rss_Eng.xml';

const DISTRICT = {
  'Central/Western': 'Central & Western',
  Southern: 'Southern',
  Eastern: 'Eastern',
  'Kwun Tong': 'Kwun Tong',
  'Sham Shui Po': 'Sham Shui Po',
  'Kwai Chung': 'Kwai Tsing',
  'Tsuen Wan': 'Tsuen Wan',
  'Tseung Kwan O': 'Sai Kung',
  'Yuen Long': 'Yuen Long',
  'Tuen Mun': 'Tuen Mun',
  'Tung Chung': 'Islands',
  'Tai Po': 'Tai Po',
  'Sha Tin': 'Sha Tin',
  North: 'North',
  'Tap Mun': 'Tai Po',
  'Causeway Bay': 'Wan Chai',
  Central: 'Central & Western',
  'Mong Kok': 'Yau Tsim Mong',
};

const parser = new XMLParser({ ignoreAttributes: true, trimValues: true });
// description: "Central/Western - General Stations: 2 Low - Sun, 24 May 2026 03:30"
const DESC_RE = /^(.+?)\s*-\s*(General|Roadside)\s+Stations?:\s*(\d+\+?)\s/i;

export function bandFor(aqhi) {
  if (aqhi <= 3) return 'low';
  if (aqhi <= 6) return 'moderate';
  if (aqhi <= 7) return 'high';
  if (aqhi <= 10) return 'veryHigh';
  return 'serious';
}

export async function fetchAqhi() {
  const res = await fetch(AQHI_URL, { headers: { 'User-Agent': 'hk-pulse/0.1' } });
  if (!res.ok) throw new Error(`EPD upstream ${res.status}`);
  const xml = await res.text();
  return parseAqhiXml(xml);
}

export function parseAqhiXml(xml) {
  const doc = parser.parse(xml);
  const items = doc?.rss?.channel?.item ?? [];
  const list = Array.isArray(items) ? items : [items];
  const stations = list.map(parseItem).filter((s) => s !== null);
  return {
    stations,
    updatedAt: doc?.rss?.channel?.lastBuildDate
      ? new Date(doc.rss.channel.lastBuildDate).toISOString()
      : new Date().toISOString(),
  };
}

function parseItem(item) {
  const desc = String(item?.description ?? '').trim();
  const match = desc.match(DESC_RE);
  if (!match) return null;
  const name = match[1].trim();
  const kind = match[2].toLowerCase();
  const raw = match[3];
  const aqhi = raw.endsWith('+') ? 11 : Number(raw);
  if (Number.isNaN(aqhi)) return null;
  return {
    station: name,
    district: DISTRICT[name] ?? name,
    type: kind === 'roadside' ? 'roadside' : 'general',
    aqhi,
    band: bandFor(aqhi),
  };
}
