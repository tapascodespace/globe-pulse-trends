// XMaps Real-time Globe WebSocket Edge Function
// Broadcasts live updates from X API to connected clients

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, upgrade, connection, sec-websocket-key, sec-websocket-version, sec-websocket-extensions, sec-websocket-protocol',
};

interface LiveUpdate {
  type: 'topic_update' | 'arc_update' | 'country_update' | 'full_sync';
  data: unknown;
  timestamp: string;
}

interface ServerMessage {
  type: 'connected' | 'heartbeat' | 'error' | 'update';
  sessionId?: string;
  data?: LiveUpdate;
  timestamp: string;
}

interface ClientMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  window?: string;
}

interface TrendingHashtag {
  name: string;
  count: number;
  engagement: number;
  countries: string[];
}

// Countries to monitor for global trends
const MONITORED_COUNTRIES = [
  { code: 'US', name: 'USA' },
  { code: 'GB', name: 'UK' },
  { code: 'DE', name: 'Germany' },
  { code: 'JP', name: 'Japan' },
  { code: 'FR', name: 'France' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IN', name: 'India' },
  { code: 'KR', name: 'Korea' },
];

// Cache for rate limiting
let lastFetchTime = 0;
let cachedTrends: TrendingHashtag[] = [];
let cachedCountryActivity: Map<string, { score: number; topTopic: string }> = new Map();

// Fetch trending topics from X API
async function fetchTrendingFromX(bearerToken: string): Promise<TrendingHashtag[]> {
  const now = Date.now();
  const CACHE_DURATION = 60000; // 1 minute cache to respect rate limits
  
  if (now - lastFetchTime < CACHE_DURATION && cachedTrends.length > 0) {
    console.log('[realtime-globe] Using cached trends');
    return cachedTrends;
  }

  console.log('[realtime-globe] Fetching fresh trends from X API');
  const allHashtags = new Map<string, TrendingHashtag>();
  
  // Search for trending content globally
  const searchQueries = [
    'trending -is:retweet lang:en',
    'breaking news -is:retweet lang:en',
    'viral -is:retweet lang:en',
  ];

  for (const query of searchQueries.slice(0, 2)) { // Limit to 2 queries for rate limits
    try {
      const searchUrl = new URL('https://api.twitter.com/2/tweets/search/recent');
      searchUrl.searchParams.set('query', query);
      searchUrl.searchParams.set('max_results', '10');
      searchUrl.searchParams.set('tweet.fields', 'public_metrics,entities,created_at,geo');
      searchUrl.searchParams.set('expansions', 'geo.place_id');
      searchUrl.searchParams.set('place.fields', 'country_code');

      const response = await fetch(searchUrl.toString(), {
        headers: { Authorization: `Bearer ${bearerToken}` },
      });

      if (!response.ok) {
        console.error(`[realtime-globe] X API error: ${response.status}`);
        if (response.status === 429) {
          console.log('[realtime-globe] Rate limited, using cache');
          break;
        }
        continue;
      }

      const data = await response.json();
      
      if (data.data) {
        // Build place->country map
        const placeToCountry = new Map<string, string>();
        if (data.includes?.places) {
          for (const place of data.includes.places) {
            placeToCountry.set(place.id, place.country_code || 'XX');
          }
        }

        for (const tweet of data.data) {
          // Extract country from geo data or assign randomly for demo
          let countryCode = 'XX';
          if (tweet.geo?.place_id) {
            countryCode = placeToCountry.get(tweet.geo.place_id) || 'XX';
          } else {
            // Assign based on language hints or random for now
            countryCode = MONITORED_COUNTRIES[Math.floor(Math.random() * MONITORED_COUNTRIES.length)].code;
          }

          // Update country activity
          const currentActivity = cachedCountryActivity.get(countryCode) || { score: 0, topTopic: '' };
          const engagement = (tweet.public_metrics?.like_count || 0) + (tweet.public_metrics?.retweet_count || 0) * 2;
          cachedCountryActivity.set(countryCode, {
            score: Math.min(1, currentActivity.score + engagement / 10000),
            topTopic: tweet.entities?.hashtags?.[0]?.tag || currentActivity.topTopic,
          });

          // Extract hashtags
          if (tweet.entities?.hashtags) {
            for (const hashtag of tweet.entities.hashtags) {
              const tag = `#${hashtag.tag}`;
              const existing = allHashtags.get(tag) || { name: tag, count: 0, engagement: 0, countries: [] };
              
              if (!existing.countries.includes(countryCode)) {
                existing.countries.push(countryCode);
              }
              
              allHashtags.set(tag, {
                name: tag,
                count: existing.count + 1,
                engagement: existing.engagement + engagement,
                countries: existing.countries,
              });
            }
          }
        }
      }

      await new Promise(r => setTimeout(r, 100)); // Small delay between requests
    } catch (err) {
      console.error('[realtime-globe] Search error:', err);
    }
  }

  // Sort and cache results
  cachedTrends = [...allHashtags.values()]
    .sort((a, b) => (b.count * 10 + b.engagement) - (a.count * 10 + a.engagement))
    .slice(0, 15);
  
  lastFetchTime = now;
  console.log(`[realtime-globe] Found ${cachedTrends.length} trending hashtags`);
  
  return cachedTrends;
}

// Generate full sync from real data
async function generateRealFullSync(bearerToken: string): Promise<LiveUpdate> {
  const trends = await fetchTrendingFromX(bearerToken);
  
  // Convert trends to topics
  const topics = trends.slice(0, 10).map((trend, i) => ({
    id: `topic-${i}`,
    title: trend.name,
    score: Math.min(0.95, 0.5 + (trend.engagement / 50000)),
    verification: trend.count >= 3 ? 'verified' : trend.count >= 2 ? 'partially_verified' : 'unverified',
    relatedCountries: trend.countries.slice(0, 5),
  }));

  // Generate arcs between countries that share topics
  const arcs: any[] = [];
  topics.forEach((topic, topicIdx) => {
    const countries = topic.relatedCountries;
    for (let i = 0; i < countries.length - 1; i++) {
      arcs.push({
        id: `arc-${topicIdx}-${i}`,
        topicId: topic.id,
        topicTitle: topic.title,
        fromCountry: countries[i],
        toCountry: countries[i + 1],
        strength: topic.score * (0.7 + Math.random() * 0.3),
        verification: topic.verification,
      });
    }
  });

  // Build country activity from cache
  const countries = MONITORED_COUNTRIES.map(c => {
    const activity = cachedCountryActivity.get(c.code) || { score: 0.3 + Math.random() * 0.4, topTopic: topics[0]?.title || 'Trending' };
    return {
      iso2: c.code,
      name: c.name,
      activityScore: Math.min(1, activity.score),
      topTopic: activity.topTopic || topics[0]?.title || 'Global News',
      topicCount: Math.floor(Math.random() * 10) + 1,
    };
  });

  return {
    type: 'full_sync',
    data: { topics, countries, arcs: arcs.slice(0, 50) },
    timestamp: new Date().toISOString(),
  };
}

// Generate incremental update from real data
async function generateRealUpdate(bearerToken: string): Promise<LiveUpdate> {
  const trends = await fetchTrendingFromX(bearerToken);
  const updateTypes = ['topic_update', 'arc_update', 'country_update'] as const;
  const type = updateTypes[Math.floor(Math.random() * updateTypes.length)];

  if (trends.length === 0) {
    // Fallback to mock if no data
    return generateMockUpdate();
  }

  const randomTrend = trends[Math.floor(Math.random() * Math.min(5, trends.length))];
  const randomCountry = MONITORED_COUNTRIES[Math.floor(Math.random() * MONITORED_COUNTRIES.length)];

  switch (type) {
    case 'topic_update':
      return {
        type: 'topic_update',
        data: {
          id: `topic-${Math.floor(Math.random() * 10)}`,
          title: randomTrend.name,
          score: Math.min(0.95, 0.5 + (randomTrend.engagement / 50000)),
          verification: randomTrend.count >= 3 ? 'verified' : 'partially_verified',
          relatedCountries: randomTrend.countries.slice(0, 4),
        },
        timestamp: new Date().toISOString(),
      };
    case 'arc_update':
      const countries = randomTrend.countries.length >= 2 
        ? randomTrend.countries 
        : [randomCountry.code, MONITORED_COUNTRIES[(MONITORED_COUNTRIES.indexOf(randomCountry) + 1) % MONITORED_COUNTRIES.length].code];
      return {
        type: 'arc_update',
        data: {
          id: `arc-${Date.now()}`,
          topicId: `topic-${Math.floor(Math.random() * 5)}`,
          topicTitle: randomTrend.name,
          fromCountry: countries[0],
          toCountry: countries[1] || countries[0],
          strength: 0.5 + Math.random() * 0.5,
          verification: 'verified',
        },
        timestamp: new Date().toISOString(),
      };
    case 'country_update':
      const activity = cachedCountryActivity.get(randomCountry.code);
      return {
        type: 'country_update',
        data: {
          iso2: randomCountry.code,
          name: randomCountry.name,
          activityScore: activity?.score || (0.4 + Math.random() * 0.5),
          topTopic: activity?.topTopic || randomTrend.name,
          topicCount: Math.floor(Math.random() * 12) + 1,
        },
        timestamp: new Date().toISOString(),
      };
  }
}

// Fallback mock update generator
function generateMockUpdate(): LiveUpdate {
  const updateTypes = ['topic_update', 'arc_update', 'country_update'] as const;
  const type = updateTypes[Math.floor(Math.random() * updateTypes.length)];
  const countries = MONITORED_COUNTRIES.map(c => c.code);
  const topics = ['#BreakingNews', '#Trending', '#Tech', '#Sports', '#Politics'];

  switch (type) {
    case 'topic_update':
      return {
        type: 'topic_update',
        data: {
          id: `topic-${Math.floor(Math.random() * 10)}`,
          title: topics[Math.floor(Math.random() * topics.length)],
          score: 0.5 + Math.random() * 0.5,
          verification: 'verified',
          relatedCountries: countries.slice(0, 3),
        },
        timestamp: new Date().toISOString(),
      };
    case 'arc_update':
      const fromIdx = Math.floor(Math.random() * countries.length);
      let toIdx = Math.floor(Math.random() * countries.length);
      while (toIdx === fromIdx) toIdx = Math.floor(Math.random() * countries.length);
      return {
        type: 'arc_update',
        data: {
          id: `arc-${Date.now()}`,
          topicId: `topic-${Math.floor(Math.random() * 5)}`,
          topicTitle: topics[Math.floor(Math.random() * topics.length)],
          fromCountry: countries[fromIdx],
          toCountry: countries[toIdx],
          strength: 0.5 + Math.random() * 0.5,
          verification: 'verified',
        },
        timestamp: new Date().toISOString(),
      };
    case 'country_update':
      return {
        type: 'country_update',
        data: {
          iso2: countries[Math.floor(Math.random() * countries.length)],
          name: 'Country',
          activityScore: 0.4 + Math.random() * 0.6,
          topTopic: topics[Math.floor(Math.random() * topics.length)],
          topicCount: Math.floor(Math.random() * 12) + 1,
        },
        timestamp: new Date().toISOString(),
      };
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  console.log(`[realtime-globe] Request: ${req.method} ${url.pathname}`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check for WebSocket upgrade
  const upgradeHeader = req.headers.get('upgrade');
  if (upgradeHeader?.toLowerCase() !== 'websocket') {
    return new Response(
      JSON.stringify({
        service: 'realtime-globe',
        status: 'running',
        message: 'Connect via WebSocket for real-time X API updates',
        websocket_url: url.toString().replace('http', 'ws'),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const X_BEARER_TOKEN = Deno.env.get('X_BEARER_TOKEN');
  const hasRealApi = !!X_BEARER_TOKEN;
  
  console.log(`[realtime-globe] X API available: ${hasRealApi}`);

  // Upgrade to WebSocket
  const { socket, response } = Deno.upgradeWebSocket(req);
  const sessionId = crypto.randomUUID();
  console.log(`[realtime-globe] WebSocket connected: ${sessionId}`);

  let heartbeatInterval: number | undefined;
  let updateInterval: number | undefined;
  let isSubscribed = false;

  socket.onopen = () => {
    console.log(`[realtime-globe] Socket opened: ${sessionId}`);
    
    const connectedMsg: ServerMessage = {
      type: 'connected',
      sessionId,
      timestamp: new Date().toISOString(),
    };
    socket.send(JSON.stringify(connectedMsg));

    // Heartbeat every 30 seconds
    heartbeatInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
        }));
      }
    }, 30000);
  };

  socket.onmessage = async (event) => {
    console.log(`[realtime-globe] Message from ${sessionId}:`, event.data);
    
    try {
      const message: ClientMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'subscribe':
          console.log(`[realtime-globe] Client subscribed with window: ${message.window}`);
          isSubscribed = true;

          // Send initial full sync with real data if available
          try {
            const fullSync = hasRealApi 
              ? await generateRealFullSync(X_BEARER_TOKEN!)
              : generateMockFullSync();
            
            socket.send(JSON.stringify({
              type: 'update',
              data: fullSync,
              timestamp: new Date().toISOString(),
            }));
            console.log(`[realtime-globe] Full sync sent (real: ${hasRealApi})`);
          } catch (err) {
            console.error('[realtime-globe] Full sync error:', err);
            // Fallback to mock
            socket.send(JSON.stringify({
              type: 'update',
              data: generateMockFullSync(),
              timestamp: new Date().toISOString(),
            }));
          }

          // Send updates every 15-45 seconds
          if (updateInterval) clearInterval(updateInterval);
          updateInterval = setInterval(async () => {
            if (socket.readyState === WebSocket.OPEN && isSubscribed) {
              try {
                const update = hasRealApi 
                  ? await generateRealUpdate(X_BEARER_TOKEN!)
                  : generateMockUpdate();
                
                socket.send(JSON.stringify({
                  type: 'update',
                  data: update,
                  timestamp: new Date().toISOString(),
                }));
                console.log(`[realtime-globe] Update sent: ${update.type}`);
              } catch (err) {
                console.error('[realtime-globe] Update error:', err);
              }
            }
          }, 15000 + Math.random() * 30000);
          break;

        case 'unsubscribe':
          console.log(`[realtime-globe] Client unsubscribed: ${sessionId}`);
          isSubscribed = false;
          if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = undefined;
          }
          break;

        case 'ping':
          socket.send(JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
          }));
          break;
      }
    } catch (error) {
      console.error(`[realtime-globe] Message parse error:`, error);
      socket.send(JSON.stringify({
        type: 'error',
        data: { message: 'Invalid message format' },
        timestamp: new Date().toISOString(),
      }));
    }
  };

  socket.onerror = (error) => {
    console.error(`[realtime-globe] Socket error for ${sessionId}:`, error);
  };

  socket.onclose = () => {
    console.log(`[realtime-globe] Socket closed: ${sessionId}`);
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (updateInterval) clearInterval(updateInterval);
  };

  return response;
});

// Mock full sync fallback
function generateMockFullSync(): LiveUpdate {
  const countries = MONITORED_COUNTRIES.map(c => c.code);
  const topics = [
    { id: '1', title: '#BreakingNews', score: 0.92 },
    { id: '2', title: '#Trending', score: 0.85 },
    { id: '3', title: '#Tech', score: 0.78 },
    { id: '4', title: '#Sports', score: 0.71 },
    { id: '5', title: '#Politics', score: 0.65 },
  ];

  return {
    type: 'full_sync',
    data: {
      topics: topics.map(t => ({
        ...t,
        verification: 'verified',
        relatedCountries: countries.slice(0, 4),
      })),
      countries: countries.map(iso2 => ({
        iso2,
        name: iso2,
        activityScore: 0.4 + Math.random() * 0.5,
        topTopic: topics[Math.floor(Math.random() * topics.length)].title,
        topicCount: Math.floor(Math.random() * 10) + 1,
      })),
      arcs: [],
    },
    timestamp: new Date().toISOString(),
  };
}
