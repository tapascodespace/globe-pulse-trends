// Legend - Small legend for visual meanings

import { useGlobeStore } from '@/store/globeStore';
import { themes } from '@/lib/themes';

export function Legend() {
  const { themeId } = useGlobeStore();
  const theme = themes[themeId];

  return (
    <div 
      className="px-2 py-1.5 md:px-3 md:py-2 rounded-lg border backdrop-blur-xl transition-colors"
      style={{
        background: theme.panelBg,
        borderColor: theme.panelBorder,
        color: theme.textColor,
      }}
    >
      <div className="flex items-center gap-3 md:gap-4 text-[9px] md:text-[10px] opacity-60">
        <div className="flex items-center gap-1 md:gap-1.5">
          <div 
            className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full animate-pulse"
            style={{ background: theme.accentColor }}
          />
          <span>Activity</span>
        </div>
        <div className="flex items-center gap-1 md:gap-1.5">
          <div 
            className="w-3 md:w-4 h-0.5 rounded-full"
            style={{ background: theme.accentColor }}
          />
          <span>Topic Flow</span>
        </div>
      </div>
    </div>
  );
}
