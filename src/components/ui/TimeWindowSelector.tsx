// TimeWindowSelector - Time range selection

import { Clock } from 'lucide-react';
import { useGlobeStore } from '@/store/globeStore';
import { themes } from '@/lib/themes';
import type { TimeWindow } from '@/types/globe';
import { cn } from '@/lib/utils';

const TIME_OPTIONS: { value: TimeWindow; label: string }[] = [
  { value: '15m', label: '15m' },
  { value: '60m', label: '1h' },
  { value: '6h', label: '6h' },
];

export function TimeWindowSelector() {
  const { timeWindow, setTimeWindow, themeId } = useGlobeStore();
  const theme = themes[themeId];

  return (
    <div 
      className="inline-flex items-center gap-0.5 md:gap-1 p-0.5 md:p-1 rounded-lg border backdrop-blur-xl transition-colors"
      style={{
        background: theme.panelBg,
        borderColor: theme.panelBorder,
      }}
    >
      <Clock className="w-3 h-3 md:w-3.5 md:h-3.5 ml-1.5 md:ml-2" style={{ color: theme.accentColor }} />
      {TIME_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => setTimeWindow(option.value)}
          className="px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-medium rounded transition-all duration-200"
          style={{
            background: timeWindow === option.value ? theme.accentColor : 'transparent',
            color: timeWindow === option.value ? '#ffffff' : theme.textColor,
            opacity: timeWindow === option.value ? 1 : 0.6,
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
