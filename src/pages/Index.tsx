// XMaps - GlobePulse Visualization
// Real-time trending topics from X (Twitter) + Grok summaries

import { useEffect } from 'react';
import { GlobeScene } from '@/components/globe/GlobeScene';
import { TrendingPanel } from '@/components/ui/TrendingPanel';
import { TimeWindowSelector } from '@/components/ui/TimeWindowSelector';
import { HoverTooltip } from '@/components/ui/HoverTooltip';
import { SidePanel } from '@/components/ui/SidePanel';
import { Legend } from '@/components/ui/Legend';
import { useGlobeStore } from '@/store/globeStore';
import { useGlobalSummary, useCountries } from '@/hooks/useGlobeData';
import { useLiveFeed } from '@/hooks/useLiveFeed';

export default function Index() {
  const { timeWindow } = useGlobeStore();
  
  // Fetch global data
  const { data: summaryData, isLoading: summaryLoading } = useGlobalSummary(timeWindow);
  const { data: countriesData, isLoading: countriesLoading } = useCountries();
  
  // Connect to live feed
  useLiveFeed({ 
    window: timeWindow, 
    connectionType: 'sse',
    enabled: true 
  });

  const isLoading = summaryLoading || countriesLoading;
  const countries = countriesData || [];

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {/* 3D Globe */}
      <GlobeScene 
        data={summaryData} 
        countries={countries}
        isLoading={isLoading}
      />
      
      {/* Top-left: Brand + Time selector */}
      <div className="fixed top-4 left-4 z-30 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="glass-panel px-4 py-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-lg font-semibold tracking-tight text-foreground">
              XMaps
            </span>
            <span className="text-xs text-muted-foreground font-light">
              GlobePulse
            </span>
          </div>
        </div>
        <TimeWindowSelector />
      </div>

      {/* Top-right: Trending panel */}
      <div className="fixed top-4 right-4 z-30">
        <TrendingPanel 
          topics={summaryData?.topics || []} 
          isLoading={summaryLoading}
        />
      </div>

      {/* Bottom-left: Legend */}
      <div className="fixed bottom-4 left-4 z-30">
        <Legend />
      </div>

      {/* Bottom-right: Data timestamp */}
      {summaryData?.timestamp && (
        <div className="fixed bottom-4 right-4 z-30">
          <div className="glass-panel-dark px-3 py-1.5 text-[10px] text-muted-foreground font-mono">
            Updated: {new Date(summaryData.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Hover tooltip */}
      <HoverTooltip activities={summaryData?.countries || []} />

      {/* Side panel */}
      <SidePanel />
    </div>
  );
}
