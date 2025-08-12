/**
 * Theme System Exports
 * Main export file for the design system and theme functionality
 */

// Theme types and objects
export type { Theme, ThemeMode, ThemeConfig } from './theme';
export { lightTheme, darkTheme } from './theme';

// Design tokens
export type {
  ThemeColors,
  TypographyTokens,
  SpacingTokens,
  AnimationTokens,
  BorderRadiusTokens,
  ShadowTokens,
} from './tokens';
export {
  lightColors,
  darkColors,
  typography,
  spacing,
  animations,
  borderRadius,
  shadows,
} from './tokens';

// Theme context and provider
export type { ThemeContextType } from './ThemeContext';
export { ThemeProvider } from './ThemeProvider';

// Theme hook
export { useTheme } from './useTheme';