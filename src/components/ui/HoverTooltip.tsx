// HoverTooltip - Country hover tooltip

import { useGlobeStore } from '@/store/globeStore';
import { themes } from '@/lib/themes';
import type { CountryActivity } from '@/types/globe';

interface HoverTooltipProps {
  activities: CountryActivity[];
}

export function HoverTooltip({ activities }: HoverTooltipProps) {
  const { hoveredCountry, themeId } = useGlobeStore();
  const theme = themes[themeId];

  if (!hoveredCountry) return null;

  const activity = activities.find(a => a.iso2 === hoveredCountry.country.iso2);
  const { x, y } = hoveredCountry.position;

  return (
    <div
      className="fixed z-50 pointer-events-none animate-in fade-in duration-150"
      style={{
        left: x + 12,
        top: y - 8,
      }}
    >
      <div 
        className="px-3 py-2 min-w-[160px] rounded-lg border backdrop-blur-xl shadow-lg"
        style={{
          background: theme.panelBg,
          borderColor: theme.panelBorder,
          color: theme.textColor,
        }}
      >
        <div className="text-sm font-semibold">
          {hoveredCountry.country.name}
        </div>
        {activity && (
          <>
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="opacity-60">Activity</span>
              <span className="font-mono font-semibold" style={{ color: theme.accentColor }}>
                {(activity.activityScore * 100).toFixed(0)}%
              </span>
            </div>
            <div className="mt-1.5 text-xs opacity-60">
              Top: <span className="opacity-90 font-medium">{activity.topTopic}</span>
            </div>
            <div className="mt-2 pt-2 border-t text-xs text-center opacity-50" style={{ borderColor: theme.panelBorder }}>
              Click to see X feed
            </div>
          </>
        )}
      </div>
    </div>
  );
}
