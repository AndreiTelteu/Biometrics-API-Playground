/**
 * Theme Hook
 * Custom hook for consuming theme context throughout the app
 */

import { useThemeContext, ThemeContextType } from './ThemeContext';

/**
 * Hook to access theme context
 * Provides theme object, theme mode, and theme control functions
 * 
 * @returns ThemeContextType - Complete theme context
 * @throws Error if used outside of ThemeProvider
 */
export const useTheme = (): ThemeContextType => {
  return useThemeContext();
};