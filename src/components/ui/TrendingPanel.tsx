// TrendingPanel - Top trending topics corner panel

import { useState } from 'react';
import { TrendingUp, ChevronDown, ChevronUp, Shield, AlertCircle, HelpCircle } from 'lucide-react';
import { useGlobeStore } from '@/store/globeStore';
import type { Topic, VerificationStatus } from '@/types/globe';
import { cn } from '@/lib/utils';

interface TrendingPanelProps {
  topics: Topic[];
  isLoading?: boolean;
}

function VerificationBadge({ status }: { status: VerificationStatus }) {
  const config = {
    verified: {
      icon: Shield,
      className: 'verification-badge verification-verified',
      label: 'Verified',
    },
    partially_verified: {
      icon: AlertCircle,
      className: 'verification-badge verification-partial',
      label: 'Partial',
    },
    unverified: {
      icon: HelpCircle,
      className: 'verification-badge verification-unverified',
      label: 'Unverified',
    },
  };

  const { icon: Icon, className, label } = config[status];

  return (
    <span className={className}>
      <Icon className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

function TrendStrengthBar({ score }: { score: number }) {
  return (
    <div className="trend-bar w-16">
      <div 
        className="trend-bar-fill" 
        style={{ width: `${Math.min(100, score * 100)}%` }}
      />
    </div>
  );
}

export function TrendingPanel({ topics, isLoading }: TrendingPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { selectedTopicId, setSelectedTopicId } = useGlobeStore();

  // Show top 15 topics
  const displayedTopics = topics.slice(0, 15);

  return (
    <div className="glass-panel w-72 max-h-[70vh] flex flex-col fade-in">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-3 border-b border-border/30 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Trending</span>
          <span className="text-xs text-muted-foreground">
            ({topics.length})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Topics list */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto scrollbar-thin p-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : displayedTopics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No trending topics
            </div>
          ) : (
            <div className="space-y-0.5">
              {displayedTopics.map((topic, index) => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={cn(
                    'w-full text-left p-2.5 rounded-md transition-all duration-200',
                    'hover:bg-muted/50',
                    selectedTopicId === topic.id
                      ? 'bg-primary/10 border border-primary/30'
                      : 'border border-transparent'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {/* Rank number */}
                    <span className="text-xs font-mono text-muted-foreground w-4 pt-0.5">
                      {index + 1}
                    </span>
                    
                    <div className="flex-1 min-w-0">
                      {/* Topic title */}
                      <div className="flex items-center gap-2">
                        <span 
                          className={cn(
                            'text-sm font-medium truncate',
                            selectedTopicId === topic.id ? 'text-primary' : 'text-foreground'
                          )}
                        >
                          {topic.title}
                        </span>
                      </div>
                      
                      {/* Score bar and verification */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <TrendStrengthBar score={topic.score} />
                        <VerificationBadge status={topic.verification} />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected topic hint */}
      {selectedTopicId && (
        <div className="p-2 border-t border-border/30 bg-primary/5">
          <p className="text-xs text-muted-foreground text-center">
            Click again to deselect
          </p>
        </div>
      )}
    </div>
  );
}
