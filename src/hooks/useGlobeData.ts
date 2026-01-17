// XMaps Globe Data Hook - Central data management with real X API

import { useQuery } from '@tanstack/react-query';
import { 
  api, 
  generateInitialSummary, 
  getMockCountries, 
  fetchRealXFeed, 
  fetchRealTrendingTopics 
} from '@/lib/api';
import type { TimeWindow, GlobalSummary, Country, CountryDetail, TopicDetail } from '@/types/globe';

export function useGlobalSummary(window: TimeWindow) {
  return useQuery<GlobalSummary>({
    queryKey: ['summary', window],
    queryFn: () => generateInitialSummary(window),
    refetchInterval: false, // WebSocket handles live updates
    staleTime: Infinity,
  });
}

export function useCountries() {
  return useQuery<Country[]>({
    queryKey: ['countries'],
    queryFn: () => getMockCountries(),
    staleTime: Infinity, // Countries are static
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

// New hooks for real X API data
export function useRealXFeed(country: string | null, countryCode: string | null, topics?: string[]) {
  return useQuery({
    queryKey: ['x-feed', countryCode, topics],
    queryFn: () => fetchRealXFeed(country!, countryCode!, topics),
    enabled: !!country && !!countryCode,
    staleTime: 60000, // Cache for 1 minute
    retry: 1,
  });
}

export function useRealTrendingTopics(countryCode: string | null) {
  return useQuery({
    queryKey: ['trending-topics', countryCode],
    queryFn: () => fetchRealTrendingTopics(countryCode!),
    enabled: !!countryCode,
    staleTime: 300000, // Cache for 5 minutes (trends don't change that fast)
    retry: 1,
  });
}
