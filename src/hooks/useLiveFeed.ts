// XMaps Live Feed Hook - WebSocket integration with Supabase Edge Functions

import { useEffect, useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { TimeWindow, LiveUpdate, GlobalSummary, Topic, TopicArc, CountryActivity, FullSyncData } from '@/types/globe';
import { connectWebSocketFeed } from '@/lib/api';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

interface UseLiveFeedOptions {
  window: TimeWindow;
  enabled?: boolean;
}


export function useLiveFeed({
  window,
  enabled = true,
}: UseLiveFeedOptions) {
  const queryClient = useQueryClient();
  const disconnectRef = useRef<(() => void) | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');

  const handleUpdate = useCallback((update: LiveUpdate) => {
    console.log('[useLiveFeed] Processing update:', update.type);
    
    // Merge live updates into React Query cache
    queryClient.setQueryData<GlobalSummary>(['summary', window], (old) => {
      if (!old) {
        console.log('[useLiveFeed] No existing data to update');
        return old;
      }

      switch (update.type) {
        case 'full_sync': {
          // Full sync replaces data
          const syncData = update.data as FullSyncData;
          console.log('[useLiveFeed] Full sync - updating all data');
          return {
            ...old,
            topics: syncData.topics || old.topics,
            countries: syncData.countries || old.countries,
            timestamp: update.timestamp,
          };
        }
        case 'topic_update': {
          const topic = update.data as Topic;
          const existingIndex = old.topics.findIndex(t => t.id === topic.id);
          const updatedTopics = existingIndex >= 0
            ? old.topics.map(t => t.id === topic.id ? { ...t, ...topic } : t)
            : [...old.topics.slice(0, 10), topic]; // Add new topic, keep max 11
          return {
            ...old,
            topics: updatedTopics,
            timestamp: update.timestamp,
          };
        }
        case 'arc_update': {
          const arc = update.data as TopicArc;
          const existingArcIndex = old.arcs.findIndex(a => a.id === arc.id);
          const updatedArcs = existingArcIndex >= 0
            ? old.arcs.map(a => a.id === arc.id ? { ...a, ...arc } : a)
            : [...old.arcs.slice(-79), arc]; // Add new arc, keep max 80
          return {
            ...old,
            arcs: updatedArcs,
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
    console.warn('[useLiveFeed] Connection error:', error);
  }, []);

  const handleStateChange = useCallback((state: ConnectionState) => {
    console.log('[useLiveFeed] Connection state:', state);
    setConnectionState(state);
  }, []);

  useEffect(() => {
    if (!enabled) {
      disconnectRef.current?.();
      disconnectRef.current = null;
      setConnectionState('disconnected');
      return;
    }

    // Use WebSocket connection to Supabase edge function
    disconnectRef.current = connectWebSocketFeed(
      window,
      handleUpdate,
      handleError,
      handleStateChange
    );

    return () => {
      disconnectRef.current?.();
      disconnectRef.current = null;
    };
  }, [window, enabled, handleUpdate, handleError, handleStateChange]);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting',
    disconnect: () => disconnectRef.current?.(),
  };
}
