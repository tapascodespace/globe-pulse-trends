// HoverTooltip - Country hover tooltip

import { useGlobeStore } from '@/store/globeStore';
import type { CountryActivity } from '@/types/globe';

interface HoverTooltipProps {
  activities: CountryActivity[];
}

export function HoverTooltip({ activities }: HoverTooltipProps) {
  const { hoveredCountry } = useGlobeStore();

  if (!hoveredCountry) return null;

  const activity = activities.find(a => a.iso2 === hoveredCountry.country.iso2);
  const { x, y } = hoveredCountry.position;

  return (
    <div
      className="fixed z-50 pointer-events-none fade-in"
      style={{
        left: x + 12,
        top: y - 8,
      }}
    >
      <div className="glass-panel-dark px-3 py-2 min-w-[140px]">
        <div className="text-sm font-medium text-foreground">
          {hoveredCountry.country.name}
        </div>
        {activity && (
          <>
            <div className="flex items-center justify-between mt-1.5 text-xs">
              <span className="text-muted-foreground">Activity</span>
              <span className="text-primary font-mono">
                {(activity.activityScore * 100).toFixed(0)}%
              </span>
            </div>
            <div className="mt-1.5 text-xs text-muted-foreground">
              Top: <span className="text-foreground/80">{activity.topTopic}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
