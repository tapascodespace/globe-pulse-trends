// XMaps Globe Data Hook - Central data management

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TimeWindow, GlobalSummary, Country, CountryDetail, TopicDetail } from '@/types/globe';

export function useGlobalSummary(window: TimeWindow) {
  return useQuery<GlobalSummary>({
    queryKey: ['summary', window],
    queryFn: () => api.getSummary(window),
    refetchInterval: 30000, // Fallback polling every 30s
    staleTime: 10000,
  });
}

export function useCountries() {
  return useQuery<Country[]>({
    queryKey: ['countries'],
    queryFn: () => api.getCountries(),
    staleTime: Infinity, // Countries don't change
  });
}

export function useCountryDetail(iso2: string | null, window: TimeWindow) {
  return useQuery<CountryDetail>({
    queryKey: ['country', iso2, window],
    queryFn: () => api.getCountryDetail(iso2!, window),
    enabled: !!iso2,
    staleTime: 15000,
  });
}

export function useTopicDetail(topicId: string | null) {
  return useQuery<TopicDetail>({
    queryKey: ['topic', topicId],
    queryFn: () => api.getTopicDetail(topicId!),
    enabled: !!topicId,
    staleTime: 15000,
  });
}
