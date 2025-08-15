/**
 * Color Contrast Utilities
 * Utilities for validating color contrast ratios for accessibility compliance
 */

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate relative luminance of a color
 * Based on WCAG 2.1 guidelines
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) {
    throw new Error('Invalid color format. Please use hex colors (e.g., #FFFFFF)');
  }
  
  const lum1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standards
 */
export function meetsWCAGAA(foreground: string, background: string, isLargeText: boolean = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  const requiredRatio = isLargeText ? 3.0 : 4.5;
  return ratio >= requiredRatio;
}

/**
 * Check if contrast ratio meets WCAG AAA standards
 */
export function meetsWCAGAAA(foreground: string, background: string, isLargeText: boolean = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  const requiredRatio = isLargeText ? 4.5 : 7.0;
  return ratio >= requiredRatio;
}

/**
 * Validate all theme color combinations
 */
export function validateThemeContrast(theme: any): {
  valid: boolean;
  violations: Array<{
    combination: string;
    ratio: number;
    required: number;
    passes: boolean;
  }>;
} {
  const violations: Array<{
    combination: string;
    ratio: number;
    required: number;
    passes: boolean;
  }> = [];

  // Define critical color combinations to test
  const combinations = [
    {
      name: 'Text on Background',
      foreground: theme.colors.text,
      background: theme.colors.background,
      isLargeText: false,
    },
    {
      name: 'Text on Surface',
      foreground: theme.colors.text,
      background: theme.colors.surface,
      isLargeText: false,
    },
    {
      name: 'Secondary Text on Background',
      foreground: theme.colors.textSecondary,
      background: theme.colors.background,
      isLargeText: false,
    },
    {
      name: 'Primary Button Text',
      foreground: '#FFFFFF',
      background: theme.colors.primary,
      isLargeText: false,
    },
    {
      name: 'Error Text',
      foreground: '#FFFFFF',
      background: theme.colors.error,
      isLargeText: false,
    },
    {
      name: 'Success Text',
      foreground: '#FFFFFF',
      background: theme.colors.success,
      isLargeText: false,
    },
    {
      name: 'Warning Text',
      foreground: '#FFFFFF',
      background: theme.colors.warning,
      isLargeText: false,
    },
  ];

  combinations.forEach(combo => {
    try {
      const ratio = getContrastRatio(combo.foreground, combo.background);
      const requiredRatio = combo.isLargeText ? 3.0 : 4.5;
      const passes = ratio >= requiredRatio;

      violations.push({
        combination: combo.name,
        ratio: Math.round(ratio * 100) / 100,
        required: requiredRatio,
        passes,
      });
    } catch (error) {
      violations.push({
        combination: combo.name,
        ratio: 0,
        required: combo.isLargeText ? 3.0 : 4.5,
        passes: false,
      });
    }
  });

  const valid = violations.every(v => v.passes);

  return { valid, violations };
}

/**
 * Get accessibility grade for a contrast ratio
 */
export function getAccessibilityGrade(ratio: number, isLargeText: boolean = false): 'AAA' | 'AA' | 'FAIL' {
  const aaaThreshold = isLargeText ? 4.5 : 7.0;
  const aaThreshold = isLargeText ? 3.0 : 4.5;

  if (ratio >= aaaThreshold) return 'AAA';
  if (ratio >= aaThreshold) return 'AA';
  return 'FAIL';
}

/**
 * Suggest improvements for failing color combinations
 */
export function suggestContrastImprovements(
  foreground: string,
  background: string,
  targetRatio: number = 4.5
): {
  currentRatio: number;
  suggestions: string[];
} {
  const currentRatio = getContrastRatio(foreground, background);
  const suggestions: string[] = [];

  if (currentRatio < targetRatio) {
    suggestions.push(`Current ratio: ${Math.round(currentRatio * 100) / 100}, Required: ${targetRatio}`);
    
    if (currentRatio < 3.0) {
      suggestions.push('Consider using a completely different color combination');
    } else if (currentRatio < 4.5) {
      suggestions.push('Darken the foreground color or lighten the background color');
    }
    
    suggestions.push('Test with actual users, especially those with visual impairments');
    suggestions.push('Consider using tools like WebAIM Contrast Checker for validation');
  }

  return {
    currentRatio: Math.round(currentRatio * 100) / 100,
    suggestions,
  };
}