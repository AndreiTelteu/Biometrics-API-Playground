/**
 * Color Contrast Tests
 * Tests for color contrast validation utilities
 */

import {
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  validateThemeContrast,
  getAccessibilityGrade,
  suggestContrastImprovements,
} from '../colorContrast';
import { lightTheme, darkTheme } from '../../theme';

describe('Color Contrast Utilities', () => {
  describe('getContrastRatio', () => {
    it('should calculate correct contrast ratio for black and white', () => {
      const ratio = getContrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBe(21); // Maximum possible contrast ratio
    });

    it('should calculate correct contrast ratio for same colors', () => {
      const ratio = getContrastRatio('#FFFFFF', '#FFFFFF');
      expect(ratio).toBe(1); // Minimum possible contrast ratio
    });

    it('should handle colors without # prefix', () => {
      const ratio = getContrastRatio('000000', 'FFFFFF');
      expect(ratio).toBe(21);
    });

    it('should throw error for invalid color format', () => {
      expect(() => getContrastRatio('invalid', '#FFFFFF')).toThrow();
      expect(() => getContrastRatio('#FFFFFF', 'invalid')).toThrow();
    });

    it('should calculate ratio for typical UI colors', () => {
      // Blue primary button with white text (updated color)
      const ratio = getContrastRatio('#FFFFFF', '#0056CC');
      expect(ratio).toBeGreaterThan(4.5); // Should meet AA standards
    });
  });

  describe('WCAG AA Compliance', () => {
    it('should pass AA for high contrast combinations', () => {
      expect(meetsWCAGAA('#000000', '#FFFFFF')).toBe(true);
      expect(meetsWCAGAA('#FFFFFF', '#000000')).toBe(true);
    });

    it('should fail AA for low contrast combinations', () => {
      expect(meetsWCAGAA('#CCCCCC', '#FFFFFF')).toBe(false);
      expect(meetsWCAGAA('#888888', '#999999')).toBe(false);
    });

    it('should have different thresholds for large text', () => {
      const foreground = '#767676';
      const background = '#FFFFFF';
      
      expect(meetsWCAGAA(foreground, background, false)).toBe(false); // Normal text
      expect(meetsWCAGAA(foreground, background, true)).toBe(true);   // Large text
    });

    it('should validate primary button colors', () => {
      expect(meetsWCAGAA('#FFFFFF', '#0056CC')).toBe(true); // Light theme primary
      expect(meetsWCAGAA('#FFFFFF', '#4DA6FF')).toBe(true); // Dark theme primary
    });

    it('should validate error colors', () => {
      expect(meetsWCAGAA('#FFFFFF', '#CC2914')).toBe(true); // Light theme error
      expect(meetsWCAGAA('#FFFFFF', '#FF6B5A')).toBe(true); // Dark theme error
    });
  });

  describe('WCAG AAA Compliance', () => {
    it('should pass AAA for very high contrast combinations', () => {
      expect(meetsWCAGAAA('#000000', '#FFFFFF')).toBe(true);
    });

    it('should fail AAA for moderate contrast combinations', () => {
      expect(meetsWCAGAAA('#666666', '#FFFFFF')).toBe(false);
    });

    it('should have different thresholds for large text', () => {
      const foreground = '#595959';
      const background = '#FFFFFF';
      
      expect(meetsWCAGAAA(foreground, background, false)).toBe(false); // Normal text
      expect(meetsWCAGAAA(foreground, background, true)).toBe(true);   // Large text
    });
  });

  describe('Theme Validation', () => {
    it('should validate light theme contrast', () => {
      const result = validateThemeContrast(lightTheme);
      
      expect(result.violations).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);
      
      // Check that critical combinations are tested
      const combinationNames = result.violations.map(v => v.combination);
      expect(combinationNames).toContain('Text on Background');
      expect(combinationNames).toContain('Primary Button Text');
    });

    it('should validate dark theme contrast', () => {
      const result = validateThemeContrast(darkTheme);
      
      expect(result.violations).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);
      
      // All violations should have required ratio information
      result.violations.forEach(violation => {
        expect(violation.ratio).toBeGreaterThanOrEqual(0);
        expect(violation.required).toBeGreaterThan(0);
        expect(typeof violation.passes).toBe('boolean');
      });
    });

    it('should identify passing and failing combinations', () => {
      const result = validateThemeContrast(lightTheme);
      
      const passingCombos = result.violations.filter(v => v.passes);
      const failingCombos = result.violations.filter(v => !v.passes);
      
      // Most combinations should pass for a well-designed theme
      expect(passingCombos.length).toBeGreaterThan(0);
      
      // Log any failing combinations for review
      if (failingCombos.length > 0) {
        console.warn('Failing contrast combinations:', failingCombos);
      }
    });
  });

  describe('Accessibility Grading', () => {
    it('should grade high contrast as AAA', () => {
      const ratio = 21; // Black on white
      expect(getAccessibilityGrade(ratio)).toBe('AAA');
      expect(getAccessibilityGrade(ratio, true)).toBe('AAA');
    });

    it('should grade moderate contrast as AA', () => {
      const ratio = 5.0; // Meets AA but not AAA for normal text
      expect(getAccessibilityGrade(ratio)).toBe('AA');
      expect(getAccessibilityGrade(ratio, true)).toBe('AAA'); // AAA for large text
    });

    it('should grade low contrast as FAIL', () => {
      const ratio = 2.0; // Below AA threshold
      expect(getAccessibilityGrade(ratio)).toBe('FAIL');
      expect(getAccessibilityGrade(ratio, true)).toBe('FAIL');
    });

    it('should handle edge cases', () => {
      expect(getAccessibilityGrade(4.5)).toBe('AA'); // Exactly AA threshold
      expect(getAccessibilityGrade(7.0)).toBe('AAA'); // Exactly AAA threshold
      expect(getAccessibilityGrade(3.0, true)).toBe('AA'); // AA for large text
    });
  });

  describe('Improvement Suggestions', () => {
    it('should provide suggestions for failing combinations', () => {
      const result = suggestContrastImprovements('#CCCCCC', '#FFFFFF', 4.5);
      
      expect(result.currentRatio).toBeLessThan(4.5);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0]).toContain('Current ratio:');
    });

    it('should provide different suggestions based on severity', () => {
      const veryLowContrast = suggestContrastImprovements('#F0F0F0', '#FFFFFF', 4.5);
      const moderateContrast = suggestContrastImprovements('#999999', '#FFFFFF', 4.5);
      
      expect(veryLowContrast.suggestions.some(s => s.includes('completely different'))).toBe(true);
      expect(moderateContrast.suggestions.some(s => s.includes('Darken the foreground'))).toBe(true);
    });

    it('should handle passing combinations', () => {
      const result = suggestContrastImprovements('#000000', '#FFFFFF', 4.5);
      
      expect(result.currentRatio).toBeGreaterThanOrEqual(4.5);
      expect(result.suggestions.length).toBe(0); // No suggestions needed
    });

    it('should calculate current ratio correctly', () => {
      const result = suggestContrastImprovements('#000000', '#FFFFFF');
      expect(result.currentRatio).toBe(21);
    });
  });

  describe('Real Theme Color Validation', () => {
    it('should validate light theme primary colors', () => {
      const primaryBg = lightTheme.colors.primary; // #007AFF
      const whiteText = '#FFFFFF';
      
      expect(meetsWCAGAA(whiteText, primaryBg)).toBe(true);
    });

    it('should validate dark theme primary colors', () => {
      const primaryBg = darkTheme.colors.primary; // #0A84FF
      const whiteText = '#FFFFFF';
      
      expect(meetsWCAGAA(whiteText, primaryBg)).toBe(true);
    });

    it('should validate text on background combinations', () => {
      // Light theme
      expect(meetsWCAGAA(lightTheme.colors.text, lightTheme.colors.background)).toBe(true);
      
      // Dark theme
      expect(meetsWCAGAA(darkTheme.colors.text, darkTheme.colors.background)).toBe(true);
    });

    it('should validate secondary text readability', () => {
      // Secondary text should still be readable, though may not meet AAA
      expect(meetsWCAGAA(lightTheme.colors.textSecondary, lightTheme.colors.background)).toBe(true);
      expect(meetsWCAGAA(darkTheme.colors.textSecondary, darkTheme.colors.background)).toBe(true);
    });

    it('should validate error state colors', () => {
      expect(meetsWCAGAA('#FFFFFF', lightTheme.colors.error)).toBe(true);
      expect(meetsWCAGAA('#FFFFFF', darkTheme.colors.error)).toBe(true);
    });

    it('should validate success state colors', () => {
      expect(meetsWCAGAA('#FFFFFF', lightTheme.colors.success)).toBe(true);
      expect(meetsWCAGAA('#FFFFFF', darkTheme.colors.success)).toBe(true);
    });
  });
});