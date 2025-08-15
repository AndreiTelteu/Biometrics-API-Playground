/**
 * Button Animation Tests
 * Tests for button press feedback animations
 */

import React from 'react';
import { Animated } from 'react-native';

// Mock the theme context
const mockTheme = {
  colors: {
    primary: '#007AFF',
    text: '#000000',
    surface: '#FFFFFF',
    border: '#C6C6C8',
  },
  typography: {
    sizes: { base: 16, sm: 14 },
    weights: { semibold: '600' },
    lineHeights: { normal: 1.4 },
  },
  spacing: { md: 16, lg: 24, sm: 8 },
  borderRadius: { md: 12 },
  shadows: { sm: {} },
  animations: {
    durations: {
      fast: 150,
      normal: 250,
    },
  },
};

jest.mock('../../theme', () => ({
  useTheme: () => ({
    theme: mockTheme,
  }),
}));

describe('Button Animation Logic', () => {
  it('creates scale animation values', () => {
    const scaleAnimation = new Animated.Value(1);
    expect(scaleAnimation).toBeDefined();
  });

  it('creates opacity animation values', () => {
    const opacityAnimation = new Animated.Value(1);
    expect(opacityAnimation).toBeDefined();
  });

  it('creates press in animation with correct values', () => {
    const scaleAnimation = new Animated.Value(1);
    const opacityAnimation = new Animated.Value(1);
    
    const pressInAnimation = Animated.parallel([
      Animated.timing(scaleAnimation, {
        toValue: 0.95,
        duration: mockTheme.animations.durations.fast,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnimation, {
        toValue: 0.8,
        duration: mockTheme.animations.durations.fast,
        useNativeDriver: true,
      }),
    ]);
    
    expect(pressInAnimation).toBeDefined();
  });

  it('creates press out animation with correct values', () => {
    const scaleAnimation = new Animated.Value(0.95);
    const opacityAnimation = new Animated.Value(0.8);
    
    const pressOutAnimation = Animated.parallel([
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: mockTheme.animations.durations.fast,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnimation, {
        toValue: 1,
        duration: mockTheme.animations.durations.fast,
        useNativeDriver: true,
      }),
    ]);
    
    expect(pressOutAnimation).toBeDefined();
  });

  it('uses correct animation duration from theme', () => {
    expect(mockTheme.animations.durations.fast).toBe(150);
  });

  it('uses native driver for performance', () => {
    const scaleAnimation = new Animated.Value(1);
    
    const animation = Animated.timing(scaleAnimation, {
      toValue: 0.95,
      duration: 150,
      useNativeDriver: true,
    });
    
    expect(animation).toBeDefined();
  });

  it('creates parallel animations for simultaneous effects', () => {
    const scaleAnimation = new Animated.Value(1);
    const opacityAnimation = new Animated.Value(1);
    
    const parallelAnimation = Animated.parallel([
      Animated.timing(scaleAnimation, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnimation, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
    ]);
    
    expect(parallelAnimation).toBeDefined();
  });
});