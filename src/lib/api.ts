// XMaps API Client - Typed backend integration

import type {
  TimeWindow,
  Country,
  GlobalSummary,
  CountryDetail,
  TopicDetail,
  LiveUpdate,
} from '@/types/globe';
import { ALL_COUNTRIES, COUNTRY_TOPICS, generateCountryPosts } from '@/data/allCountries';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Types for real X API responses
export interface RealXPost {
  id: string;
  text: string;
  author: string;
  authorHandle: string;
  timestamp: string;
  engagement: number;
  likes: number;
  retweets: number;
  replies: number;
}

export interface RealXFeedResponse {
  posts: RealXPost[];
  summary?: string;
  error?: string;
}

export interface RealTrendingTopic {
  name: string;
  url: string;
  tweetVolume: number | null;
  query: string;
}

export interface RealTrendingResponse {
  topics: RealTrendingTopic[];
  location: string;
  error?: string;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new ApiError(response.status, `API Error: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // For demo purposes, return mock data when backend is unavailable
    console.warn(`Backend unavailable, using mock data for: ${endpoint}`);
    return getMockData<T>(endpoint);
  }
}

// API Endpoints
export const api = {
  // Get global summary with topics, arcs, and country activity
  getSummary: (window: TimeWindow = '60m') =>
    fetchApi<GlobalSummary>(`/api/summary?window=${window}`),

  // Get all countries with centroids
  getCountries: () =>
    fetchApi<Country[]>('/api/countries'),

  // Get country-specific details
  getCountryDetail: (iso2: string, window: TimeWindow = '60m') =>
    fetchApi<CountryDetail>(`/api/country/${iso2}?window=${window}`),

  // Get topic details including Grok summary
  getTopicDetail: (topicId: string) =>
    fetchApi<TopicDetail>(`/api/topic/${topicId}`),
};

// SSE Live Feed Connection
export function connectLiveFeed(
  window: TimeWindow,
  onUpdate: (update: LiveUpdate) => void,
  onError?: (error: Event) => void
): () => void {
  const url = `${API_BASE_URL}/api/stream?window=${window}`;
  
  try {
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data) as LiveUpdate;
        onUpdate(update);
      } catch (e) {
        console.error('Failed to parse SSE message:', e);
      }
    };

    eventSource.onerror = (error) => {
      console.warn('SSE connection error, will attempt reconnect');
      onError?.(error);
    };

    return () => eventSource.close();
  } catch (error) {
    console.warn('SSE not available, using polling fallback');
    // Return no-op cleanup
    return () => {};
  }
}

// WebSocket Live Feed Connection via Supabase Edge Function
export function connectWebSocketFeed(
  window: TimeWindow,
  onUpdate: (update: LiveUpdate) => void,
  onError?: (error: Event) => void,
  onStateChange?: (state: 'connecting' | 'connected' | 'disconnected') => void
): () => void {
  const wsUrl = 'wss://uynszjswreybknuvhdio.functions.supabase.co/functions/v1/realtime-globe';
  
  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  let reconnectTimeout: number | undefined;
  let isClosedIntentionally = false;

  const connect = () => {
    try {
      onStateChange?.('connecting');
      console.log('[WebSocket] Connecting to realtime-globe...');
      
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WebSocket] Connected successfully');
        reconnectAttempts = 0;
        onStateChange?.('connected');
        
        // Subscribe with the current time window
        ws?.send(JSON.stringify({ type: 'subscribe', window }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[WebSocket] Received:', message.type);
          
          if (message.type === 'update' && message.data) {
            // Handle different update types
            const update = message.data as LiveUpdate;
            if (update.type === 'full_sync') {
              // Full sync contains multiple updates
              console.log('[WebSocket] Full sync received');
            }
            onUpdate(update);
          } else if (message.type === 'heartbeat') {
            console.log('[WebSocket] Heartbeat received');
          } else if (message.type === 'connected') {
            console.log('[WebSocket] Session established:', message.sessionId);
          }
        } catch (e) {
          console.error('[WebSocket] Failed to parse message:', e);
        }
      };

      ws.onerror = (error) => {
        console.warn('[WebSocket] Error occurred');
        onError?.(error as Event);
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', event.code, event.reason);
        onStateChange?.('disconnected');
        
        if (!isClosedIntentionally && reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          reconnectAttempts++;
          reconnectTimeout = setTimeout(connect, delay) as unknown as number;
        }
      };
    } catch (error) {
      console.warn('[WebSocket] Failed to create connection:', error);
      onStateChange?.('disconnected');
    }
  };

  connect();

  // Return cleanup function
  return () => {
    isClosedIntentionally = true;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (ws) {
      ws.send(JSON.stringify({ type: 'unsubscribe' }));
      ws.close();
      ws = null;
    }
  };
}

// Mock Data for Demo/Development
function getMockData<T>(endpoint: string): T {
  if (endpoint.includes('/api/summary')) {
    return generateMockSummary() as T;
  }
  if (endpoint.includes('/api/countries')) {
    return getMockCountries() as T;
  }
  if (endpoint.includes('/api/country/')) {
    const iso2 = endpoint.split('/').pop()?.split('?')[0] || 'US';
    return generateMockCountryDetail(iso2) as T;
  }
  if (endpoint.includes('/api/topic/')) {
    const topicId = endpoint.split('/').pop() || '1';
    return generateMockTopicDetail(topicId) as T;
  }
  return {} as T;
}

function getMockCountries(): Country[] {
  // Import all countries from comprehensive list
  return ALL_COUNTRIES;
}

const mockTopics = [
  { title: 'AI Regulation Summit', id: '1' },
  { title: 'Climate Action 2025', id: '2' },
  { title: 'Crypto Markets Rally', id: '3' },
  { title: 'SpaceX Starship Launch', id: '4' },
  { title: 'Global Tech Layoffs', id: '5' },
  { title: 'FIFA World Cup 2026', id: '6' },
  { title: 'Electric Vehicle Boom', id: '7' },
  { title: 'Central Bank Rates', id: '8' },
  { title: 'AI Breakthrough Model', id: '9' },
  { title: 'Geopolitical Tensions', id: '10' },
  { title: 'Quantum Computing Milestone', id: '11' },
  { title: 'Renewable Energy Record', id: '12' },
  { title: 'Social Media Exodus', id: '13' },
  { title: 'Healthcare AI Diagnosis', id: '14' },
  { title: 'Supply Chain Crisis', id: '15' },
];

function generateMockSummary(): GlobalSummary {
  const countries = getMockCountries();
  
  const topics = mockTopics.map((t, i) => ({
    id: t.id,
    title: t.title,
    score: Math.max(0.15, 1 - i * 0.06 + Math.random() * 0.1),
    verification: (['verified', 'partially_verified', 'unverified'] as const)[Math.floor(Math.random() * 3)],
    relatedCountries: countries.slice(0, 3 + Math.floor(Math.random() * 5)).map(c => c.iso2),
  }));

  const arcs: GlobalSummary['arcs'] = [];
  topics.forEach(topic => {
    const relatedCountries = topic.relatedCountries;
    for (let i = 0; i < relatedCountries.length - 1; i++) {
      const from = countries.find(c => c.iso2 === relatedCountries[i])!;
      const to = countries.find(c => c.iso2 === relatedCountries[i + 1])!;
      if (from && to) {
        arcs.push({
          id: `arc-${topic.id}-${i}`,
          topicId: topic.id,
          topicTitle: topic.title,
          fromCountry: from.iso2,
          toCountry: to.iso2,
          fromLat: from.lat,
          fromLon: from.lon,
          toLat: to.lat,
          toLon: to.lon,
          strength: topic.score * (0.7 + Math.random() * 0.3),
          verification: topic.verification,
        });
      }
    }
  });

  const countryActivity = countries.map(c => ({
    iso2: c.iso2,
    name: c.name,
    activityScore: Math.random() * 0.8 + 0.2,
    topTopic: topics[Math.floor(Math.random() * 5)].title,
    topicCount: Math.floor(Math.random() * 10) + 1,
  }));

  return {
    topics,
    arcs: arcs.slice(0, 80),
    countries: countryActivity,
    timestamp: new Date().toISOString(),
  };
}

function generateMockCountryDetail(iso2: string): CountryDetail {
  const countries = getMockCountries();
  const country = countries.find(c => c.iso2 === iso2) || countries[0];
  
  // Get country-specific topics or fallback to generic
  const countryTopicTitles = COUNTRY_TOPICS[iso2] || ['Local News', 'Economy Update', 'Cultural Event', 'Sports Update', 'Weather Report'];
  
  return {
    iso2: country.iso2,
    name: country.name,
    activityScore: Math.random() * 0.5 + 0.5,
    topics: countryTopicTitles.map((title, i) => ({
      id: `${iso2}-topic-${i}`,
      title,
      score: Math.max(0.2, 0.95 - i * 0.12),
      verification: (['verified', 'partially_verified', 'unverified'] as const)[i % 3],
      relatedCountries: [iso2, 'US', 'GB'].slice(0, 2 + Math.floor(Math.random() * 2)),
    })),
    evidence: generateCountryPosts(iso2, country.name),
  };
}

function generateMockTopicDetail(topicId: string): TopicDetail {
  const topic = mockTopics.find(t => t.id === topicId) || mockTopics[0];
  const countries = getMockCountries();
  
  return {
    id: topic.id,
    title: topic.title,
    score: 0.85,
    verification: 'verified',
    relatedCountries: ['US', 'GB', 'DE', 'JP', 'FR'],
    grokSummary: `${topic.title} has seen significant global attention in the past hour. Key developments include policy announcements, market reactions, and widespread social media discussion. The conversation is primarily driven by verified sources and official accounts, with high engagement rates indicating strong public interest. Regional variations show concentrated activity in major tech hubs and financial centers.`,
    arcs: countries.slice(0, 4).flatMap((from, i) => 
      countries.slice(i + 1, i + 3).map((to, j) => ({
        id: `arc-${topicId}-${i}-${j}`,
        topicId: topic.id,
        topicTitle: topic.title,
        fromCountry: from.iso2,
        toCountry: to.iso2,
        fromLat: from.lat,
        fromLon: from.lon,
        toLat: to.lat,
        toLon: to.lon,
        strength: 0.6 + Math.random() * 0.35,
        verification: 'verified' as const,
      }))
    ),
    evidence: [
      { id: '1', text: 'Breaking: Official confirmation of major developments in this space.', author: '@verified_source', timestamp: '1m ago', engagement: 89000 },
      { id: '2', text: 'Deep dive into the numbers behind this trend. The data tells an interesting story.', author: '@data_analyst', timestamp: '4m ago', engagement: 23000 },
      { id: '3', text: 'Expert commentary on what this means for the broader ecosystem.', author: '@industry_expert', timestamp: '8m ago', engagement: 15600 },
      { id: '4', text: 'Community reaction has been overwhelmingly positive. Here\'s what people are saying.', author: '@reporter', timestamp: '15m ago', engagement: 8900 },
    ],
  };
}

// Real X API Integration via Edge Functions
export async function fetchRealXFeed(
  country: string,
  countryCode: string,
  topics?: string[]
): Promise<RealXFeedResponse> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('Supabase not configured, using mock data');
    const mockPosts = generateCountryPosts(countryCode, country);
    return {
      posts: mockPosts.map(p => ({
        id: p.id,
        text: p.text,
        author: p.author.replace('@', ''),
        authorHandle: p.author,
        timestamp: p.timestamp,
        engagement: p.engagement,
        likes: Math.floor(p.engagement * 0.6),
        retweets: Math.floor(p.engagement * 0.3),
        replies: Math.floor(p.engagement * 0.1),
      })),
    };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/x-feed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ country, countryCode, topics }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch real X feed:', error);
    // Fallback to mock data
    const mockPosts = generateCountryPosts(countryCode, country);
    return {
      posts: mockPosts.map(p => ({
        id: p.id,
        text: p.text,
        author: p.author.replace('@', ''),
        authorHandle: p.author,
        timestamp: p.timestamp,
        engagement: p.engagement,
        likes: Math.floor(p.engagement * 0.6),
        retweets: Math.floor(p.engagement * 0.3),
        replies: Math.floor(p.engagement * 0.1),
      })),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function fetchRealTrendingTopics(
  countryCode: string
): Promise<RealTrendingResponse> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('Supabase not configured, using mock data');
    const mockTopicsList = COUNTRY_TOPICS[countryCode] || ['Local News', 'Economy', 'Sports', 'Culture', 'Weather'];
    return {
      topics: mockTopicsList.map((name, i) => ({
        name,
        url: '#',
        tweetVolume: Math.floor(Math.random() * 50000) + 1000,
        query: encodeURIComponent(name),
      })),
      location: countryCode,
    };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/trending-topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ countryCode }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch real trending topics:', error);
    // Fallback to mock data
    const mockTopicsList = COUNTRY_TOPICS[countryCode] || ['Local News', 'Economy', 'Sports', 'Culture', 'Weather'];
    return {
      topics: mockTopicsList.map((name) => ({
        name,
        url: '#',
        tweetVolume: Math.floor(Math.random() * 50000) + 1000,
        query: encodeURIComponent(name),
      })),
      location: countryCode,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
