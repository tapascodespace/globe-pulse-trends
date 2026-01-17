// TimeWindowSelector - Time range selection

import { Clock } from 'lucide-react';
import { useGlobeStore } from '@/store/globeStore';
import type { TimeWindow } from '@/types/globe';
import { cn } from '@/lib/utils';

const TIME_OPTIONS: { value: TimeWindow; label: string }[] = [
  { value: '15m', label: '15m' },
  { value: '60m', label: '1h' },
  { value: '6h', label: '6h' },
];

export function TimeWindowSelector() {
  const { timeWindow, setTimeWindow } = useGlobeStore();

  return (
    <div className="glass-panel inline-flex items-center gap-1 p-1 fade-in">
      <Clock className="w-3.5 h-3.5 text-muted-foreground ml-2" />
      {TIME_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => setTimeWindow(option.value)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded transition-all duration-200',
            timeWindow === option.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
