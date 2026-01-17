// ThemeSelector - Color scheme picker

import { Palette } from 'lucide-react';
import { useGlobeStore } from '@/store/globeStore';
import { themes, themeList, type ThemeId } from '@/lib/themes';
import { cn } from '@/lib/utils';

export function ThemeSelector() {
  const { themeId, setThemeId } = useGlobeStore();
  const currentTheme = themes[themeId];

  return (
    <div 
      className="inline-flex items-center gap-1 p-1 rounded-lg backdrop-blur-xl border transition-colors"
      style={{
        background: currentTheme.panelBg,
        borderColor: currentTheme.panelBorder,
      }}
    >
      <Palette 
        className="w-3.5 h-3.5 ml-2" 
        style={{ color: currentTheme.accentColor }}
      />
      {themeList.map((theme) => (
        <button
          key={theme.id}
          onClick={() => setThemeId(theme.id)}
          className={cn(
            'w-6 h-6 rounded-md transition-all duration-200 border-2',
            themeId === theme.id 
              ? 'scale-110 shadow-lg' 
              : 'hover:scale-105 opacity-70 hover:opacity-100'
          )}
          style={{
            background: theme.id === 'light' 
              ? `linear-gradient(135deg, ${theme.background} 50%, ${theme.accentColor} 50%)`
              : `linear-gradient(135deg, ${theme.globeSurface} 50%, ${theme.accentColor} 50%)`,
            borderColor: themeId === theme.id ? theme.accentColor : 'transparent',
          }}
          title={theme.name}
        />
      ))}
    </div>
  );
}
