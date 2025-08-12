/**
 * Theme Provider
 * Main theme provider component with state management and persistence
 */

import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContextProvider, ThemeContextType } from './ThemeContext';
import { Theme, ThemeMode, lightTheme, darkTheme } from './theme';

const THEME_STORAGE_KEY = '@biometrics_playground:theme_mode';

export interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [isLoading, setIsLoading] = useState(true);

  // Get current theme based on mode
  const getCurrentTheme = useCallback((mode: ThemeMode): Theme => {
    return mode === 'dark' ? darkTheme : lightTheme;
  }, []);

  // Load theme preference from storage
  const loadThemePreference = useCallback(async (): Promise<ThemeMode> => {
    try {
      const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark')) {
        return storedTheme as ThemeMode;
      }
    } catch (error) {
      console.warn('Failed to load theme preference:', error);
    }
    
    // Fallback to system preference or light theme
    return systemColorScheme === 'dark' ? 'dark' : 'light';
  }, [systemColorScheme]);

  // Save theme preference to storage
  const saveThemePreference = useCallback(async (mode: ThemeMode): Promise<void> => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  }, []);

  // Set theme mode and persist
  const setTheme = useCallback(async (mode: ThemeMode): Promise<void> => {
    setThemeMode(mode);
    await saveThemePreference(mode);
  }, [saveThemePreference]);

  // Toggle between light and dark themes
  const toggleTheme = useCallback(async (): Promise<void> => {
    const newMode: ThemeMode = themeMode === 'light' ? 'dark' : 'light';
    await setTheme(newMode);
  }, [themeMode, setTheme]);

  // Initialize theme on component mount
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        const preferredTheme = await loadThemePreference();
        setThemeMode(preferredTheme);
      } catch (error) {
        console.warn('Failed to initialize theme:', error);
        // Fallback to system preference or light theme
        setThemeMode(systemColorScheme === 'dark' ? 'dark' : 'light');
      } finally {
        setIsLoading(false);
      }
    };

    initializeTheme();
  }, [loadThemePreference, systemColorScheme]);

  // Don't render children until theme is loaded
  if (isLoading) {
    return null;
  }

  const contextValue: ThemeContextType = {
    theme: getCurrentTheme(themeMode),
    isDark: themeMode === 'dark',
    themeMode,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContextProvider value={contextValue}>
      {children}
    </ThemeContextProvider>
  );
};