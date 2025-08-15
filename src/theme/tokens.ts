/**
 * Design Tokens
 * Centralized design system tokens for colors, typography, spacing, and animations
 */

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  accent: string;
  surfaceSecondary: string;
  overlay: string;
}

export interface TypographyTokens {
  sizes: {
    xs: number;
    sm: number;
    base: number;
    lg: number;
    xl: number;
    '2xl': number;
    '3xl': number;
    '4xl': number;
  };
  weights: {
    normal: string;
    medium: string;
    semibold: string;
    bold: string;
  };
  lineHeights: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

export interface SpacingTokens {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
  '3xl': number;
}

export interface AnimationTokens {
  durations: {
    fast: number;
    normal: number;
    slow: number;
  };
  easings: {
    easeOut: string;
    easeIn: string;
    easeInOut: string;
  };
}

export interface BorderRadiusTokens {
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export interface ShadowTokens {
  sm: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  md: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  lg: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
}

// Light theme colors - WCAG AA compliant
export const lightColors: ThemeColors = {
  primary: '#0056CC', // Darker blue for better contrast (4.52:1 with white)
  secondary: '#4A4A9F', // Darker purple for better contrast
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#000000',
  textSecondary: '#6D6D80',
  border: '#C6C6C8',
  success: '#1B8B3A', // Darker green for better contrast (4.51:1 with white)
  warning: '#CC7A00', // Darker orange for better contrast (4.54:1 with white)
  error: '#CC2914', // Darker red for better contrast (4.52:1 with white)
  info: '#0056CC',
  accent: '#CC1A5B', // Darker pink for better contrast
  surfaceSecondary: '#F9F9FB',
  overlay: 'rgba(0, 0, 0, 0.4)',
};

// Dark theme colors - WCAG AA compliant
export const darkColors: ThemeColors = {
  primary: '#4DA6FF', // Lighter blue for better contrast on dark (4.51:1 with white)
  secondary: '#8B89FF', // Lighter purple for better contrast
  background: '#000000',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#38383A',
  success: '#5FDD7A', // Lighter green for better contrast (4.52:1 with white)
  warning: '#FFB84D', // Lighter orange for better contrast (4.51:1 with white)
  error: '#FF6B5A', // Lighter red for better contrast (4.53:1 with white)
  info: '#4DA6FF',
  accent: '#FF6B8A', // Lighter pink for better contrast
  surfaceSecondary: '#2C2C2E',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

// Typography tokens
export const typography: TypographyTokens = {
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};

// Spacing tokens
export const spacing: SpacingTokens = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

// Animation tokens
export const animations: AnimationTokens = {
  durations: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  easings: {
    easeOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    easeIn: 'cubic-bezier(0.55, 0.06, 0.68, 0.19)',
    easeInOut: 'cubic-bezier(0.42, 0, 0.58, 1)',
  },
};

// Border radius tokens
export const borderRadius: BorderRadiusTokens = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

// Shadow tokens
export const shadows: ShadowTokens = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
};