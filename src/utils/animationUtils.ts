/**
 * Animation Utilities
 * Optimized animation utilities with hardware acceleration and reduced motion support
 */

import { Animated, Platform } from 'react-native';

// Import AccessibilityInfo conditionally to handle testing
let AccessibilityInfo: any;
try {
  AccessibilityInfo = require('react-native').AccessibilityInfo;
} catch (error) {
  // Fallback for testing environments
  AccessibilityInfo = null;
}

// Cache for reduced motion preference
let reducedMotionEnabled: boolean | null = null;
let reducedMotionListeners: ((enabled: boolean) => void)[] = [];

/**
 * Check if reduced motion is enabled
 */
export const isReducedMotionEnabled = async (): Promise<boolean> => {
  if (reducedMotionEnabled !== null) {
    return reducedMotionEnabled;
  }

  try {
    if (Platform.OS === 'ios' && AccessibilityInfo && AccessibilityInfo.isReduceMotionEnabled) {
      // On iOS, check for reduce motion accessibility setting
      const isEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      reducedMotionEnabled = isEnabled;
      return isEnabled;
    } else {
      // On Android or when AccessibilityInfo is not available, default to false
      reducedMotionEnabled = false;
      return false;
    }
  } catch (error) {
    console.warn('Failed to check reduced motion setting:', error);
    reducedMotionEnabled = false;
    return false;
  }
};

/**
 * Subscribe to reduced motion changes (iOS only)
 */
export const subscribeToReducedMotion = (callback: (enabled: boolean) => void): (() => void) => {
  reducedMotionListeners.push(callback);

  // Set up listener for iOS
  if (Platform.OS === 'ios' && AccessibilityInfo && AccessibilityInfo.addEventListener) {
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled: boolean) => {
      reducedMotionEnabled = enabled;
      reducedMotionListeners.forEach(listener => listener(enabled));
    });

    return () => {
      const index = reducedMotionListeners.indexOf(callback);
      if (index > -1) {
        reducedMotionListeners.splice(index, 1);
      }
      subscription?.remove();
    };
  }

  // Return cleanup function for non-iOS platforms
  return () => {
    const index = reducedMotionListeners.indexOf(callback);
    if (index > -1) {
      reducedMotionListeners.splice(index, 1);
    }
  };
};

/**
 * Optimized animation configuration with hardware acceleration
 */
export interface OptimizedAnimationConfig {
  toValue: number;
  duration: number;
  useNativeDriver?: boolean;
  easing?: (value: number) => number;
  delay?: number;
}

/**
 * Create an optimized timing animation with hardware acceleration
 */
export const createOptimizedTiming = (
  animatedValue: Animated.Value,
  config: OptimizedAnimationConfig
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    ...config,
    useNativeDriver: config.useNativeDriver !== false, // Default to true for hardware acceleration
  });
};

/**
 * Create an optimized spring animation with hardware acceleration
 */
export const createOptimizedSpring = (
  animatedValue: Animated.Value,
  config: {
    toValue: number;
    tension?: number;
    friction?: number;
    useNativeDriver?: boolean;
    speed?: number;
    bounciness?: number;
  }
): Animated.CompositeAnimation => {
  return Animated.spring(animatedValue, {
    tension: 100,
    friction: 8,
    ...config,
    useNativeDriver: config.useNativeDriver !== false, // Default to true for hardware acceleration
  });
};

/**
 * Create animation with reduced motion support
 */
export const createAccessibleAnimation = async (
  animatedValue: Animated.Value,
  config: OptimizedAnimationConfig,
  fallbackValue?: number
): Promise<Animated.CompositeAnimation | null> => {
  const reducedMotion = await isReducedMotionEnabled();
  
  if (reducedMotion) {
    // If reduced motion is enabled, set value immediately without animation
    if (fallbackValue !== undefined) {
      animatedValue.setValue(fallbackValue);
    } else {
      animatedValue.setValue(config.toValue);
    }
    return null;
  }

  return createOptimizedTiming(animatedValue, config);
};

/**
 * Batch multiple animations for better performance
 */
export const createBatchedAnimations = (
  animations: Array<{
    animatedValue: Animated.Value;
    config: OptimizedAnimationConfig;
  }>
): Animated.CompositeAnimation => {
  const animationList = animations.map(({ animatedValue, config }) =>
    createOptimizedTiming(animatedValue, config)
  );

  return Animated.parallel(animationList);
};

/**
 * Create staggered animations with optimized timing
 */
export const createStaggeredAnimations = (
  animations: Array<{
    animatedValue: Animated.Value;
    config: OptimizedAnimationConfig;
  }>,
  staggerDelay: number = 100
): Animated.CompositeAnimation => {
  const animationList = animations.map(({ animatedValue, config }, index) =>
    createOptimizedTiming(animatedValue, {
      ...config,
      delay: (config.delay || 0) + (index * staggerDelay),
    })
  );

  return Animated.parallel(animationList);
};

/**
 * Memory-efficient animation cleanup
 */
export const cleanupAnimation = (animation: Animated.CompositeAnimation | null): void => {
  if (animation) {
    animation.stop();
  }
};

/**
 * Performance monitoring for animations
 */
export interface AnimationPerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration: number;
  frameDrops?: number;
}

const performanceMetrics = new Map<string, AnimationPerformanceMetrics>();

/**
 * Start performance monitoring for an animation
 */
export const startAnimationProfiling = (animationId: string, duration: number): void => {
  performanceMetrics.set(animationId, {
    startTime: Date.now(),
    duration,
  });
};

/**
 * End performance monitoring for an animation
 */
export const endAnimationProfiling = (animationId: string): AnimationPerformanceMetrics | null => {
  const metrics = performanceMetrics.get(animationId);
  if (metrics) {
    metrics.endTime = Date.now();
    performanceMetrics.delete(animationId);
    
    // Log performance warnings if animation took significantly longer than expected
    const actualDuration = metrics.endTime - metrics.startTime;
    const expectedDuration = metrics.duration;
    
    if (actualDuration > expectedDuration * 1.5) {
      console.warn(`Animation ${animationId} took ${actualDuration}ms, expected ${expectedDuration}ms`);
    }
    
    return metrics;
  }
  return null;
};

/**
 * Get current performance metrics
 */
export const getAnimationMetrics = (): Map<string, AnimationPerformanceMetrics> => {
  return new Map(performanceMetrics);
};

/**
 * Clear all performance metrics
 */
export const clearAnimationMetrics = (): void => {
  performanceMetrics.clear();
};