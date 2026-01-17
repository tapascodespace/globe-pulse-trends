// XMaps - GlobePulse Visualization

import { GlobeScene } from '@/components/globe/GlobeScene';
import { TrendingPanel } from '@/components/ui/TrendingPanel';
import { TimeWindowSelector } from '@/components/ui/TimeWindowSelector';
import { ThemeSelector } from '@/components/ui/ThemeSelector';
import { HoverTooltip } from '@/components/ui/HoverTooltip';
import { SidePanel } from '@/components/ui/SidePanel';
import { Legend } from '@/components/ui/Legend';
import { useGlobeStore } from '@/store/globeStore';
import { themes } from '@/lib/themes';
import { useGlobalSummary, useCountries } from '@/hooks/useGlobeData';
import { useLiveFeed } from '@/hooks/useLiveFeed';

export default function Index() {
  const { timeWindow, themeId } = useGlobeStore();
  const theme = themes[themeId];
  
  const { data: summaryData, isLoading: summaryLoading } = useGlobalSummary(timeWindow);
  const { data: countriesData, isLoading: countriesLoading } = useCountries();
  
  useLiveFeed({ 
    window: timeWindow, 
    connectionType: 'sse',
    enabled: true 
  });

  const isLoading = summaryLoading || countriesLoading;
  const countries = countriesData || [];

  return (
    <div 
      className="relative h-screen w-screen overflow-hidden transition-colors duration-500"
      style={{ background: theme.background }}
    >
      {/* 3D Globe */}
      <GlobeScene 
        data={summaryData} 
        countries={countries}
        isLoading={isLoading}
      />
      
      {/* Top-left: Brand + Controls */}
      <div className="fixed top-4 left-4 z-30 flex flex-col gap-3">
        <div 
          className="px-4 py-2.5 rounded-xl border backdrop-blur-xl flex items-center gap-3 transition-colors"
          style={{
            background: theme.panelBg,
            borderColor: theme.panelBorder,
          }}
        >
          <div 
            className="w-2.5 h-2.5 rounded-full animate-pulse"
            style={{ background: theme.accentColor }}
          />
          <span className="text-lg font-bold tracking-tight" style={{ color: theme.textColor }}>
            XMaps
          </span>
          <span className="text-xs font-light opacity-50" style={{ color: theme.textColor }}>
            GlobePulse
          </span>
        </div>
        <TimeWindowSelector />
        <ThemeSelector />
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

      {/* Bottom-right: Timestamp */}
      {summaryData?.timestamp && (
        <div className="fixed bottom-4 right-4 z-30">
          <div 
            className="px-3 py-1.5 text-[10px] font-mono rounded-lg border backdrop-blur-xl transition-colors"
            style={{
              background: theme.panelBg,
              borderColor: theme.panelBorder,
              color: theme.textColor,
              opacity: 0.7,
            }}
          >
            Updated: {new Date(summaryData.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Hover tooltip */}
      <HoverTooltip activities={summaryData?.countries || []} />

      {/* Side panel - LEFT side */}
      <SidePanel />
    </div>
  );
}
