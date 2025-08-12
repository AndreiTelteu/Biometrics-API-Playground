/**
 * Theme Context
 * React context for theme management and distribution
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { Theme, ThemeMode } from './theme';

export interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export interface ThemeContextProviderProps {
  children: ReactNode;
  value: ThemeContextType;
}

export const ThemeContextProvider: React.FC<ThemeContextProviderProps> = ({
  children,
  value,
}) => {
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};