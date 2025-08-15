/**
 * Animation Utils Tests
 * Performance and functionality tests for optimized animation utilities
 */

import { Animated, Platform } from 'react-native';
import {
  isReducedMotionEnabled,
  subscribeToReducedMotion,
  createOptimizedTiming,
  createOptimizedSpring,
  createAccessibleAnimation,
  createBatchedAnimations,
  createStaggeredAnimations,
  cleanupAnimation,
  startAnimationProfiling,
  endAnimationProfiling,
  getAnimationMetrics,
  clearAnimationMetrics,
} from '../animationUtils';

// Mock AccessibilityInfo
const mockAccessibilityInfo = {
  isReduceMotionEnabled: jest.fn(),
  addEventListener: jest.fn(),
};

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  AccessibilityInfo: mockAccessibilityInfo,
  Platform: { OS: 'ios' },
}));

describe('Animation Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAnimationMetrics();
  });

  describe('Reduced Motion Detection', () => {
    it('should detect reduced motion on iOS', async () => {
      Platform.OS = 'ios';
      mockAccessibilityInfo.isReduceMotionEnabled.mockResolvedValue(true);

      const result = await isReducedMotionEnabled();
      expect(result).toBe(true);
      expect(mockAccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled();
    });

    it('should default to false on Android', async () => {
      Platform.OS = 'android';

      const result = await isReducedMotionEnabled();
      expect(result).toBe(false);
    });

    it('should cache reduced motion result', async () => {
      Platform.OS = 'ios';
      mockAccessibilityInfo.isReduceMotionEnabled.mockResolvedValue(true);

      // First call
      await isReducedMotionEnabled();
      // Second call should use cache
      await isReducedMotionEnabled();

      expect(mockAccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      Platform.OS = 'ios';
      mockAccessibilityInfo.isReduceMotionEnabled.mockRejectedValue(new Error('Test error'));

      const result = await isReducedMotionEnabled();
      expect(result).toBe(false);
    });
  });

  describe('Reduced Motion Subscription', () => {
    it('should subscribe to reduced motion changes on iOS', () => {
      Platform.OS = 'ios';
      const mockRemove = jest.fn();
      mockAccessibilityInfo.addEventListener.mockReturnValue({ remove: mockRemove });

      const callback = jest.fn();
      const unsubscribe = subscribeToReducedMotion(callback);

      expect(mockAccessibilityInfo.addEventListener).toHaveBeenCalledWith(
        'reduceMotionChanged',
        expect.any(Function)
      );

      unsubscribe();
      expect(mockRemove).toHaveBeenCalled();
    });

    it('should handle subscription on non-iOS platforms', () => {
      Platform.OS = 'android';

      const callback = jest.fn();
      const unsubscribe = subscribeToReducedMotion(callback);

      expect(mockAccessibilityInfo.addEventListener).not.toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('Optimized Animations', () => {
    it('should create optimized timing animation with hardware acceleration', () => {
      const animatedValue = new Animated.Value(0);
      const config = {
        toValue: 1,
        duration: 250,
      };

      const animation = createOptimizedTiming(animatedValue, config);

      expect(animation).toBeDefined();
      // Verify that useNativeDriver defaults to true
      expect(animation._config?.useNativeDriver).toBe(true);
    });

    it('should create optimized spring animation with hardware acceleration', () => {
      const animatedValue = new Animated.Value(0);
      const config = {
        toValue: 1,
        tension: 100,
        friction: 8,
      };

      const animation = createOptimizedSpring(animatedValue, config);

      expect(animation).toBeDefined();
      // Verify that useNativeDriver defaults to true
      expect(animation._config?.useNativeDriver).toBe(true);
    });

    it('should allow disabling native driver when needed', () => {
      const animatedValue = new Animated.Value(0);
      const config = {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      };

      const animation = createOptimizedTiming(animatedValue, config);

      expect(animation._config?.useNativeDriver).toBe(false);
    });
  });

  describe('Accessible Animations', () => {
    it('should create animation when reduced motion is disabled', async () => {
      mockAccessibilityInfo.isReduceMotionEnabled.mockResolvedValue(false);

      const animatedValue = new Animated.Value(0);
      const config = {
        toValue: 1,
        duration: 250,
      };

      const animation = await createAccessibleAnimation(animatedValue, config);

      expect(animation).toBeDefined();
      expect(animation).not.toBeNull();
    });

    it('should set value immediately when reduced motion is enabled', async () => {
      mockAccessibilityInfo.isReduceMotionEnabled.mockResolvedValue(true);

      const animatedValue = new Animated.Value(0);
      const setValue = jest.spyOn(animatedValue, 'setValue');
      const config = {
        toValue: 1,
        duration: 250,
      };

      const animation = await createAccessibleAnimation(animatedValue, config);

      expect(animation).toBeNull();
      expect(setValue).toHaveBeenCalledWith(1);
    });

    it('should use fallback value when provided', async () => {
      mockAccessibilityInfo.isReduceMotionEnabled.mockResolvedValue(true);

      const animatedValue = new Animated.Value(0);
      const setValue = jest.spyOn(animatedValue, 'setValue');
      const config = {
        toValue: 1,
        duration: 250,
      };

      await createAccessibleAnimation(animatedValue, config, 0.5);

      expect(setValue).toHaveBeenCalledWith(0.5);
    });
  });

  describe('Batched Animations', () => {
    it('should create parallel animations from multiple configs', () => {
      const animatedValue1 = new Animated.Value(0);
      const animatedValue2 = new Animated.Value(0);

      const animations = [
        {
          animatedValue: animatedValue1,
          config: { toValue: 1, duration: 250 },
        },
        {
          animatedValue: animatedValue2,
          config: { toValue: 0.5, duration: 300 },
        },
      ];

      const batchedAnimation = createBatchedAnimations(animations);

      expect(batchedAnimation).toBeDefined();
      expect(batchedAnimation._animations).toHaveLength(2);
    });
  });

  describe('Staggered Animations', () => {
    it('should create staggered animations with delays', () => {
      const animatedValue1 = new Animated.Value(0);
      const animatedValue2 = new Animated.Value(0);
      const animatedValue3 = new Animated.Value(0);

      const animations = [
        {
          animatedValue: animatedValue1,
          config: { toValue: 1, duration: 250 },
        },
        {
          animatedValue: animatedValue2,
          config: { toValue: 1, duration: 250 },
        },
        {
          animatedValue: animatedValue3,
          config: { toValue: 1, duration: 250 },
        },
      ];

      const staggeredAnimation = createStaggeredAnimations(animations, 100);

      expect(staggeredAnimation).toBeDefined();
      expect(staggeredAnimation._animations).toHaveLength(3);
    });

    it('should apply custom stagger delay', () => {
      const animatedValue1 = new Animated.Value(0);
      const animatedValue2 = new Animated.Value(0);

      const animations = [
        {
          animatedValue: animatedValue1,
          config: { toValue: 1, duration: 250, delay: 50 },
        },
        {
          animatedValue: animatedValue2,
          config: { toValue: 1, duration: 250 },
        },
      ];

      const staggeredAnimation = createStaggeredAnimations(animations, 200);

      expect(staggeredAnimation).toBeDefined();
      // First animation should have original delay (50) + 0 * stagger (200) = 50
      // Second animation should have 0 + 1 * stagger (200) = 200
    });
  });

  describe('Animation Cleanup', () => {
    it('should stop animation when cleaning up', () => {
      const animatedValue = new Animated.Value(0);
      const animation = createOptimizedTiming(animatedValue, {
        toValue: 1,
        duration: 250,
      });

      const stopSpy = jest.spyOn(animation, 'stop');

      cleanupAnimation(animation);

      expect(stopSpy).toHaveBeenCalled();
    });

    it('should handle null animation gracefully', () => {
      expect(() => cleanupAnimation(null)).not.toThrow();
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start performance profiling', () => {
      const animationId = 'test-animation';
      const duration = 250;

      startAnimationProfiling(animationId, duration);

      const metrics = getAnimationMetrics();
      expect(metrics.has(animationId)).toBe(true);

      const metric = metrics.get(animationId);
      expect(metric?.duration).toBe(duration);
      expect(metric?.startTime).toBeDefined();
    });

    it('should end performance profiling and return metrics', () => {
      const animationId = 'test-animation';
      const duration = 250;

      startAnimationProfiling(animationId, duration);
      
      // Advance time
      jest.advanceTimersByTime(300);
      
      const result = endAnimationProfiling(animationId);

      expect(result).toBeDefined();
      expect(result?.endTime).toBeDefined();
      expect(result?.duration).toBe(duration);

      // Should be removed from active metrics
      const metrics = getAnimationMetrics();
      expect(metrics.has(animationId)).toBe(false);
    });

    it('should warn about slow animations', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const animationId = 'slow-animation';
      const duration = 250;

      startAnimationProfiling(animationId, duration);
      
      // Advance time to make it significantly slower than expected
      jest.advanceTimersByTime(400); // 1.6x slower than expected
      
      endAnimationProfiling(animationId);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Animation slow-animation took')
      );

      consoleSpy.mockRestore();
    });

    it('should handle ending non-existent profiling', () => {
      const result = endAnimationProfiling('non-existent');
      expect(result).toBeNull();
    });

    it('should clear all metrics', () => {
      startAnimationProfiling('test1', 250);
      startAnimationProfiling('test2', 300);

      let metrics = getAnimationMetrics();
      expect(metrics.size).toBe(2);

      clearAnimationMetrics();

      metrics = getAnimationMetrics();
      expect(metrics.size).toBe(0);
    });
  });
});