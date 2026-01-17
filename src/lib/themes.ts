// Theme/Color scheme definitions

export type ThemeId = 'light' | 'dark' | 'ocean' | 'sunset' | 'forest';

export interface GlobeTheme {
  id: ThemeId;
  name: string;
  background: string;
  globeSurface: string;
  gridColor: string;
  borderColor: string;
  accentColor: string;
  textColor: string;
  panelBg: string;
  panelBorder: string;
  arcColor: string;
  markerColor: string;
}

export const themes: Record<ThemeId, GlobeTheme> = {
  light: {
    id: 'light',
    name: 'Space',
    background: '#000408',
    globeSurface: '#0a0e14',
    gridColor: '#1a2535',
    borderColor: '#4dd0e1',
    accentColor: '#00bcd4',
    textColor: '#e2e8f0',
    panelBg: 'rgba(8, 12, 20, 0.95)',
    panelBorder: 'rgba(77, 208, 225, 0.3)',
    arcColor: '#00bcd4',
    markerColor: '#00e5ff',
  },
  dark: {
    id: 'dark',
    name: 'Neon',
    background: '#000510',
    globeSurface: '#050a15',
    gridColor: '#0f1a30',
    borderColor: '#00ffff',
    accentColor: '#00ffff',
    textColor: '#e2e8f0',
    panelBg: 'rgba(5, 10, 21, 0.95)',
    panelBorder: 'rgba(0, 255, 255, 0.3)',
    arcColor: '#00ffff',
    markerColor: '#00ffff',
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    background: '#0c1929',
    globeSurface: '#0f2942',
    gridColor: '#1e4976',
    borderColor: '#38bdf8',
    accentColor: '#38bdf8',
    textColor: '#e0f2fe',
    panelBg: 'rgba(12, 25, 41, 0.9)',
    panelBorder: 'rgba(56, 189, 248, 0.2)',
    arcColor: '#38bdf8',
    markerColor: '#38bdf8',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    background: '#1a1520',
    globeSurface: '#2d1f2d',
    gridColor: '#4a3545',
    borderColor: '#f97316',
    accentColor: '#f97316',
    textColor: '#fef3c7',
    panelBg: 'rgba(26, 21, 32, 0.9)',
    panelBorder: 'rgba(249, 115, 22, 0.2)',
    arcColor: '#fb923c',
    markerColor: '#f97316',
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    background: '#0f1a14',
    globeSurface: '#152419',
    gridColor: '#1f3d2a',
    borderColor: '#22c55e',
    accentColor: '#22c55e',
    textColor: '#dcfce7',
    panelBg: 'rgba(15, 26, 20, 0.9)',
    panelBorder: 'rgba(34, 197, 94, 0.2)',
    arcColor: '#4ade80',
    markerColor: '#22c55e',
  },
};

export const themeList = Object.values(themes);
