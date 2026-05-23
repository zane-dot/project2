/**
 * Bus & minibus route catalogues — front-end client.
 *
 *   /api/bus/routes                       → KMB route list
 *   /api/bus/routes/:r/:b/:s              → KMB route stops
 *   /api/minibus/routes                   → GMB summary per region
 */

export type KmbRoute = {
  route: string;
  bound: 'O' | 'I' | string;
  serviceType: number;
  origin: string;
  originZh: string;
  destination: string;
  destinationZh: string;
};

export type KmbRouteList = {
  operator: 'KMB';
  count: number;
  routes: KmbRoute[];
  updatedAt: string;
};

export type KmbStop = {
  seq: number;
  stopId: string;
  name: string;
  nameZh: string;
};

export type KmbRouteDetail = {
  operator: 'KMB';
  route: string;
  bound: string;
  serviceType: number;
  stopCount: number;
  stops: KmbStop[];
  updatedAt: string;
};

export type GmbRegionSummary = {
  region: 'HKI' | 'KLN' | 'NT';
  label: string;
  count: number;
  routes: string[];
};

export type GmbSummary = {
  operator: 'GMB';
  regions: GmbRegionSummary[];
  total: number;
  updatedAt: string;
};

type Envelope<T> = { ok: true; data: T };

export async function fetchKmbRoutes(signal?: AbortSignal): Promise<KmbRouteList> {
  const res = await fetch('/api/bus/routes', { signal });
  if (!res.ok) throw new Error(`bff ${res.status}`);
  const env = (await res.json()) as Envelope<KmbRouteList>;
  return env.data;
}

export async function fetchKmbRouteDetail(
  route: string,
  bound: string,
  serviceType: number,
  signal?: AbortSignal,
): Promise<KmbRouteDetail> {
  const res = await fetch(
    `/api/bus/routes/${encodeURIComponent(route)}/${encodeURIComponent(bound)}/${serviceType}`,
    { signal },
  );
  if (!res.ok) throw new Error(`bff ${res.status}`);
  const env = (await res.json()) as Envelope<KmbRouteDetail>;
  return env.data;
}

export async function fetchGmbSummary(signal?: AbortSignal): Promise<GmbSummary> {
  const res = await fetch('/api/minibus/routes', { signal });
  if (!res.ok) throw new Error(`bff ${res.status}`);
  const env = (await res.json()) as Envelope<GmbSummary>;
  return env.data;
}

export type GmbStop = {
  seq: number;
  stopId: number | string;
  name: string;
  nameZh: string;
};

export type GmbDirection = {
  routeSeq: number;
  origin: string;
  originZh: string;
  destination: string;
  destinationZh: string;
  remarks: string;
  remarksZh: string;
  stopCount: number;
  stops: GmbStop[];
};

export type GmbVariant = {
  routeId: number | string;
  descriptionEn: string;
  descriptionZh: string;
  directions: GmbDirection[];
};

export type GmbRouteDetail = {
  operator: 'GMB';
  region: 'HKI' | 'KLN' | 'NT';
  regionLabel: string;
  route: string;
  variants: GmbVariant[];
  updatedAt: string;
};

export async function fetchGmbRouteDetail(
  region: string,
  route: string,
  signal?: AbortSignal,
): Promise<GmbRouteDetail> {
  const res = await fetch(
    `/api/minibus/routes/${encodeURIComponent(region)}/${encodeURIComponent(route)}`,
    { signal },
  );
  if (!res.ok) throw new Error(`bff ${res.status}`);
  const env = (await res.json()) as Envelope<GmbRouteDetail>;
  return env.data;
}
