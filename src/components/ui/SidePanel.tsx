// SidePanel - Country/Topic details panel

import { X, MapPin, TrendingUp, MessageSquare, Shield, AlertCircle, HelpCircle, ExternalLink } from 'lucide-react';
import { useGlobeStore } from '@/store/globeStore';
import { useCountryDetail, useTopicDetail } from '@/hooks/useGlobeData';
import type { VerificationStatus, EvidenceItem, Topic } from '@/types/globe';
import { cn } from '@/lib/utils';

function VerificationIcon({ status }: { status: VerificationStatus }) {
  const icons = {
    verified: <Shield className="w-3.5 h-3.5 text-emerald-400" />,
    partially_verified: <AlertCircle className="w-3.5 h-3.5 text-amber-400" />,
    unverified: <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />,
  };
  return icons[status];
}

function EvidenceCard({ item }: { item: EvidenceItem }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
      <p className="text-sm text-foreground/90 leading-relaxed">{item.text}</p>
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span>{item.author}</span>
        <div className="flex items-center gap-3">
          <span>{item.timestamp}</span>
          <span className="text-primary">{(item.engagement / 1000).toFixed(1)}k</span>
        </div>
      </div>
    </div>
  );
}

function TopicListItem({ topic, onClick }: { topic: Topic; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-2.5 rounded-md bg-muted/20 hover:bg-muted/40 border border-border/20 transition-colors"
    >
      <div className="flex items-center gap-2">
        <VerificationIcon status={topic.verification} />
        <span className="text-sm font-medium text-foreground truncate">{topic.title}</span>
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <div className="trend-bar w-20">
          <div 
            className="trend-bar-fill" 
            style={{ width: `${Math.min(100, topic.score * 100)}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {topic.relatedCountries?.length || 0} regions
        </span>
      </div>
    </button>
  );
}

export function SidePanel() {
  const { 
    selectedCountry, 
    selectedTopicId,
    timeWindow,
    sidePanelOpen,
    showDetailedTopicView,
    setSelectedCountry,
    setSelectedTopicId,
    setSidePanelOpen,
    setShowDetailedTopicView,
  } = useGlobeStore();

  const { data: countryData, isLoading: countryLoading } = useCountryDetail(
    selectedCountry?.iso2 || null,
    timeWindow
  );

  const { data: topicData, isLoading: topicLoading } = useTopicDetail(
    showDetailedTopicView ? selectedTopicId : null
  );

  if (!sidePanelOpen && !showDetailedTopicView) return null;

  const isLoading = countryLoading || topicLoading;
  const showTopicDetail = showDetailedTopicView && topicData;
  const showCountryDetail = !showDetailedTopicView && countryData;

  const handleClose = () => {
    setSidePanelOpen(false);
    setSelectedCountry(null);
    if (showDetailedTopicView) {
      setShowDetailedTopicView(false);
    }
  };

  const handleTopicClick = (topicId: string) => {
    setSelectedTopicId(topicId);
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 glass-panel rounded-none border-l border-border/30 slide-in-right z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div className="flex items-center gap-2">
          {showTopicDetail ? (
            <>
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium truncate max-w-[250px]">
                {topicData.title}
              </span>
            </>
          ) : showCountryDetail ? (
            <>
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{countryData.name}</span>
            </>
          ) : (
            <span className="text-sm font-medium text-muted-foreground">Details</span>
          )}
        </div>
        <button
          onClick={handleClose}
          className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : showTopicDetail ? (
          <div className="space-y-6">
            {/* Grok Summary */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                AI Summary
              </h3>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {topicData.grokSummary}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/20 border border-border/20">
                <div className="text-xs text-muted-foreground mb-1">Trend Score</div>
                <div className="text-lg font-semibold text-primary">
                  {(topicData.score * 100).toFixed(0)}%
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/20 border border-border/20">
                <div className="text-xs text-muted-foreground mb-1">Regions</div>
                <div className="text-lg font-semibold text-foreground">
                  {topicData.relatedCountries?.length || 0}
                </div>
              </div>
            </div>

            {/* Related Countries */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Top Regions
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {topicData.relatedCountries?.slice(0, 8).map(iso => (
                  <span 
                    key={iso}
                    className="px-2 py-1 text-xs bg-muted/30 rounded border border-border/30 text-foreground/80"
                  >
                    {iso}
                  </span>
                ))}
              </div>
            </div>

            {/* Evidence */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" />
                Evidence ({topicData.evidence?.length || 0})
              </h3>
              <div className="space-y-2">
                {topicData.evidence?.map(item => (
                  <EvidenceCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </div>
        ) : showCountryDetail ? (
          <div className="space-y-6">
            {/* Activity Score */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-transparent border border-primary/20">
              <div className="text-xs text-muted-foreground mb-1">Activity Score</div>
              <div className="text-2xl font-semibold text-primary">
                {(countryData.activityScore * 100).toFixed(0)}%
              </div>
              <div className="trend-bar w-full mt-2">
                <div 
                  className="trend-bar-fill" 
                  style={{ width: `${countryData.activityScore * 100}%` }}
                />
              </div>
            </div>

            {/* Topics */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Topics ({countryData.topics?.length || 0})
              </h3>
              <div className="space-y-2">
                {countryData.topics?.slice(0, 8).map(topic => (
                  <TopicListItem 
                    key={topic.id} 
                    topic={topic} 
                    onClick={() => handleTopicClick(topic.id)}
                  />
                ))}
              </div>
            </div>

            {/* Evidence */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" />
                Recent Posts
              </h3>
              <div className="space-y-2">
                {countryData.evidence?.map(item => (
                  <EvidenceCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Select a country or topic to see details
          </div>
        )}
      </div>
    </div>
  );
}
