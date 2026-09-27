import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useColorScheme, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
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
        if (__DEV__) console.warn('Failed to load theme preference');
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
      if (__DEV__) console.warn('Failed to save theme preference');
    }
  };

  const resolvedTheme: Theme =
    preference === 'system'
      ? systemColorScheme === 'dark'
        ? 'dark'
        : 'light'
      : preference;

  const toggleTheme = () => {
    setThemePreference(resolvedTheme === 'light' ? 'dark' : 'light');
  };

  const isDark = resolvedTheme === 'dark';

  if (!mounted) {
    // Render an opaque background matching the system color scheme to prevent
    // a white flash before the async theme preference is resolved.
    const bg = systemColorScheme === 'dark' ? darkColors.background : lightColors.background;
    return <View style={{ flex: 1, backgroundColor: bg }} />;
  }
  if (!mounted) return null;

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
