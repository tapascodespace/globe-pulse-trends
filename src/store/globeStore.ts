// XMaps Globe State Store - UI state management

import { create } from 'zustand';
import type { TimeWindow, Country } from '@/types/globe';

interface GlobeState {
  // Time window selection
  timeWindow: TimeWindow;
  setTimeWindow: (window: TimeWindow) => void;

  // Selected topic for highlighting
  selectedTopicId: string | null;
  setSelectedTopicId: (id: string | null) => void;

  // Selected country for side panel
  selectedCountry: Country | null;
  setSelectedCountry: (country: Country | null) => void;

  // Hovered country for tooltip
  hoveredCountry: { country: Country; position: { x: number; y: number } } | null;
  setHoveredCountry: (data: { country: Country; position: { x: number; y: number } } | null) => void;

  // Arc popover state
  hoveredArc: { arcId: string; position: { x: number; y: number } } | null;
  setHoveredArc: (data: { arcId: string; position: { x: number; y: number } } | null) => void;

  // Side panel state
  sidePanelOpen: boolean;
  setSidePanelOpen: (open: boolean) => void;

  // View state
  showDetailedTopicView: boolean;
  setShowDetailedTopicView: (show: boolean) => void;

  // Clear all selections
  clearSelections: () => void;
}

export const useGlobeStore = create<GlobeState>((set) => ({
  timeWindow: '60m',
  setTimeWindow: (window) => set({ timeWindow: window }),

  selectedTopicId: null,
  setSelectedTopicId: (id) => set((state) => ({
    selectedTopicId: state.selectedTopicId === id ? null : id,
    showDetailedTopicView: state.selectedTopicId !== id && id !== null,
  })),

  selectedCountry: null,
  setSelectedCountry: (country) => set({ 
    selectedCountry: country, 
    sidePanelOpen: country !== null,
  }),

  hoveredCountry: null,
  setHoveredCountry: (data) => set({ hoveredCountry: data }),

  hoveredArc: null,
  setHoveredArc: (data) => set({ hoveredArc: data }),

  sidePanelOpen: false,
  setSidePanelOpen: (open) => set({ 
    sidePanelOpen: open,
    selectedCountry: open ? undefined : null,
  }),

  showDetailedTopicView: false,
  setShowDetailedTopicView: (show) => set({ showDetailedTopicView: show }),

  clearSelections: () => set({
    selectedTopicId: null,
    selectedCountry: null,
    hoveredCountry: null,
    hoveredArc: null,
    sidePanelOpen: false,
    showDetailedTopicView: false,
  }),
}));
