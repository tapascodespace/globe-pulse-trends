// TrendingPanel - Top trending topics corner panel

import { useState } from 'react';
import { TrendingUp, ChevronDown, ChevronUp, Shield, AlertCircle, HelpCircle } from 'lucide-react';
import { useGlobeStore } from '@/store/globeStore';
import { themes } from '@/lib/themes';
import type { Topic, VerificationStatus } from '@/types/globe';
import { cn } from '@/lib/utils';

interface TrendingPanelProps {
  topics: Topic[];
  isLoading?: boolean;
}

function VerificationBadge({ status, accentColor }: { status: VerificationStatus; accentColor: string }) {
  const config = {
    verified: { icon: Shield, label: 'Verified', color: '#22c55e' },
    partially_verified: { icon: AlertCircle, label: 'Partial', color: '#f59e0b' },
    unverified: { icon: HelpCircle, label: 'Unverified', color: '#94a3b8' },
  };

  const { icon: Icon, label, color } = config[status];

  return (
    <span 
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider"
      style={{ background: `${color}20`, color }}
    >
      <Icon className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

export function TrendingPanel({ topics, isLoading }: TrendingPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { selectedTopicId, setSelectedTopicId, themeId } = useGlobeStore();
  const theme = themes[themeId];

  const displayedTopics = topics.slice(0, 15);

  return (
    <div 
      className="w-56 md:w-64 lg:w-72 max-h-[60vh] md:max-h-[70vh] flex flex-col rounded-xl border backdrop-blur-xl transition-colors duration-300"
      style={{
        background: theme.panelBg,
        borderColor: theme.panelBorder,
        color: theme.textColor,
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-3 border-b transition-colors"
        style={{ borderColor: theme.panelBorder }}
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: theme.accentColor }} />
          <span className="text-sm font-medium">Trending</span>
          <span className="text-xs opacity-50">({topics.length})</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 opacity-50" />
        ) : (
          <ChevronDown className="w-4 h-4 opacity-50" />
        )}
      </button>

      {/* Topics list */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div 
                className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: theme.accentColor, borderTopColor: 'transparent' }}
              />
            </div>
          ) : displayedTopics.length === 0 ? (
            <div className="text-center py-8 text-sm opacity-50">
              No trending topics
            </div>
          ) : (
            <div className="space-y-0.5">
              {displayedTopics.map((topic, index) => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={cn(
                    'w-full text-left p-2.5 rounded-lg transition-all duration-200',
                    selectedTopicId === topic.id
                      ? 'border'
                      : 'border border-transparent hover:opacity-80'
                  )}
                  style={{
                    background: selectedTopicId === topic.id ? `${theme.accentColor}15` : undefined,
                    borderColor: selectedTopicId === topic.id ? `${theme.accentColor}40` : 'transparent',
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono opacity-40 w-4 pt-0.5">
                      {index + 1}
                    </span>
                    
                    <div className="flex-1 min-w-0">
                      <span 
                        className={cn('text-sm font-medium truncate block')}
                        style={{ color: selectedTopicId === topic.id ? theme.accentColor : undefined }}
                      >
                        {topic.title}
                      </span>
                      
                      <div className="flex items-center gap-2 mt-1.5">
                        <div 
                          className="h-1 w-16 rounded-full overflow-hidden"
                          style={{ background: `${theme.accentColor}20` }}
                        >
                          <div 
                            className="h-full rounded-full"
                            style={{ 
                              width: `${topic.score * 100}%`,
                              background: theme.accentColor 
                            }}
                          />
                        </div>
                        <VerificationBadge status={topic.verification} accentColor={theme.accentColor} />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedTopicId && (
        <div 
          className="p-2 border-t text-center"
          style={{ borderColor: theme.panelBorder }}
        >
          <p className="text-xs opacity-50">Click again to deselect</p>
        </div>
      )}
    </div>
  );
}
