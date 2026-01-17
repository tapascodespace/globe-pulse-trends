// SidePanel - Country X feed panel (LEFT side)

import { X, MapPin, TrendingUp, MessageSquare, Users, Clock, Heart, Repeat2, ExternalLink } from 'lucide-react';
import { useGlobeStore } from '@/store/globeStore';
import { useCountryDetail, useTopicDetail } from '@/hooks/useGlobeData';
import { themes } from '@/lib/themes';
import type { VerificationStatus, EvidenceItem, Topic } from '@/types/globe';
import { cn } from '@/lib/utils';

function XPostCard({ item, accentColor }: { item: EvidenceItem; accentColor: string }) {
  return (
    <div className="p-4 rounded-xl border transition-all hover:shadow-md" style={{ borderColor: `${accentColor}20` }}>
      <div className="flex items-start gap-3">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={{ background: accentColor }}
        >
          {item.author.replace('@', '').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{item.author}</span>
            <span className="text-xs opacity-50">· {item.timestamp}</span>
          </div>
          <p className="mt-1 text-sm leading-relaxed opacity-90">{item.text}</p>
          <div className="flex items-center gap-4 mt-3 text-xs opacity-60">
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              {(item.engagement / 1000).toFixed(1)}k
            </span>
            <span className="flex items-center gap-1">
              <Repeat2 className="w-3.5 h-3.5" />
              {Math.floor(item.engagement / 4000)}k
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              {Math.floor(item.engagement / 8000)}k
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopicCard({ 
  topic, 
  onClick, 
  accentColor 
}: { 
  topic: Topic; 
  onClick: () => void; 
  accentColor: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-xl border transition-all hover:shadow-md"
      style={{ borderColor: `${accentColor}30` }}
    >
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4" style={{ color: accentColor }} />
        <span className="font-medium text-sm">{topic.title}</span>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: `${accentColor}20` }}>
          <div 
            className="h-full rounded-full transition-all"
            style={{ 
              width: `${topic.score * 100}%`,
              background: accentColor 
            }}
          />
        </div>
        <span className="text-xs opacity-60">{(topic.score * 100).toFixed(0)}%</span>
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
    themeId,
    setSelectedCountry,
    setSelectedTopicId,
    setSidePanelOpen,
    setShowDetailedTopicView,
  } = useGlobeStore();

  const theme = themes[themeId];

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
    <div 
      className="fixed left-0 top-0 bottom-0 w-[400px] z-40 flex flex-col border-r backdrop-blur-xl animate-in slide-in-from-left duration-300"
      style={{
        background: theme.panelBg,
        borderColor: theme.panelBorder,
        color: theme.textColor,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: theme.panelBorder }}>
        <div className="flex items-center gap-3">
          {showTopicDetail ? (
            <>
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${theme.accentColor}20` }}
              >
                <TrendingUp className="w-5 h-5" style={{ color: theme.accentColor }} />
              </div>
              <div>
                <h2 className="font-semibold text-base truncate max-w-[260px]">{topicData.title}</h2>
                <p className="text-xs opacity-60">Trending Topic</p>
              </div>
            </>
          ) : showCountryDetail ? (
            <>
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${theme.accentColor}20` }}
              >
                <MapPin className="w-5 h-5" style={{ color: theme.accentColor }} />
              </div>
              <div>
                <h2 className="font-semibold text-base">{countryData.name}</h2>
                <p className="text-xs opacity-60">What's happening</p>
              </div>
            </>
          ) : null}
        </div>
        <button
          onClick={handleClose}
          className="p-2 rounded-lg transition-colors hover:opacity-70"
          style={{ background: `${theme.accentColor}10` }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div 
              className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: theme.accentColor, borderTopColor: 'transparent' }}
            />
          </div>
        ) : showTopicDetail ? (
          <div className="space-y-5">
            {/* Grok Summary */}
            <div 
              className="p-4 rounded-xl"
              style={{ background: `${theme.accentColor}10` }}
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-2">
                AI Summary
              </h3>
              <p className="text-sm leading-relaxed">{topicData.grokSummary}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border" style={{ borderColor: `${theme.accentColor}20` }}>
                <div className="text-xs opacity-60 mb-1">Trend Score</div>
                <div className="text-2xl font-bold" style={{ color: theme.accentColor }}>
                  {(topicData.score * 100).toFixed(0)}%
                </div>
              </div>
              <div className="p-4 rounded-xl border" style={{ borderColor: `${theme.accentColor}20` }}>
                <div className="text-xs opacity-60 mb-1">Countries</div>
                <div className="text-2xl font-bold">
                  {topicData.relatedCountries?.length || 0}
                </div>
              </div>
            </div>

            {/* X Posts */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                From X
              </h3>
              <div className="space-y-3">
                {topicData.evidence?.map(item => (
                  <XPostCard key={item.id} item={item} accentColor={theme.accentColor} />
                ))}
              </div>
            </div>
          </div>
        ) : showCountryDetail ? (
          <div className="space-y-5">
            {/* Activity Score */}
            <div 
              className="p-4 rounded-xl"
              style={{ background: `${theme.accentColor}15` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-60">Activity Level</span>
                <span className="text-lg font-bold" style={{ color: theme.accentColor }}>
                  {(countryData.activityScore * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: `${theme.accentColor}20` }}>
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${countryData.activityScore * 100}%`,
                    background: theme.accentColor 
                  }}
                />
              </div>
            </div>

            {/* Trending Topics */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Trending in {countryData.name}
              </h3>
              <div className="space-y-2">
                {countryData.topics?.slice(0, 6).map(topic => (
                  <TopicCard 
                    key={topic.id} 
                    topic={topic} 
                    onClick={() => handleTopicClick(topic.id)}
                    accentColor={theme.accentColor}
                  />
                ))}
              </div>
            </div>

            {/* X Feed */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Live from X
              </h3>
              <div className="space-y-3">
                {countryData.evidence?.map(item => (
                  <XPostCard key={item.id} item={item} accentColor={theme.accentColor} />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
