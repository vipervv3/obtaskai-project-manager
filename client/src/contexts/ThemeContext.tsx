import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark' | 'system';
  primaryColor: string;
  compactMode: boolean;
  animationsEnabled: boolean;
  fontSize: 'small' | 'medium' | 'large';
  sidebarPosition: 'left' | 'right';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setPrimaryColor: (color: string) => void;
  setCompactMode: (compact: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setSidebarPosition: (position: 'left' | 'right') => void;
  applyTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark' | 'system') || 'system';
  });

  const [primaryColor, setPrimaryColorState] = useState(() => {
    return localStorage.getItem('primaryColor') || '#3B82F6';
  });

  const [compactMode, setCompactModeState] = useState(() => {
    return localStorage.getItem('compactMode') === 'true';
  });

  const [animationsEnabled, setAnimationsEnabledState] = useState(() => {
    return localStorage.getItem('animationsEnabled') !== 'false';
  });

  const [fontSize, setFontSizeState] = useState<'small' | 'medium' | 'large'>(() => {
    const saved = localStorage.getItem('fontSize');
    return (saved as 'small' | 'medium' | 'large') || 'medium';
  });

  const [sidebarPosition, setSidebarPositionState] = useState<'left' | 'right'>(() => {
    const saved = localStorage.getItem('sidebarPosition');
    return (saved as 'left' | 'right') || 'left';
  });

  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const setPrimaryColor = (color: string) => {
    setPrimaryColorState(color);
    localStorage.setItem('primaryColor', color);
  };

  const setCompactMode = (compact: boolean) => {
    setCompactModeState(compact);
    localStorage.setItem('compactMode', compact.toString());
  };

  const setAnimationsEnabled = (enabled: boolean) => {
    setAnimationsEnabledState(enabled);
    localStorage.setItem('animationsEnabled', enabled.toString());
  };

  const setFontSize = (size: 'small' | 'medium' | 'large') => {
    setFontSizeState(size);
    localStorage.setItem('fontSize', size);
  };

  const setSidebarPosition = (position: 'left' | 'right') => {
    setSidebarPositionState(position);
    localStorage.setItem('sidebarPosition', position);
  };

  const applyTheme = () => {
    const root = document.documentElement;
    
    // Apply theme
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    // Apply primary color as CSS custom properties
    const primaryRGB = hexToRgb(primaryColor);
    if (primaryRGB) {
      root.style.setProperty('--primary-50', `rgb(${lighten(primaryRGB, 0.9)})`);
      root.style.setProperty('--primary-100', `rgb(${lighten(primaryRGB, 0.8)})`);
      root.style.setProperty('--primary-200', `rgb(${lighten(primaryRGB, 0.6)})`);
      root.style.setProperty('--primary-300', `rgb(${lighten(primaryRGB, 0.4)})`);
      root.style.setProperty('--primary-400', `rgb(${lighten(primaryRGB, 0.2)})`);
      root.style.setProperty('--primary-500', primaryColor);
      root.style.setProperty('--primary-600', `rgb(${darken(primaryRGB, 0.1)})`);
      root.style.setProperty('--primary-700', `rgb(${darken(primaryRGB, 0.2)})`);
      root.style.setProperty('--primary-800', `rgb(${darken(primaryRGB, 0.3)})`);
      root.style.setProperty('--primary-900', `rgb(${darken(primaryRGB, 0.4)})`);
    }

    // Apply font size
    switch (fontSize) {
      case 'small':
        root.classList.remove('text-medium', 'text-large');
        root.classList.add('text-small');
        break;
      case 'large':
        root.classList.remove('text-small', 'text-medium');
        root.classList.add('text-large');
        break;
      default:
        root.classList.remove('text-small', 'text-large');
        root.classList.add('text-medium');
        break;
    }

    // Apply compact mode
    if (compactMode) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }

    // Apply animations
    if (!animationsEnabled) {
      root.classList.add('no-animations');
    } else {
      root.classList.remove('no-animations');
    }

    // Apply sidebar position
    if (sidebarPosition === 'right') {
      root.classList.add('sidebar-right');
    } else {
      root.classList.remove('sidebar-right');
    }
  };

  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const lighten = (rgb: { r: number; g: number; b: number }, factor: number) => {
    return {
      r: Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor)),
      g: Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor)),
      b: Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor))
    };
  };

  const darken = (rgb: { r: number; g: number; b: number }, factor: number) => {
    return {
      r: Math.max(0, Math.round(rgb.r * (1 - factor))),
      g: Math.max(0, Math.round(rgb.g * (1 - factor))),
      b: Math.max(0, Math.round(rgb.b * (1 - factor)))
    };
  };

  // Apply theme on mount and when theme changes
  useEffect(() => {
    applyTheme();
  }, [theme, primaryColor, fontSize, compactMode, animationsEnabled, sidebarPosition]);

  // Force apply theme on mount to ensure it's set correctly
  useEffect(() => {
    applyTheme();
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme();
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const value: ThemeContextType = {
    theme,
    primaryColor,
    compactMode,
    animationsEnabled,
    fontSize,
    sidebarPosition,
    setTheme,
    setPrimaryColor,
    setCompactMode,
    setAnimationsEnabled,
    setFontSize,
    setSidebarPosition,
    applyTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};