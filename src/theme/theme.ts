/**
 * Theme Definition
 * Complete theme objects combining all design tokens
 */

import {
  ThemeColors,
  TypographyTokens,
  SpacingTokens,
  AnimationTokens,
  BorderRadiusTokens,
  ShadowTokens,
  lightColors,
  darkColors,
  typography,
  spacing,
  animations,
  borderRadius,
  shadows,
} from './tokens';

export interface Theme {
  colors: ThemeColors;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  animations: AnimationTokens;
  borderRadius: BorderRadiusTokens;
  shadows: ShadowTokens;
}

// Light theme
export const lightTheme: Theme = {
  colors: lightColors,
  typography,
  spacing,
  animations,
  borderRadius,
  shadows,
};

// Dark theme
export const darkTheme: Theme = {
  colors: darkColors,
  typography,
  spacing,
  animations,
  borderRadius,
  shadows,
};

export type ThemeMode = 'light' | 'dark';

export interface ThemeConfig {
  mode: ThemeMode;
  autoDetect: boolean;
}