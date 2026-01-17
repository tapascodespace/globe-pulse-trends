// XMaps Real-time Globe WebSocket Edge Function
// Broadcasts live updates to connected clients

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

// Simple mock data generator for demonstration
function generateMockUpdate(): LiveUpdate {
  const updateTypes = ['topic_update', 'arc_update', 'country_update'] as const;
  const type = updateTypes[Math.floor(Math.random() * updateTypes.length)];
  
  const countries = ['US', 'GB', 'DE', 'JP', 'FR', 'CA', 'AU', 'BR', 'IN', 'KR'];
  const topics = [
    'AI Regulation Summit',
    'Climate Action 2025',
    'Crypto Markets Rally',
    'SpaceX Starship Launch',
    'Global Tech Layoffs',
  ];

  switch (type) {
    case 'topic_update':
      return {
        type: 'topic_update',
        data: {
          id: `topic-${Math.floor(Math.random() * 10)}`,
          title: topics[Math.floor(Math.random() * topics.length)],
          score: 0.5 + Math.random() * 0.5,
          verification: ['verified', 'partially_verified', 'unverified'][Math.floor(Math.random() * 3)],
          relatedCountries: countries.slice(0, 3 + Math.floor(Math.random() * 4)),
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
          strength: 0.4 + Math.random() * 0.6,
          verification: 'verified',
        },
        timestamp: new Date().toISOString(),
      };
    case 'country_update':
      return {
        type: 'country_update',
        data: {
          iso2: countries[Math.floor(Math.random() * countries.length)],
          name: 'Country Name',
          activityScore: 0.3 + Math.random() * 0.7,
          topTopic: topics[Math.floor(Math.random() * topics.length)],
          topicCount: Math.floor(Math.random() * 15) + 1,
        },
        timestamp: new Date().toISOString(),
      };
  }
}

// Generate initial full sync data
function generateFullSync(): LiveUpdate {
  const countries = ['US', 'GB', 'DE', 'JP', 'FR', 'CA', 'AU', 'BR', 'IN', 'KR', 'IT', 'ES', 'NL', 'SE', 'CH'];
  const topics = [
    { id: '1', title: 'AI Regulation Summit', score: 0.95 },
    { id: '2', title: 'Climate Action 2025', score: 0.88 },
    { id: '3', title: 'Crypto Markets Rally', score: 0.82 },
    { id: '4', title: 'SpaceX Starship Launch', score: 0.76 },
    { id: '5', title: 'Global Tech Layoffs', score: 0.71 },
  ];

  return {
    type: 'full_sync',
    data: {
      topics: topics.map(t => ({
        ...t,
        verification: 'verified',
        relatedCountries: countries.slice(0, 3 + Math.floor(Math.random() * 5)),
      })),
      countries: countries.map(iso2 => ({
        iso2,
        name: iso2,
        activityScore: 0.3 + Math.random() * 0.7,
        topTopic: topics[Math.floor(Math.random() * topics.length)].title,
        topicCount: Math.floor(Math.random() * 15) + 1,
      })),
    },
    timestamp: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  console.log(`[realtime-globe] Request: ${req.method} ${url.pathname}`);
  console.log(`[realtime-globe] Headers:`, Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check for WebSocket upgrade
  const upgradeHeader = req.headers.get('upgrade');
  if (upgradeHeader?.toLowerCase() !== 'websocket') {
    // Return info for non-WebSocket requests
    return new Response(
      JSON.stringify({
        service: 'realtime-globe',
        status: 'running',
        message: 'Connect via WebSocket for real-time updates',
        websocket_url: url.toString().replace('http', 'ws'),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Upgrade to WebSocket
  const { socket, response } = Deno.upgradeWebSocket(req);
  const sessionId = crypto.randomUUID();
  console.log(`[realtime-globe] WebSocket connected: ${sessionId}`);

  let heartbeatInterval: number | undefined;
  let updateInterval: number | undefined;
  let isSubscribed = false;

  socket.onopen = () => {
    console.log(`[realtime-globe] Socket opened: ${sessionId}`);
    
    // Send connected message
    const connectedMsg: ServerMessage = {
      type: 'connected',
      sessionId,
      timestamp: new Date().toISOString(),
    };
    socket.send(JSON.stringify(connectedMsg));

    // Start heartbeat (every 30 seconds)
    heartbeatInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        const heartbeat: ServerMessage = {
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
        };
        socket.send(JSON.stringify(heartbeat));
        console.log(`[realtime-globe] Heartbeat sent: ${sessionId}`);
      }
    }, 30000);
  };

  socket.onmessage = (event) => {
    console.log(`[realtime-globe] Message received from ${sessionId}:`, event.data);
    
    try {
      const message: ClientMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'subscribe':
          console.log(`[realtime-globe] Client subscribed with window: ${message.window}`);
          isSubscribed = true;

          // Send initial full sync
          const fullSync = generateFullSync();
          socket.send(JSON.stringify({
            type: 'update',
            data: fullSync,
            timestamp: new Date().toISOString(),
          }));

          // Start sending updates every 10-30 seconds (randomized for demo)
          if (updateInterval) clearInterval(updateInterval);
          updateInterval = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN && isSubscribed) {
              const update = generateMockUpdate();
              const msg: ServerMessage = {
                type: 'update',
                data: update,
                timestamp: new Date().toISOString(),
              };
              socket.send(JSON.stringify(msg));
              console.log(`[realtime-globe] Update sent: ${update.type}`);
            }
          }, 10000 + Math.random() * 20000);
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

        default:
          console.log(`[realtime-globe] Unknown message type:`, message);
      }
    } catch (error) {
      console.error(`[realtime-globe] Failed to parse message:`, error);
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
