import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useColorScheme, View } from 'react-native';

export type Theme = 'light' | 'dark';
export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
  isDark: boolean;
  colors: ColorScheme;
}

interface ColorScheme {
  background: string;
  text: string;
  primary: string;
  secondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  surface?: string;
}

const lightColors: ColorScheme = {
  background: '#ffffff',
  text: '#111827',
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  border: '#e5e7eb',
  error: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#0ea5e9',
  surface: '#f9fafb',
};

const darkColors: ColorScheme = {
  background: '#1f2937',
  text: '#f3f4f6',
  primary: '#60a5fa',
  secondary: '#a78bfa',
  border: '#374151',
  error: '#f87171',
  success: '#34d399',
  warning: '#fbbf24',
  info: '#38bdf8',
  surface: '#111827',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [mounted, setMounted] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem('themePreference');
        if (!mountedRef.current) return;
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setPreference(saved);
        }
      } catch {
        // Silently fall back to system theme if preference cannot be loaded
      } finally {
        if (mountedRef.current) setMounted(true);
      }
    };

    void loadTheme();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const setThemePreference = async (newPreference: ThemePreference) => {
    setPreference(newPreference);
    try {
      await AsyncStorage.setItem('themePreference', newPreference);
    } catch {
      // Silently ignore storage write failures — preference will reset on next launch
    }
  };

  const resolvedTheme: Theme =
    preference === 'system' ? (systemColorScheme === 'dark' ? 'dark' : 'light') : preference;

  const toggleTheme = () => {
    void setThemePreference(resolvedTheme === 'light' ? 'dark' : 'light');
  };

  const isDark = resolvedTheme === 'dark';

  if (!mounted) {
    const bg = systemColorScheme === 'dark' ? darkColors.background : lightColors.background;
    return <View style={{ flex: 1, backgroundColor: bg }} />;
  }

  return (
    <ThemeContext.Provider
      value={{
        theme: resolvedTheme,
        themePreference: preference,
        setThemePreference,
        toggleTheme,
        isDark,
        colors: isDark ? darkColors : lightColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
