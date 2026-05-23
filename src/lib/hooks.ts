import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchWeather } from '@/lib/api/weather';
import { fetchAqhi } from '@/lib/api/airQuality';
import { fetchMtrStatus } from '@/lib/api/mtr';
import { fetchMtrLines } from '@/lib/api/mtrLines';
import { fetchKmbRoutes, fetchKmbRouteDetail, fetchGmbSummary, fetchGmbRouteDetail } from '@/lib/api/bus';
import { requestAdvice, type AdviceRequest } from '@/lib/api/ai';

const REFRESH_MS = 60_000;
const ROUTE_STALE_MS = 10 * 60_000;

export function useWeather() {
  return useQuery({
    queryKey: ['weather'],
    queryFn: ({ signal }) => fetchWeather(signal),
    refetchInterval: REFRESH_MS,
  });
}

export function useAqhi() {
  return useQuery({
    queryKey: ['aqhi'],
    queryFn: ({ signal }) => fetchAqhi(signal),
    refetchInterval: REFRESH_MS,
  });
}

export function useMtrStatus() {
  return useQuery({
    queryKey: ['mtr'],
    queryFn: ({ signal }) => fetchMtrStatus(signal),
    refetchInterval: REFRESH_MS,
  });
}

export function useMtrLines() {
  return useQuery({
    queryKey: ['mtr', 'lines'],
    queryFn: ({ signal }) => fetchMtrLines(signal),
    staleTime: 24 * 60 * 60_000,
  });
}

export function useKmbRoutes() {
  return useQuery({
    queryKey: ['bus', 'kmb', 'routes'],
    queryFn: ({ signal }) => fetchKmbRoutes(signal),
    staleTime: ROUTE_STALE_MS,
  });
}

export function useGmbSummary() {
  return useQuery({
    queryKey: ['bus', 'gmb', 'summary'],
    queryFn: ({ signal }) => fetchGmbSummary(signal),
    staleTime: ROUTE_STALE_MS,
  });
}

export function useKmbRouteDetail(
  route: string | null,
  bound: string | null,
  serviceType: number | null,
) {
  return useQuery({
    queryKey: ['bus', 'kmb', 'detail', route, bound, serviceType],
    queryFn: ({ signal }) =>
      fetchKmbRouteDetail(route as string, bound as string, serviceType as number, signal),
    enabled: Boolean(route && bound && serviceType !== null),
    staleTime: ROUTE_STALE_MS,
  });
}

export function useTravelAdvice() {
  return useMutation({
    mutationFn: (payload: AdviceRequest) => requestAdvice(payload),
  });
}

export function useGmbRouteDetail(region: string | null, route: string | null) {
  return useQuery({
    queryKey: ['bus', 'gmb', 'detail', region, route],
    queryFn: ({ signal }) => fetchGmbRouteDetail(region as string, route as string, signal),
    enabled: Boolean(region && route),
    staleTime: ROUTE_STALE_MS,
  });
}
