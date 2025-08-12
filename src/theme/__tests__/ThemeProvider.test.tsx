/**
 * ThemeProvider Tests
 * Unit tests for theme provider functionality
 */

import { lightTheme, darkTheme } from '../theme';
import { lightColors, darkColors } from '../tokens';

describe('Theme System', () => {
  it('should have correct light theme structure', () => {
    expect(lightTheme).toBeDefined();
    expect(lightTheme.colors).toBeDefined();
    expect(lightTheme.typography).toBeDefined();
    expect(lightTheme.spacing).toBeDefined();
    expect(lightTheme.animations).toBeDefined();
    expect(lightTheme.borderRadius).toBeDefined();
    expect(lightTheme.shadows).toBeDefined();
  });

  it('should have correct dark theme structure', () => {
    expect(darkTheme).toBeDefined();
    expect(darkTheme.colors).toBeDefined();
    expect(darkTheme.typography).toBeDefined();
    expect(darkTheme.spacing).toBeDefined();
    expect(darkTheme.animations).toBeDefined();
    expect(darkTheme.borderRadius).toBeDefined();
    expect(darkTheme.shadows).toBeDefined();
  });

  it('should have correct light theme colors', () => {
    expect(lightTheme.colors.background).toBe('#F2F2F7');
    expect(lightTheme.colors.text).toBe('#000000');
    expect(lightTheme.colors.primary).toBe('#007AFF');
    expect(lightTheme.colors.surface).toBe('#FFFFFF');
  });

  it('should have correct dark theme colors', () => {
    expect(darkTheme.colors.background).toBe('#000000');
    expect(darkTheme.colors.text).toBe('#FFFFFF');
    expect(darkTheme.colors.primary).toBe('#0A84FF');
    expect(darkTheme.colors.surface).toBe('#1C1C1E');
  });

  it('should have consistent typography across themes', () => {
    expect(lightTheme.typography).toEqual(darkTheme.typography);
    expect(lightTheme.typography.sizes.base).toBe(16);
    expect(lightTheme.typography.weights.bold).toBe('700');
  });

  it('should have consistent spacing across themes', () => {
    expect(lightTheme.spacing).toEqual(darkTheme.spacing);
    expect(lightTheme.spacing.md).toBe(16);
    expect(lightTheme.spacing.lg).toBe(24);
  });

  it('should have consistent animations across themes', () => {
    expect(lightTheme.animations).toEqual(darkTheme.animations);
    expect(lightTheme.animations.durations.normal).toBe(250);
    expect(lightTheme.animations.easings.easeOut).toBe('cubic-bezier(0.25, 0.46, 0.45, 0.94)');
  });
});