/**
 * Theme Provider
 * Main theme provider component with state management and persistence
 */

import React, { useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useColorScheme, Animated } from 'react-native';
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Animation value for theme transitions
  const themeTransition = useRef(new Animated.Value(0)).current;

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

  // Toggle between light and dark themes with animation
  const toggleTheme = useCallback(async (): Promise<void> => {
    const newMode: ThemeMode = themeMode === 'light' ? 'dark' : 'light';
    
    setIsTransitioning(true);
    
    // Animate theme transition
    Animated.timing(themeTransition, {
      toValue: newMode === 'dark' ? 1 : 0,
      duration: lightTheme.animations.durations.normal,
      useNativeDriver: false,
    }).start(() => {
      setIsTransitioning(false);
    });
    
    await setTheme(newMode);
  }, [themeMode, setTheme, themeTransition]);

  // Initialize theme on component mount
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        const preferredTheme = await loadThemePreference();
        setThemeMode(preferredTheme);
        // Set initial animation value without animation
        themeTransition.setValue(preferredTheme === 'dark' ? 1 : 0);
      } catch (error) {
        console.warn('Failed to initialize theme:', error);
        // Fallback to system preference or light theme
        const fallbackTheme = systemColorScheme === 'dark' ? 'dark' : 'light';
        setThemeMode(fallbackTheme);
        themeTransition.setValue(fallbackTheme === 'dark' ? 1 : 0);
      } finally {
        setIsLoading(false);
      }
    };

    initializeTheme();
  }, [loadThemePreference, systemColorScheme, themeTransition]);

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
    themeTransition,
    isTransitioning,
  };

  return (
    <ThemeContextProvider value={contextValue}>
      {children}
    </ThemeContextProvider>
  );
};