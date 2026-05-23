/**
 * Bus & minibus open data.
 *
 *   KMB  (franchised bus)   https://data.etabus.gov.hk/v1/transport/kmb
 *   GMB  (green minibus)    https://data.etagmb.gov.hk
 *
 * The endpoints used here:
 *   GET /route                                 — all routes (KMB)
 *   GET /stop                                  — all stops dictionary (KMB)
 *   GET /route-stop/{route}/{bound}/{svc_type} — ordered stop list (KMB)
 *   GET /route                                 — all GMB route codes per region
 */

const KMB_BASE = 'https://data.etabus.gov.hk/v1/transport/kmb';
const GMB_BASE = 'https://data.etagmb.gov.hk';

const UA = { 'User-Agent': 'hk-pulse/0.1' };

// -------------------------- KMB routes --------------------------

export async function fetchKmbRoutes() {
  const res = await fetch(`${KMB_BASE}/route/`, { headers: UA });
  if (!res.ok) throw new Error(`KMB upstream ${res.status}`);
  const json = await res.json();
  const list = (json.data ?? []).map((r) => ({
    route: r.route,
    bound: r.bound,
    serviceType: Number(r.service_type),
    origin: r.orig_en,
    originZh: r.orig_tc,
    destination: r.dest_en,
    destinationZh: r.dest_tc,
  }));
  return {
    operator: 'KMB',
    count: list.length,
    routes: list,
    updatedAt: json.generated_timestamp ?? new Date().toISOString(),
  };
}

// -------------------------- KMB stop dictionary (cached separately) --------------------------

let kmbStopDictPromise = null;
async function getKmbStopDict() {
  if (!kmbStopDictPromise) {
    kmbStopDictPromise = (async () => {
      const res = await fetch(`${KMB_BASE}/stop/`, { headers: UA });
      if (!res.ok) throw new Error(`KMB stop dict ${res.status}`);
      const json = await res.json();
      const map = new Map();
      for (const s of json.data ?? []) {
        map.set(s.stop, { nameEn: s.name_en, nameZh: s.name_tc });
      }
      return map;
    })().catch((err) => {
      kmbStopDictPromise = null;
      throw err;
    });
  }
  return kmbStopDictPromise;
}

// -------------------------- KMB route detail (stops) --------------------------

export async function fetchKmbRouteDetail({ route, bound, serviceType }) {
  // KMB route-stop API uses full words "inbound" / "outbound" — translate one-letter bounds.
  const boundWord =
    String(bound).toUpperCase() === 'O' ? 'outbound' : String(bound).toUpperCase() === 'I' ? 'inbound' : bound;
  const url = `${KMB_BASE}/route-stop/${encodeURIComponent(route)}/${encodeURIComponent(
    boundWord,
  )}/${encodeURIComponent(serviceType)}`;
  const [stopRes, dict] = await Promise.all([
    fetch(url, { headers: UA }),
    getKmbStopDict(),
  ]);
  if (!stopRes.ok) throw new Error(`KMB route-stop ${stopRes.status}`);
  const stopJson = await stopRes.json();
  const stops = (stopJson.data ?? []).map((s) => {
    const meta = dict.get(s.stop);
    return {
      seq: Number(s.seq),
      stopId: s.stop,
      name: meta?.nameEn ?? s.stop,
      nameZh: meta?.nameZh ?? '',
    };
  });
  return {
    operator: 'KMB',
    route,
    bound,
    serviceType,
    stopCount: stops.length,
    stops,
    updatedAt: stopJson.generated_timestamp ?? new Date().toISOString(),
  };
}

// -------------------------- GMB summary --------------------------

const GMB_REGIONS = { HKI: 'Hong Kong Island', KLN: 'Kowloon', NT: 'New Territories' };

export async function fetchGmbSummary() {
  const res = await fetch(`${GMB_BASE}/route`, { headers: UA });
  if (!res.ok) throw new Error(`GMB upstream ${res.status}`);
  const json = await res.json();
  const routes = json?.data?.routes ?? {};
  const summary = Object.entries(GMB_REGIONS).map(([code, label]) => ({
    region: code,
    label,
    count: Array.isArray(routes[code]) ? routes[code].length : 0,
    routes: Array.isArray(routes[code]) ? routes[code] : [],
  }));
  return {
    operator: 'GMB',
    regions: summary,
    total: summary.reduce((n, r) => n + r.count, 0),
    updatedAt: json?.data?.data_timestamp ?? new Date().toISOString(),
  };
}

// -------------------------- GMB route detail --------------------------

export async function fetchGmbRouteDetail({ region, route }) {
  const reg = String(region).toUpperCase();
  if (!GMB_REGIONS[reg]) throw new Error('invalid_region');
  const url = `${GMB_BASE}/route/${encodeURIComponent(reg)}/${encodeURIComponent(route)}`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`GMB route ${res.status}`);
  const json = await res.json();
  const variants = Array.isArray(json?.data) ? json.data : [];
  if (!variants.length) {
    const err = new Error('not_found');
    err.code = 'not_found';
    throw err;
  }

  // For each variant + direction, fetch its ordered stop list.
  const detailed = await Promise.all(
    variants.map(async (v) => {
      const directions = await Promise.all(
        (v.directions ?? []).map(async (d) => {
          let stops = [];
          try {
            const stopRes = await fetch(
              `${GMB_BASE}/route-stop/${encodeURIComponent(v.route_id)}/${encodeURIComponent(
                d.route_seq,
              )}`,
              { headers: UA },
            );
            if (stopRes.ok) {
              const stopJson = await stopRes.json();
              stops = (stopJson?.data?.route_stops ?? []).map((s) => ({
                seq: Number(s.stop_seq),
                stopId: s.stop_id,
                name: s.name_en ?? '',
                nameZh: s.name_tc ?? '',
              }));
            }
          } catch {
            stops = [];
          }
          return {
            routeSeq: Number(d.route_seq),
            origin: d.orig_en ?? '',
            originZh: d.orig_tc ?? '',
            destination: d.dest_en ?? '',
            destinationZh: d.dest_tc ?? '',
            remarks: d.remarks_en ?? '',
            remarksZh: d.remarks_tc ?? '',
            stopCount: stops.length,
            stops,
          };
        }),
      );
      return {
        routeId: v.route_id,
        descriptionEn: v.description_en ?? '',
        descriptionZh: v.description_tc ?? '',
        directions,
      };
    }),
  );

  return {
    operator: 'GMB',
    region: reg,
    regionLabel: GMB_REGIONS[reg],
    route,
    variants: detailed,
    updatedAt: new Date().toISOString(),
  };
}
