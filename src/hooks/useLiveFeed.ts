// XMaps Live Feed Hook - SSE/WebSocket integration

import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { TimeWindow, LiveUpdate, GlobalSummary, Topic, TopicArc, CountryActivity } from '@/types/globe';
import { connectLiveFeed, connectWebSocketFeed } from '@/lib/api';

type ConnectionType = 'sse' | 'websocket';

interface UseLiveFeedOptions {
  window: TimeWindow;
  connectionType?: ConnectionType;
  enabled?: boolean;
}

export function useLiveFeed({
  window,
  connectionType = 'sse',
  enabled = true,
}: UseLiveFeedOptions) {
  const queryClient = useQueryClient();
  const disconnectRef = useRef<(() => void) | null>(null);

  const handleUpdate = useCallback((update: LiveUpdate) => {
    // Merge live updates into React Query cache
    queryClient.setQueryData<GlobalSummary>(['summary', window], (old) => {
      if (!old) return old;

      switch (update.type) {
        case 'topic_update': {
          const topic = update.data as Topic;
          return {
            ...old,
            topics: old.topics.map(t => 
              t.id === topic.id ? { ...t, ...topic } : t
            ),
            timestamp: update.timestamp,
          };
        }
        case 'arc_update': {
          const arc = update.data as TopicArc;
          return {
            ...old,
            arcs: old.arcs.map(a => 
              a.id === arc.id ? { ...a, ...arc } : a
            ),
            timestamp: update.timestamp,
          };
        }
        case 'country_update': {
          const country = update.data as CountryActivity;
          return {
            ...old,
            countries: old.countries.map(c => 
              c.iso2 === country.iso2 ? { ...c, ...country } : c
            ),
            timestamp: update.timestamp,
          };
        }
        default:
          return old;
      }
    });
  }, [queryClient, window]);

  const handleError = useCallback((error: Event) => {
    console.warn('Live feed error:', error);
    // Could implement reconnection logic here
  }, []);

  useEffect(() => {
    if (!enabled) {
      disconnectRef.current?.();
      disconnectRef.current = null;
      return;
    }

    const connect = connectionType === 'websocket' 
      ? connectWebSocketFeed 
      : connectLiveFeed;

    disconnectRef.current = connect(window, handleUpdate, handleError);

    return () => {
      disconnectRef.current?.();
      disconnectRef.current = null;
    };
  }, [window, connectionType, enabled, handleUpdate, handleError]);

  return {
    disconnect: () => disconnectRef.current?.(),
  };
}
