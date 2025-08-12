/**
 * Design Tokens Tests
 * Unit tests for design tokens and theme structure
 */

import {
  lightColors,
  darkColors,
  typography,
  spacing,
  animations,
  borderRadius,
  shadows,
} from '../tokens';

describe('Design Tokens', () => {
  describe('Colors', () => {
    it('should have all required light theme colors', () => {
      expect(lightColors.primary).toBeDefined();
      expect(lightColors.secondary).toBeDefined();
      expect(lightColors.background).toBeDefined();
      expect(lightColors.surface).toBeDefined();
      expect(lightColors.text).toBeDefined();
      expect(lightColors.textSecondary).toBeDefined();
      expect(lightColors.border).toBeDefined();
      expect(lightColors.success).toBeDefined();
      expect(lightColors.warning).toBeDefined();
      expect(lightColors.error).toBeDefined();
      expect(lightColors.info).toBeDefined();
      expect(lightColors.accent).toBeDefined();
      expect(lightColors.surfaceSecondary).toBeDefined();
      expect(lightColors.overlay).toBeDefined();
    });

    it('should have all required dark theme colors', () => {
      expect(darkColors.primary).toBeDefined();
      expect(darkColors.secondary).toBeDefined();
      expect(darkColors.background).toBeDefined();
      expect(darkColors.surface).toBeDefined();
      expect(darkColors.text).toBeDefined();
      expect(darkColors.textSecondary).toBeDefined();
      expect(darkColors.border).toBeDefined();
      expect(darkColors.success).toBeDefined();
      expect(darkColors.warning).toBeDefined();
      expect(darkColors.error).toBeDefined();
      expect(darkColors.info).toBeDefined();
      expect(darkColors.accent).toBeDefined();
      expect(darkColors.surfaceSecondary).toBeDefined();
      expect(darkColors.overlay).toBeDefined();
    });

    it('should have valid color values', () => {
      expect(lightColors.primary).toMatch(/^#[0-9A-F]{6}$/i);
      expect(darkColors.primary).toMatch(/^#[0-9A-F]{6}$/i);
      expect(lightColors.overlay).toMatch(/^rgba\(/);
      expect(darkColors.overlay).toMatch(/^rgba\(/);
    });
  });

  describe('Typography', () => {
    it('should have all required typography sizes', () => {
      expect(typography.sizes.xs).toBe(12);
      expect(typography.sizes.sm).toBe(14);
      expect(typography.sizes.base).toBe(16);
      expect(typography.sizes.lg).toBe(18);
      expect(typography.sizes.xl).toBe(20);
      expect(typography.sizes['2xl']).toBe(24);
      expect(typography.sizes['3xl']).toBe(30);
      expect(typography.sizes['4xl']).toBe(36);
    });

    it('should have all required font weights', () => {
      expect(typography.weights.normal).toBe('400');
      expect(typography.weights.medium).toBe('500');
      expect(typography.weights.semibold).toBe('600');
      expect(typography.weights.bold).toBe('700');
    });

    it('should have all required line heights', () => {
      expect(typography.lineHeights.tight).toBe(1.2);
      expect(typography.lineHeights.normal).toBe(1.4);
      expect(typography.lineHeights.relaxed).toBe(1.6);
    });
  });

  describe('Spacing', () => {
    it('should have all required spacing values', () => {
      expect(spacing.xs).toBe(4);
      expect(spacing.sm).toBe(8);
      expect(spacing.md).toBe(16);
      expect(spacing.lg).toBe(24);
      expect(spacing.xl).toBe(32);
      expect(spacing['2xl']).toBe(48);
      expect(spacing['3xl']).toBe(64);
    });
  });

  describe('Animations', () => {
    it('should have all required animation durations', () => {
      expect(animations.durations.fast).toBe(150);
      expect(animations.durations.normal).toBe(250);
      expect(animations.durations.slow).toBe(350);
    });

    it('should have all required easing functions', () => {
      expect(animations.easings.easeOut).toBe('cubic-bezier(0.25, 0.46, 0.45, 0.94)');
      expect(animations.easings.easeIn).toBe('cubic-bezier(0.55, 0.06, 0.68, 0.19)');
      expect(animations.easings.easeInOut).toBe('cubic-bezier(0.42, 0, 0.58, 1)');
    });
  });

  describe('Border Radius', () => {
    it('should have all required border radius values', () => {
      expect(borderRadius.sm).toBe(8);
      expect(borderRadius.md).toBe(12);
      expect(borderRadius.lg).toBe(16);
      expect(borderRadius.xl).toBe(20);
    });
  });

  describe('Shadows', () => {
    it('should have all required shadow definitions', () => {
      expect(shadows.sm).toBeDefined();
      expect(shadows.md).toBeDefined();
      expect(shadows.lg).toBeDefined();
      
      expect(shadows.sm.shadowColor).toBe('#000');
      expect(shadows.sm.elevation).toBe(2);
      expect(shadows.md.elevation).toBe(4);
      expect(shadows.lg.elevation).toBe(8);
    });
  });
});