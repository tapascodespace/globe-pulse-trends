// XMaps Type Definitions

export type TimeWindow = '15m' | '60m' | '6h';

export type VerificationStatus = 'verified' | 'partially_verified' | 'unverified';

export interface Country {
  iso2: string;
  name: string;
  lat: number;
  lon: number;
}

export interface CountryActivity {
  iso2: string;
  name: string;
  activityScore: number;
  topTopic: string;
  topicCount: number;
}

export interface TopicArc {
  id: string;
  topicId: string;
  topicTitle: string;
  fromCountry: string;
  toCountry: string;
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  strength: number;
  verification: VerificationStatus;
}

export interface Topic {
  id: string;
  title: string;
  score: number;
  verification: VerificationStatus;
  relatedCountries: string[];
  grokSummary?: string;
}

export interface TopicDetail extends Topic {
  arcs: TopicArc[];
  evidence: EvidenceItem[];
}

export interface EvidenceItem {
  id: string;
  text: string;
  author: string;
  timestamp: string;
  engagement: number;
}

export interface CountryDetail {
  iso2: string;
  name: string;
  activityScore: number;
  topics: Topic[];
  evidence: EvidenceItem[];
}

export interface GlobalSummary {
  topics: Topic[];
  arcs: TopicArc[];
  countries: CountryActivity[];
  timestamp: string;
}

export interface LiveUpdate {
  type: 'topic_update' | 'arc_update' | 'country_update' | 'full_sync';
  data: Topic | TopicArc | CountryActivity | FullSyncData;
  timestamp: string;
}

export interface FullSyncData {
  topics?: Topic[];
  countries?: CountryActivity[];
  arcs?: TopicArc[];
}

// Visual mapping helpers
export function getArcStrengthTier(strength: number): 'high' | 'medium' | 'low' {
  if (strength >= 0.75) return 'high';
  if (strength >= 0.40) return 'medium';
  return 'low';
}

export function getArcVisualConfig(strength: number) {
  const tier = getArcStrengthTier(strength);
  
  switch (tier) {
    case 'high':
      return {
        thickness: 2.5,
        opacity: 0.9,
        pulseSpeed: 0.8,
        glowIntensity: 1.0,
        color: '#00e5ff',
      };
    case 'medium':
      return {
        thickness: 1.5,
        opacity: 0.6,
        pulseSpeed: 1.2,
        glowIntensity: 0.5,
        color: '#00b8cc',
      };
    case 'low':
      return {
        thickness: 0.8,
        opacity: 0.25,
        pulseSpeed: 2.0,
        glowIntensity: 0.2,
        color: '#006677',
      };
  }
}

export function getMarkerVisualConfig(activityScore: number) {
  const normalized = Math.min(1, Math.max(0, activityScore));
  
  return {
    size: 0.02 + normalized * 0.04,
    glowSize: 0.03 + normalized * 0.06,
    opacity: 0.4 + normalized * 0.5,
    showHalo: normalized > 0.8,
  };
}
